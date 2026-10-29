import os
import io
import uuid
import logging
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from starlette.background import BackgroundTask
from fastapi.responses import FileResponse
from PIL import Image, ImageOps

logger = logging.getLogger("orbit.img_resizer")
router = APIRouter(prefix="/api/resize-image", tags=["Image Editor"])

TEMP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../storage/temp"))
os.makedirs(TEMP_DIR, exist_ok=True)

def cleanup_file(filepath: str):
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        logger.error(f"Error removing temp file {filepath}: {e}")

def safe_float(val, default=800.0) -> float:
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

def safe_int(val, default=0) -> int:
    try:
        return int(val)
    except (ValueError, TypeError):
        return default

def safe_bool(val, default=False) -> bool:
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.lower() in ["true", "1", "yes"]
    return default

def convert_to_pixels(val: float, unit: str, dpi: int) -> int:
    unit = str(unit).lower().strip()
    if unit in ["in", "inch", "inches"]:
        return max(1, int(round(val * dpi)))
    elif unit in ["cm", "centimeter"]:
        return max(1, int(round((val / 2.54) * dpi)))
    else: # px
        return max(1, int(round(val)))

@router.post("")
async def resize_and_edit_image(
    file: UploadFile = File(...),
    width: float = Form(800.0),
    height: float = Form(600.0),
    unit: str = Form("px"),
    dpi: int = Form(96),
    maintain_aspect: bool = Form(True),
    rotation: int = Form(0),
    flip_h: bool = Form(False),
    flip_v: bool = Form(False),
    crop_enabled: bool = Form(False),
    crop_x: int = Form(0),
    crop_y: int = Form(0),
    crop_w: int = Form(0),
    crop_h: int = Form(0),
    target_size_kb: Optional[int] = Form(None),
    output_format: str = Form("png")
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image.")

    # Safe type conversions
    width_num = safe_float(width, 800.0)
    height_num = safe_float(height, 600.0)
    unit_str = str(unit) if isinstance(unit, str) else "px"
    dpi_num = safe_int(dpi, 96)
    maintain_aspect_bool = safe_bool(maintain_aspect, True)
    rotation_num = safe_int(rotation, 0)
    flip_h_bool = safe_bool(flip_h, False)
    flip_v_bool = safe_bool(flip_v, False)
    crop_enabled_bool = safe_bool(crop_enabled, False)
    crop_x_num = safe_int(crop_x, 0)
    crop_y_num = safe_int(crop_y, 0)
    crop_w_num = safe_int(crop_w, 0)
    crop_h_num = safe_int(crop_h, 0)
    output_fmt_str = str(output_format) if isinstance(output_format, str) else "png"

    contents = await file.read()
    try:
        img = Image.open(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read image: {e}")

    # 1. Apply Rotation & Flips
    if rotation_num in [90, 180, 270]:
        img = img.rotate(-rotation_num, expand=True)
    if flip_h_bool:
        img = ImageOps.mirror(img)
    if flip_v_bool:
        img = ImageOps.flip(img)

    # 2. Apply Crop if enabled
    if crop_enabled_bool and crop_w_num > 0 and crop_h_num > 0:
        orig_w, orig_h = img.size
        left = max(0, min(crop_x_num, orig_w - 1))
        top = max(0, min(crop_y_num, orig_h - 1))
        right = max(left + 1, min(left + crop_w_num, orig_w))
        bottom = max(top + 1, min(top + crop_h_num, orig_h))
        img = img.crop((left, top, right, bottom))

    # 3. Convert Units to Pixels
    target_w_px = convert_to_pixels(width_num, unit_str, dpi_num)
    target_h_px = convert_to_pixels(height_num, unit_str, dpi_num)

    if target_w_px > 10000 or target_h_px > 10000:
        raise HTTPException(status_code=400, detail="Target dimensions cannot exceed 10,000 pixels.")

    orig_w, orig_h = img.size
    if maintain_aspect_bool:
        ratio = min(target_w_px / orig_w, target_h_px / orig_h)
        final_w = max(1, int(round(orig_w * ratio)))
        final_h = max(1, int(round(orig_h * ratio)))
    else:
        final_w = target_w_px
        final_h = target_h_px

    # 4. Perform Lanczos Resampling
    resized_img = img.resize((final_w, final_h), Image.Resampling.LANCZOS)

    # 5. Format & Color Mode Setup
    fmt = output_fmt_str.upper()
    if fmt in ["JPG", "JPEG"]:
        fmt = "JPEG"
        ext = "jpg"
        mime = "image/jpeg"
        if resized_img.mode in ("RGBA", "P"):
            background = Image.new("RGB", resized_img.size, (255, 255, 255))
            background.paste(resized_img, mask=resized_img.split()[3] if resized_img.mode == "RGBA" else None)
            resized_img = background
    elif fmt == "WEBP":
        ext = "webp"
        mime = "image/webp"
        if resized_img.mode not in ("RGB", "RGBA"):
            resized_img = resized_img.convert("RGBA")
    else:
        fmt = "PNG"
        ext = "png"
        mime = "image/png"
        if resized_img.mode not in ("RGB", "RGBA"):
            resized_img = resized_img.convert("RGBA")

    output_filename = f"orbit_edited_{uuid.uuid4().hex[:8]}.{ext}"
    output_filepath = os.path.join(TEMP_DIR, output_filename)

    # 6. Target File Size Compression Loop (if specified)
    target_kb_num = safe_int(target_size_kb, 0)
    if target_kb_num > 0 and fmt in ["JPEG", "WEBP"]:
        target_bytes = target_kb_num * 1024
        quality = 95
        while quality >= 10:
            buf = io.BytesIO()
            resized_img.save(buf, format=fmt, quality=quality, dpi=(dpi_num, dpi_num))
            if buf.tell() <= target_bytes or quality <= 15:
                with open(output_filepath, "wb") as f_out:
                    f_out.write(buf.getvalue())
                break
            quality -= 5
    else:
        resized_img.save(output_filepath, format=fmt, quality=92, dpi=(dpi_num, dpi_num))

    return FileResponse(
        path=output_filepath,
        filename=f"ORBIT_Edited_{final_w}x{final_h}_{file.filename.split('.')[0]}.{ext}",
        media_type=mime,
        background=BackgroundTask(cleanup_file, output_filepath)
    )

import os
import io
import uuid
import logging
import numpy as np
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from starlette.background import BackgroundTask
from fastapi.responses import FileResponse
from PIL import Image, ImageOps, ImageFilter

try:
    from skimage import color, filters, morphology
    from skimage.util import img_as_float, img_as_ubyte
    SKIMAGE_AVAILABLE = True
except ImportError:
    SKIMAGE_AVAILABLE = False

logger = logging.getLogger("orbit.bg_remover")
router = APIRouter(prefix="/api/remove-bg", tags=["Background Remover"])

TEMP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../storage/temp"))
os.makedirs(TEMP_DIR, exist_ok=True)

def cleanup_file(filepath: str):
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        logger.error(f"Error removing temp file {filepath}: {e}")

def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    hex_str = hex_str.lstrip('#')
    if len(hex_str) == 3:
        hex_str = ''.join([c*2 for c in hex_str])
    if len(hex_str) != 6:
        return (255, 255, 255)
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def process_removebg_skimage(img_pil: Image.Image, sensitivity: int = 50) -> Image.Image:
    """Professional bgremover.com-style edge-aware background removal engine using scikit-image."""
    img_rgba = img_pil.convert("RGBA")
    width, height = img_rgba.size

    img_np = np.array(img_rgba)
    rgb = img_np[:, :, :3]

    # Convert RGB to CIELAB perceptual color space
    lab = color.rgb2lab(img_as_float(rgb))

    # Sample background color distribution from outer border frame
    border_pixels = []
    border_width = max(2, min(width, height) // 20)
    
    border_pixels.append(lab[:border_width, :, :].reshape(-1, 3))
    border_pixels.append(lab[-border_width:, :, :].reshape(-1, 3))
    border_pixels.append(lab[:, :border_width, :].reshape(-1, 3))
    border_pixels.append(lab[:, -border_width:, :].reshape(-1, 3))
    
    bg_sample = np.vstack(border_pixels)
    bg_mean_lab = np.mean(bg_sample, axis=0)

    # Compute Euclidean distance in CIELAB space
    delta_e = np.sqrt(np.sum((lab - bg_mean_lab) ** 2, axis=2))

    # Otsu automatic thresholding combined with user sensitivity mapping
    try:
        otsu_val = filters.threshold_otsu(delta_e)
        thresh_base = otsu_val * (sensitivity / 50.0)
    except Exception:
        thresh_base = (sensitivity / 50.0) * 18.0
    
    # Compute Sobel edge magnitude map to retain subject boundaries
    gray = color.rgb2gray(img_as_float(rgb))
    edges = filters.sobel(gray)

    # Generate initial binary foreground mask
    raw_mask = (delta_e > thresh_base) | (edges > 0.08)

    # Morphological cleaning: fill interior holes and smooth outer contours
    cleaned_mask = morphology.remove_small_holes(raw_mask, max_size=150)
    cleaned_mask = morphology.closing(cleaned_mask, morphology.disk(3))

    # Apply Gaussian smoothing for translucent anti-aliased edge feathering
    mask_float = cleaned_mask.astype(np.float32)
    feather_radius = max(1.0, float(sensitivity) / 35.0)
    smooth_mask = filters.gaussian(mask_float, sigma=feather_radius)
    
    alpha = (np.clip(smooth_mask, 0.0, 1.0) * 255.0).astype(np.uint8)

    out_np = img_np.copy()
    out_np[:, :, 3] = alpha

    return Image.fromarray(out_np, mode="RGBA")

def remove_bg_engine(input_image: Image.Image, sensitivity: int = 50) -> Image.Image:
    """Master background removal engine."""
    img = input_image.convert("RGBA")

    # 1. Attempt ONNX rembg model if available
    try:
        import onnxruntime
        from rembg import remove
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        output_bytes = remove(buf.getvalue())
        return Image.open(io.BytesIO(output_bytes)).convert("RGBA")
    except Exception as e:
        logger.info(f"ONNX rembg model bypass: {e}")

    # 2. Use scikit-image CIELAB saliency + Sobel edge matting
    if SKIMAGE_AVAILABLE:
        try:
            return process_removebg_skimage(img, sensitivity=sensitivity)
        except Exception as err:
            logger.warning(f"skimage processing exception: {err}")

    # 3. Luminance threshold fallback
    grayscale = ImageOps.grayscale(img)
    threshold = int(255 - (sensitivity / 100.0) * 80)
    mask = grayscale.point(lambda p: 255 if p < threshold else 0)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=1.5))
    output_image = img.copy()
    output_image.putalpha(mask)
    return output_image

@router.post("")
async def remove_background(
    file: UploadFile = File(...),
    bg_type: str = Form("transparent"), # transparent, white, black, cosmic, custom
    custom_color: Optional[str] = Form("#00F0FF"),
    sensitivity: int = Form(50)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image (PNG, JPG, WEBP).")

    contents = await file.read()
    try:
        input_image = Image.open(io.BytesIO(contents)).convert("RGBA")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {e}")

    output_image = remove_bg_engine(input_image, sensitivity=sensitivity)
    width, height = output_image.size

    if bg_type == "white":
        background = Image.new("RGBA", (width, height), (255, 255, 255, 255))
        background.paste(output_image, (0, 0), output_image)
        final_img = background.convert("RGB")
        img_format = "JPEG"
        ext = "jpg"
        mime = "image/jpeg"
    elif bg_type == "black":
        background = Image.new("RGBA", (width, height), (11, 13, 23, 255))
        background.paste(output_image, (0, 0), output_image)
        final_img = background.convert("RGB")
        img_format = "JPEG"
        ext = "jpg"
        mime = "image/jpeg"
    elif bg_type == "cosmic":
        background = Image.new("RGBA", (width, height))
        for y in range(height):
            r = int(11 + (y / height) * 30)
            g = int(13 + (y / height) * 20)
            b = int(35 + (y / height) * 80)
            for x in range(width):
                background.putpixel((x, y), (r, g, b, 255))
        background.paste(output_image, (0, 0), output_image)
        final_img = background.convert("RGB")
        img_format = "JPEG"
        ext = "jpg"
        mime = "image/jpeg"
    elif bg_type == "custom":
        rgb = hex_to_rgb(custom_color or "#00F0FF")
        background = Image.new("RGBA", (width, height), (*rgb, 255))
        background.paste(output_image, (0, 0), output_image)
        final_img = background.convert("RGB")
        img_format = "JPEG"
        ext = "jpg"
        mime = "image/jpeg"
    else: # transparent
        final_img = output_image
        img_format = "PNG"
        ext = "png"
        mime = "image/png"

    output_filename = f"orbit_nobg_{uuid.uuid4().hex[:8]}.{ext}"
    output_filepath = os.path.join(TEMP_DIR, output_filename)
    final_img.save(output_filepath, format=img_format, quality=95)

    return FileResponse(
        path=output_filepath,
        filename=f"ORBIT_NoBG_{file.filename.split('.')[0]}.{ext}",
        media_type=mime,
        background=BackgroundTask(cleanup_file, output_filepath)
    )

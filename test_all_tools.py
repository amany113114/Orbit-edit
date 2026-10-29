import os
import io
import asyncio
from PIL import Image
from fastapi import UploadFile

from app.routes.youtube import get_video_info, download_media, VideoInfoRequest, DownloadRequest
from app.routes.reels import get_reel_info, download_reel, ReelInfoRequest, ReelDownloadRequest
from app.routes.bg_remover import remove_background
from app.routes.img_resizer import resize_and_edit_image
from app.routes.pdf_tools import images_to_pdf, pdf_to_images, merge_pdfs, split_pdf, compress_pdf
from app.routes.invoice import generate_gst_invoice_pdf, GSTInvoiceRequest, GSTInvoiceItem
from app.routes.cv_maker import generate_cv_pdf, CVRequest, CVExperienceItem, CVEducationItem
from app.routes.system import get_storage_stats, purge_expired_temp_files

async def test_all():
    print("🛸 Testing Upgraded ORBIT 2.5 Backend Suite...\n")

    # 1. System Storage
    stats = await get_storage_stats()
    print("✅ System Storage Stats:", stats)
    assert stats["success"] is True

    # 2. YouTube Extractor
    yt_info = await get_video_info(VideoInfoRequest(url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"))
    print("✅ YouTube Video Info:", yt_info["title"])
    assert yt_info["success"] is True

    yt_dl = await download_media(DownloadRequest(url="https://www.youtube.com/watch?v=JqFzhcWo3EU&list=RDJqFzhcWo3EU&start_radio=1", format="mp4", quality="720p"))
    print("✅ YouTube Media File (Sanitized Link):", yt_dl.filename)
    assert os.path.exists(yt_dl.path)

    # 3. Reel Downloader (Instagram / Facebook / TikTok / Shorts)
    reel_info = await get_reel_info(ReelInfoRequest(url="https://www.instagram.com/reel/Cx123456789/"))
    print("✅ Reel Info Extracted:", reel_info["title"], f"[{reel_info['platform']}]")
    assert reel_info["success"] is True

    reel_dl = await download_reel(ReelDownloadRequest(url="https://www.instagram.com/reel/Cx123456789/", format="mp4", quality="hd"))
    print("✅ Reel Media File:", reel_dl.filename)
    assert os.path.exists(reel_dl.path)

    # 3. AI Background Remover (Custom Color test)
    img = Image.new("RGBA", (100, 100), (255, 0, 0, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    upload_bg = UploadFile(filename="test_bg.png", file=buf, headers={"content-type": "image/png"})

    bg_res = await remove_background(file=upload_bg, bg_type="custom", custom_color="#00F0FF", sensitivity=50)
    print("✅ AI BG Remover Output (Custom Color):", bg_res.filename)
    assert os.path.exists(bg_res.path)

    # 4. Advanced Image Editor & Resizer
    img_edit = Image.new("RGB", (600, 400), (0, 255, 0))
    buf_edit = io.BytesIO()
    img_edit.save(buf_edit, format="JPEG")
    buf_edit.seek(0)
    upload_edit = UploadFile(filename="photo.jpg", file=buf_edit, headers={"content-type": "image/jpeg"})

    edit_res = await resize_and_edit_image(
        file=upload_edit,
        width=5.0,
        height=3.33,
        unit="in",
        dpi=300,
        maintain_aspect=True,
        rotation=90,
        flip_h=True,
        target_size_kb=150,
        output_format="jpg"
    )
    print("✅ Image Editor Output:", edit_res.filename)
    assert os.path.exists(edit_res.path)

    # 5. PDF Editing Suite
    img_pdf = Image.new("RGB", (200, 200), (0, 0, 255))
    buf_pdf = io.BytesIO()
    img_pdf.save(buf_pdf, format="JPEG")
    buf_pdf.seek(0)
    upload_pdf1 = UploadFile(filename="doc1.jpg", file=buf_pdf, headers={"content-type": "image/jpeg"})

    pdf1_res = await images_to_pdf(files=[upload_pdf1])
    print("✅ PDF Editing Img2PDF Output:", pdf1_res.filename)
    assert os.path.exists(pdf1_res.path)

    # 6. Invoice Generator
    gst_req = GSTInvoiceRequest(
        invoice_number="INV/2026-27/101",
        supplier_name="ORBIT Tech",
        recipient_name="Test Client",
        items=[GSTInvoiceItem(description="Web Development", unit_price=50000.0)]
    )
    gst_res = await generate_gst_invoice_pdf(gst_req)
    print("✅ Invoice Output (₹ INR):", gst_res.filename)
    assert os.path.exists(gst_res.path)

    # 7. NEW: CV Maker PDF Generator
    cv_req = CVRequest(
        full_name="Aman Sharma",
        job_title="Senior Software Engineer",
        email="aman@example.com",
        phone="+91 98765 43210",
        location="New Delhi, India",
        summary="Passionate software engineer building scalable web engines.",
        skills=["Python", "FastAPI", "React", "Docker"],
        template="modern",
        experience=[CVExperienceItem(title="Senior Developer", company="TechCorp", dates="2022-Present", location="Delhi", description="Architected FastAPI services.")],
        education=[CVEducationItem(degree="B.Tech CS", school="IIT", dates="2018-2022", location="Delhi")]
    )
    cv_res = await generate_cv_pdf(cv_req)
    print("✅ CV Maker PDF Output:", cv_res.filename)
    assert os.path.exists(cv_res.path)

    # 8. Storage Cleanup
    cleanup_res = await purge_expired_temp_files()
    print("✅ Storage Cleanup Purge:", cleanup_res["message"])
    assert cleanup_res["success"] is True

    print("\n🎉 ALL ORBIT 2.5 UPGRADED FUNCTIONS VERIFIED AND WORKING PERFECTLY!")

if __name__ == "__main__":
    asyncio.run(test_all())

import logging
import urllib.parse
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

logger = logging.getLogger("orbit.proxy")
router = APIRouter(prefix="/api", tags=["Stream Proxy"])

@router.get("/stream-proxy")
async def stream_proxy(
    url: str = Query(..., description="Target media stream URL"),
    filename: str = Query("ORBIT_Download.mp4", description="Custom download filename")
):
    """
    Universal stream proxy: pipes external media streams directly to client browser
    with Content-Disposition: attachment and Access-Control-Allow-Origin: *
    to guarantee one-click browser download on any device without CORS restrictions.
    """
    clean_url = urllib.parse.unquote(url.strip())
    if not clean_url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid media stream URL.")

    # Determine content-type from filename extension
    ext = filename.lower().split('.')[-1] if '.' in filename else 'mp4'
    content_type_map = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mkv': 'video/x-matroska',
        'mp3': 'audio/mpeg',
        'm4a': 'audio/mp4',
        'aac': 'audio/aac',
        'ogg': 'audio/ogg',
        'jpg': 'image/jpeg',
        'png': 'image/png'
    }
    media_type = content_type_map.get(ext, 'application/octet-stream')

    async def stream_generator():
        try:
            import httpx
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Encoding': 'identity',
                'Referer': 'https://www.youtube.com/' if 'googlevideo.com' in clean_url else 'https://www.instagram.com/'
            }
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True, verify=False) as client:
                async with client.stream("GET", clean_url, headers=headers) as resp:
                    if resp.status_code >= 400:
                        logger.error(f"Stream proxy upstream error: {resp.status_code} for {clean_url}")
                        yield b""
                        return
                    async for chunk in resp.aiter_bytes(chunk_size=65536):
                        yield chunk
        except Exception as e:
            logger.error(f"Stream proxy piping error: {e}")
            yield b""

    # Safe sanitized filename
    safe_filename = filename.replace('"', '').replace("'", '').strip()
    encoded_filename = urllib.parse.quote(safe_filename)

    headers = {
        "Content-Disposition": f"attachment; filename=\"{safe_filename}\"; filename*=UTF-8''{encoded_filename}",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Expose-Headers": "Content-Disposition, Content-Length"
    }

    return StreamingResponse(
        stream_generator(),
        media_type=media_type,
        headers=headers
    )

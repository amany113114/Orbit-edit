import os
import time
import logging
from fastapi import APIRouter

logger = logging.getLogger("orbit.system")
router = APIRouter(prefix="/api/system", tags=["System Management"])

TEMP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../storage/temp"))
os.makedirs(TEMP_DIR, exist_ok=True)

def get_dir_size_and_count(path: str):
    total_size = 0
    file_count = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if not os.path.islink(fp):
                total_size += os.path.getsize(fp)
                file_count += 1
    return total_size, file_count

@router.get("/storage")
async def get_storage_stats():
    size_bytes, count = get_dir_size_and_count(TEMP_DIR)
    size_mb = round(size_bytes / (1024 * 1024), 2)
    
    # Calculate disk usage of volume
    try:
        stat = os.statvfs(TEMP_DIR)
        free_bytes = stat.f_bavail * stat.f_frsize
        total_bytes = stat.f_blocks * stat.f_frsize
        used_bytes = total_bytes - free_bytes
        used_pct = round((used_bytes / total_bytes) * 100, 1)
    except Exception:
        used_pct = 15.0

    return {
        "success": True,
        "temp_files_count": count,
        "temp_size_mb": size_mb,
        "system_disk_used_pct": used_pct,
        "status": "Optimal" if size_mb < 500 else "Cleanup Recommended"
    }

@router.post("/cleanup")
async def purge_expired_temp_files(max_age_seconds: int = 3600):
    now = time.time()
    removed_count = 0
    freed_bytes = 0

    for dirpath, dirnames, filenames in os.walk(TEMP_DIR):
        for f in filenames:
            filepath = os.path.join(dirpath, f)
            try:
                file_age = now - os.path.getmtime(filepath)
                if file_age > max_age_seconds:
                    size = os.path.getsize(filepath)
                    os.remove(filepath)
                    removed_count += 1
                    freed_bytes += size
            except Exception as e:
                logger.error(f"Error purging file {filepath}: {e}")

    freed_mb = round(freed_bytes / (1024 * 1024), 2)
    return {
        "success": True,
        "files_removed": removed_count,
        "freed_mb": freed_mb,
        "message": f"Purged {removed_count} temporary files ({freed_mb} MB freed)."
    }

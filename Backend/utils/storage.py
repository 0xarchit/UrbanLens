import aiofiles
import aiohttp
from pathlib import Path
from uuid import uuid4
from typing import Optional
from fastapi import UploadFile

from Backend.core.config import settings
from Backend.core.logging import get_logger

logger = get_logger(__name__)


def generate_filename(original_filename: str) -> str:
    ext = Path(original_filename).suffix.lower()
    if not ext:
        ext = ".jpg"
    return f"{uuid4().hex}{ext}"


def get_supabase_public_url(file_path: str) -> str:
    return f"{settings.supabase_url}/storage/v1/object/public/{settings.supabase_bucket}/{file_path}"


async def upload_to_supabase(file_data: bytes, remote_path: str, content_type: str = "image/jpeg") -> str:
    url = f"{settings.supabase_url}/storage/v1/object/{settings.supabase_bucket}/{remote_path}"
    
    headers = {
        "Authorization": f"Bearer {settings.supabase_key}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, data=file_data, headers=headers) as response:
            if response.status not in (200, 201):
                error_text = await response.text()
                logger.error(f"Supabase upload failed: {response.status} - {error_text}")
                raise Exception(f"Failed to upload to Supabase: {error_text}")
            
            logger.info(f"Uploaded to Supabase: {remote_path}")
            return get_supabase_public_url(remote_path)


async def save_upload(file: UploadFile, subfolder: str = "") -> str:
    filename = generate_filename(file.filename or "image.jpg")
    
    if subfolder:
        remote_path = f"{subfolder}/{filename}"
    else:
        remote_path = filename
    
    content = await file.read()
    await file.seek(0)
    
    content_type = file.content_type or "image/jpeg"
    
    public_url = await upload_to_supabase(content, remote_path, content_type)
    
    return remote_path


async def save_bytes(data: bytes, filename: str, subfolder: str = "", content_type: str = "image/jpeg") -> str:
    if subfolder:
        remote_path = f"{subfolder}/{filename}"
    else:
        remote_path = filename
    
    public_url = await upload_to_supabase(data, remote_path, content_type)
    
    return remote_path


async def save_local_temp(data: bytes, filename: str) -> str:
    temp_dir = settings.local_temp_dir
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = temp_dir / filename
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(data)
    
    return str(file_path)


async def download_from_supabase(remote_path: str) -> bytes:
    url = get_supabase_public_url(remote_path)
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status != 200:
                raise Exception(f"Failed to download from Supabase: {response.status}")
            return await response.read()


def get_upload_url(file_path: str) -> str:
    if file_path.startswith("http"):
        return file_path
    return get_supabase_public_url(file_path)


def validate_file_extension(filename: str) -> bool:
    ext = Path(filename).suffix.lower().lstrip(".")
    return ext in settings.allowed_extensions


def validate_file_size(size: int) -> bool:
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    return size <= max_bytes

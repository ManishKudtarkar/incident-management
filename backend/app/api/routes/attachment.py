"""
Attachment upload endpoint — stores files in MinIO, records metadata in PostgreSQL.
"""
import io
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import settings
from app.models.attachment import Attachment
from app.schemas.attachment_schema import AttachmentOut

router = APIRouter(prefix="/incidents", tags=["Attachments"])


def _get_minio():
    """Lazy-import minio so startup doesn't fail if MinIO is unreachable."""
    try:
        from minio import Minio
        client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=False,
        )
        return client
    except Exception:
        return None


@router.post("/{incident_id}/attachments", response_model=AttachmentOut)
async def upload_attachment(
    incident_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a file attachment for an incident. Stored in MinIO."""
    minio = _get_minio()
    if minio is None:
        raise HTTPException(status_code=503, detail="Object storage unavailable")

    try:
        # Ensure bucket exists
        if not minio.bucket_exists(settings.MINIO_BUCKET):
            minio.make_bucket(settings.MINIO_BUCKET)

        file_id = str(uuid.uuid4())
        file_path = f"{incident_id}/{file_id}/{file.filename}"
        content = await file.read()

        minio.put_object(
            settings.MINIO_BUCKET,
            file_path,
            io.BytesIO(content),
            length=len(content),
            content_type=file.content_type or "application/octet-stream",
        )

        db_attachment = Attachment(
            id=file_id,
            incident_id=incident_id,
            file_name=file.filename,
            file_path=file_path,
            file_type=file.content_type or "application/octet-stream",
        )
        db.add(db_attachment)
        await db.commit()
        await db.refresh(db_attachment)
        return db_attachment

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

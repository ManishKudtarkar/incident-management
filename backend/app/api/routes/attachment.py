import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.db.minio import minio_client
from app.core.config import settings
from app.models.attachment import Attachment
from app.schemas.attachment_schema import Attachment as AttachmentSchema

router = APIRouter()

@router.post("/incidents/{incident_id}/attachments", response_model=AttachmentSchema)
async def upload_attachment(
    incident_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
):
    try:
        # Check if bucket exists
        found = minio_client.bucket_exists(settings.MINIO_BUCKET)
        if not found:
            minio_client.make_bucket(settings.MINIO_BUCKET)

        file_id = uuid.uuid4()
        file_path = f"{incident_id}/{file_id}/{file.filename}"

        # Upload file to MinIO
        minio_client.put_object(
            settings.MINIO_BUCKET,
            file_path,
            file.file,
            file.size,
            content_type=file.content_type
        )

        # Create attachment record in DB
        db_attachment = Attachment(
            id=file_id,
            incident_id=incident_id,
            file_name=file.filename,
            file_path=file_path,
            file_type=file.content_type,
        )
        db.add(db_attachment)
        await db.commit()
        await db.refresh(db_attachment)

        return db_attachment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

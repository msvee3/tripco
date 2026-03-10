"""Upload router – SAS token generation for direct-to-blob uploads."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends

from app.middleware.auth import get_current_user
from app.models.schemas import SASRequest, SASResponse
from app.services.blob import generate_upload_sas

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/sas", response_model=SASResponse)
def get_upload_sas(body: SASRequest, user: dict = Depends(get_current_user)):
    """Generate a short-lived SAS URL for the client to PUT a file directly to Blob Storage."""
    ext = body.filename.rsplit(".", 1)[-1] if "." in body.filename else "bin"
    blob_name = f"{user['id']}/{uuid.uuid4()}.{ext}"

    container = body.container if body.container in ("media", "tickets") else "media"

    url, expires_at = generate_upload_sas(
        container=container,
        blob_name=blob_name,
        content_type=body.contentType,
    )

    return SASResponse(uploadUrl=url, blobName=blob_name, expiresAt=expires_at)

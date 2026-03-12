"""Upload router – SAS token generation for direct-to-blob uploads."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends

from app.middleware.auth import get_current_user
from app.models.schemas import SASRequest, SASResponse, ReadSASRequest, ReadSASResponse
from app.services.blob import generate_upload_sas, generate_read_sas

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


@router.post("/read-sas", response_model=ReadSASResponse)
def get_read_sas(body: ReadSASRequest, user: dict = Depends(get_current_user)):
    """Generate a read-only SAS URL for an existing blob (container + blobName)."""
    container = body.container if body.container in ("media", "tickets") else "media"
    url = generate_read_sas(container=container, blob_name=body.blobName, ttl_hours=24)
    return ReadSASResponse(readUrl=url)

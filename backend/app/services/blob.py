"""Azure Blob Storage helpers – SAS generation for direct client uploads."""

from datetime import datetime, timedelta, timezone

from azure.storage.blob import (
    BlobSasPermissions,
    BlobServiceClient,
    generate_blob_sas,
)

from app.core.config import get_settings


def _get_blob_service() -> BlobServiceClient:
    s = get_settings()
    conn_str = (
        f"DefaultEndpointsProtocol=https;"
        f"AccountName={s.BLOB_ACCOUNT_NAME};"
        f"AccountKey={s.BLOB_ACCOUNT_KEY};"
        f"EndpointSuffix=core.windows.net"
    )
    return BlobServiceClient.from_connection_string(conn_str)


def generate_upload_sas(
    container: str,
    blob_name: str,
    content_type: str = "image/jpeg",
    ttl_minutes: int = 15,
) -> tuple[str, str]:
    """Return (full_upload_url, expiry_iso) for a client to PUT directly."""
    s = get_settings()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)

    sas = generate_blob_sas(
        account_name=s.BLOB_ACCOUNT_NAME,
        account_key=s.BLOB_ACCOUNT_KEY,
        container_name=container,
        blob_name=blob_name,
        permission=BlobSasPermissions(write=True, create=True),
        expiry=expiry,
        content_type=content_type,
    )

    url = f"https://{s.BLOB_ACCOUNT_NAME}.blob.core.windows.net/{container}/{blob_name}?{sas}"
    return url, expiry.isoformat()


def generate_read_sas(
    container: str,
    blob_name: str,
    ttl_hours: int = 1,
) -> str:
    """Return a time-limited read URL for a stored blob."""
    s = get_settings()
    expiry = datetime.now(timezone.utc) + timedelta(hours=ttl_hours)

    # If a full URL was stored (older records), extract the blob name
    if blob_name.startswith("http://") or blob_name.startswith("https://"):
        try:
            # Expecting format https://<account>.blob.core.windows.net/<container>/<blob_path>
            parts = blob_name.split(".blob.core.windows.net/")
            if len(parts) == 2:
                path = parts[1]
                # remove any leading container segment if present
                if path.startswith(f"{container}/"):
                    blob_name = path[len(container) + 1 :]
                else:
                    # If container segment isn't present, use the full path as blob_name
                    blob_name = path
        except Exception:
            # fallback to using provided blob_name as-is
            pass

    sas = generate_blob_sas(
        account_name=s.BLOB_ACCOUNT_NAME,
        account_key=s.BLOB_ACCOUNT_KEY,
        container_name=container,
        blob_name=blob_name,
        permission=BlobSasPermissions(read=True),
        expiry=expiry,
    )
    return f"https://{s.BLOB_ACCOUNT_NAME}.blob.core.windows.net/{container}/{blob_name}?{sas}"

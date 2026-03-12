"""Migration: convert stored full blob URLs in TripItems to blob names.

Run this once (carefully) to normalise existing documents so the backend
can consistently generate read SAS tokens.

Usage:
    python -m backend.scripts.migrate_blob_urls

Note: ensure your environment variables (COSMOS_*, BLOB_*) are set.
"""

from __future__ import annotations

from typing import Tuple

from app.db.cosmos_client import query_items, upsert_item


def extract_blob_path(url: str) -> Tuple[str | None, str | None]:
    """Return (container, blob_name) or (None, None) if not a blob URL."""
    if not url or not url.startswith("http"):
        return None, None
    try:
        parts = url.split(".blob.core.windows.net/")
        if len(parts) != 2:
            return None, None
        path = parts[1].split("?", 1)[0]
        # Path usually looks like "media/userId/uuid.ext" or "tickets/.."
        if path.startswith("media/"):
            return "media", path[len("media/") :]
        if path.startswith("tickets/"):
            return "tickets", path[len("tickets/") :]
        # Unknown container — return full path as blob_name (caller will default container)
        return None, path
    except Exception:
        return None, None


def convert_doc(doc: dict) -> bool:
    """Convert any URL fields in a TripItems document to blob names.
    Returns True if document was modified.
    """
    modified = False

    # fileUrl (single)
    fu = doc.get("fileUrl")
    if isinstance(fu, str) and fu.startswith("http"):
        container, blob = extract_blob_path(fu)
        if blob:
            # If container not found, infer from type
            if not container:
                container = "tickets" if doc.get("type") == "ticket" else "media"
            doc["fileUrl"] = blob
            modified = True

    # thumbnailUrl
    tu = doc.get("thumbnailUrl")
    if isinstance(tu, str) and tu.startswith("http"):
        _, blob = extract_blob_path(tu)
        if blob:
            doc["thumbnailUrl"] = blob
            modified = True

    # photos (list)
    photos = doc.get("photos")
    if isinstance(photos, list):
        new_photos = []
        changed = False
        for p in photos:
            if isinstance(p, str) and p.startswith("http"):
                _, blob = extract_blob_path(p)
                if blob:
                    new_photos.append(blob)
                    changed = True
                else:
                    new_photos.append(p)
            else:
                new_photos.append(p)
        if changed:
            doc["photos"] = new_photos
            modified = True

    return modified


def main() -> None:
    print("Starting migration: converting full blob URLs to blob names...")
    docs = query_items("TripItems", "SELECT * FROM c", None, None, max_count=10000)
    total = len(docs)
    print(f"Found {total} TripItems to inspect")

    updated = 0
    for d in docs:
        if convert_doc(d):
            # Upsert back into database (partition key is tripId)
            upsert_item("TripItems", d)
            updated += 1

    print(f"Migration complete. Updated {updated} documents.")


if __name__ == "__main__":
    main()

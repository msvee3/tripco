"""Azure Cosmos DB async-ish client wrapper.

Uses the synchronous azure-cosmos SDK with per-container helpers.
For high-throughput production workloads consider running in a
thread-pool executor or switching to the MongoDB-API + Motor driver.
"""

from typing import Any

from azure.cosmos import CosmosClient, PartitionKey, exceptions
from azure.cosmos.container import ContainerProxy
from azure.cosmos.database import DatabaseProxy

from app.core.config import get_settings

# ── Module-level singletons (initialised lazily) ────────

_client: CosmosClient | None = None
_db: DatabaseProxy | None = None

CONTAINERS: dict[str, ContainerProxy] = {}

# Container definitions: name → partition key path
CONTAINER_DEFS: dict[str, str] = {
    "Users": "/id",
    "Trips": "/ownerId",
    "TripItems": "/tripId",
    "SyncCursors": "/userId",
}


def _get_client() -> CosmosClient:
    global _client
    if _client is None:
        s = get_settings()
        _client = CosmosClient(s.COSMOS_ENDPOINT, credential=s.COSMOS_KEY)
    return _client


def _get_db() -> DatabaseProxy:
    global _db
    if _db is None:
        s = get_settings()
        _db = _get_client().create_database_if_not_exists("tripco")
    return _db


def get_container(name: str) -> ContainerProxy:
    """Return (and cache) a container proxy, creating the container if needed."""
    if name not in CONTAINERS:
        pk_path = CONTAINER_DEFS.get(name, "/id")
        CONTAINERS[name] = _get_db().create_container_if_not_exists(
            id=name,
            partition_key=PartitionKey(path=pk_path),
            indexing_policy={
                "automatic": True,
                "includedPaths": [{"path": "/*"}],
                "excludedPaths": [{"path": '/"_etag"/?'}],
                "compositeIndexes": [
                    [
                        {"path": "/tripId", "order": "ascending"},
                        {"path": "/type", "order": "ascending"},
                        {"path": "/createdAt", "order": "descending"},
                    ]
                ],
            },
        )
    return CONTAINERS[name]


# ── CRUD helpers ─────────────────────────────────────────

def create_item(container_name: str, item: dict[str, Any]) -> dict[str, Any]:
    container = get_container(container_name)
    return container.create_item(body=item)


def read_item(container_name: str, item_id: str, partition_key: str) -> dict[str, Any] | None:
    container = get_container(container_name)
    try:
        return container.read_item(item=item_id, partition_key=partition_key)
    except exceptions.CosmosResourceNotFoundError:
        return None


def upsert_item(container_name: str, item: dict[str, Any]) -> dict[str, Any]:
    container = get_container(container_name)
    return container.upsert_item(body=item)


def delete_item(container_name: str, item_id: str, partition_key: str) -> None:
    container = get_container(container_name)
    try:
        container.delete_item(item=item_id, partition_key=partition_key)
    except exceptions.CosmosResourceNotFoundError:
        pass


def query_items(
    container_name: str,
    query: str,
    parameters: list[dict[str, Any]] | None = None,
    partition_key: str | None = None,
    max_count: int = 50,
) -> list[dict[str, Any]]:
    container = get_container(container_name)
    kwargs: dict[str, Any] = {
        "query": query,
        "parameters": parameters or [],
        "max_item_count": max_count,
    }
    if partition_key is not None:
        kwargs["partition_key"] = partition_key
    return list(container.query_items(**kwargs))

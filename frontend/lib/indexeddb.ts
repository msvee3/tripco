/**
 * IndexedDB offline store using Dexie.
 *
 * Stores:
 *   trips        – cached trip summaries
 *   tripItems    – memories, expenses, itinerary, food, tickets
 *   pendingChanges – mutations queued while offline
 *   pendingUploads – files queued for upload
 *   metadata     – key-value (lastSyncTs, etc.)
 */

import Dexie, { type Table } from "dexie";
import { api, getAccessToken } from "./api";

// ── Database schema ─────────────────────────────────

export class TravelDB extends Dexie {
  trips!: Table<any, string>;
  tripItems!: Table<any, string>;
  pendingChanges!: Table<any, number>;
  pendingUploads!: Table<any, number>;
  metadata!: Table<{ key: string; value: string }, string>;

  constructor() {
    super("travel-companion-db");
    this.version(1).stores({
      trips: "id, ownerId, status",
      tripItems: "id, tripId, type, [tripId+type]",
      pendingChanges: "++id, collection, op",
      pendingUploads: "++id, status",
      metadata: "key",
    });
  }
}

export const db = new TravelDB();

// ── Offline cache helpers ───────────────────────────

export async function cacheTrips(trips: any[]) {
  await db.trips.bulkPut(trips);
}

export async function getCachedTrips(): Promise<any[]> {
  return db.trips.toArray();
}

export async function cacheTripItems(items: any[]) {
  await db.tripItems.bulkPut(items);
}

export async function getCachedTripItems(tripId: string, type?: string): Promise<any[]> {
  if (type) {
    return db.tripItems.where({ tripId, type }).toArray();
  }
  return db.tripItems.where({ tripId }).toArray();
}

// ── Pending change queue ────────────────────────────

export async function queueChange(change: {
  op: "create" | "update" | "delete";
  collection: string;
  docId?: string;
  doc?: any;
}) {
  await db.pendingChanges.add({
    ...change,
    clientTs: new Date().toISOString(),
  });
}

export async function getPendingChanges() {
  return db.pendingChanges.toArray();
}

export async function clearPendingChanges(ids: number[]) {
  await db.pendingChanges.bulkDelete(ids);
}

// ── Sync to server ──────────────────────────────────

export async function syncToServer() {
  if (!getAccessToken()) return; // not logged in

  const changes = await getPendingChanges();
  if (changes.length === 0) return;

  try {
    const result = await api.post("/sync/push", {
      clientId: getDeviceId(),
      changes: changes.map((c) => ({
        op: c.op,
        collection: c.collection,
        docId: c.docId,
        doc: c.doc,
        clientTs: c.clientTs,
      })),
    });

    // Remove accepted changes
    if (result.accepted?.length) {
      const acceptedIds = changes
        .filter((c) => {
          const id = c.docId || c.doc?.id;
          return result.accepted.includes(id);
        })
        .map((c) => c.id);
      await clearPendingChanges(acceptedIds);
    }

    console.log("[Sync] pushed", result);
  } catch (err) {
    console.warn("[Sync] push failed, will retry later", err);
  }
}

export async function syncFromServer() {
  if (!getAccessToken()) return;

  const meta = await db.metadata.get("lastSyncTs");
  const since = meta?.value ?? "1970-01-01T00:00:00Z";

  try {
    const result = await api.get(`/sync/pull?since=${encodeURIComponent(since)}`);
    if (result.changes?.length) {
      await cacheTripItems(result.changes);
    }
    await db.metadata.put({ key: "lastSyncTs", value: result.serverTime });
    console.log("[Sync] pulled", result.changes?.length, "items");
  } catch (err) {
    console.warn("[Sync] pull failed", err);
  }
}

// ── Device ID ───────────────────────────────────────

function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("tc-device-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("tc-device-id", id);
  }
  return id;
}

// ── Online/offline listeners ────────────────────────

export function initOfflineSync() {
  if (typeof window === "undefined") return;

  window.addEventListener("online", () => {
    console.log("[Sync] back online – syncing…");
    syncToServer().then(() => syncFromServer());
  });

  // Initial sync
  if (navigator.onLine) {
    syncFromServer();
  }
}

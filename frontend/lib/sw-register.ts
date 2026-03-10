/**
 * Register the service worker and listen for sync events.
 * Import this in the root layout (client-side).
 */

export function registerSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
      console.log("[SW] registered", reg.scope);

      // Listen for sync messages from SW
      navigator.serviceWorker.addEventListener("message", (ev) => {
        if (ev.data?.type === "SYNC_NOW") {
          // Trigger sync from IndexedDB → server
          import("./indexeddb").then(({ syncToServer }) => syncToServer());
        }
      });
    } catch (err) {
      console.error("[SW] registration failed", err);
    }
  });
}

/**
 * Request a background sync (if supported).
 */
export async function requestSync() {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  if ("sync" in reg) {
    await (reg as any).sync.register("sync-pending-changes");
  }
}

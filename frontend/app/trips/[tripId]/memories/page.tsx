"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Upload, X, MapPin, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { api, setTokens } from "@/lib/api";
import type { Memory, SASResponse } from "@/lib/types";
import { TripPageHero } from "@/components/TripPageHero";

export default function MemoriesPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: session, status } = useSession();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }

    const s = session as any;
    if (s?.accessToken) {
      setTokens(s.accessToken, s.refreshToken);
      console.log("[Memories] Tokens set from NextAuth session (will auto-refresh on 401 if needed)");
    } else {
      console.warn("[Memories] No accessToken in NextAuth session");
    }

    (async () => {
      try {
        console.log("[Memories] Fetching memories for trip:", tripId);
        const data = await api.get<Memory[]>(`/trips/${tripId}/memories`);
        setMemories(data);
      } catch (err: any) {
        console.error("[Memories] Failed to load memories:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [status, session, tripId]);

  // Resolve a blobName → signed read URL (cached)
  async function resolveUrl(m: Memory): Promise<string | null> {
    if (!m.fileUrl) return null;
    if (resolvedUrls[m.id]) return resolvedUrls[m.id];
    if (m.fileUrl.startsWith("http")) {
      setResolvedUrls((prev) => ({ ...prev, [m.id]: m.fileUrl! }));
      return m.fileUrl;
    }
    try {
      const res = await api.post<{ readUrl: string }>("/upload/read-sas", {
        container: "media",
        blobName: m.fileUrl,
      });
      const url = (res as any).readUrl;
      setResolvedUrls((prev) => ({ ...prev, [m.id]: url }));
      return url;
    } catch (err) {
      console.error("Failed to resolve URL for:", m.fileUrl, err);
      return null;
    }
  }

  // Open lightbox at a given index
  async function openLightbox(index: number) {
    setLightboxIndex(index);
    setResolving(true);
    const m = memories[index];
    await resolveUrl(m);
    setResolving(false);
    // Preload adjacent
    if (index > 0) resolveUrl(memories[index - 1]);
    if (index < memories.length - 1) resolveUrl(memories[index + 1]);
  }

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const goPrev = useCallback(async () => {
    if (lightboxIndex === null || lightboxIndex <= 0) return;
    const newIndex = lightboxIndex - 1;
    setLightboxIndex(newIndex);
    setResolving(true);
    await resolveUrl(memories[newIndex]);
    setResolving(false);
    if (newIndex > 0) resolveUrl(memories[newIndex - 1]);
  }, [lightboxIndex, memories, resolvedUrls]);

  const goNext = useCallback(async () => {
    if (lightboxIndex === null || lightboxIndex >= memories.length - 1) return;
    const newIndex = lightboxIndex + 1;
    setLightboxIndex(newIndex);
    setResolving(true);
    await resolveUrl(memories[newIndex]);
    setResolving(false);
    if (newIndex < memories.length - 1) resolveUrl(memories[newIndex + 1]);
  }, [lightboxIndex, memories, resolvedUrls]);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, closeLightbox, goPrev, goNext]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const sas = await api.post<SASResponse>("/upload/sas", {
        filename: file.name,
        contentType: file.type,
        container: "media",
      });
      await fetch(sas.uploadUrl, {
        method: "PUT",
        headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": file.type },
        body: file,
      });
      const memory = await api.post<Memory>(`/trips/${tripId}/memories`, {
        type: file.type.startsWith("video") ? "video" : "photo",
        fileUrl: sas.blobName,
        caption: "",
        date: new Date().toISOString().split("T")[0],
      });
      setMemories((prev) => [memory, ...prev]);
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(memoryId: string) {
    if (!confirm("Delete this memory?")) return;
    try {
      await api.del(`/trips/${tripId}/memories/${memoryId}`);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      setResolvedUrls((prev) => { const n = { ...prev }; delete n[memoryId]; return n; });
      if (lightboxIndex !== null) closeLightbox();
    } catch {
      alert("Failed to delete memory");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const lightboxMemory = lightboxIndex !== null ? memories[lightboxIndex] : null;
  const lightboxUrl = lightboxMemory ? resolvedUrls[lightboxMemory.id] : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <TripPageHero section="memories" />
      <div className="mb-6 flex items-center justify-end">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading…" : "Upload"}
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {memories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-16 text-gray-400">
          <Upload className="mb-3 h-10 w-10" />
          <p>No memories yet. Upload your first photo!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {memories.map((m, index) => (
            <div key={m.id} className="group relative overflow-hidden rounded-lg border shadow-sm">
              {m.fileUrl ? (
                <button
                  onClick={() => openLightbox(index)}
                  className="block w-full p-0 focus:outline-none"
                  aria-label={m.caption || "Open image"}
                >
                  {m.type === "video" ? (
                    <div className="flex h-48 w-full items-center justify-center bg-gray-900">
                      <span className="text-4xl text-white/70">▶</span>
                    </div>
                  ) : (
                    <img
                      src={resolvedUrls[m.id] || m.thumbnailUrl || m.fileUrl}
                      alt={m.caption || "Memory"}
                      className="h-48 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  )}
                </button>
              ) : (
                <div className="flex h-48 items-center justify-center bg-gray-100 text-gray-400">No image</div>
              )}

              {/* Overlay on hover */}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                <p className="text-sm font-medium text-white">{m.caption || "Untitled"}</p>
                {m.location && (
                  <p className="flex items-center gap-1 text-xs text-white/80">
                    <MapPin className="h-3 w-3" /> {m.location}
                  </p>
                )}
                {m.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.tags.map((t) => (
                      <span key={t} className="flex items-center gap-0.5 rounded bg-white/20 px-1.5 py-0.5 text-[10px] text-white">
                        <Tag className="h-2.5 w-2.5" /> {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(m.id)}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600 z-10"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Photo counter badge */}
              <span className="absolute bottom-2 left-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                {index + 1} / {memories.length}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxMemory && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 z-10"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
            {lightboxIndex! + 1} / {memories.length}
          </div>

          {/* Prev arrow */}
          {lightboxIndex! > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/25 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
          )}

          {/* Media */}
          <div className="flex max-h-[85vh] max-w-[85vw] items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {resolving || !lightboxUrl ? (
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
            ) : lightboxMemory.type === "video" ? (
              <video src={lightboxUrl} controls autoPlay className="max-h-[85vh] max-w-[85vw] rounded" />
            ) : (
              <img
                src={lightboxUrl}
                alt={lightboxMemory.caption || "Memory"}
                className="max-h-[85vh] max-w-[85vw] rounded object-contain shadow-2xl"
              />
            )}
          </div>

          {/* Next arrow */}
          {lightboxIndex! < memories.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/25 transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          )}

          {/* Caption */}
          {lightboxMemory.caption && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-sm text-white">
              {lightboxMemory.caption}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

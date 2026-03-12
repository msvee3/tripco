"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Upload, X, MapPin, Tag } from "lucide-react";
import { api, setTokens } from "@/lib/api";
import type { Memory, SASResponse } from "@/lib/types";

export default function MemoriesPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: session, status } = useSession();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Memory | null>(null);

  useEffect(() => {
    // Wait for NextAuth to be fully authenticated before making API calls.
    if (status === "loading") return;
    
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }

    const s = session as any;
    if (s?.accessToken) setTokens(s.accessToken, s.refreshToken);

    (async () => {
      try {
        const data = await api.get<Memory[]>(`/trips/${tripId}/memories`);
        setMemories(data);
      } catch (err: any) {
        console.error("Failed to load memories:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [status, session, tripId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      // 1. Get SAS URL
      const sas = await api.post<SASResponse>("/upload/sas", {
        filename: file.name,
        contentType: file.type,
        container: "media",
      });

      // 2. Direct upload to Blob
      await fetch(sas.uploadUrl, {
        method: "PUT",
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": file.type,
        },
        body: file,
      });

      // 3. Create memory record
      // store the blob name (server expects blobName, not full URL)
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
    } catch {
      // ignore
    }
  }

  async function openMedia(m: Memory) {
    if (!m.fileUrl) {
      console.warn("No fileUrl to open");
      return;
    }
    // If it's already a full URL (SAS), open directly
    if (m.fileUrl.startsWith("http")) {
      setSelected(m);
      return;
    }
    try {
      console.log("Fetching read SAS for:", m.fileUrl);
      const res = await api.post<{ readUrl: string }>("/upload/read-sas", {
        container: "media",
        blobName: m.fileUrl,
      });
      console.log("Got read URL:", (res as any).readUrl);
      setSelected({ ...m, fileUrl: (res as any).readUrl });
    } catch (err: any) {
      console.error("Failed to open media:", err);
      alert(err.message || "Failed to generate file URL");
    }
  

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Memories</h1>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading…" : "Upload"}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {memories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-16 text-gray-400">
          <Upload className="mb-3 h-10 w-10" />
          <p>No memories yet. Upload your first photo!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {memories.map((m) => (
            <div
              key={m.id}
              className="group relative overflow-hidden rounded-lg border shadow-sm"
            >
              {m.fileUrl ? (
                m.type === "video" ? (
                  <div className="h-48 w-full">
                    <video
                      src={m.fileUrl}
                      className="h-48 w-full object-cover cursor-pointer"
                      controls={false}
                      onClick={() => openMedia(m)}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => openMedia(m)}
                    className="block w-full p-0"
                    aria-label={m.caption || "Open image"}
                  >
                    <img src={m.thumbnailUrl || m.fileUrl} alt={m.caption} className="h-48 w-full object-cover" />
                  </button>
                )
              ) : (
                <div className="flex h-48 items-center justify-center bg-gray-100 text-gray-400">
                  No image
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
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
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

        {/* Lightbox modal */}
        {selected && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setSelected(null)}
          >
            <div className="relative max-h-full max-w-[90%]" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSelected(null)}
                className="absolute right-0 top-0 m-2 rounded bg-black/60 p-2 text-white hover:bg-black/80"
                aria-label="Close"
              >
                ✕
              </button>

              {selected.type === "video" ? (
                <video src={selected.fileUrl ?? undefined} controls className="max-h-[80vh] w-auto" />
              ) : (
                <img src={selected.fileUrl ?? undefined} alt={selected.caption ?? ""} className="max-h-[80vh] w-auto object-contain" />
              )}

              {selected.caption && <p className="mt-2 text-center text-sm text-white">{selected.caption}</p>}
            </div>
          </div>
        )}
    </div>
  );
}

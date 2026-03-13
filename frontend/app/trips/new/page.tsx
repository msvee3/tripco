"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ImagePlus, X } from "lucide-react";
import { api, setTokens } from "@/lib/api";
import type { SASResponse } from "@/lib/types";

export default function NewTripPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [coverBlobName, setCoverBlobName] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  async function handleCoverPhoto(e: React.ChangeEvent<HTMLInputElement>) {
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
      setCoverBlobName(sas.blobName);
      setCoverPreview(URL.createObjectURL(file));
    } catch (err: any) {
      setError(err.message || "Cover photo upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const s = session as any;
    if (s?.accessToken) setTokens(s.accessToken, s.refreshToken);

    const form = new FormData(e.currentTarget);
    try {
      const trip = await api.post("/trips", {
        title: form.get("title"),
        destination: form.get("destination"),
        description: form.get("description"),
        startDate: form.get("startDate") || undefined,
        endDate: form.get("endDate") || undefined,
        coverPhoto: coverBlobName || undefined,
      });
      router.push(`/trips/${trip.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Create a New Trip</h1>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Cover Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cover Photo</label>
          {coverPreview ? (
            <div className="relative h-44 w-full overflow-hidden rounded-xl">
              <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => { setCoverBlobName(null); setCoverPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition hover:border-brand-400 hover:text-brand-500 disabled:opacity-50"
            >
              <ImagePlus className="h-8 w-8" />
              <span className="text-sm">{uploading ? "Uploading…" : "Click to upload a cover photo"}</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverPhoto} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Trip Name *</label>
          <input
            name="title"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Summer in Italy"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Destination</label>
          <input
            name="destination"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Rome, Italy"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="What's the trip about?"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              name="startDate"
              type="date"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              name="endDate"
              type="date"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full rounded-md bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create Trip"}
        </button>
      </form>
    </div>
  );
}

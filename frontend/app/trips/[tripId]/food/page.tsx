"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Star, MapPin } from "lucide-react";
import { api, setTokens } from "@/lib/api";
import type { FoodLog } from "@/lib/types";

export default function FoodPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: session } = useSession();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    
    const s = session as any;
    if (!s.accessToken) return;
    
    setTokens(s.accessToken, s.refreshToken);

    (async () => {
      try {
        const data = await api.get<FoodLog[]>(`/trips/${tripId}/food`);
        setLogs(data);
      } catch (err: any) {
        console.error("Failed to load food logs:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [session, tripId]);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const log = await api.post<FoodLog>(`/trips/${tripId}/food`, {
        name: form.get("name"),
        location: form.get("location") || "",
        rating: form.get("rating") ? parseFloat(form.get("rating") as string) : null,
        notes: form.get("notes") || "",
        date: form.get("date") || undefined,
      });
      setLogs((prev) => [log, ...prev]);
      setShowForm(false);
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Food Log</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Add Entry
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 rounded-xl border p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Restaurant / Dish</label>
              <input name="name" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input name="location" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Rating (0-5)</label>
              <input name="rating" type="number" min={0} max={5} step={0.5} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input name="date" type="date" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <input name="notes" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
          </div>
          <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Save
          </button>
        </form>
      )}

      {logs.length === 0 ? (
        <p className="py-8 text-center text-gray-400">No food entries yet.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border px-4 py-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{log.name}</p>
                  <div className="flex gap-3 text-xs text-gray-400">
                    {log.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {log.location}
                      </span>
                    )}
                    {log.date && <span>{log.date}</span>}
                  </div>
                  {log.notes && <p className="mt-1 text-sm text-gray-500">{log.notes}</p>}
                </div>
                {log.rating != null && (
                  <span className="flex items-center gap-1 text-sm font-medium text-amber-500">
                    <Star className="h-4 w-4 fill-current" /> {log.rating}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

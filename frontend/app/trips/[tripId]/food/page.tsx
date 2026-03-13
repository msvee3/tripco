"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Star, MapPin, Trash2, Pencil, Check, X } from "lucide-react";
import { api, setTokens } from "@/lib/api";
import type { FoodLog } from "@/lib/types";
import { TripPageHero } from "@/components/TripPageHero";
import { Toast } from "@/components/Toast";

interface TripDateRange {
  min: string;
  max: string;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function FoodPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: session, status } = useSession();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [dateRange, setDateRange] = useState<TripDateRange | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FoodLog>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }

    const s = session as any;
    if (s?.accessToken) {
      setTokens(s.accessToken, s.refreshToken);
    } else {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const [data, trip] = await Promise.all([
          api.get<FoodLog[]>(`/trips/${tripId}/food`),
          api.get<any>(`/trips/${tripId}`),
        ]);
        setLogs(data);
        if (trip.startDate && trip.endDate) {
          setDateRange({
            min: addDays(trip.startDate, -5),
            max: addDays(trip.endDate, 5),
          });
        }
      } catch (err: any) {
        console.error("[Food] Failed to load:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [status, session, tripId]);

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
      (e.target as HTMLFormElement).reset();
      setToast({ message: "Food log added!", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to add", type: "error" });
    }
  }

  function startEdit(log: FoodLog) {
    setEditingId(log.id);
    setEditForm({
      name: log.name,
      location: log.location,
      rating: log.rating ?? undefined,
      notes: log.notes,
      date: log.date ?? undefined,
    });
  }

  async function handleSaveEdit(logId: string) {
    try {
      const updated = await api.patch<FoodLog>(`/trips/${tripId}/food/${logId}`, {
        name: editForm.name,
        location: editForm.location || "",
        rating: editForm.rating ?? null,
        notes: editForm.notes || "",
        date: editForm.date || undefined,
      });
      setLogs((prev) => prev.map((l) => (l.id === logId ? updated : l)));
      setEditingId(null);
      setToast({ message: "Food log updated!", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to save changes", type: "error" });
    }
  }

  async function handleDelete(logId: string) {
    if (!confirm("Delete this food log?")) return;
    try {
      await api.del(`/trips/${tripId}/food/${logId}`);
      setLogs((prev) => prev.filter((log) => log.id !== logId));
      setToast({ message: "Food log deleted!", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to delete food log", type: "error" });
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
      <TripPageHero section="food" />
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={() => setToast(null)} />
      <div className="mb-6 flex items-center justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Add Entry
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 rounded-xl border p-5 space-y-4 bg-gray-50">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Restaurant / Dish *</label>
              <input name="name" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input name="location" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Rating (0–5)</label>
              <input name="rating" type="number" min={0} max={5} step={0.5} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                name="date"
                type="date"
                min={dateRange?.min}
                max={dateRange?.max}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <input name="notes" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Save
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </form>
      )}

      {logs.length === 0 ? (
        <p className="py-8 text-center text-gray-400">No food entries yet.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) =>
            editingId === log.id ? (
              /* Inline edit form */
              <div key={log.id} className="rounded-lg border border-brand-300 bg-brand-50 px-4 py-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Restaurant / Dish *</label>
                    <input
                      value={editForm.name ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Location</label>
                    <input
                      value={editForm.location ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Rating (0–5)</label>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      step={0.5}
                      value={editForm.rating ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, rating: e.target.value ? parseFloat(e.target.value) : undefined }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Date</label>
                    <input
                      type="date"
                      value={editForm.date ?? ""}
                      min={dateRange?.min}
                      max={dateRange?.max}
                      onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Notes</label>
                    <input
                      value={editForm.notes ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(log.id)}
                    className="flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                  >
                    <Check className="h-3.5 w-3.5" /> Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Read-only row */
              <div key={log.id} className="group rounded-lg border px-4 py-3 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
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
                  <div className="flex items-center gap-2">
                    {log.rating != null && (
                      <span className="flex items-center gap-1 text-sm font-medium text-amber-500 whitespace-nowrap">
                        <Star className="h-4 w-4 fill-current" /> {log.rating}
                      </span>
                    )}
                    <button
                      onClick={() => startEdit(log)}
                      className="rounded px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, CheckCircle2, Circle, MapPin, Clock, Pencil, Trash2, Check, X } from "lucide-react";
import { api, setTokens } from "@/lib/api";
import type { ItineraryItem } from "@/lib/types";
import { Toast } from "@/components/Toast";

interface EditForm {
  day: string;
  title: string;
  time: string;
  location: string;
  notes: string;
}

export default function ItineraryPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: session } = useSession();
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ day: "", title: "", time: "", location: "", notes: "" });

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (session) {
      const s = session as any;
      if (s.accessToken) setTokens(s.accessToken, s.refreshToken);
      loadItems();
    }
  }, [session, tripId]);

  async function loadItems() {
    try {
      const data = await api.get<ItineraryItem[]>(`/trips/${tripId}/itinerary`);
      setItems(data);
    } catch { /* offline */ } finally { setLoading(false); }
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const item = await api.post<ItineraryItem>(`/trips/${tripId}/itinerary`, {
        day: parseInt(form.get("day") as string),
        title: form.get("title"),
        time: form.get("time") || undefined,
        location: form.get("location") || "",
        notes: form.get("notes") || "",
      });
      setItems((prev) => [...prev, item].sort((a, b) => a.day - b.day));
      setShowForm(false);
      (e.target as HTMLFormElement).reset();
      showToast("Item added!");
    } catch (err: any) { showToast(err.message || "Failed to add", "error"); }
  }

  function startEdit(it: ItineraryItem) {
    setEditingId(it.id);
    setEditForm({ day: String(it.day), title: it.title, time: it.time || "", location: it.location || "", notes: it.notes || "" });
  }

  async function handleSaveEdit(itemId: string) {
    try {
      const updated = await api.put<ItineraryItem>(`/trips/${tripId}/itinerary/${itemId}`, {
        day: parseInt(editForm.day),
        title: editForm.title,
        time: editForm.time || undefined,
        location: editForm.location,
        notes: editForm.notes,
      });
      setItems((prev) => [...prev.map((i) => (i.id === itemId ? updated : i))].sort((a, b) => a.day - b.day));
      setEditingId(null);
      showToast("Item updated!");
    } catch (err: any) { showToast(err.message || "Failed to update", "error"); }
  }

  async function handleDelete(itemId: string) {
    if (!confirm("Delete this itinerary item?")) return;
    try {
      await api.del(`/trips/${tripId}/itinerary/${itemId}`);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      showToast("Item deleted!");
    } catch (err: any) { showToast(err.message || "Failed to delete", "error"); }
  }

  const byDay = items.reduce<Record<number, ItineraryItem[]>>((acc, it) => {
    (acc[it.day] ??= []).push(it);
    return acc;
  }, {});

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={() => setToast(null)} />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Itinerary</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 rounded-xl border bg-gray-50 p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Day #</label>
              <input name="day" type="number" min={1} required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input name="title" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Time</label>
              <input name="time" type="time" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input name="location" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <input name="notes" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {Object.keys(byDay).length === 0 ? (
        <p className="py-8 text-center text-gray-400">No itinerary items yet.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(byDay)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([day, dayItems]) => (
              <div key={day}>
                <h2 className="mb-3 text-lg font-semibold text-brand-700">Day {day}</h2>
                <div className="space-y-2">
                  {dayItems.map((it) =>
                    editingId === it.id ? (
                      /* Inline edit */
                      <div key={it.id} className="rounded-lg border border-brand-300 bg-brand-50 px-4 py-4 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Day #</label>
                            <input type="number" min={1} value={editForm.day} onChange={(e) => setEditForm((f) => ({ ...f, day: e.target.value }))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Title</label>
                            <input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Time</label>
                            <input type="time" value={editForm.time} onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Location</label>
                            <input value={editForm.location} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Notes</label>
                            <input value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(it.id)} className="flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">
                            <Check className="h-3.5 w-3.5" /> Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
                            <X className="h-3.5 w-3.5" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Read-only row */
                      <div key={it.id} className="group flex items-start gap-3 rounded-lg border px-4 py-3 hover:bg-gray-50">
                        {it.isVisited ? (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                        ) : (
                          <Circle className="mt-0.5 h-5 w-5 shrink-0 text-gray-300" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{it.title}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                            {it.time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {it.time}</span>}
                            {it.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {it.location}</span>}
                          </div>
                          {it.notes && <p className="mt-1 text-sm text-gray-500">{it.notes}</p>}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 shrink-0">
                          <button onClick={() => startEdit(it)} className="rounded p-1.5 text-brand-600 hover:bg-brand-50" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(it.id)} className="rounded p-1.5 text-red-500 hover:bg-red-50" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}


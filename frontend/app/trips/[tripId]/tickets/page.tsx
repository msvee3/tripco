"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, FileText, Plane, Building2, CalendarDays } from "lucide-react";
import { api, setTokens } from "@/lib/api";
import type { Ticket } from "@/lib/types";

const typeIcons: Record<string, React.ReactNode> = {
  flight: <Plane className="h-5 w-5 text-blue-500" />,
  hotel: <Building2 className="h-5 w-5 text-purple-500" />,
  event: <CalendarDays className="h-5 w-5 text-orange-500" />,
};

export default function TicketsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (session) {
      const s = session as any;
      if (s.accessToken) setTokens(s.accessToken, s.refreshToken);
      loadTickets();
    }
  }, [session, tripId]);

  async function loadTickets() {
    try {
      const data = await api.get<Ticket[]>(`/trips/${tripId}/tickets`);
      setTickets(data);
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const ticket = await api.post<Ticket>(`/trips/${tripId}/tickets`, {
        type: form.get("type"),
        title: form.get("title"),
        date: form.get("date") || undefined,
        notes: form.get("notes") || "",
      });
      setTickets((prev) => [...prev, ticket]);
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
        <h1 className="text-2xl font-bold">Tickets</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Add Ticket
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 rounded-xl border p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select name="type" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2">
                <option value="flight">Flight</option>
                <option value="hotel">Hotel</option>
                <option value="event">Event</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input name="title" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input name="date" type="date" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <input name="notes" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Save
          </button>
        </form>
      )}

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-16 text-gray-400">
          <FileText className="mb-3 h-10 w-10" />
          <p>No tickets uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <div key={t.id} className="flex items-center gap-4 rounded-lg border px-4 py-3">
              {typeIcons[t.type] || <FileText className="h-5 w-5 text-gray-400" />}
              <div className="flex-1">
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-gray-400 capitalize">{t.type} · {t.date || "—"}</p>
                {t.notes && <p className="mt-0.5 text-sm text-gray-500">{t.notes}</p>}
              </div>
              {t.fileUrl && (
                <a href={t.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline">
                  View
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, FileText, Plane, Building2, CalendarDays, Edit2, Trash2 } from "lucide-react";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: "flight",
    title: "",
    date: "",
    notes: "",
  });

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
    try {
      const ticketData = {
        type: formData.type,
        title: formData.title,
        date: formData.date || undefined,
        notes: formData.notes || "",
      };

      if (editingId) {
        await api.put(`/trips/${tripId}/tickets/${editingId}`, ticketData);
        const updatedTickets = await api.get<Ticket[]>(`/trips/${tripId}/tickets`);
        setTickets(updatedTickets);
        setEditingId(null);
      } else {
        const ticket = await api.post<Ticket>(`/trips/${tripId}/tickets`, ticketData);
        setTickets((prev) => [...prev, ticket]);
      }
      setShowForm(false);
      setFormData({ type: "flight", title: "", date: "", notes: "" });
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this ticket?")) return;
    try {
      await api.delete(`/trips/${tripId}/tickets/${id}`);
      setTickets((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  function handleEdit(ticket: Ticket) {
    setEditingId(ticket.id);
    setFormData({
      type: ticket.type,
      title: ticket.title,
      date: ticket.date || "",
      notes: ticket.notes || "",
    });
    setShowForm(true);
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
          onClick={() => {
            setEditingId(null);
            setFormData({ type: "flight", title: "", date: "", notes: "" });
            setShowForm(!showForm);
          }}
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
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="flight">Flight</option>
                <option value="hotel">Hotel</option>
                <option value="event">Event</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              {editingId ? "Update" : "Save"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setShowForm(false);
                  setFormData({ type: "flight", title: "", date: "", notes: "" });
                }}
                className="rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-400"
              >
                Cancel
              </button>
            )}
          </div>
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
            <div key={t.id} className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center gap-4 flex-1">
                {typeIcons[t.type] || <FileText className="h-5 w-5 text-gray-400" />}
                <div className="flex-1">
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs text-gray-400 capitalize">{t.type} · {t.date || "—"}</p>
                  {t.notes && <p className="mt-0.5 text-sm text-gray-500">{t.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {t.fileUrl && (
                  <a href={t.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline">
                    View
                  </a>
                )}
                <button
                  onClick={() => handleEdit(t)}
                  className="p-2 text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                  aria-label="Edit ticket"
                  title="Edit"
                >
                  <Edit2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  aria-label="Delete ticket"
                  title="Delete"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

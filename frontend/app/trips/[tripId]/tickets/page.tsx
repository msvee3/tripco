"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, FileText, Plane, Building2, CalendarDays, Upload, X } from "lucide-react";
import { api, setTokens } from "@/lib/api";
import type { Ticket, SASResponse } from "@/lib/types";

const typeIcons: Record<string, React.ReactNode> = {
  flight: <Plane className="h-5 w-5 text-blue-500" />,
  hotel: <Building2 className="h-5 w-5 text-purple-500" />,
  event: <CalendarDays className="h-5 w-5 text-orange-500" />,
};

export default function TicketsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: session } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: "flight",
    title: "",
    date: "",
    notes: "",
    fileUrl: "",
  });

  useEffect(() => {
    if (session) {
      const s = session as any;
      if (s.accessToken) setTokens(s.accessToken, s.refreshToken);
      loadTickets();
    }
  }, [session, tripId]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      // 1. Get SAS URL
      const sas = await api.post<SASResponse>("/upload/sas", {
        filename: file.name,
        contentType: file.type,
        container: "tickets",
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

      // 3. Store blob name (not full URL)
      setFormData((prev) => ({ ...prev, fileUrl: sas.blobName }));
    } catch (err: any) {
      alert(err.message || "File upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

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
        fileUrl: formData.fileUrl || undefined,
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
      setFormData({ type: "flight", title: "", date: "", notes: "", fileUrl: "" });
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this ticket?")) return;
    try {
      await api.del(`/trips/${tripId}/tickets/${id}`);
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
      fileUrl: ticket.fileUrl || "",
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
            setFormData({ type: "flight", title: "", date: "", notes: "", fileUrl: "" });
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attachment</label>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : "Choose File"}
              </button>
              {formData.fileUrl && (
                <div className="flex items-center gap-2 flex-1">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-700 truncate">{formData.fileUrl.split("/").pop()}</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, fileUrl: "" })}
                    className="ml-auto text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
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
                  setFormData({ type: "flight", title: "", date: "", notes: "", fileUrl: "" });
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
        <div className="space-y-4">
          {tickets.map((t) => (
            <div key={t.id} className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="md:col-span-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      {typeIcons[t.type] || <FileText className="h-5 w-5 text-gray-400" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-lg">{t.title}</h3>
                      <p className="text-sm text-gray-600">{t.type} • {t.date || "No date"}</p>
                      {t.notes && <p className="text-sm text-gray-600 mt-1">{t.notes}</p>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
                  {t.fileUrl && (
                    <a
                      href={t.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                    >
                      View File
                    </a>
                  )}
                  <button
                    onClick={() => handleEdit(t)}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 font-medium"
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200 font-medium"
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

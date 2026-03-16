"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Download, Pencil, Trash2, Check, X } from "lucide-react";
import { api, setTokens, getAccessToken } from "@/lib/api";
import type { Expense, ExpenseSummary, TripMember } from "@/lib/types";
import { TripPageHero } from "@/components/TripPageHero";
import { Toast } from "@/components/Toast";

const CATEGORIES = ["food", "transport", "accommodation", "sightseeing", "shopping", "misc"] as const;

interface EditForm {
  category: string;
  amount: string;
  currency: string;
  description: string;
  date: string;
}

export default function ExpensesPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: session, status } = useSession();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [memberMap, setMemberMap] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ category: "food", amount: "", currency: "INR", description: "", date: "" });

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") { setLoading(false); return; }
    const s = session as any;
    if (s?.accessToken) setTokens(s.accessToken, s.refreshToken);
    loadData();
  }, [status, session, tripId]);

  async function loadData() {
    try {
      const [e, s, members] = await Promise.all([
        api.get<Expense[]>(`/trips/${tripId}/expenses`),
        api.get<ExpenseSummary>(`/trips/${tripId}/expenses/summary`),
        api.get<TripMember[]>(`/trips/${tripId}/members`),
      ]);
      const unique = Array.from(new Map(e.map((exp) => [exp.id, exp])).values());
      setExpenses(unique);
      setSummary(s);
      const map: Record<string, string> = {};
      for (const m of members) {
        map[m.userId] = m.name || m.email || m.userId;
      }
      setMemberMap(map);
    } catch { /* offline */ } finally { setLoading(false); }
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const userId = (session as any)?.user?.id || "";
    try {
      const expense = await api.post<Expense>(`/trips/${tripId}/expenses`, {
        category: form.get("category"),
        amount: parseFloat(form.get("amount") as string),
        currency: form.get("currency") || "INR",
        description: form.get("description"),
        paidBy: userId,
        date: form.get("date") || undefined,
      });
      setExpenses((prev) => [expense, ...prev]);
      setShowForm(false);
      (e.target as HTMLFormElement).reset();
      setToast({ message: "Expense added!", type: "success" });
      loadData();
    } catch (err: any) { setToast({ message: err.message || "Failed to add", type: "error" }); }
  }

  function startEdit(exp: Expense) {
    setEditingId(exp.id);
    setEditForm({
      category: exp.category,
      amount: String(exp.amount),
      currency: exp.currency,
      description: exp.description || "",
      date: exp.date || "",
    });
  }

  async function handleSaveEdit(expenseId: string) {
    try {
      const updated = await api.patch<Expense>(`/trips/${tripId}/expenses/${expenseId}`, {
        category: editForm.category,
        amount: parseFloat(editForm.amount),
        currency: editForm.currency,
        description: editForm.description,
        date: editForm.date || undefined,
      });
      setExpenses((prev) => prev.map((e) => (e.id === expenseId ? updated : e)));
      setEditingId(null);
      setToast({ message: "Expense updated!", type: "success" });
      loadData(); // refresh summary
    } catch (err: any) { setToast({ message: err.message || "Failed to update", type: "error" }); }
  }

  async function handleDelete(expenseId: string) {
    if (!confirm("Delete this expense?")) return;
    try {
      await api.del(`/trips/${tripId}/expenses/${expenseId}`);
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      setToast({ message: "Expense deleted!", type: "success" });
      loadData();
    } catch (err: any) { setToast({ message: err.message || "Failed to delete", type: "error" }); }
  }

  async function handleExport() {
    try {
      const token = getAccessToken();
      if (!token) { alert("Not authenticated. Please refresh."); return; }
      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/trips/${tripId}/expenses/export`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) { const b = await response.json().catch(() => ({})); throw new Error(b.detail || `HTTP ${response.status}`); }
      const blob = await response.blob();
      const dl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = dl; link.download = `expenses_${tripId}.csv`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      window.URL.revokeObjectURL(dl);
    } catch (err: any) { setToast({ message: err.message || "Export failed", type: "error" }); }
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <TripPageHero section="expenses" />
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={() => setToast(null)} />

      <div className="mb-6 flex items-center justify-end">
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold">₹{summary.totalBase.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-sm text-gray-500">By Category</p>
            <div className="mt-1 space-y-1 text-sm">
              {Object.entries(summary.byCategory).map(([cat, amt]) => (
                <div key={cat} className="flex justify-between"><span className="capitalize">{cat}</span><span className="font-medium">₹{amt.toFixed(2)}</span></div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-sm text-gray-500">By Person</p>
            <div className="mt-1 space-y-1 text-sm">
              {Object.entries(summary.byPerson).map(([pid, amt]) => (
                <div key={pid} className="flex justify-between"><span className="truncate">{memberMap[pid] ?? pid.slice(0, 8) + "…"}</span><span className="font-medium">₹{amt.toFixed(2)}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 rounded-xl border bg-gray-50 p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select name="category" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input name="amount" type="number" step="0.01" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Currency</label>
              <input name="currency" defaultValue="INR" maxLength={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input name="description" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input name="date" type="date" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Save Expense</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-2">
        {expenses.length === 0 ? (
          <p className="py-8 text-center text-gray-400">No expenses recorded yet.</p>
        ) : (
          expenses.map((exp) =>
            editingId === exp.id ? (
              /* Inline edit row */
              <div key={exp.id} className="rounded-lg border border-brand-300 bg-brand-50 px-4 py-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Category</label>
                    <select value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Amount</label>
                    <input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Currency</label>
                    <input maxLength={3} value={editForm.currency} onChange={(e) => setEditForm((f) => ({ ...f, currency: e.target.value }))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Description</label>
                    <input value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Date</label>
                    <input type="date" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSaveEdit(exp.id)} className="flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">
                    <Check className="h-3.5 w-3.5" /> Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Read-only row */
              <div key={exp.id} className="group flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-gray-50">
                <div className="flex-1">
                  <p className="text-sm font-medium">{exp.description || exp.category}</p>
                  <p className="text-xs text-gray-400 capitalize">{exp.category} · {exp.date || "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold whitespace-nowrap">{exp.currency} {exp.amount.toFixed(2)}</p>
                  <button onClick={() => startEdit(exp)} className="text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-brand-700" title="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(exp.id)} className="text-red-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-700" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Download } from "lucide-react";
import { api, setTokens } from "@/lib/api";
import type { Expense, ExpenseSummary } from "@/lib/types";

const CATEGORIES = ["food", "transport", "accommodation", "sightseeing", "shopping", "misc"] as const;

export default function ExpensesPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: session, status } = useSession();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    
    // Always set tokens from NextAuth session before API calls
    const s = session as any;
    if (s?.accessToken) {
      setTokens(s.accessToken, s.refreshToken);
      console.log("[Expenses] Tokens set from NextAuth session");
    } else {
      console.warn("[Expenses] No accessToken in NextAuth session");
    }
    
    loadData();
  }, [status, session, tripId]);

  async function loadData() {
    try {
      const [e, s] = await Promise.all([
        api.get<Expense[]>(`/trips/${tripId}/expenses`),
        api.get<ExpenseSummary>(`/trips/${tripId}/expenses/summary`),
      ]);
      setExpenses(e);
      setSummary(s);
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const userId = (session as any)?.user?.id || "";
    try {
      const expense = await api.post<Expense>(`/trips/${tripId}/expenses`, {
        category: form.get("category"),
        amount: parseFloat(form.get("amount") as string),
        currency: form.get("currency") || "USD",
        description: form.get("description"),
        paidBy: userId,
        date: form.get("date") || undefined,
      });
      setExpenses((prev) => [expense, ...prev]);
      setShowForm(false);
      loadData(); // refresh summary
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete(expenseId: string) {
    if (!confirm("Delete this expense?")) return;
    try {
      await api.del(`/trips/${tripId}/expenses/${expenseId}`);
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      loadData(); // refresh summary
    } catch (err: any) {
      alert(err.message || "Failed to delete expense");
    }
  }

  function handleExport() {
    const s = session as any;
    const token = s?.accessToken;
    const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/trips/${tripId}/expenses/export`;
    // Open in new tab with token
    window.open(url, "_blank");
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold">${summary.totalBase.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-sm text-gray-500">By Category</p>
            <div className="mt-1 space-y-1 text-sm">
              {Object.entries(summary.byCategory).map(([cat, amt]) => (
                <div key={cat} className="flex justify-between">
                  <span className="capitalize">{cat}</span>
                  <span className="font-medium">${amt.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-sm text-gray-500">By Person</p>
            <div className="mt-1 space-y-1 text-sm">
              {Object.entries(summary.byPerson).map(([pid, amt]) => (
                <div key={pid} className="flex justify-between">
                  <span className="truncate">{pid.slice(0, 8)}…</span>
                  <span className="font-medium">${amt.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 rounded-xl border p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select name="category" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input name="amount" type="number" step="0.01" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Currency</label>
              <input name="currency" defaultValue="USD" maxLength={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
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
          <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Save Expense
          </button>
        </form>
      )}

      {/* Expense list */}
      <div className="space-y-2">
        {expenses.length === 0 ? (
          <p className="py-8 text-center text-gray-400">No expenses recorded yet.</p>
        ) : (
          expenses.map((exp) => (
            <div key={exp.id} className="group flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-gray-50">
              <div className="flex-1">
                <p className="text-sm font-medium">{exp.description || exp.category}</p>
                <p className="text-xs text-gray-400 capitalize">{exp.category} · {exp.date || "—"}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold whitespace-nowrap">
                  {exp.currency} {exp.amount.toFixed(2)}
                </p>
                <button
                  onClick={() => handleDelete(exp.id)}
                  className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

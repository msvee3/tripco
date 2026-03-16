"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { User, Mail, Lock, Trash2, Eye, EyeOff, Download, Shield } from "lucide-react";
import { api, setTokens, getAccessToken } from "@/lib/api";
import { Toast } from "@/components/Toast";
import Link from "next/link";

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  if (!user) {
    return <div className="p-8 text-center text-gray-500">Please log in to view your profile.</div>;
  }

  // Ensure tokens are set
  const s = session as any;
  if (s?.accessToken) setTokens(s.accessToken, s.refreshToken);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setToast({ message: "New passwords do not match", type: "error" });
      return;
    }
    if (newPassword.length < 8) {
      setToast({ message: "Password must be at least 8 characters", type: "error" });
      return;
    }
    setChangingPassword(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setToast({ message: "Password changed successfully!", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setToast({ message: err.message || "Failed to change password", type: "error" });
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirm("Are you sure you want to delete your account? All your trips, memories, and data will be permanently deleted. This cannot be undone.")) return;
    if (!confirm("This is your final warning. Press OK to permanently delete your account.")) return;
    try {
      await api.del("/auth/account");
      signOut({ callbackUrl: "/" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to delete account", type: "error" });
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={() => setToast(null)} />
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>

      <div className="flex flex-col items-center gap-4 rounded-xl border p-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-2xl font-bold">
          {user.image ? (
            <img src={user.image} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            (user.name?.charAt(0) ?? "?").toUpperCase()
          )}
        </div>

        <div className="text-center">
          <h2 className="text-lg font-semibold">{user.name}</h2>
        </div>

        <div className="w-full space-y-3 pt-4">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Mail className="h-4 w-4 text-gray-400" />
            {user.email}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <User className="h-4 w-4 text-gray-400" />
            ID: {(session as any)?.user?.id?.slice(0, 8) ?? "—"}…
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="mt-8 rounded-xl border p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Lock className="h-5 w-5 text-gray-500" />
          Change Password
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Current Password</label>
            <div className="relative mt-1">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <div className="relative mt-1">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={changingPassword}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {changingPassword ? "Changing…" : "Change Password"}
          </button>
        </form>
      </div>

      {/* GDPR: Export Data */}
      <div className="mt-8 rounded-xl border p-6">
        <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
          <Shield className="h-5 w-5 text-gray-500" />
          Your Data (GDPR)
        </h3>
        <p className="mb-4 text-sm text-gray-500">
          Download a copy of all your personal data in JSON format, or{" "}
          <Link href="/privacy" className="text-brand-600 underline hover:text-brand-700">read our Privacy Policy</Link>.
        </p>
        <button
          onClick={async () => {
            try {
              const token = getAccessToken();
              if (!token) { setToast({ message: "Not authenticated", type: "error" }); return; }
              const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/export`;
              const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
              if (!res.ok) throw new Error(`Export failed (${res.status})`);
              const blob = await res.blob();
              const dl = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = dl; a.download = "tripco_data_export.json";
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              window.URL.revokeObjectURL(dl);
              setToast({ message: "Data exported!", type: "success" });
            } catch (err: any) {
              setToast({ message: err.message || "Export failed", type: "error" });
            }
          }}
          className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Download className="h-4 w-4" /> Export My Data
        </button>
      </div>

      {/* Delete Account (GDPR) */}
      <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6">
        <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-red-700">
          <Trash2 className="h-5 w-5" />
          Delete Account
        </h3>
        <p className="mb-4 text-sm text-red-600">
          Permanently delete your account and all associated data (trips, memories, expenses). This action cannot be undone.
        </p>
        <button
          onClick={handleDeleteAccount}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Delete My Account
        </button>
      </div>
    </div>
  );
}

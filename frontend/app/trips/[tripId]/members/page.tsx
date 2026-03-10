"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { UserPlus, Shield, Eye, Edit3 } from "lucide-react";
import { api, setTokens } from "@/lib/api";
import type { TripMember } from "@/lib/types";

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Shield className="h-4 w-4 text-amber-500" />,
  editor: <Edit3 className="h-4 w-4 text-blue-500" />,
  viewer: <Eye className="h-4 w-4 text-gray-400" />,
};

export default function MembersPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: session } = useSession();
  const [members, setMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (session) {
      const s = session as any;
      if (s.accessToken) setTokens(s.accessToken, s.refreshToken);
      loadMembers();
    }
  }, [session, tripId]);

  async function loadMembers() {
    try {
      const data = await api.get<TripMember[]>(`/trips/${tripId}/members`);
      setMembers(data);
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      await api.post(`/trips/${tripId}/members/invite`, { email, role });
      setEmail("");
      loadMembers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setInviting(false);
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
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Members</h1>

      {/* Invite form */}
      <form onSubmit={handleInvite} className="mb-6 flex flex-col gap-3 rounded-xl border p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={inviting}
          className="flex items-center gap-1 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          {inviting ? "Inviting…" : "Invite"}
        </button>
      </form>

      {/* Member list */}
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.userId} className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-sm">
              {m.avatar ? (
                <img src={m.avatar} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                m.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{m.name}</p>
              <p className="text-xs text-gray-400">{m.email}</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-600">
              {roleIcons[m.role]} {m.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

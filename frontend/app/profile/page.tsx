"use client";

import { useSession } from "next-auth/react";
import { User, Mail, Calendar } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) {
    return <div className="p-8 text-center text-gray-500">Please log in to view your profile.</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
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
    </div>
  );
}

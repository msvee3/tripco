"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, MapPin, Calendar, Users, Image, IndianRupee } from "lucide-react";
import type { TripSummary } from "@/lib/types";
import { api, setTokens } from "@/lib/api";
import { TripCard } from "@/components/TripCard";
import { Toast } from "@/components/Toast";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      const s = session as any;
      if (s.accessToken) setTokens(s.accessToken, s.refreshToken);
      loadTrips();
    }
  }, [session]);

  async function loadTrips() {
    try {
      const data = await api.get<TripSummary[]>("/trips");
      setTrips(data);
    } catch {
      // Offline: try IndexedDB later
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTrip(tripId: string) {
    if (!confirm("Are you sure you want to delete this trip? This cannot be undone.")) return;
    try {
      await api.del(`/trips/${tripId}`);
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      setToast({ message: "Trip deleted successfully", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to delete trip", type: "error" });
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={() => setToast(null)} />
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Trips</h1>
          <p className="text-sm text-gray-500">{trips.length} trip{trips.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/trips/new"
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          New Trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-16">
          <MapPin className="mb-4 h-12 w-12 text-gray-300" />
          <p className="mb-2 text-lg font-medium text-gray-500">No trips yet</p>
          <p className="mb-6 text-sm text-gray-400">Create your first trip to get started</p>
          <Link
            href="/trips/new"
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Create Trip
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onDelete={handleDeleteTrip} />
          ))}
        </div>
      )}
    </div>
  );
}

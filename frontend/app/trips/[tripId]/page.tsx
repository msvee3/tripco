"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Camera,
  IndianRupee,
  CalendarDays,
  Utensils,
  Ticket,
  Users,
  MapPin,
} from "lucide-react";
import { api, setTokens } from "@/lib/api";
import type { TripDetail } from "@/lib/types";
import clsx from "clsx";

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  ongoing: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
};

export default function TripDashboardPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: session } = useSession();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      const s = session as any;
      if (s.accessToken) setTokens(s.accessToken, s.refreshToken);
      api
        .get<TripDetail>(`/trips/${tripId}`)
        .then(setTrip)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [session, tripId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!trip) {
    return <div className="p-8 text-center text-gray-500">Trip not found.</div>;
  }

  const navItems = [
    {
      href: `/trips/${tripId}/memories`,
      icon: Camera,
      label: "Memories",
      count: trip.memoryCount,
      photo: "https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?auto=format&fit=crop&w=600&q=70",
      accent: "from-purple-900/70 via-purple-700/20 to-transparent",
    },
    {
      href: `/trips/${tripId}/expenses`,
      icon: IndianRupee,
      label: "Expenses",
      count: `₹${trip.totalExpenses.toFixed(0)}`,
      photo: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=70",
      accent: "from-emerald-900/70 via-emerald-700/20 to-transparent",
    },
    {
      href: `/trips/${tripId}/itinerary`,
      icon: CalendarDays,
      label: "Itinerary",
      count: undefined,
      photo: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=70",
      accent: "from-sky-900/70 via-sky-700/20 to-transparent",
    },
    {
      href: `/trips/${tripId}/food`,
      icon: Utensils,
      label: "Food Log",
      count: undefined,
      photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=70",
      accent: "from-orange-900/70 via-orange-700/20 to-transparent",
    },
    {
      href: `/trips/${tripId}/tickets`,
      icon: Ticket,
      label: "Tickets",
      count: undefined,
      photo: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=70",
      accent: "from-blue-900/70 via-blue-700/20 to-transparent",
    },
    {
      href: `/trips/${tripId}/members`,
      icon: Users,
      label: "Members",
      count: trip.memberCount,
      photo: "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=600&q=70",
      accent: "from-rose-900/70 via-rose-700/20 to-transparent",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="relative mb-8 overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-white shadow-lg">
        {trip.coverPhoto && (
          <img
            src={trip.coverPhoto}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {/* scrim so text always readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        <div className="relative z-10">
          <span
            className={clsx(
              "mb-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
              statusColors[trip.status]
            )}
          >
            {trip.status}
          </span>
          <h1 className="text-3xl font-extrabold">{trip.title}</h1>
          {trip.destination && (
            <p className="mt-1 flex items-center gap-1 text-brand-100">
              <MapPin className="h-4 w-4" />
              {trip.destination}
            </p>
          )}
          {trip.description && <p className="mt-3 text-sm text-brand-100">{trip.description}</p>}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-brand-200">
            {trip.startDate && <span>From: {trip.startDate}</span>}
            {trip.endDate && <span>To: {trip.endDate}</span>}
          </div>
        </div>
      </div>

      {/* Quick Nav Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group relative h-36 overflow-hidden rounded-xl shadow-sm transition-all hover:shadow-lg hover:scale-[1.02]"
          >
            {/* Background photo */}
            <img
              src={item.photo}
              alt={item.label}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Left-to-right accent scrim + bottom dark scrim */}
            <div className={`absolute inset-0 bg-gradient-to-r ${item.accent}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <item.icon className="h-4 w-4 text-white" />
                </div>
                <p className="font-bold text-white drop-shadow">{item.label}</p>
              </div>
              {item.count !== undefined && (
                <p className="mt-0.5 pl-10 text-sm font-medium text-white/80">{item.count}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

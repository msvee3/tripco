"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Camera,
  DollarSign,
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
    { href: `/trips/${tripId}/memories`, icon: Camera, label: "Memories", count: trip.memoryCount },
    { href: `/trips/${tripId}/expenses`, icon: DollarSign, label: "Expenses", count: `$${trip.totalExpenses.toFixed(0)}` },
    { href: `/trips/${tripId}/itinerary`, icon: CalendarDays, label: "Itinerary" },
    { href: `/trips/${tripId}/food`, icon: Utensils, label: "Food Log" },
    { href: `/trips/${tripId}/tickets`, icon: Ticket, label: "Tickets" },
    { href: `/trips/${tripId}/members`, icon: Users, label: "Members", count: trip.memberCount },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="relative mb-8 overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-white shadow-lg">
        {trip.coverPhoto && (
          <img
            src={trip.coverPhoto}
            alt=""
            className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-30"
          />
        )}
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
            className="group flex items-center gap-4 rounded-xl border p-5 transition-colors hover:border-brand-300 hover:bg-brand-50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 text-brand-600 group-hover:bg-brand-200">
              <item.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{item.label}</p>
              {item.count !== undefined && (
                <p className="text-sm text-gray-500">{item.count}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

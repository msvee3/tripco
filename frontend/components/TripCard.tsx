"use client";

import Link from "next/link";
import { Calendar, Users, Image, DollarSign } from "lucide-react";
import clsx from "clsx";
import type { TripSummary } from "@/lib/types";

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  ongoing: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
};

// Unique gradient palette — one per card, chosen deterministically by trip id
const GRADIENTS = [
  "from-violet-500 to-purple-700",
  "from-blue-500 to-cyan-600",
  "from-emerald-400 to-teal-600",
  "from-orange-400 to-rose-500",
  "from-pink-400 to-fuchsia-600",
  "from-amber-400 to-orange-600",
  "from-indigo-500 to-blue-700",
  "from-rose-400 to-pink-600",
  "from-teal-400 to-emerald-600",
  "from-sky-400 to-indigo-500",
];

function pickGradient(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export function TripCard({ trip }: { trip: TripSummary }) {
  const gradient = pickGradient(trip.id);

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group relative flex h-56 flex-col overflow-hidden rounded-xl shadow-sm transition-all hover:shadow-lg hover:scale-[1.02]"
    >
      {/* Background layer — gradient always present, image on top */}
      <div className={clsx("absolute inset-0 bg-gradient-to-br", gradient)}>
        {trip.coverPhoto && (
          <img
            src={trip.coverPhoto}
            alt={trip.title}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* Dark scrim so text is always readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

      {/* Status badge — top right */}
      <div className="absolute top-3 right-3 z-10">
        <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize shadow", statusColors[trip.status])}>
          {trip.status}
        </span>
      </div>

      {/* Content — pinned to bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <h3 className="truncate text-base font-semibold text-white group-hover:text-brand-200">
          {trip.title}
        </h3>
        {trip.destination && (
          <p className="truncate text-sm text-white/70">{trip.destination}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/60">
          {trip.startDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {trip.startDate}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {trip.memberCount}
          </span>
          <span className="flex items-center gap-1">
            <Image className="h-3.5 w-3.5" />
            {trip.memoryCount}
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            {trip.totalExpenses.toFixed(0)}
          </span>
        </div>
      </div>
    </Link>
  );
}

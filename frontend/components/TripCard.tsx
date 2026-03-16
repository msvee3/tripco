"use client";

import Link from "next/link";
import { Calendar, Users, Image, IndianRupee, Trash2 } from "lucide-react";
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

// Travel-themed Unsplash photos — one per gradient slot
const TRAVEL_PHOTOS = [
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=70", // airplane over clouds
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=70", // tropical beach
  "https://images.unsplash.com/photo-1504214208698-ea1916a2195a?auto=format&fit=crop&w=600&q=70", // green jungle river
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=600&q=70", // sunset road trip
  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=600&q=70", // Italy travel
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=70", // couple road trip
  "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&w=600&q=70", // pool resort
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=70", // travel map planning
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=70", // mountain reflection
  "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=600&q=70", // adventure backpacking
];

function pickGradient(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

function pickPhoto(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TRAVEL_PHOTOS[h % TRAVEL_PHOTOS.length];
}

export function TripCard({ trip, onDelete }: { trip: TripSummary; onDelete?: (id: string) => void }) {
  const gradient = pickGradient(trip.id);
  const fallbackPhoto = pickPhoto(trip.id);
  const bgPhoto = trip.coverPhoto ?? fallbackPhoto;

  return (
    <div className="group relative flex h-56 flex-col overflow-hidden rounded-xl shadow-sm transition-all hover:shadow-lg hover:scale-[1.02]">
      {/* Delete button — top left */}
      {onDelete && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(trip.id); }}
          className="absolute top-3 left-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-red-600/80 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-700"
          title="Delete trip"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      <Link
        href={`/trips/${trip.id}`}
        className="absolute inset-0"
      >
      {/* Background layer — gradient always present, image on top */}
      <div className={clsx("absolute inset-0 bg-gradient-to-br", gradient)}>
        <img
          src={bgPhoto}
          alt={trip.title}
          className="h-full w-full object-cover"
        />
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
            <IndianRupee className="h-3.5 w-3.5" />
            {trip.totalExpenses.toFixed(0)}
          </span>
        </div>
      </div>
    </Link>
    </div>
  );
}

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

export function TripCard({ trip }: { trip: TripSummary }) {
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Cover */}
      <div className="h-40 bg-gradient-to-br from-brand-400 to-brand-600">
        {trip.coverPhoto && (
          <img
            src={trip.coverPhoto}
            alt={trip.title}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold group-hover:text-brand-600">{trip.title}</h3>
          <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium capitalize", statusColors[trip.status])}>
            {trip.status}
          </span>
        </div>

        {trip.destination && (
          <p className="text-sm text-gray-500">{trip.destination}</p>
        )}

        <div className="mt-auto flex items-center gap-4 pt-2 text-xs text-gray-400">
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

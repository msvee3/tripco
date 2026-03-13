"use client";

import { Camera, DollarSign, CalendarDays, Utensils, Ticket, Users } from "lucide-react";

type Section = "memories" | "expenses" | "itinerary" | "food" | "tickets" | "members";

interface SectionMeta {
  label: string;
  icon: React.ElementType;
  photo: string;
  accent: string; // tailwind gradient overlay
}

const SECTIONS: Record<Section, SectionMeta> = {
  memories: {
    label: "Memories",
    icon: Camera,
    photo:
      "https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?auto=format&fit=crop&w=800&q=75",
    accent: "from-purple-900/70 via-purple-700/30 to-transparent",
  },
  expenses: {
    label: "Expenses",
    icon: DollarSign,
    photo:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=75",
    accent: "from-emerald-900/70 via-emerald-700/30 to-transparent",
  },
  itinerary: {
    label: "Itinerary",
    icon: CalendarDays,
    photo:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=75",
    accent: "from-sky-900/70 via-sky-700/30 to-transparent",
  },
  food: {
    label: "Food Log",
    icon: Utensils,
    photo:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=75",
    accent: "from-orange-900/70 via-orange-700/30 to-transparent",
  },
  tickets: {
    label: "Tickets",
    icon: Ticket,
    photo:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=75",
    accent: "from-blue-900/70 via-blue-700/30 to-transparent",
  },
  members: {
    label: "Members",
    icon: Users,
    photo:
      "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=800&q=75",
    accent: "from-rose-900/70 via-rose-700/30 to-transparent",
  },
};

export function TripPageHero({ section }: { section: Section }) {
  const meta = SECTIONS[section];
  const Icon = meta.icon;

  return (
    <div className="relative mb-8 h-40 w-full overflow-hidden rounded-xl shadow-md">
      {/* Background photo */}
      <img
        src={meta.photo}
        alt={meta.label}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Colour-accent scrim left-to-right + universal bottom dark scrim */}
      <div className={`absolute inset-0 bg-gradient-to-r ${meta.accent}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex items-end p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white drop-shadow">{meta.label}</h1>
        </div>
      </div>
    </div>
  );
}

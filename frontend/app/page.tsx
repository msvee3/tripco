"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MapPin, Camera, DollarSign, Wifi, WifiOff } from "lucide-react";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // Show nothing while checking auth status
  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // If authenticated, don't show landing page (useEffect will redirect)
  if (status === "authenticated") {
    return null;
  }

  const features = [
    {
      icon: <MapPin className="h-8 w-8 text-brand-500" />,
      title: "Trip Planning",
      desc: "Organize your journeys with a day-by-day itinerary, invite friends, and keep everything in one place.",
    },
    {
      icon: <Camera className="h-8 w-8 text-brand-500" />,
      title: "Memories & Photos",
      desc: "Capture and relive every moment – upload photos, videos, and notes, auto-organized by date.",
    },
    {
      icon: <DollarSign className="h-8 w-8 text-brand-500" />,
      title: "Expense Tracking",
      desc: "Log expenses in any currency, split bills with friends, and export reports as CSV.",
    },
    {
      icon: <WifiOff className="h-8 w-8 text-brand-500" />,
      title: "Offline Ready",
      desc: "Works without internet. Add memories and expenses offline, and they sync when you reconnect.",
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-6 px-4 py-24 text-center">
        <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
          Your <span className="text-brand-600">Tripco</span>
        </h1>
        <p className="max-w-xl text-lg text-gray-600">
          Plan trips, capture memories, track expenses, and share experiences — all in one
          beautiful, offline-ready app.
        </p>
        <div className="flex gap-3">
          <Link
            href="/auth/signup"
            className="rounded-lg bg-brand-600 px-6 py-3 font-medium text-white shadow hover:bg-brand-700"
          >
            Get Started Free
          </Link>
          <Link
            href="/auth/login"
            className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Log in
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto grid max-w-5xl gap-8 px-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="mb-4">{f.icon}</div>
            <h3 className="mb-1 font-semibold">{f.title}</h3>
            <p className="text-sm text-gray-500">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

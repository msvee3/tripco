"use client";

import { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";
import { persistentHydrate } from "@/lib/api";

export function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // On app startup: restore session from localStorage and refresh access token
    // (persistent login across browser sessions)
    persistentHydrate().finally(() => setHydrated(true));
  }, []);

  // Render children only after hydration completes to ensure tokens are ready
  if (!hydrated) {
    return null; // or a loading screen
  }
  return <SessionProvider>{children}</SessionProvider>;
}

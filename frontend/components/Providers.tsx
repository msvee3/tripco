"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { persistentHydrate } from "@/lib/api";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // On app startup: restore session from localStorage and refresh access token
    // (persistent login across browser sessions)
    persistentHydrate();
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}

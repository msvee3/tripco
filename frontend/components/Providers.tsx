"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { persistentHydrate } from "@/lib/api";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // On app startup: restore session from localStorage and refresh access token
    // (persistent login across browser sessions)
    // This runs in background; don't block rendering
    persistentHydrate().catch((err) => {
      console.warn("Persistent hydration failed (expected if refresh token expired):", err);
    });
  }, []);

  // Render immediately; NextAuth will handle session
  return <SessionProvider>{children}</SessionProvider>;
}

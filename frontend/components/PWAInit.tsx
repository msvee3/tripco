"use client";

import { useEffect } from "react";
import { registerSW } from "@/lib/sw-register";
import { initOfflineSync } from "@/lib/indexeddb";

/**
 * Client component that bootstraps PWA + offline sync.
 * Rendered once in the root layout.
 */
export function PWAInit() {
  useEffect(() => {
    registerSW();
    initOfflineSync();
  }, []);

  return null; // renders nothing
}

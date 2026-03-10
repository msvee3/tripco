"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function SyncStatus() {
  const online = useOnlineStatus();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!online && (
        <div className="flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 shadow-lg">
          <WifiOff className="h-3.5 w-3.5" />
          Offline — changes saved locally
        </div>
      )}
    </div>
  );
}

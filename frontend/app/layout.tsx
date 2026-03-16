import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PWAInit } from "@/components/PWAInit";
import { SyncStatus } from "@/components/SyncStatus";
import { CookieConsent } from "@/components/CookieConsent";

export const metadata: Metadata = {
  title: "Tripco",
  description: "Your personal travel journal, expense tracker & photo album.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/icons/icon-180.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#006dce",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <SyncStatus />
          <PWAInit />
          <CookieConsent />
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

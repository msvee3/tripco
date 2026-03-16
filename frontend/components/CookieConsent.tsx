"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) setShow(true);
  }, []);

  function accept() {
    localStorage.setItem("cookie-consent", "accepted");
    setShow(false);
  }

  function decline() {
    localStorage.setItem("cookie-consent", "declined");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t bg-white p-4 shadow-lg sm:flex sm:items-center sm:justify-between sm:px-8">
      <p className="text-sm text-gray-600">
        We use essential cookies to make Tripco work. By continuing to use this site, you agree to our{" "}
        <Link href="/privacy" className="text-brand-600 underline hover:text-brand-700">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-3 flex gap-2 sm:mt-0 sm:shrink-0">
        <button
          onClick={decline}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Decline
        </button>
        <button
          onClick={accept}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

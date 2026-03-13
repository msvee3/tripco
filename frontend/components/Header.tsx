"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Tripco" width={36} height={36} className="object-contain" />
          <span className="text-2xl font-extrabold tracking-tight" style={{ color: "#006dce" }}>
            Tripco
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {session?.user ? (
            <>
              <Link href="/profile" className="text-gray-700 hover:text-brand-600">
                Profile
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-gray-700 hover:bg-gray-200"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-gray-700 hover:text-brand-600">
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-md bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}


        <nav className="flex items-center gap-4 text-sm">
          {session?.user ? (
            <>
              <Link href="/profile" className="text-gray-700 hover:text-brand-600">
                Profile
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-gray-700 hover:bg-gray-200"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-gray-700 hover:text-brand-600">
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-md bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

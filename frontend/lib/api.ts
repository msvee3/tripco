/**
 * Thin API client – wraps fetch with auth header injection & error handling.
 * All calls go through the Next.js rewrite → FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Stored in memory – never in localStorage (security best-practice)
let _accessToken: string | null = null;
let _refreshToken: string | null = null;

export function setTokens(access: string, refresh: string) {
  _accessToken = access;
  _refreshToken = refresh;
  // Persist refresh token in localStorage for persistent login across browser sessions
  if (typeof window !== "undefined") {
    localStorage.setItem("rt", refresh);
  }
}

export function getAccessToken() {
  return _accessToken;
}

export function clearTokens() {
  _accessToken = null;
  _refreshToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("rt");
  }
}

export function hydrateRefreshToken() {
  if (typeof window !== "undefined") {
    _refreshToken = localStorage.getItem("rt");
  }
}

/**
 * On app startup: hydrate refresh token and attempt to refresh.
 * Restores user session across browser sessions (persistent login).
 */
export async function persistentHydrate(): Promise<void> {
  try {
    hydrateRefreshToken();
    if (_refreshToken) {
      const success = await refreshAccessToken();
      if (!success) {
        console.warn("Failed to refresh token on app startup");
        clearTokens();
      } else {
        console.log("Session restored from persistent token");
      }
    }
  } catch (err) {
    console.error("Persistent hydration error:", err);
    clearTokens();
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (!_refreshToken) {
    console.warn("[API] No refresh token available");
    return false;
  }
  try {
    console.log("[API] Refreshing access token...");
    const res = await fetch(`${API_BASE}/auth/refresh?refresh_token=${encodeURIComponent(_refreshToken)}`, {
      method: "POST",
    });
    if (!res.ok) {
      console.error("[API] Refresh failed with status:", res.status);
      return false;
    }
    const data = await res.json();
    console.log("[API] Refresh response keys:", Object.keys(data));
    
    // Handle both snake_case and camelCase response keys
    const accessToken = data.access_token || data.accessToken;
    const refreshToken = data.refresh_token || data.refreshToken;
    
    if (!accessToken) {
      console.error("[API] Refresh response has no access token!", data);
      return false;
    }
    
    setTokens(accessToken, refreshToken || _refreshToken);
    console.log("[API] Access token refreshed successfully");
    return true;
  } catch (err) {
    console.error("[API] Refresh error:", err);
    return false;
  }
}

// ── Generic fetch wrapper ───────────────────────────

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (_accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
    console.log("[API]", path, "- Token present");
  } else {
    console.warn("[API]", path, "- No access token!");
  }

  const res = await fetch(url, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && retry) {
    console.warn("[API] Got 401 - attempting refresh");
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      console.log("[API] Token refreshed - retrying request");
      return apiFetch<T>(path, options, false);
    }
    console.error("[API] Refresh failed - redirecting to login");
    clearTokens();
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// ── Convenience helpers ─────────────────────────────

export const api = {
  get: <T = any>(path: string) => apiFetch<T>(path),
  post: <T = any>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T = any>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

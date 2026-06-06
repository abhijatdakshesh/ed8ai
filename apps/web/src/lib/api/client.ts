/**
 * Ed8AI Web — authenticated API client.
 *
 * Attaches Bearer token from NextAuth session (`accessToken`).
 * Falls back to unauthenticated requests when no session (e.g. public mocks).
 */

import { getSession } from "next-auth/react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

/**
 * BFF-handled prefixes — these requests go to the Next.js route handlers
 * under /apps/web/src/app/api/* (relative URL) instead of directly hitting
 * the identity service. The Next handlers either provide a synthetic-success
 * response (for endpoints the backend doesn't implement yet) or proxy to
 * the upstream via the catch-all route. Keeping prod-tolerance for the demo.
 */
const BFF_PREFIXES = [
  "/api/jobs/",                  // jobs/:id/apply synth fallback
  "/api/hostel/",                // hostel/student, complaints, leave-requests
  "/api/transport/",             // transport/student/:usn synth
  "/api/hr/",                    // hr/grievances, hr/service-requests synth
  "/api/wellness/stress-assessment", // synth scoring
  "/api/timetable/student/",     // weekly schedule synth (backend has no route yet)
  "/api/announcements",          // announcements synth fallback
  "/api/parent/scholarship/",    // parent scholarship apply synth (no BE route)
  "/api/recruiter/jobs",         // KAN-29 post-job synth
  "/api/recruiter/drives",       // KAN-30 start-drive synth (no BE route)
  "/api/recruiter/analytics",    // KAN-31 analytics synth fallback
  "/api/parent-comms/messages",  // KAN-41 parent send-message synth
  "/api/automation/rules",       // KAN-52 admin automation rule create
  "/api/lms/",                   // LMS: modules, lessons, progress, mastery, eli5, narrate, authoring
  "/api/teacher/reports/generate", // KAN-74 teacher report download synth
  "/api/admin/comms/test-send",  // KAN-62 admin comms test message
  "/api/ia/submissions/",        // KAN-63 IA remind/confirm synth
  "/api/ia/teacher/marks",       // KAN-73 teacher marks save/submit synth
  "/api/fees/payment/initiate",  // KAN-78 fee payment initiate synth
  "/api/vtu/teacher/",           // VTU eligibility + submit synth
  "/api/admissions",             // Admission portal: apply, mine, docs, fee, review, merit-list
];

/**
 * BFF endpoints that take precedence ONLY for the listed HTTP methods.
 * Used when the backend serves GET (e.g. `GET /api/classes`) but the BFF
 * needs to handle POST locally because the backend has no create route.
 */
const BFF_METHOD_PREFIXES: Array<{ path: string; methods: string[] }> = [
  { path: "/api/classes", methods: ["POST"] },   // KAN-37 add class
  { path: "/api/courses", methods: ["POST"] },   // KAN-32 add course
];

function resolveRequestUrl(path: string, method = "GET"): string {
  // In the browser, relative paths hit the Next BFF on the same origin.
  // SSR / Node still needs an absolute URL, so we keep API_BASE there.
  if (typeof window !== "undefined") {
    if (BFF_PREFIXES.some((p) => path.startsWith(p))) {
      return path;
    }
    const upper = method.toUpperCase();
    if (BFF_METHOD_PREFIXES.some(({ path: p, methods }) => path.startsWith(p) && methods.includes(upper))) {
      return path;
    }
  }
  return `${API_BASE}${path}`;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const session = await getSession();
  const accessToken = session?.accessToken;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const requestUrl = resolveRequestUrl(path, init.method ?? "GET");
  let res: Response;
  try {
    res = await fetch(requestUrl, { ...init, headers });
  } catch (error) {
    throw error;
  }

  if (res.status === 401 && accessToken) {
    // The cached client-side session token is expired. Ask the NextAuth session
    // endpoint to re-evaluate it — this runs the server-side jwt callback which
    // silently calls /api/auth/refresh and stores a new access token in the cookie.
    try {
      const sessionRes = await fetch("/api/auth/session");
      if (sessionRes.ok) {
        const freshSession = (await sessionRes.json()) as {
          accessToken?: string;
          error?: string;
        };
        const freshToken = freshSession?.accessToken;

        if (freshSession.error === "RefreshAccessTokenError") {
          // Refresh failed server-side — token is unrecoverable, redirect to login.
          // Do NOT redirect on !freshToken alone: the token may be momentarily
          // undefined while NextAuth's JWT callback is still hydrating, which
          // would cause a spurious login redirect on an otherwise valid session.
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          return undefined as unknown as T;
        }

        if (freshToken && freshToken !== accessToken) {
          // Got a new token — retry the original request with it
          const retryHeaders = {
            ...headers,
            Authorization: `Bearer ${freshToken}`,
          };
          const retry = await fetch(resolveRequestUrl(path, init.method ?? "GET"), {
            ...init,
            headers: retryHeaders,
          });
          if (!retry.ok) {
            const err = (await retry.json().catch(() => ({}))) as {
              message?: string;
            };
            throw new Error(err.message ?? `Request failed: ${retry.status}`);
          }
          if (retry.status === 204) return undefined as unknown as T;
          return (await retry.json()) as T;
        }
      }
    } catch (refreshError) {
      if (refreshError instanceof Error) throw refreshError;
    }

    // Refresh did not produce a new token — surface the original 401
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? "Unauthorized");
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as unknown as T;

  return (await res.json()) as T;
}

export const apiGet = <T>(path: string) => apiFetch<T>(path, { method: "GET" });

// Always-array variant. Backend may return null / error envelope on partial-
// migration / cold-start states; downstream JSX that calls .map / .length on
// non-arrays crashes the whole route. Centralised so consumers don't each
// reimplement the guard (Dev review on KAN-15). Use for any GET that the
// frontend expects as a list.
export const apiGetArray = async <T>(path: string): Promise<T[]> => {
  const data = await apiFetch<unknown>(path, { method: "GET" });
  return Array.isArray(data) ? (data as T[]) : [];
};

export const apiPost = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const apiPut = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const apiPatch = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const apiDelete = <T>(path: string) =>
  apiFetch<T>(path, { method: "DELETE" });

/** Downloads a file from an authenticated endpoint and triggers browser save. */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const session = await getSession();
  const accessToken = session?.accessToken;
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  // Route through resolveRequestUrl so BFF-handled paths stay same-origin
  // and hit the Next route handler (which proxies to the backend or
  // returns a synth response).
  const res = await fetch(resolveRequestUrl(path, "GET"), { headers });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Downloads a file from an authenticated POST endpoint and triggers browser save. */
export async function apiDownloadPost(path: string, body: unknown, filename: string): Promise<void> {
  const session = await getSession();
  const accessToken = session?.accessToken;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  // resolveRequestUrl keeps BFF-handled POSTs same-origin so synth-fallback
  // routes (e.g. /api/teacher/reports/generate) work in prod.
  const res = await fetch(resolveRequestUrl(path, "POST"), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** @deprecated Use apiFetch / apiGet / apiPost directly. */
export const apiClient = {
  get: apiGet,
  post: apiPost,
};

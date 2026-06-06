/**
 * NextAuth v5 configuration for Ed8AI / RV Trust.
 *
 * Authentication flow:
 *   1. User submits email + password on /login.
 *   2. NextAuth Credentials.authorize() calls POST /api/auth/login on the
 *      identity service (NestJS, port 3001) and receives a real JWT pair.
 *   3. The access token + refresh token are stored in the encrypted NextAuth
 *      session cookie (httpOnly, Secure, SameSite=Lax).
 *   4. Every API call reads the token via getSession() → attaches Bearer header.
 *   5. When the access token expires the JWT callback silently refreshes it
 *      using /api/auth/refresh.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { SignJWT } from "jose";

import type { UserRole, Language } from "@/lib/auth/session";

// ── Backend response shapes ───────────────────────────────────────────────────

interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institutionId: string;
  preferredLanguage: Language;
  sapId?: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: BackendUser;
}

interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

// ── Identity service base URL ─────────────────────────────────────────────────
// In Next.js server-side code use the internal URL (no NEXT_PUBLIC_ prefix).

const IDENTITY_URL =
  process.env.IDENTITY_SERVICE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3001";

/** When the identity service is offline, matching rows allow sign-in (same emails as login page dev hints). */
const DEV_CREDENTIALS: Record<
  string,
  { password: string; role: UserRole; name: string }
> = {
  "admin@rvce.edu": { password: "Admin@123", role: "ADMIN", name: "Admin User" },
  "teacher@rvce.edu": { password: "Teacher@123", role: "FACULTY", name: "Teacher" },
  "student@rvce.edu": { password: "Student@123", role: "STUDENT", name: "Student" },
  "parent@rvce.edu": { password: "Parent@123", role: "PARENT", name: "Parent" },
  "hod@rvce.edu": { password: "Hod@123", role: "HOD", name: "Head of Department" },
  "principal@rvce.edu": { password: "Principal@123", role: "PRINCIPAL", name: "Principal" },
  "recruiter@demo.com": { password: "Recruiter@123", role: "RECRUITER", name: "Recruiter" },
  "applicant@demo.com": { password: "Applicant@123", role: "APPLICANT", name: "Applicant" },
};

const DEV_JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "edai-dev-secret-change-in-production",
);

async function makeDevJwt(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("ed8ai-identity")
    .setAudience("ed8ai-services")
    .setExpirationTime("24h")
    .sign(DEV_JWT_SECRET);
}

async function tryDevLogin(
  email: string,
  password: string,
): Promise<{
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institutionId: string;
  preferredLanguage: Language;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
} | null> {
  const row = DEV_CREDENTIALS[email.toLowerCase()];
  if (!row || row.password !== password) return null;
  const id = `dev-${row.role.toLowerCase()}`;
  const accessToken = await makeDevJwt({
    sub: id,
    email,
    role: row.role,
    institutionId: "rvce",
    name: row.name,
  });
  return {
    id,
    name: row.name,
    email,
    role: row.role,
    institutionId: "rvce",
    preferredLanguage: "en",
    accessToken,
    refreshToken: "dev-refresh-token",
    accessTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
}

// ── NextAuth config ───────────────────────────────────────────────────────────

if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET env var is required — add it to .env.local for development");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  pages: { signIn: "/login" },

  providers: [
    Credentials({
      name: "Ed8AI Identity",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      /**
       * Called by NextAuth when the user submits the login form.
       * Returns a User object on success, null on failure.
       */
      async authorize(credentials, _request) {
        const email = String(credentials?.email ?? "").trim();
        const password = String(credentials?.password ?? "");

        if (!email || !password) return null;

        try {
          const res = await fetch(`${IDENTITY_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          if (res.ok) {
            const data = (await res.json()) as LoginResponse;

            // Cast required: NextAuth User type is augmented with optional fields;
            // exactOptionalPropertyTypes rejects undefined in conditionally-present fields.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: data.user.role,
              institutionId: data.user.institutionId,
              preferredLanguage: data.user.preferredLanguage,
              sapId: data.user.sapId,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              accessTokenExpiresAt: Date.now() + data.expiresIn * 1_000,
            } as any; // eslint-disable-line
          }
        } catch {
          // Identity service unreachable — fall through to dev credentials (dev only)
        }

        // Dev credentials only when explicitly enabled via env var — never in production
        // and never when NODE_ENV is merely not "production" (e.g. staging docker builds).
        if (process.env.NEXT_PUBLIC_USE_MOCKS !== "true") return null;
        const dev = await tryDevLogin(email, password);
        return dev;
      },
    }),
  ],

  callbacks: {
    /**
     * jwt — runs on every token creation and when the session is read.
     * Handles silent token refresh when the access token is near expiry.
     */
    async jwt({ token, user }) {
      // First call after login — user contains the authorize() return value
      if (user) {
        if (user.id !== undefined) token.sub = user.id;
        if (user.email !== undefined && user.email !== null) token.email = user.email;
        else if (user.email === null) token.email = null;
        if (user.name !== undefined && user.name !== null) token.name = user.name;
        else if (user.name === null) token.name = null;
        const u = user as {
          role?: UserRole | undefined;
          institutionId?: string | undefined;
          preferredLanguage?: Language | undefined;
          sapId?: string | undefined;
          accessToken?: string | undefined;
          refreshToken?: string | undefined;
          accessTokenExpiresAt?: number | undefined;
        };
        if (u.role !== undefined) token.role = u.role;
        if (u.institutionId !== undefined) token.institutionId = u.institutionId;
        if (u.preferredLanguage !== undefined) token.preferredLanguage = u.preferredLanguage;
        if (u.sapId !== undefined) token.sapId = u.sapId;
        if (u.accessToken !== undefined) token.accessToken = u.accessToken;
        if (u.refreshToken !== undefined) token.refreshToken = u.refreshToken;
        if (u.accessTokenExpiresAt !== undefined) token.accessTokenExpiresAt = u.accessTokenExpiresAt;
        return token;
      }

      // Subsequent calls — refresh the access token if it's expired or expiring soon
      const expiresAt = token.accessTokenExpiresAt as number | undefined;
      // Default true when expiresAt absent/zero — always attempt refresh for tokens without expiry metadata
      const isExpired = expiresAt ? Date.now() >= expiresAt - 30_000 : true;

      if (
        isExpired &&
        token.refreshToken &&
        token.refreshToken !== "dev-refresh-token"
      ) {
        try {
          const res = await fetch(`${IDENTITY_URL}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: token.refreshToken }),
          });

          if (res.ok) {
            const data = (await res.json()) as RefreshResponse;
            token.accessToken = data.accessToken;
            token.accessTokenExpiresAt = Date.now() + data.expiresIn * 1_000;
          } else {
            // Refresh failed — mark token as invalid so the session callback
            // can return an error and the client can redirect to /login
            token.error = "RefreshAccessTokenError";
          }
        } catch {
          token.error = "RefreshAccessTokenError";
        }
      }

      return token;
    },

    /**
     * session — shapes what getSession() / useSession() returns to the client.
     */
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub as string | undefined) ?? "";
        session.user.email = (token.email as string | undefined) ?? session.user.email;
        session.user.name = (token.name as string | null | undefined) ?? session.user.name ?? null;
        session.user.role = (token.role as UserRole | undefined) ?? "FACULTY";
        const institutionId = token.institutionId as string | undefined;
        const preferredLanguage = token.preferredLanguage as Language | undefined;
        const sapId = token.sapId as string | undefined;
        if (institutionId !== undefined) session.user.institutionId = institutionId;
        if (preferredLanguage !== undefined) session.user.preferredLanguage = preferredLanguage;
        if (sapId !== undefined) session.user.sapId = sapId;
      }
      const accessToken = token.accessToken as string | undefined;
      const refreshToken = token.refreshToken as string | undefined;
      const error = token.error as string | undefined;
      if (accessToken !== undefined) session.accessToken = accessToken;
      if (refreshToken !== undefined) session.refreshToken = refreshToken;
      if (error !== undefined) session.error = error;
      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days (refresh tokens live this long)
  },
});

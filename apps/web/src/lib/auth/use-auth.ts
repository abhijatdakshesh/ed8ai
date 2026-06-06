"use client";

import { useMemo } from "react";
import { signOut, useSession } from "next-auth/react";

import type { UserRole } from "@/lib/auth/session";

/** First route after login — sends each role to their dedicated portal home. */
export function homeRouteForRole(role: UserRole): string {
  switch (role) {
    case "ADMIN":
    case "TRUSTEE":
    case "PRINCIPAL":
    case "DEAN":
      return "/dashboard";
    case "FACULTY":
    case "HOD":
    case "COUNSELLOR":
      return "/dashboard";
    case "STUDENT":
      return "/student/dashboard";
    case "PARENT":
      return "/parent/dashboard";
    case "APPLICANT":
      return "/admit/dashboard";
    default:
      return "/dashboard";
  }
}

export function useAuth() {
  const { data: session, status } = useSession();
  const ready = status !== "loading";

  // Memoize so consumers using `session` in useEffect deps don't re-render every tick.
  // next-auth re-issues a fresh session object on every poll, breaking referential equality.
  const stableSession = useMemo(
    () =>
      session?.user
        ? { user: session.user, email: session.user.email ?? "", role: session.user.role }
        : null,
    [session?.user?.id, session?.user?.role, session?.user?.email, session?.user?.name],
  );

  return {
    session: stableSession,
    ready,
    logout: () => void signOut({ callbackUrl: "/login" }),
  };
}

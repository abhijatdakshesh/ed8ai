// All roles that exist in the system — mirrors the backend UserRole enum.
export type UserRole =
  | "ADMIN"
  | "FACULTY"
  | "HOD"
  | "DEAN"
  | "PRINCIPAL"
  | "TRUSTEE"
  | "COUNSELLOR"
  | "STUDENT"
  | "PARENT"
  | "RECRUITER"
  | "APPLICANT";

export type Language = "kn" | "en" | "hi" | "ta" | "te" | "ml";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institutionId: string;
  preferredLanguage: Language;
  sapId?: string;
}

export interface AuthSession {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
  /** Unix timestamp (ms) when the access token expires. Used to proactively refresh. */
  accessTokenExpiresAt: number;
}

export const AUTH_STORAGE_KEY = "rv_auth_session";

// ── Helpers ────────────────────────────────────────────────────────────────

/** True if the stored access token is expired or expires within 30 s. */
export function isAccessTokenExpired(session: AuthSession): boolean {
  return Date.now() >= session.accessTokenExpiresAt - 30_000;
}

/** Human-readable label for a role. */
export function roleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    ADMIN: "Admin",
    FACULTY: "Faculty",
    HOD: "HoD",
    DEAN: "Dean",
    PRINCIPAL: "Principal",
    TRUSTEE: "Trustee",
    COUNSELLOR: "Counsellor",
    STUDENT: "Student",
    PARENT: "Parent",
    RECRUITER: "Recruiter",
    APPLICANT: "Applicant",
  };
  return labels[role] ?? role;
}

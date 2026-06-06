/**
 * Admission portal domain types — shared by the applicant portal (/admit/*)
 * and the admin review section (/admin/admissions).
 */

export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "ADMITTED"
  | "REJECTED"
  | "WAITLISTED";

export type AdmissionDocType =
  | "MARKSHEET_10"
  | "MARKSHEET_12"
  | "ID_PROOF"
  | "TRANSFER_CERT"
  | "CASTE_CERT"
  | "PHOTO";

export interface AdmissionDoc {
  id: string;
  docType: AdmissionDocType;
  fileName: string;
  url: string;
  uploadedAt: string;
  verified: boolean;
}

export interface Application {
  /** Human-readable tracking ID, e.g. ADM-2026-00042. */
  id: string;
  applicantName: string;
  email: string;
  phone: string;
  program: string;
  category: string;
  marks12Pct: number;
  documents: AdmissionDoc[];
  status: ApplicationStatus;
  meritScore?: number;
  meritRank?: number;
  feePaid: boolean;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitApplicationPayload {
  applicantName: string;
  email: string;
  phone: string;
  program: string;
  category: string;
  marks12Pct: number;
  consentGiven: boolean;
}

export interface ApplicationsFilter {
  status?: string | undefined;
  program?: string | undefined;
  category?: string | undefined;
}

export interface MeritListEntry {
  rank: number;
  applicationId: string;
  applicantName: string;
  meritScore: number;
  category: string;
  status: ApplicationStatus;
}

// ── Display helpers ──────────────────────────────────────────────────────────

export const STATUS_FLOW: ApplicationStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "ADMITTED",
];

export const DOC_LABELS: Record<AdmissionDocType, string> = {
  MARKSHEET_10: "10th Marksheet",
  MARKSHEET_12: "12th Marksheet",
  ID_PROOF: "ID Proof (Aadhaar/Passport)",
  TRANSFER_CERT: "Transfer Certificate",
  CASTE_CERT: "Category Certificate",
  PHOTO: "Passport Photo",
};

export const REQUIRED_DOCS: AdmissionDocType[] = [
  "MARKSHEET_10",
  "MARKSHEET_12",
  "ID_PROOF",
  "PHOTO",
];

export function statusLabel(s: ApplicationStatus): string {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

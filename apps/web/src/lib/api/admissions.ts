/**
 * React Query hooks for the Admission portal.
 * Backend: identity service → /api/admissions/* (synth BFF fallback in CI/demo).
 *
 * Mock-mode (NEXT_PUBLIC_USE_MOCKS=true) short-circuits every query with a
 * realistic in-memory dataset, mirroring the pattern in users.ts — so the
 * portal and the @P1 e2e gate work with no backend.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiGet, apiPatch, apiPost } from "./client";
import type {
  Application,
  ApplicationsFilter,
  MeritListEntry,
  SubmitApplicationPayload,
} from "@/features/admissions/types";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_APPLICATIONS: Application[] = [
  {
    id: "ADM-2026-00001", applicantName: "Aditya Nair", email: "aditya.nair@gmail.com",
    phone: "+91 98860 11111", program: "B.E. CSE", category: "GM", marks12Pct: 94.5,
    status: "SHORTLISTED", meritScore: 94.5, meritRank: 1, feePaid: false,
    documents: [
      { id: "d1", docType: "MARKSHEET_12", fileName: "puc-marks.pdf", url: "#", uploadedAt: "2026-05-20T09:00:00Z", verified: true },
      { id: "d2", docType: "ID_PROOF", fileName: "aadhaar.pdf", url: "#", uploadedAt: "2026-05-20T09:05:00Z", verified: true },
    ],
    submittedAt: "2026-05-20T09:10:00Z", createdAt: "2026-05-20T08:00:00Z", updatedAt: "2026-05-25T10:00:00Z",
  },
  {
    id: "ADM-2026-00002", applicantName: "Sneha Reddy", email: "sneha.reddy@gmail.com",
    phone: "+91 98860 22222", program: "B.E. ECE", category: "OBC", marks12Pct: 91.0,
    status: "UNDER_REVIEW", meritScore: 91.0, feePaid: false,
    documents: [
      { id: "d3", docType: "MARKSHEET_12", fileName: "marks.pdf", url: "#", uploadedAt: "2026-05-21T09:00:00Z", verified: false },
    ],
    submittedAt: "2026-05-21T09:10:00Z", createdAt: "2026-05-21T08:00:00Z", updatedAt: "2026-05-21T09:10:00Z",
  },
  {
    id: "ADM-2026-00003", applicantName: "Mohammed Irfan", email: "irfan@gmail.com",
    phone: "+91 98860 33333", program: "B.E. CSE", category: "GM", marks12Pct: 88.2,
    status: "SUBMITTED", meritScore: 88.2, feePaid: false,
    documents: [], submittedAt: "2026-05-22T09:10:00Z", createdAt: "2026-05-22T08:00:00Z", updatedAt: "2026-05-22T09:10:00Z",
  },
];

/** The "current applicant" record returned by the mock /mine endpoint. */
const MOCK_MINE: Application = MOCK_APPLICATIONS[0]!;

function mockList(filter: ApplicationsFilter): Application[] {
  let rows = [...MOCK_APPLICATIONS];
  if (filter.status) rows = rows.filter((a) => a.status === filter.status);
  if (filter.program) rows = rows.filter((a) => a.program === filter.program);
  if (filter.category) rows = rows.filter((a) => a.category === filter.category);
  return rows;
}

function mockMeritList(program?: string): MeritListEntry[] {
  return [...MOCK_APPLICATIONS]
    .filter((a) => !program || a.program === program)
    .sort((a, b) => (b.meritScore ?? 0) - (a.meritScore ?? 0))
    .map((a, i) => ({
      rank: i + 1,
      applicationId: a.id,
      applicantName: a.applicantName,
      meritScore: a.meritScore ?? 0,
      category: a.category,
      status: a.status,
    }));
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const admissionKeys = {
  all: ["admissions"] as const,
  list: (f: ApplicationsFilter) => ["admissions", "list", f] as const,
  mine: ["admissions", "mine"] as const,
  detail: (id: string) => ["admissions", "detail", id] as const,
  meritList: (program?: string) => ["admissions", "merit-list", program ?? "all"] as const,
};

// ─── Applicant-facing hooks ────────────────────────────────────────────────────

/** The signed-in applicant's own application (status, docs, fee). */
export function useMyApplication() {
  return useQuery<Application | null>({
    queryKey: admissionKeys.mine,
    queryFn: USE_MOCKS
      ? () => Promise.resolve(MOCK_MINE)
      : () => apiGet<Application | null>("/api/admissions/mine"),
  });
}

export function useSubmitApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitApplicationPayload) =>
      USE_MOCKS
        ? Promise.resolve({ ...MOCK_MINE, ...payload, status: "SUBMITTED" as const })
        : apiPost<Application>("/api/admissions", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: admissionKeys.all }),
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { docType: string; fileName: string }) =>
      apiPost<Application>("/api/admissions/documents", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: admissionKeys.mine }),
  });
}

export function useInitiateAdmissionFee() {
  return useMutation({
    mutationFn: (payload: { applicationId: string; amount: number }) =>
      apiPost<{ orderId: string; amount: number; currency: string; key: string }>(
        "/api/admissions/fee/initiate",
        payload,
      ),
  });
}

// ─── Admin-facing hooks ─────────────────────────────────────────────────────────

export function useApplications(filter: ApplicationsFilter = {}) {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.program) params.set("program", filter.program);
  if (filter.category) params.set("category", filter.category);
  const qs = params.toString();

  return useQuery<Application[]>({
    queryKey: admissionKeys.list(filter),
    queryFn: USE_MOCKS
      ? () => Promise.resolve(mockList(filter))
      : () => apiGet<Application[]>(`/api/admissions${qs ? `?${qs}` : ""}`),
  });
}

export function useReviewApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: string; notes?: string }) =>
      apiPatch<Application>(`/api/admissions/${vars.id}`, {
        status: vars.status,
        notes: vars.notes,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: admissionKeys.all }),
  });
}

export function useShortlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<Application>(`/api/admissions/${id}/shortlist`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: admissionKeys.all }),
  });
}

export function useMeritList(program?: string) {
  return useQuery<MeritListEntry[]>({
    queryKey: admissionKeys.meritList(program),
    queryFn: USE_MOCKS
      ? () => Promise.resolve(mockMeritList(program))
      : () =>
          apiGet<MeritListEntry[]>(
            `/api/admissions/merit-list${program ? `?program=${encodeURIComponent(program)}` : ""}`,
          ),
  });
}

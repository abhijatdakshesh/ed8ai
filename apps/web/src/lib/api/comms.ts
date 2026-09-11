/**
 * React Query hooks for Communications (announcements, AI calls, messages).
 * Backend: comms service → /api/comms
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnnouncementCategory =
  | "EXAM" | "PLACEMENT" | "EVENT" | "GENERAL" | "ACADEMIC" | "URGENT";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  postedBy: string;
  postedAt: string;
  important: boolean;
  targetRoles: string[];
  targetDepts?: string[];
}

export interface AiCallLog {
  id: string;
  studentUsn: string;
  studentName: string;
  parentPhone: string;
  calledAt: string;
  duration: number; // seconds
  outcome: "ANSWERED" | "NO_ANSWER" | "BUSY" | "FAILED";
  transcript?: string | undefined;
  summary?: string | undefined;
  language: string;
  // Live-agent handoff (AI→human transfer)
  transferStatus?: "PENDING" | "CONNECTED" | "FAILED" | undefined;
  transferReason?: string | undefined;
  transferredAt?: string | undefined;
  transferDuration?: number | undefined;
}

export interface SendSmsPayload {
  to: string;
  message: string;
  studentUsn?: string;
}

export interface TriggerCallPayload {
  studentUsn: string;
  parentPhone: string;
  reason: "LOW_ATTENDANCE" | "PERFORMANCE_DROP" | "FEE_DUE" | "GENERAL";
  language?: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const commsKeys = {
  announcements: (role?: string, dept?: string) =>
    ["comms", "announcements", role, dept] as const,
  aiCalls: (classId: string) => ["comms", "calls", classId] as const,
  callLog: ["comms", "calls", "log"] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Announcements filtered by role and/or department */
export function useAnnouncements(role?: string, dept?: string) {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (dept) params.set("dept", dept);
  const qs = params.toString();

  return useQuery<Announcement[]>({
    queryKey: commsKeys.announcements(role, dept),
    queryFn: () => apiGet<Announcement[]>(`/api/comms/announcements${qs ? `?${qs}` : ""}`),
  });
}

/** AI call logs for a class — Teacher portal */
export function useAiCallLogs(classId: string) {
  return useQuery<AiCallLog[]>({
    queryKey: commsKeys.aiCalls(classId),
    queryFn: () => apiGet<AiCallLog[]>(`/api/comms/calls?classId=${classId}`),
    enabled: !!classId,
  });
}

/** All recent AI calls — Teacher call panel */
export function useRecentCallLogs() {
  return useQuery<AiCallLog[]>({
    queryKey: commsKeys.callLog,
    queryFn: () => apiGet<AiCallLog[]>("/api/comms/calls/recent"),
  });
}

/** Post an announcement — Admin / Teacher portal */
export function usePostAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<Announcement, "id" | "postedAt">) =>
      apiPost<Announcement>("/api/comms/announcements", payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["comms", "announcements"] }),
  });
}

/** Send SMS to parent */
export function useSendSms() {
  return useMutation({
    mutationFn: (payload: SendSmsPayload) =>
      apiPost("/api/comms/sms/send", payload),
  });
}

/** Trigger AI voice call to parent */
export function useTriggerCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TriggerCallPayload) =>
      apiPost("/api/comms/calls/trigger", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comms", "calls"] }),
  });
}

/** Proctored assessments. Backend: /api/proctor */
import { apiGet, apiPost } from "./client";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export interface PublicQuestion { id: string; q: string; options: string[]; }
export interface Assessment { id: string; courseId: string; title: string; durationSec: number; questions: PublicQuestion[]; }
export type FlagType = "TAB_SWITCH" | "FOCUS_LOSS" | "FULLSCREEN_EXIT" | "COPY_PASTE" | "MULTIPLE_FACES" | "NO_FACE";
export interface AttemptResult { id: string; score?: number; integrityScore?: number; flagged?: boolean; flags: Array<{ type: FlagType; ts: string }>; }

const MOCK_ASSESSMENT: Assessment = {
  id: "as-cs501-1", courseId: "CS501", title: "OS Quiz 1 — Process Scheduling", durationSec: 600,
  questions: [
    { id: "q1", q: "Which scheduling algorithm can cause starvation?", options: ["FCFS", "Round Robin", "Priority (non-aging)", "SJF preemptive"] },
    { id: "q2", q: "Round Robin is governed by which parameter?", options: ["Burst time", "Time quantum", "Arrival time", "Priority"] },
    { id: "q3", q: "A deadlock requires which condition?", options: ["Preemption", "Mutual exclusion", "Unlimited resources", "Single process"] },
  ],
};

export const proctorApi = {
  getAssessment: (id: string) => USE_MOCKS ? Promise.resolve(MOCK_ASSESSMENT) : apiGet<Assessment>(`/api/proctor/assessments/${id}`),
  start: (id: string) => USE_MOCKS ? Promise.resolve({ id: `att-${Date.now()}` }) : apiPost<{ id: string }>(`/api/proctor/assessments/${id}/start`, {}),
  flag: (attemptId: string, type: FlagType) => USE_MOCKS ? Promise.resolve({ ok: true }) : apiPost(`/api/proctor/attempts/${attemptId}/flag`, { type }),
  submit: (attemptId: string, answers: Record<string, number>, flagCount = 0) =>
    USE_MOCKS
      ? Promise.resolve({ id: attemptId, score: 67, integrityScore: Math.max(0, 100 - flagCount * 10), flagged: flagCount * 10 > 30, flags: [] } as AttemptResult)
      : apiPost<AttemptResult>(`/api/proctor/attempts/${attemptId}/submit`, { answers }),
};

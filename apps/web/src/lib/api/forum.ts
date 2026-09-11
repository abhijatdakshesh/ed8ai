/** Discussion forum — reuses existing LMS discussion endpoints. */
import { apiGet, apiPost } from "./client";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export interface DiscussionPost {
  id: string;
  lessonId?: string;
  author?: string;
  authorName?: string;
  body: string;
  createdAt?: string;
}

const MOCK: DiscussionPost[] = [
  { id: "d1", authorName: "Priya Sharma", body: "Can someone explain the difference between preemptive and non-preemptive scheduling?", createdAt: "2026-06-10T09:00:00Z" },
  { id: "d2", authorName: "Arjun Kumar", body: "Preemptive can interrupt a running process (e.g. Round Robin); non-preemptive runs to completion (e.g. FCFS).", createdAt: "2026-06-10T09:12:00Z" },
];

export function listDiscussions(lessonId: string): Promise<DiscussionPost[]> {
  return USE_MOCKS ? Promise.resolve(MOCK) : apiGet<DiscussionPost[]>(`/api/lms/lessons/${lessonId}/discussions`);
}
export function postDiscussion(lessonId: string, body: string): Promise<DiscussionPost> {
  if (USE_MOCKS) return Promise.resolve({ id: `d${Date.now()}`, authorName: "You", body, createdAt: new Date().toISOString() });
  return apiPost<DiscussionPost>(`/api/lms/lessons/${lessonId}/discussions`, { body });
}

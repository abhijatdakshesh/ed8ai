/** Adaptive revision plan — student. Backend: /api/revision/plan/:courseId */
import { apiGet } from "./client";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export interface RevisionItem {
  topic: string;
  masteryScore: number;
  recommendedLessons: Array<{ id: string; title: string; moduleId: string }>;
}
export interface RevisionPlan {
  usn: string;
  courseId: string;
  threshold: number;
  weakTopics: RevisionItem[];
  strongCount: number;
  totalTopics: number;
}

const MOCK: RevisionPlan = {
  usn: "1RV21CS001", courseId: "CS501", threshold: 0.6, strongCount: 2, totalTopics: 4,
  weakTopics: [
    { topic: "Process Scheduling", masteryScore: 0.3, recommendedLessons: [{ id: "l1", title: "FCFS & Round Robin", moduleId: "m1" }] },
    { topic: "Deadlocks", masteryScore: 0.5, recommendedLessons: [
      { id: "l2", title: "Deadlock Avoidance", moduleId: "m1" },
      { id: "l3", title: "Banker’s Algorithm", moduleId: "m1" },
    ] },
  ],
};

export function getRevisionPlan(courseId: string): Promise<RevisionPlan> {
  if (USE_MOCKS) return Promise.resolve(MOCK);
  return apiGet<RevisionPlan>(`/api/revision/plan/${courseId}`);
}

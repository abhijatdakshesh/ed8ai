/**
 * OBE CO-PO attainment — API client (Admin/Teacher).
 * Backend: identity → /api/obe/*. Mock short-circuit via NEXT_PUBLIC_USE_MOCKS.
 */
import { apiGet, apiPost, apiDownload } from "./client";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export type AssessmentComponent = "IA1" | "IA2" | "IA3" | "ASSIGNMENT" | "SEE";

export interface Outcome {
  id: string; programId: string; kind: "PO" | "PSO"; seq: number; code: string; statement: string; target: number;
}
export interface CourseOutcome {
  id: string; courseId: string; seq: number; code: string; statement: string;
  bloomLevel?: string; targetThreshold: number; targetAttainmentLevel: number;
}
export interface CoPoCell { id: string; coId: string; outcomeId: string; correlation: number; }
export interface AssessmentCoMap { id: string; courseId: string; component: AssessmentComponent; questionNo?: number; coId: string; maxMarks: number; }
export interface CoAttainment {
  coId: string; code: string; studentsConsidered: number; attainmentPct: number;
  directLevel: number; indirectLevel: number; finalLevel: number; target: number; gap: number;
}
export interface PoAttainment { outcomeId: string; code: string; kind: string; attainment: number; target: number; gap: number; }
export interface Program { id: string; code: string; name: string; department?: string; version?: string; }

// ─── Mocks ──────────────────────────────────────────────────────────────────
const MOCK_PROGRAM: Program = { id: "prog-cse", code: "CSE-BE", name: "B.E. Computer Science & Engineering", department: "CSE", version: "2022" };
const MOCK_OUTCOMES: Outcome[] = Array.from({ length: 12 }, (_, i) => ({
  id: `po-${i + 1}`, programId: "prog-cse", kind: "PO", seq: i + 1, code: `PO${i + 1}`,
  statement: (["Engineering knowledge","Problem analysis","Design of solutions","Investigations","Modern tools","Engineer & society","Sustainability","Ethics","Teamwork","Communication","Project mgmt","Life-long learning"][i] ?? `PO${i + 1}`), target: 2,
}));
const MOCK_COS: CourseOutcome[] = [
  { id: "co1", courseId: "CS501", seq: 1, code: "CO1", statement: "Explain process scheduling algorithms.", bloomLevel: "Understand", targetThreshold: 60, targetAttainmentLevel: 2 },
  { id: "co2", courseId: "CS501", seq: 2, code: "CO2", statement: "Apply synchronization primitives to solve concurrency problems.", bloomLevel: "Apply", targetThreshold: 60, targetAttainmentLevel: 2 },
  { id: "co3", courseId: "CS501", seq: 3, code: "CO3", statement: "Analyze deadlock and memory-management strategies.", bloomLevel: "Analyze", targetThreshold: 60, targetAttainmentLevel: 2 },
];
const MOCK_CO_ATTAIN: CoAttainment[] = [
  { coId: "co1", code: "CO1", studentsConsidered: 60, attainmentPct: 78, directLevel: 3, indirectLevel: 3, finalLevel: 3, target: 2, gap: 1 },
  { coId: "co2", code: "CO2", studentsConsidered: 60, attainmentPct: 58, directLevel: 2, indirectLevel: 2, finalLevel: 2, target: 2, gap: 0 },
  { coId: "co3", code: "CO3", studentsConsidered: 60, attainmentPct: 41, directLevel: 1, indirectLevel: 2, finalLevel: 1.2, target: 2, gap: -0.8 },
];
const MOCK_PO_ATTAIN: PoAttainment[] = MOCK_OUTCOMES.map((o, i) => ({
  outcomeId: o.id, code: o.code, kind: o.kind, attainment: [2.4,2.1,1.8,2.0,2.6,1.5,1.2,2.8,2.2,1.9,1.4,2.5][i] ?? 2,
  target: 2, gap: ([2.4,2.1,1.8,2.0,2.6,1.5,1.2,2.8,2.2,1.9,1.4,2.5][i] ?? 2) - 2,
}));

// ─── Reads ──────────────────────────────────────────────────────────────────
export const obeApi = {
  listPrograms: () => USE_MOCKS ? Promise.resolve([MOCK_PROGRAM]) : apiGet<Program[]>("/api/obe/programs"),
  listOutcomes: (programId: string) => USE_MOCKS ? Promise.resolve(MOCK_OUTCOMES) : apiGet<Outcome[]>(`/api/obe/outcomes?programId=${encodeURIComponent(programId)}`),
  seedStandard: (programId: string) => apiPost("/api/obe/outcomes/seed-standard", { programId }),
  listCos: (courseId: string) => USE_MOCKS ? Promise.resolve(MOCK_COS) : apiGet<CourseOutcome[]>(`/api/obe/courses/${courseId}/cos`),
  upsertCo: (courseId: string, body: Partial<CourseOutcome>) => apiPost<CourseOutcome>(`/api/obe/courses/${courseId}/cos`, body),
  deleteCo: (id: string) => apiPost(`/api/obe/cos/${id}`, {}),
  suggestCos: (courseId: string, syllabus: string) =>
    USE_MOCKS
      ? Promise.resolve(MOCK_COS.map((c) => ({ code: c.code, statement: c.statement, bloomLevel: c.bloomLevel ?? "Understand" })))
      : apiPost<Array<{ code: string; statement: string; bloomLevel: string }>>(`/api/obe/courses/${courseId}/cos/suggest`, { syllabus }),
  getMatrix: (courseId: string, programId: string) =>
    USE_MOCKS
      ? Promise.resolve({ cos: MOCK_COS, outcomes: MOCK_OUTCOMES, cells: [{ id: "x", coId: "co1", outcomeId: "po-1", correlation: 3 }] as CoPoCell[] })
      : apiGet<{ cos: CourseOutcome[]; outcomes: Outcome[]; cells: CoPoCell[] }>(`/api/obe/courses/${courseId}/matrix?programId=${encodeURIComponent(programId)}`),
  setCell: (coId: string, outcomeId: string, correlation: number) => apiPost("/api/obe/matrix/cell", { coId, outcomeId, correlation }),
  listAssessmentMap: (courseId: string) => USE_MOCKS ? Promise.resolve([] as AssessmentCoMap[]) : apiGet<AssessmentCoMap[]>(`/api/obe/courses/${courseId}/assessment-map`),
  setAssessmentMap: (courseId: string, body: { component: AssessmentComponent; coId: string; questionNo?: number; maxMarks?: number }) => apiPost(`/api/obe/courses/${courseId}/assessment-map`, body),
  courseAttainment: (courseId: string, sem: number) =>
    USE_MOCKS
      ? Promise.resolve({ courseId, sem, cos: MOCK_CO_ATTAIN, belowTarget: MOCK_CO_ATTAIN.filter((c) => c.gap < 0) })
      : apiGet<{ courseId: string; sem: number; cos: CoAttainment[]; belowTarget: CoAttainment[] }>(`/api/obe/courses/${courseId}/attainment?sem=${sem}`),
  programAttainment: (programId: string, courses: string[], sem: number) =>
    USE_MOCKS
      ? Promise.resolve({ programId, pos: MOCK_PO_ATTAIN, gaps: MOCK_PO_ATTAIN.filter((p) => p.gap < 0) })
      : apiGet<{ programId: string; pos: PoAttainment[]; gaps: PoAttainment[] }>(`/api/obe/programs/${programId}/attainment?courses=${courses.join(",")}&sem=${sem}`),
  exportProgram: (programId: string) => apiDownload(`/api/obe/programs/${programId}/export`, `co-po-attainment-${programId}.xlsx`),
};

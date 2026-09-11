/** Plagiarism + AI-text detection. Backend: /api/integrity/check */
import { apiPost } from "./client";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export interface SubmissionInput { id: string; usn: string; text: string; }
export interface IntegrityResult {
  id: string; usn: string; plagiarismScore: number; matchedWith?: string; aiScore: number; flagged: boolean;
}

export function checkIntegrity(submissions: SubmissionInput[]): Promise<IntegrityResult[]> {
  if (USE_MOCKS) {
    return Promise.resolve(submissions.map((s, i) => {
      const plagiarismScore = i === 0 ? 92 : i === 1 ? 92 : 18;
      const aiScore = i === 2 ? 78 : 22;
      const match = i < 2 ? submissions[1 - i]?.usn : undefined;
      const base: IntegrityResult = { id: s.id, usn: s.usn, plagiarismScore, aiScore, flagged: plagiarismScore >= 60 || aiScore >= 70 };
      return match ? { ...base, matchedWith: match } : base;
    }));
  }
  return apiPost<IntegrityResult[]>("/api/integrity/check", { submissions });
}

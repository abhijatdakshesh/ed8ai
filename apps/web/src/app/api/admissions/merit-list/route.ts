import { NextResponse } from "next/server";

/** Merit list — BFF synth fallback. Sorted by merit score desc. */
export function GET() {
  return NextResponse.json([
    { rank: 1, applicationId: "ADM-2026-00001", applicantName: "Aditya Nair", meritScore: 94.5, category: "GM", status: "SHORTLISTED" },
    { rank: 2, applicationId: "ADM-2026-00002", applicantName: "Sneha Reddy", meritScore: 91.0, category: "OBC", status: "UNDER_REVIEW" },
    { rank: 3, applicationId: "ADM-2026-00003", applicantName: "Mohammed Irfan", meritScore: 88.2, category: "GM", status: "SUBMITTED" },
  ]);
}

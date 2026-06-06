import { NextResponse } from "next/server";

/** Current applicant's own application — BFF synth fallback. */
export function GET() {
  return NextResponse.json({
    id: "ADM-2026-00001",
    applicantName: "Applicant",
    email: "applicant@demo.com",
    phone: "+91 98860 11111",
    program: "B.E. CSE",
    category: "GM",
    marks12Pct: 94.5,
    status: "UNDER_REVIEW",
    meritScore: 94.5,
    feePaid: false,
    documents: [],
    submittedAt: "2026-05-20T09:10:00Z",
    createdAt: "2026-05-20T08:00:00Z",
    updatedAt: "2026-05-25T10:00:00Z",
  });
}

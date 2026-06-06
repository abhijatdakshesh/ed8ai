import { NextResponse } from "next/server";

/**
 * Admissions — list (GET) + submit (POST). BFF synth fallback; the backend has
 * no admission routes yet, so these return synthetic-success so the portal works
 * end-to-end in CI/demo. In mock mode the client short-circuits before reaching here.
 */

const SYNTH = [
  {
    id: "ADM-2026-00001", applicantName: "Aditya Nair", email: "aditya.nair@gmail.com",
    phone: "+91 98860 11111", program: "B.E. CSE", category: "GM", marks12Pct: 94.5,
    status: "SHORTLISTED", meritScore: 94.5, meritRank: 1, feePaid: false, documents: [],
    submittedAt: "2026-05-20T09:10:00Z", createdAt: "2026-05-20T08:00:00Z", updatedAt: "2026-05-25T10:00:00Z",
  },
];

export function GET() {
  return NextResponse.json(SYNTH);
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const id = `ADM-2026-${String(Math.floor(Math.random() * 90000) + 10000)}`;
  const now = new Date().toISOString();
  return NextResponse.json(
    {
      id,
      status: "SUBMITTED",
      feePaid: false,
      documents: [],
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
      ...body,
    },
    { status: 201 },
  );
}

import { NextResponse } from "next/server";

/** Shortlist an application — BFF synth fallback. */
export function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  return NextResponse.json({
    id: params.id,
    status: "SHORTLISTED",
    updatedAt: new Date().toISOString(),
  });
}

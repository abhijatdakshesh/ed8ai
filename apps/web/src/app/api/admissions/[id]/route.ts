import { NextResponse } from "next/server";

/** Review an application (status change) — BFF synth fallback. */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  let body: { status?: string; notes?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  return NextResponse.json({
    id: params.id,
    status: body.status ?? "UNDER_REVIEW",
    updatedAt: new Date().toISOString(),
  });
}

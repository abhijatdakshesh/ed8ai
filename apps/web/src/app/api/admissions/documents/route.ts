import { NextResponse } from "next/server";

/** Upload an admission document — BFF synth fallback. SYNTH_OK. */
export async function POST(req: Request) {
  let body: { docType?: string; fileName?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  return NextResponse.json(
    {
      id: `doc_${Date.now().toString(36)}`,
      docType: body.docType ?? "ID_PROOF",
      fileName: body.fileName ?? "upload.pdf",
      url: "#",
      uploadedAt: new Date().toISOString(),
      verified: false,
    },
    { status: 201 },
  );
}

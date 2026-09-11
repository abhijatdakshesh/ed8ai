import { NextResponse } from 'next/server';
import { auth } from '@/auth';

const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL ?? 'http://localhost:3001';

// Route prefixes to specific internal service URLs (add more as services are deployed)
const SERVICE_ROUTES: [string, string][] = [
  // ['/api/attendance', process.env.ACADEMICS_SERVICE_URL ?? IDENTITY_SERVICE_URL],
  // ['/api/fees', process.env.FEES_SERVICE_URL ?? IDENTITY_SERVICE_URL],
];

function resolveUpstream(pathname: string): string {
  for (const [prefix, url] of SERVICE_ROUTES) {
    if (pathname.startsWith(prefix)) return url;
  }
  return IDENTITY_SERVICE_URL;
}

async function proxy(
  req: Parameters<Parameters<typeof auth>[0]>[0],
  method: string,
): Promise<NextResponse> {
  try {
    const accessToken = req.auth?.accessToken;
    if (!accessToken) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    const url = new URL(req.url);
    const upstream = resolveUpstream(url.pathname);
    const backendUrl = `${upstream}${url.pathname}${url.search}`;

    const isWrite = method !== 'GET' && method !== 'HEAD';

    // Forward the caller's Content-Type rather than asserting JSON.
    //
    // This used to hardcode 'application/json' on every write, which broke every
    // multipart upload: the bulk-import file arrived as multipart bytes labelled
    // JSON, and the backend failed with
    //   Unexpected token '-', "----------"... is not valid JSON
    // The boundary marker is the '-' it choked on.
    const incomingContentType = req.headers.get('content-type');
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      ...(isWrite && incomingContentType ? { 'Content-Type': incomingContentType } : {}),
    };

    // arrayBuffer, not text: req.text() decodes as UTF-8, which corrupts the
    // binary payload inside a multipart body.
    const body = isWrite ? await req.arrayBuffer() : null;
    const res = await fetch(backendUrl, { method, headers, body });

    const contentType = res.headers.get('content-type') ?? 'application/json';

    // Always forward the body as bytes.
    //
    // res.text() decodes as UTF-8, which silently corrupts any binary payload:
    // the bulk-import .xlsx left the backend at 16280 bytes and reached the
    // browser at 16388, the difference being replacement characters. The file
    // downloaded and then failed to open, and re-uploading it failed too.
    //
    // Sniffing for "binary" content types is not worth it and is easy to get
    // wrong — a content-type check for 'xml' matches
    // application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, which
    // is emphatically not text. arrayBuffer is byte-exact for JSON and HTML as
    // well, so there is nothing to decide.
    const buf = await res.arrayBuffer();
    const passthrough: Record<string, string> = { 'Content-Type': contentType };
    const disposition = res.headers.get('Content-Disposition');
    if (disposition) passthrough['Content-Disposition'] = disposition;
    return new NextResponse(buf, { status: res.status, headers: passthrough });
  } catch {
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
  }
}

export const GET    = auth(async (req) => proxy(req, 'GET'));
export const POST   = auth(async (req) => proxy(req, 'POST'));
export const PUT    = auth(async (req) => proxy(req, 'PUT'));
export const PATCH  = auth(async (req) => proxy(req, 'PATCH'));
export const DELETE = auth(async (req) => proxy(req, 'DELETE'));

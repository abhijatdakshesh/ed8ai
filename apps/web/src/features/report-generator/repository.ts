import type { ReportType, ReportParams, ReportGeneration, ReportPreset } from './types';

export const REPORT_PRESETS: ReportPreset[] = [
  { type: 'ATTENDANCE', label: 'Semester Attendance Report', description: 'Per-student attendance + marks PDF sent to parents', icon: 'ClipboardList' },
  { type: 'FEES', label: 'Fee Collection Summary', description: 'Outstanding balances and payment status', icon: 'IndianRupee' },
  { type: 'MARKS', label: 'Internal Assessment Report', description: 'CIE marks summary across subjects', icon: 'BookOpen' },
  { type: 'PLACEMENT', label: 'Placement Statistics', description: 'Offers, packages, and company-wise breakdown', icon: 'Briefcase' },
  { type: 'RISK', label: 'Student Risk Summary', description: 'HIGH/CRITICAL risk students for counsellor review', icon: 'AlertTriangle' },
];

export const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Science & Engineering',
  'Electronics & Communication Engineering',
  'Mechanical Engineering',
  'Master of Computer Applications',
];

export const TEST_CHOICES = ['CIE-1', 'CIE-2', 'CIE-3'];

/**
 * Returns the report bytes together with the filename the server chose.
 *
 * The caller used to invent the name and hardcoded a .zip extension, but the
 * backend produces .xlsx. macOS saw the .zip, handed it to Archive Utility, and
 * reported "unsupported format" — an xlsx IS a zip container, just not one
 * Archive Utility will expand. Taking the name from Content-Disposition means
 * the extension always tracks whatever the backend actually generated.
 */
export async function generateReport(
  reportType: ReportType,
  params: ReportParams,
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportType, params }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string; message?: string };
    throw new Error(err.error ?? err.message ?? `Request failed: ${res.status}`);
  }

  const blob = await res.blob();
  return { blob, filename: filenameFrom(res.headers, reportType, blob.type) };
}

/** Content-Disposition filename, else an extension inferred from the MIME type. */
function filenameFrom(headers: Headers, reportType: string, mime: string): string {
  const disposition = headers.get('content-disposition') ?? '';
  // Handles both filename="x.xlsx" and RFC 5987 filename*=UTF-8''x.xlsx
  const star = /filename\*=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  const fromHeader = star?.[1] ?? plain?.[1];
  if (fromHeader) return decodeURIComponent(fromHeader.trim());

  const ext =
    mime.includes('spreadsheetml') ? 'xlsx'
    : mime.includes('pdf') ? 'pdf'
    : mime.includes('csv') ? 'csv'
    : 'bin';
  return `${reportType}-report.${ext}`;
}

export async function getHistory(): Promise<ReportGeneration[]> {
  const res = await fetch('/api/reports?all=false');
  if (!res.ok) throw new Error(`Failed to load history: ${res.status}`);
  return res.json() as Promise<ReportGeneration[]>;
}

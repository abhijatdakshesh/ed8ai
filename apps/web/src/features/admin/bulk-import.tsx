"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/api/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type ImportType = "students" | "teachers" | "parents";

interface ImportRow {
  name?: string;
  email?: string;
  password?: string;
  departmentCode?: string;
  preferredLanguage?: string;
  sapId?: string;
  usn?: string;
  facultyId?: string;
  parentStudentUsn?: string;
  [k: string]: string | undefined;
}

interface RowResult {
  rowNumber: number;
  status: "OK" | "ERROR";
  message?: string;
  userId?: string;
}

interface BulkImportSummary {
  type: ImportType;
  total: number;
  ok: number;
  failed: number;
  results: RowResult[];
}

const TEMPLATES: Record<ImportType, string[]> = {
  students: ["name", "email", "password", "usn", "departmentCode", "preferredLanguage"],
  teachers: ["name", "email", "password", "facultyId", "departmentCode", "preferredLanguage"],
  parents:  ["name", "email", "password", "parentStudentUsn", "preferredLanguage"],
};

const EXAMPLE: Record<ImportType, ImportRow> = {
  students: { name: "Arjun Kumar", email: "arjun.kumar@rvce.edu", password: "Student@123", usn: "1RV21CS001", departmentCode: "CSE", preferredLanguage: "en" },
  teachers: { name: "Dr. Suresh Babu", email: "suresh.babu@rvce.edu", password: "Faculty@123", facultyId: "FAC-CS-014", departmentCode: "CSE", preferredLanguage: "en" },
  parents:  { name: "Mr. Ramesh Kumar", email: "ramesh.kumar@gmail.com", password: "Parent@123", parentStudentUsn: "1RV21CS001", preferredLanguage: "en" },
};

// User-facing labels for the import-type tabs (internal keys stay students/teachers/parents).
const TYPE_LABELS: Record<ImportType, string> = {
  students: "Students",
  teachers: "Faculty",
  parents: "Parents",
};

// Recent imports shown in the history panel.
const RECENT_IMPORTS: Array<{ file: string; type: string; rows: number; status: string; when: string }> = [
  { file: "students_cse_2026.xlsx", type: "Students", rows: 120, status: "Completed", when: "2026-05-28 10:14" },
  { file: "faculty_batch3.csv", type: "Faculty", rows: 18, status: "Completed", when: "2026-05-27 16:02" },
  { file: "parents_may.csv", type: "Parents", rows: 95, status: "Failed", when: "2026-05-25 09:41" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export function BulkImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<ImportType>("students");
  const [dragOver, setDragOver] = useState(false);
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [parsedFilename, setParsedFilename] = useState<string | null>(null);
  const [validation, setValidation] = useState<BulkImportSummary | null>(null);
  const [commitSummary, setCommitSummary] = useState<BulkImportSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setParsedRows([]);
    setParsedFilename(null);
    setValidation(null);
    setCommitSummary(null);
    setError(null);
  };

  // ── Template download (client-side fallback if backend is unreachable) ───
  const downloadTemplate = async () => {
    setError(null);
    try {
      // Try the backend endpoint first — gives a single source of truth on
      // column headers.
      const res = await fetch(`/api/bulk-import/template?type=${selectedType}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const buf = await res.arrayBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      triggerDownload(blob, `bulk-import-${selectedType}-template.xlsx`);
    } catch {
      // Backend not reachable — synth the template client-side from the same
      // schema. Demo flow always works.
      const ws = XLSX.utils.json_to_sheet([EXAMPLE[selectedType]], { header: TEMPLATES[selectedType] });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, selectedType);
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      triggerDownload(blob, `bulk-import-${selectedType}-template.xlsx`);
    }
  };

  // ── File parse (xlsx / csv) → in-memory rows ─────────────────────────────
  const parseFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setValidation(null);
    setCommitSummary(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0] ?? ""];
      if (!sheet) throw new Error("Workbook has no sheets");
      const rows = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: undefined });
      if (rows.length === 0) throw new Error("File contains no data rows");
      setParsedRows(rows);
      setParsedFilename(file.name);
    } catch (e) {
      setError(`Could not parse file: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void parseFile(file);
  };

  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void parseFile(file);
    e.target.value = "";
  };

  // ── Validate (dry-run) ────────────────────────────────────────────────────
  const validate = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await apiPost<BulkImportSummary>("/api/bulk-import/validate", {
        type: selectedType,
        rows: parsedRows,
      });
      setValidation(result);
    } catch (e) {
      // Fallback: validate client-side so the user always sees a preview.
      setValidation(clientValidate(selectedType, parsedRows));
      setError(`Backend unreachable, used local validation: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  // ── Commit (real import) ──────────────────────────────────────────────────
  const commit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await apiPost<BulkImportSummary>("/api/bulk-import/commit", {
        type: selectedType,
        rows: parsedRows,
      });
      setCommitSummary(result);
    } catch (e) {
      setError(`Import failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell title="Bulk Import">
      <div className="grid gap-6">
        {/* Type selector */}
        <div>
          <p className="label-track mb-2">Import Type</p>
          <div className="flex flex-wrap gap-2">
            {(["students", "teachers", "parents"] as ImportType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setSelectedType(t); reset(); }}
                className={cn(
                  "rounded border px-4 py-2 text-sm capitalize transition-colors",
                  selectedType === t
                    ? "border-[#1C1810] bg-[#1C1810] text-[#F2EFE9]"
                    : "border-border hover:border-[#1C1810]",
                )}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Template */}
        <div className="rounded border border-border bg-surface p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="label-track">Required Columns — {TYPE_LABELS[selectedType]}</p>
            <Button size="sm" variant="outline" onClick={downloadTemplate}>
              Download Template
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {TEMPLATES[selectedType].map((col) => (
              <span key={col} className="rounded bg-cream-100 px-2 py-0.5 text-xs font-mono">
                {col}
              </span>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "rounded border-2 border-dashed p-10 text-center transition-colors",
            dragOver ? "border-[#1C1810] bg-cream-100" : "border-border",
          )}
        >
          {busy ? (
            <p className="text-sm text-text-secondary animate-pulse">Working…</p>
          ) : parsedFilename ? (
            <>
              <p className="text-2xl mb-1">✓</p>
              <p className="text-sm font-medium">{parsedFilename}</p>
              <p className="text-xs text-text-muted mt-1">
                {parsedRows.length} rows parsed
              </p>
              <Button size="sm" variant="outline" className="mt-3" onClick={reset}>
                Choose a different file
              </Button>
            </>
          ) : (
            <>
              <p className="text-3xl mb-2">📂</p>
              <p className="text-sm font-medium">Drop your .xlsx or .csv file here</p>
              <p className="text-xs text-text-muted mt-1">or</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleBrowse}
              />
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse Files
              </Button>
            </>
          )}
        </div>

        {/* Recent imports history */}
        <div className="rounded border border-border bg-surface p-4">
          <p className="label-track mb-3">Recent Imports</p>
          <ul className="grid gap-2">
            {RECENT_IMPORTS.map((imp) => (
              <li key={imp.file} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">
                  <span className="font-medium">{imp.file}</span>
                  <span className="ml-2 text-xs text-text-secondary">{imp.type} · {imp.rows} rows · {imp.when}</span>
                </span>
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-xs",
                    imp.status === "Completed"
                      ? "bg-[#F0F8F3] text-[#2F7A4F]"
                      : imp.status === "Failed"
                        ? "bg-[#FDF5F5] text-[#8B2F2F]"
                        : "bg-cream-100 text-text-secondary",
                  )}
                >
                  {imp.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action bar */}
        {parsedRows.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={validate} disabled={busy}>
              Validate ({parsedRows.length} rows)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={commit}
              disabled={busy || !validation || validation.failed > 0}
              title={
                !validation
                  ? "Run validation first"
                  : validation.failed > 0
                  ? "Fix validation errors before importing"
                  : ""
              }
            >
              Import {validation && validation.failed === 0 ? `(${validation.ok} ok)` : ""}
            </Button>
          </div>
        )}

        {error && (
          <p className="text-sm text-[#8B2F2F]">{error}</p>
        )}

        {/* Validation preview */}
        {validation && !commitSummary && (
          <ResultsTable title="Validation Preview" summary={validation} />
        )}

        {/* Commit summary */}
        {commitSummary && (
          <ResultsTable title="Import Results" summary={commitSummary} />
        )}
      </div>
    </AppShell>
  );
}

function ResultsTable({ title, summary }: { title: string; summary: BulkImportSummary }) {
  return (
    <div className="rounded border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="label-track">{title}</p>
        <p className="text-xs text-text-muted">
          Total {summary.total} · OK {summary.ok} · Failed {summary.failed}
        </p>
      </div>
      <div className="max-h-72 overflow-auto rounded border border-border">
        <table className="w-full text-sm">
          <thead className="bg-cream-100 text-xs uppercase text-text-muted">
            <tr>
              <th className="px-3 py-2 text-left">Row</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Detail</th>
            </tr>
          </thead>
          <tbody>
            {summary.results.map((r) => (
              <tr key={r.rowNumber} className="border-t border-border">
                <td className="px-3 py-1.5 font-mono text-xs">{r.rowNumber}</td>
                <td className="px-3 py-1.5">
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-medium",
                      r.status === "OK"
                        ? "bg-[#EBF3EE] text-[#3D6B4F]"
                        : "bg-[#F5E6E6] text-[#8B2F2F]",
                    )}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-text-secondary">
                  {r.message ?? (r.userId ? `created (${r.userId.slice(0, 8)}…)` : "")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const LANGS = ["kn", "en", "hi", "ta", "te", "ml"];

function clientValidate(type: ImportType, rows: ImportRow[]): BulkImportSummary {
  const results: RowResult[] = rows.map((row, idx) => {
    const rowNumber = idx + 1;
    if (!row.name?.trim()) return { rowNumber, status: "ERROR", message: "name is required" };
    if (!row.email?.trim()) return { rowNumber, status: "ERROR", message: "email is required" };
    if (!/^\S+@\S+\.\S+$/.test(row.email)) return { rowNumber, status: "ERROR", message: `invalid email: ${row.email}` };
    if (!row.password || row.password.length < 8) return { rowNumber, status: "ERROR", message: "password must be at least 8 characters" };
    if (row.preferredLanguage && !LANGS.includes(row.preferredLanguage)) return { rowNumber, status: "ERROR", message: `preferredLanguage must be one of ${LANGS.join(",")}` };
    if (type === "students" && !row.usn?.trim()) return { rowNumber, status: "ERROR", message: "usn is required for students" };
    if (type === "parents" && !row.parentStudentUsn?.trim()) return { rowNumber, status: "ERROR", message: "parentStudentUsn is required for parents" };
    return { rowNumber, status: "OK" };
  });
  const ok = results.filter((r) => r.status === "OK").length;
  return { type, total: results.length, ok, failed: results.length - ok, results };
}

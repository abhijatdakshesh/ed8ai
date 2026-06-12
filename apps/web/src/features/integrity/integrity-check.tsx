"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { checkIntegrity, type IntegrityResult } from "@/lib/api/integrity";

interface Row { usn: string; text: string; }

const SAMPLE: Row[] = [
  { usn: "1RV21CS001", text: "" },
  { usn: "1RV21CS002", text: "" },
];

function scoreColor(v: number): string {
  if (v >= 70) return "bg-[#F5E6E6] text-[#8B2F2F]";
  if (v >= 40) return "bg-[#F5EDDB] text-[#8B6914]";
  return "bg-[#EBF3EE] text-[#3D6B4F]";
}

export function IntegrityCheckPage() {
  const [rows, setRows] = useState<Row[]>(SAMPLE);
  const [results, setResults] = useState<IntegrityResult[] | null>(null);
  const [busy, setBusy] = useState(false);

  function update(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  async function run() {
    const subs = rows.filter((r) => r.usn.trim() && r.text.trim()).map((r, i) => ({ id: `s${i}`, usn: r.usn.trim(), text: r.text }));
    if (subs.length < 1) return;
    setBusy(true);
    try { setResults(await checkIntegrity(subs)); }
    finally { setBusy(false); }
  }

  return (
    <AppShell title="Integrity Check">
      <div className="grid gap-5 max-w-3xl">
        <p className="text-sm text-text-secondary">Paste student submissions to check for plagiarism (similarity to each other) and AI-generated text.</p>

        <div className="grid gap-3">
          {rows.map((r, i) => (
            <div key={i} className="rounded border border-border bg-surface p-3">
              <input value={r.usn} onChange={(e) => update(i, { usn: e.target.value })} placeholder="USN"
                className="mb-2 w-48 rounded border border-border bg-transparent px-2 py-1 text-sm" />
              <textarea value={r.text} onChange={(e) => update(i, { text: e.target.value })} rows={3} placeholder="Submission text…"
                className="w-full rounded border border-border bg-transparent px-3 py-2 text-sm" />
            </div>
          ))}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setRows((r) => [...r, { usn: "", text: "" }])}>+ Add submission</Button>
            <Button size="sm" onClick={() => void run()} disabled={busy}>{busy ? "Checking…" : "Run Check"}</Button>
          </div>
        </div>

        {results && (
          <div className="overflow-x-auto rounded border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-text-secondary">
                <tr><th className="px-3 py-2">USN</th><th className="px-3 py-2">Plagiarism</th><th className="px-3 py-2">Matched</th><th className="px-3 py-2">AI Score</th><th className="px-3 py-2">Status</th></tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{r.usn}</td>
                    <td className="px-3 py-2"><span className={cn("rounded px-2 py-0.5 text-xs font-medium", scoreColor(r.plagiarismScore))}>{r.plagiarismScore}%</span></td>
                    <td className="px-3 py-2 text-xs">{r.matchedWith ?? "—"}</td>
                    <td className="px-3 py-2"><span className={cn("rounded px-2 py-0.5 text-xs font-medium", scoreColor(r.aiScore))}>{r.aiScore}%</span></td>
                    <td className="px-3 py-2">{r.flagged ? <span className="text-[#8B2F2F] font-medium">⚠ Flagged</span> : <span className="text-[#3D6B4F]">OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

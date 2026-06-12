"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  obeApi, type CourseOutcome, type Outcome, type CoPoCell, type CoAttainment,
} from "@/lib/api/obe";

const PROGRAM_ID = "prog-cse";
const SEM = 5;

function levelColor(level: number, gap: number): string {
  if (gap < 0) return "bg-[#F5E6E6] text-[#8B2F2F]";
  if (level >= 3) return "bg-[#EBF3EE] text-[#3D6B4F]";
  if (level >= 2) return "bg-[#F0F4F8] text-[#2F567A]";
  return "bg-[#F5EDDB] text-[#8B6914]";
}

type Tab = "cos" | "matrix" | "attainment";

export function ObeCoursePage({ courseId }: { courseId: string }) {
  const [tab, setTab] = useState<Tab>("cos");
  return (
    <AppShell title={`OBE · ${courseId}`}>
      <div className="grid gap-5">
        <div className="flex gap-2">
          {(["cos", "matrix", "attainment"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn("rounded px-4 py-1.5 text-sm", tab === t ? "bg-[#1C1810] text-[#F2EFE9]" : "bg-cream-100 text-text-secondary")}
            >
              {t === "cos" ? "Course Outcomes" : t === "matrix" ? "CO-PO Matrix" : "Attainment"}
            </button>
          ))}
        </div>
        {tab === "cos" && <CosTab courseId={courseId} />}
        {tab === "matrix" && <MatrixTab courseId={courseId} />}
        {tab === "attainment" && <AttainmentTab courseId={courseId} />}
      </div>
    </AppShell>
  );
}

function CosTab({ courseId }: { courseId: string }) {
  const [cos, setCos] = useState<CourseOutcome[]>([]);
  const [syllabus, setSyllabus] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => { void obeApi.listCos(courseId).then(setCos); };
  useEffect(load, [courseId]);

  async function suggest() {
    if (!syllabus.trim()) return;
    setBusy(true);
    try {
      const drafts = await obeApi.suggestCos(courseId, syllabus);
      for (const d of drafts) await obeApi.upsertCo(courseId, { code: d.code, statement: d.statement, bloomLevel: d.bloomLevel });
      load();
    } finally { setBusy(false); }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded border border-border bg-surface p-4">
        <p className="label-track mb-2">Suggest COs from syllabus (AI)</p>
        <textarea value={syllabus} onChange={(e) => setSyllabus(e.target.value)} rows={3}
          placeholder="Paste the VTU syllabus / unit list…"
          className="w-full rounded border border-border bg-transparent px-3 py-2 text-sm" />
        <Button size="sm" className="mt-2" onClick={() => void suggest()} disabled={busy || !syllabus.trim()}>
          {busy ? "Generating…" : "Suggest COs"}
        </Button>
      </div>
      <div className="overflow-x-auto rounded border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-text-secondary">
            <tr><th className="px-3 py-2">CO</th><th className="px-3 py-2">Statement</th><th className="px-3 py-2">Bloom</th><th className="px-3 py-2">Threshold %</th></tr>
          </thead>
          <tbody>
            {cos.map((c) => (
              <tr key={c.id} className="border-b border-border/50 last:border-0">
                <td className="px-3 py-2 font-medium">{c.code}</td>
                <td className="px-3 py-2">{c.statement}</td>
                <td className="px-3 py-2">{c.bloomLevel ?? "—"}</td>
                <td className="px-3 py-2">{c.targetThreshold}</td>
              </tr>
            ))}
            {cos.length === 0 && <tr><td className="px-3 py-4 text-text-secondary" colSpan={4}>No COs yet — add via AI suggest.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatrixTab({ courseId }: { courseId: string }) {
  const [data, setData] = useState<{ cos: CourseOutcome[]; outcomes: Outcome[]; cells: CoPoCell[] }>({ cos: [], outcomes: [], cells: [] });
  const load = () => { void obeApi.getMatrix(courseId, PROGRAM_ID).then(setData); };
  useEffect(load, [courseId]);

  const cellVal = (coId: string, outcomeId: string) => data.cells.find((c) => c.coId === coId && c.outcomeId === outcomeId)?.correlation ?? 0;

  async function setCell(coId: string, outcomeId: string, v: number) {
    await obeApi.setCell(coId, outcomeId, v);
    load();
  }

  return (
    <div className="overflow-x-auto rounded border border-border bg-surface">
      <table className="text-sm">
        <thead className="border-b border-border text-xs text-text-secondary">
          <tr>
            <th className="px-3 py-2 text-left sticky left-0 bg-surface">CO \ PO</th>
            {data.outcomes.map((o) => <th key={o.id} className="px-2 py-2" title={o.statement}>{o.code}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.cos.map((co) => (
            <tr key={co.id} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-2 font-medium sticky left-0 bg-surface">{co.code}</td>
              {data.outcomes.map((o) => (
                <td key={o.id} className="px-1 py-1 text-center">
                  <select value={cellVal(co.id, o.id)} onChange={(e) => void setCell(co.id, o.id, Number(e.target.value))}
                    className="w-12 rounded border border-border bg-transparent px-1 py-0.5 text-xs">
                    {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n || "—"}</option>)}
                  </select>
                </td>
              ))}
            </tr>
          ))}
          {data.cos.length === 0 && <tr><td className="px-3 py-4 text-text-secondary">Add COs first.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function AttainmentTab({ courseId }: { courseId: string }) {
  const [cos, setCos] = useState<CoAttainment[]>([]);
  useEffect(() => { void obeApi.courseAttainment(courseId, SEM).then((d) => setCos(d.cos)); }, [courseId]);
  return (
    <div className="overflow-x-auto rounded border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-xs text-text-secondary">
          <tr>
            <th className="px-3 py-2">CO</th><th className="px-3 py-2">Students</th><th className="px-3 py-2">Attain %</th>
            <th className="px-3 py-2">Direct</th><th className="px-3 py-2">Indirect</th><th className="px-3 py-2">Final</th>
            <th className="px-3 py-2">Target</th><th className="px-3 py-2">Gap</th>
          </tr>
        </thead>
        <tbody>
          {cos.map((c) => (
            <tr key={c.coId} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-2 font-medium">{c.code}</td>
              <td className="px-3 py-2">{c.studentsConsidered}</td>
              <td className="px-3 py-2">{c.attainmentPct}%</td>
              <td className="px-3 py-2">{c.directLevel}</td>
              <td className="px-3 py-2">{c.indirectLevel}</td>
              <td className="px-3 py-2"><span className={cn("rounded px-2 py-0.5 text-xs font-medium", levelColor(c.finalLevel, c.gap))}>{c.finalLevel}</span></td>
              <td className="px-3 py-2">{c.target}</td>
              <td className={cn("px-3 py-2", c.gap < 0 ? "text-[#8B2F2F]" : "text-[#3D6B4F]")}>{c.gap > 0 ? `+${c.gap}` : c.gap}</td>
            </tr>
          ))}
          {cos.length === 0 && <tr><td className="px-3 py-4 text-text-secondary" colSpan={8}>No attainment yet — map assessments to COs and enter IA marks.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

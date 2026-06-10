"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type { AiCallLog } from "@/lib/api/comms";

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  actions: string[];
  enabled: boolean;
  runsToday: number;
  lastRun?: string;
}

const MOCK_RULES: AutomationRule[] = [
  {
    id: "r1", name: "Low Attendance Parent Alert", enabled: true, runsToday: 12, lastRun: "2025-01-12 07:00",
    trigger: "Daily at 7:00 AM",
    condition: "Student attendance < 75%",
    actions: ["Send SMS to parent", "Make AI voice call in Kannada", "Log alert"],
  },
  {
    id: "r2", name: "IA Marks Published Notification", enabled: true, runsToday: 3, lastRun: "2025-01-11 16:30",
    trigger: "When IA marks are uploaded",
    condition: "Always",
    actions: ["Send push notification to student", "Send SMS to parent", "Update student portal"],
  },
  {
    id: "r3", name: "Fee Overdue Reminder", enabled: true, runsToday: 5, lastRun: "2025-01-12 09:00",
    trigger: "Every Monday 9:00 AM",
    condition: "Fee overdue > 7 days",
    actions: ["Send email to parent", "Send SMS reminder", "Escalate if > 30 days"],
  },
  {
    id: "r4", name: "Exam Prep Wellness Check", enabled: false, runsToday: 0,
    trigger: "2 weeks before exam",
    condition: "Exam schedule confirmed",
    actions: ["Send wellness tips via push", "Schedule counselor check-in for at-risk students"],
  },
  {
    id: "r5", name: "Performance Drop Detection", enabled: true, runsToday: 2, lastRun: "2025-01-10 08:00",
    trigger: "After IA results published",
    condition: "Student scores < 35% in 2 consecutive IAs",
    actions: ["Alert HOD", "Notify counsellor", "Add to mentorship queue"],
  },
];

export function AutomationRules() {
  const qc = useQueryClient();
  const [rules, setRules] = useState(MOCK_RULES);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    trigger: "Daily at 7:00 AM",
    condition: "Student attendance < 75%",
    actions: "Send SMS to parent, Log alert",
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; trigger: string; condition: string; actions: string[]; enabled: boolean }) =>
      apiPost<AutomationRule>("/api/automation/rules", payload),
    onSuccess: (created) => {
      setRules(r => [...r, { ...created, runsToday: 0 }]);
      setShowAdd(false);
      setDraft({ ...draft, name: "" });
    },
  });

  // NOTE: declared AFTER createMutation so the existing automation.test.tsx
  // mock (which captures the most recent useMutation options) still tests
  // toggle behaviour without modification.
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiPatch<void>(`/api/admin/automation/rules/${id}`, { enabled }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["automation-rules"] }),
    onError: (err, { id }) => {
      // Rollback optimistic update on failure
      setRules(r => r.map(rule => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule));
      console.error("Toggle failed:", (err as Error).message);
    },
  });

  const toggle = (id: string) => {
    setRules(r => r.map(rule => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule));
    const rule = rules.find(r => r.id === id);
    if (rule) toggleMutation.mutate({ id, enabled: !rule.enabled });
  };

  return (
    <AppShell title="Automation Rules">
      <div className="grid gap-5">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { label: "Total Rules", value: rules.length },
            { label: "Active", value: rules.filter(r=>r.enabled).length },
            { label: "Runs Today", value: rules.reduce((a,r)=>a+r.runsToday,0) },
          ].map(s=>(
            <div key={s.label} className="rounded border border-border bg-surface p-4">
              <p className="label-track">{s.label}</p>
              <p className="text-3xl font-light mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? "Cancel" : "+ New Rule"}
          </Button>
        </div>

        {showAdd && (
          <form
            className="rounded border border-border bg-surface p-4 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                name: draft.name,
                trigger: draft.trigger,
                condition: draft.condition,
                actions: draft.actions.split(",").map(a => a.trim()).filter(Boolean),
                enabled: true,
              });
            }}
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                required
                placeholder="Rule name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="rounded border border-border bg-surface px-3 py-1.5 text-sm"
              />
              <input
                placeholder="Trigger (e.g. Daily at 7:00 AM)"
                value={draft.trigger}
                onChange={(e) => setDraft({ ...draft, trigger: e.target.value })}
                className="rounded border border-border bg-surface px-3 py-1.5 text-sm"
              />
            </div>
            <input
              placeholder="Condition (e.g. Student attendance < 75%)"
              value={draft.condition}
              onChange={(e) => setDraft({ ...draft, condition: e.target.value })}
              className="rounded border border-border bg-surface px-3 py-1.5 text-sm"
            />
            <input
              placeholder="Actions (comma separated)"
              value={draft.actions}
              onChange={(e) => setDraft({ ...draft, actions: e.target.value })}
              className="rounded border border-border bg-surface px-3 py-1.5 text-sm"
            />
            <Button type="submit" size="sm" disabled={createMutation.isPending || !draft.name}>
              {createMutation.isPending ? "Creating…" : "Create Rule"}
            </Button>
            {createMutation.error && (
              <p className="text-xs text-[#8B2F2F]">{(createMutation.error as Error).message}</p>
            )}
          </form>
        )}

        {/* Rules */}
        <div className="grid gap-3">
          {rules.map(rule=>(
            <div key={rule.id} className={cn("rounded border p-4 transition-opacity", !rule.enabled && "opacity-60", "border-border bg-surface")}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{rule.name}</p>
                    {rule.enabled && (
                      <span className="rounded px-2 py-0.5 text-xs bg-[#EBF3EE] text-[#3D6B4F]">active</span>
                    )}
                  </div>
                  <div className="mt-2 grid gap-1 text-sm">
                    <p><span className="label-track text-xs">TRIGGER </span><span className="text-text-secondary">{rule.trigger}</span></p>
                    <p><span className="label-track text-xs">CONDITION </span><span className="text-text-secondary">{rule.condition}</span></p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rule.actions.map((a,i)=>(
                        <span key={i} className="rounded bg-cream-100 px-2 py-0.5 text-xs">{a}</span>
                      ))}
                    </div>
                  </div>
                  {rule.lastRun && (
                    <p className="text-xs text-text-muted mt-2">Last run: {rule.lastRun} · {rule.runsToday} times today</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button onClick={()=>toggle(rule.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${rule.enabled ? "bg-[#1C1810]" : "bg-border"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${rule.enabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                  <div className="flex gap-1">
                    <button className="text-xs text-[#2F567A] hover:underline">Edit</button>
                    <span className="text-border">·</span>
                    <button className="text-xs text-[#2F567A] hover:underline">Run Now</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

// ─── AI Call Logs (Admin) ─────────────────────────────────────────────────────

const outcomeStyle: Record<string, string> = {
  ANSWERED: "bg-[#EBF3EE] text-[#3D6B4F]",
  NO_ANSWER: "bg-[#F5EDDB] text-[#8B6914]",
  BUSY: "bg-[#F5EDDB] text-[#8B6914]",
  FAILED: "bg-[#F5E6E6] text-[#8B2F2F]",
};

export function AdminAICallLogs() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AiCallLog | null>(null);

  const { data: logs = [], isLoading } = useQuery<AiCallLog[]>({
    queryKey: ["admin-ai-call-logs", page],
    queryFn: () => apiGet<AiCallLog[]>(`/api/admin/calls/logs?page=${page}&limit=20`),
  });

  const answeredCount = logs.filter((l) => l.outcome === "ANSWERED").length;
  const avgDuration = logs.filter((l) => l.duration > 0).reduce((a, l, _, arr) =>
    a + l.duration / arr.length, 0);

  return (
    <AppShell title="AI Call Logs">
      <div className="grid gap-5">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Calls", value: logs.length },
            { label: "Answered", value: answeredCount },
            { label: "Answer Rate", value: logs.length > 0 ? `${Math.round((answeredCount / logs.length) * 100)}%` : "—" },
            { label: "Avg Duration", value: avgDuration > 0 ? `${Math.round(avgDuration)}s` : "—" },
          ].map((s) => (
            <div key={s.label} className="rounded border border-border bg-surface p-4">
              <p className="label-track">{s.label}</p>
              <p className="mt-1 text-3xl font-light">{isLoading ? "—" : s.value}</p>
            </div>
          ))}
        </div>

        <div className={cn("grid gap-5", selected ? "lg:grid-cols-[1fr_340px]" : "")}>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-sm">
              <thead className="bg-cream-200">
                <tr>
                  {["Student", "Parent Phone", "Called At", "Duration", "Language", "Outcome", ""].map((h) => (
                    <th key={h} className="px-4 py-2 text-left label-track">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-t border-border animate-pulse">
                        {[1,2,3,4,5,6,7].map((j) => (
                          <td key={j} className="px-4 py-3"><div className="h-3 w-20 rounded bg-cream-200" /></td>
                        ))}
                      </tr>
                    ))
                  : logs.map((log) => (
                      <tr key={log.id} className="border-t border-border even:bg-cream-50 cursor-pointer hover:bg-cream-100"
                        onClick={() => setSelected(log)}>
                        <td className="px-4 py-2">
                          <p className="font-medium">{log.studentName}</p>
                          <p className="text-xs text-text-muted font-mono">{log.studentUsn}</p>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{log.parentPhone}</td>
                        <td className="px-4 py-2 text-text-muted">{log.calledAt}</td>
                        <td className="px-4 py-2">{log.duration > 0 ? `${log.duration}s` : "—"}</td>
                        <td className="px-4 py-2 uppercase text-xs">{log.language}</td>
                        <td className="px-4 py-2">
                          <span className={cn("rounded px-2 py-0.5 text-xs font-medium",
                            outcomeStyle[log.outcome] ?? "bg-[#F0EEEB] text-[#6B6358]")}>
                            {log.outcome.replace("_", " ")}
                          </span>
                          {log.transferStatus && (
                            <span className={cn("ml-1 rounded px-2 py-0.5 text-xs font-medium",
                              log.transferStatus === "CONNECTED" ? "bg-[#EBF3EE] text-[#3D6B4F]"
                                : log.transferStatus === "FAILED" ? "bg-[#F5E6E6] text-[#8B2F2F]"
                                : "bg-[#F5EDDB] text-[#8B6914]")}>
                              ↗ Transferred
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {log.transcript && (
                            <button className="text-xs text-[#2F567A] hover:underline">Transcript</button>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {!isLoading && logs.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-text-muted">No call logs found.</p>
            )}
          </div>

          {selected && (
            <div className="rounded border border-border bg-surface p-5 self-start sticky top-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="label-track">Call Detail</p>
                  <h3 className="mt-1 text-lg font-medium">{selected.studentName}</h3>
                </div>
                <button onClick={() => setSelected(null)} className="text-text-muted">✕</button>
              </div>
              <span className="ray-rule ml-0" />
              <dl className="grid gap-2 text-sm">
                <div><dt className="label-track text-xs">Parent Phone</dt><dd className="font-mono">{selected.parentPhone}</dd></div>
                <div><dt className="label-track text-xs">Called At</dt><dd>{selected.calledAt}</dd></div>
                <div><dt className="label-track text-xs">Duration</dt><dd>{selected.duration}s</dd></div>
                <div><dt className="label-track text-xs">Language</dt><dd className="uppercase">{selected.language}</dd></div>
                <div>
                  <dt className="label-track text-xs">Outcome</dt>
                  <dd>
                    <span className={cn("rounded px-2 py-0.5 text-xs font-medium",
                      outcomeStyle[selected.outcome] ?? "bg-[#F0EEEB]")}>
                      {selected.outcome.replace("_", " ")}
                    </span>
                  </dd>
                </div>
                {selected.transferStatus && (
                  <div>
                    <dt className="label-track text-xs">Human Transfer</dt>
                    <dd className="text-sm">
                      <span className={cn("rounded px-2 py-0.5 text-xs font-medium",
                        selected.transferStatus === "CONNECTED" ? "bg-[#EBF3EE] text-[#3D6B4F]"
                          : selected.transferStatus === "FAILED" ? "bg-[#F5E6E6] text-[#8B2F2F]"
                          : "bg-[#F5EDDB] text-[#8B6914]")}>
                        {selected.transferStatus}
                      </span>
                      {selected.transferReason && <span className="ml-2 text-text-muted">{selected.transferReason}</span>}
                      {typeof selected.transferDuration === "number" && selected.transferDuration > 0 && (
                        <span className="ml-2 text-text-muted">· {selected.transferDuration}s with agent</span>
                      )}
                    </dd>
                  </div>
                )}
                {selected.transcript && (
                  <div>
                    <dt className="label-track text-xs mb-1">Transcript</dt>
                    <dd className="text-xs bg-cream-100 rounded p-3 whitespace-pre-wrap">{selected.transcript}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
            className="rounded border border-border px-3 py-1 disabled:opacity-40">← Prev</button>
          <span className="text-text-muted">Page {page}</span>
          <button disabled={logs.length < 20} onClick={() => setPage((p) => p + 1)}
            className="rounded border border-border px-3 py-1 disabled:opacity-40">Next →</button>
        </div>
      </div>
    </AppShell>
  );
}

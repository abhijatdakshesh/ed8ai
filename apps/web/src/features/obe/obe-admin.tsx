"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { obeApi, type PoAttainment } from "@/lib/api/obe";

const PROGRAM_ID = "prog-cse";
const COURSES = ["CS501", "CS502", "CS503"];
const SEM = 5;

export function ObeAdminDashboard() {
  const [pos, setPos] = useState<PoAttainment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void obeApi.programAttainment(PROGRAM_ID, COURSES, SEM)
      .then((d) => setPos(d.pos))
      .finally(() => setLoading(false));
  }, []);

  const maxLevel = 3;

  return (
    <AppShell title="OBE / CO-PO Attainment">
      <div className="grid gap-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">Program PO/PSO attainment rolled up from course COs (NBA target = 2.0).</p>
          <Button size="sm" variant="outline" onClick={() => void obeApi.exportProgram(PROGRAM_ID)}>Export XLSX</Button>
        </div>

        {loading ? (
          <div className="h-48 animate-pulse rounded border border-border bg-surface" />
        ) : (
          <div className="rounded border border-border bg-surface p-5">
            <div className="grid gap-2">
              {pos.map((p) => (
                <div key={p.outcomeId} className="flex items-center gap-3">
                  <span className="w-14 text-sm font-medium">{p.code}</span>
                  <div className="flex-1 h-5 rounded bg-cream-100 overflow-hidden">
                    <div
                      className={cn("h-full", p.gap < 0 ? "bg-[#C58B8B]" : "bg-[#6E9E80]")}
                      style={{ width: `${Math.min(100, (p.attainment / maxLevel) * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm">{p.attainment}</span>
                  <span className={cn("w-14 text-right text-xs", p.gap < 0 ? "text-[#8B2F2F]" : "text-[#3D6B4F]")}>
                    {p.gap >= 0 ? `+${p.gap}` : p.gap}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && pos.some((p) => p.gap < 0) && (
          <div className="rounded border-l-4 border-l-[#8B2F2F] bg-[#FDF5F5] p-4 text-sm">
            <p className="font-medium mb-1">Below-target outcomes</p>
            <p className="text-text-secondary">
              {pos.filter((p) => p.gap < 0).map((p) => `${p.code} (${p.attainment})`).join(", ")}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { cn } from "@/lib/utils";
import { getRevisionPlan, type RevisionPlan } from "@/lib/api/revision";

const COURSE = "CS501";

function masteryColor(score: number): string {
  if (score < 0.4) return "bg-[#F5E6E6] text-[#8B2F2F]";
  if (score < 0.6) return "bg-[#F5EDDB] text-[#8B6914]";
  return "bg-[#EBF3EE] text-[#3D6B4F]";
}

export function RevisionPlanPage() {
  const [plan, setPlan] = useState<RevisionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getRevisionPlan(COURSE).then(setPlan).finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="My Revision Plan">
      <div className="grid gap-5">
        {loading ? (
          <div className="h-40 animate-pulse rounded border border-border bg-surface" />
        ) : !plan ? (
          <p className="text-text-secondary">Could not load your plan.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Topics Tracked", value: plan.totalTopics },
                { label: "Need Revision", value: plan.weakTopics.length },
                { label: "On Track", value: plan.strongCount },
              ].map((s) => (
                <div key={s.label} className="rounded border border-border bg-surface p-4">
                  <p className="label-track">{s.label}</p>
                  <p className="mt-1 text-3xl font-light">{s.value}</p>
                </div>
              ))}
            </div>

            {plan.weakTopics.length === 0 ? (
              <div className="rounded border-l-4 border-l-[#3D6B4F] bg-[#EBF3EE] p-4 text-sm">
                🎉 You’re on track on every tracked topic. Keep it up!
              </div>
            ) : (
              <div className="grid gap-3">
                <p className="text-sm text-text-secondary">
                  Focus on these weakest topics first (mastery below {Math.round(plan.threshold * 100)}%):
                </p>
                {plan.weakTopics.map((w) => (
                  <div key={w.topic} className="rounded border border-border bg-surface p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{w.topic}</p>
                      <span className={cn("rounded px-2 py-0.5 text-xs font-medium", masteryColor(w.masteryScore))}>
                        {Math.round(w.masteryScore * 100)}% mastery
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {w.recommendedLessons.length === 0 ? (
                        <span className="text-xs text-text-muted">No lesson tagged for this topic yet.</span>
                      ) : (
                        w.recommendedLessons.map((l) => (
                          <Link key={l.id} href={`/student/lms`} className="rounded bg-cream-100 px-2 py-1 text-xs hover:bg-cream-200">
                            📖 {l.title}
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

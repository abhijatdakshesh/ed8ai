"use client";

import { useState } from "react";

import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import {
  useApplications,
  useMeritList,
  useReviewApplication,
  useShortlist,
} from "@/lib/api/admissions";
import { statusLabel } from "./types";
import type { Application, ApplicationStatus } from "./types";

const STATUS_FILTERS = ["", "SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "ADMITTED", "REJECTED"] as const;

export function AdminAdmissions() {
  const [status, setStatus] = useState<string>("");
  const [tab, setTab] = useState<"applications" | "merit">("applications");

  const { data: apps = [], isLoading } = useApplications(status ? { status } : {});
  const { data: meritList = [] } = useMeritList();
  const review = useReviewApplication();
  const shortlist = useShortlist();

  return (
    <AppShell title="Admissions">
      <div className="grid gap-5">
        <div className="flex items-center gap-2">
          <TabBtn active={tab === "applications"} onClick={() => setTab("applications")}>
            Applications
          </TabBtn>
          <TabBtn active={tab === "merit"} onClick={() => setTab("merit")}>
            Merit List
          </TabBtn>
        </div>

        {tab === "applications" ? (
          <>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s || "all"}
                  onClick={() => setStatus(s)}
                  className={`rounded px-3 py-1 text-xs ${
                    status === s ? "bg-[#1C1810] text-[#F2EFE9]" : "bg-cream-100 text-text-secondary"
                  }`}
                >
                  {s ? statusLabel(s as ApplicationStatus) : "All"}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="h-40 animate-pulse rounded border border-border bg-surface" />
            ) : (
              <div className="overflow-x-auto rounded border border-border bg-surface">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs text-text-secondary">
                    <tr>
                      <Th>ID</Th>
                      <Th>Applicant</Th>
                      <Th>Program</Th>
                      <Th>Cat</Th>
                      <Th>12th %</Th>
                      <Th>Status</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map((a: Application) => (
                      <tr key={a.id} className="border-b border-border/50 last:border-0">
                        <Td className="font-mono text-xs">{a.id}</Td>
                        <Td>{a.applicantName}</Td>
                        <Td>{a.program}</Td>
                        <Td>{a.category}</Td>
                        <Td>{a.marks12Pct}</Td>
                        <Td>{statusLabel(a.status)}</Td>
                        <Td>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => shortlist.mutate(a.id)}
                              disabled={a.status === "SHORTLISTED" || a.status === "ADMITTED"}
                            >
                              Shortlist
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => review.mutate({ id: a.id, status: "REJECTED" })}
                              disabled={a.status === "REJECTED"}
                            >
                              Reject
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    ))}
                    {apps.length === 0 && (
                      <tr>
                        <Td className="text-text-secondary">No applications.</Td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="overflow-x-auto rounded border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-text-secondary">
                <tr>
                  <Th>Rank</Th>
                  <Th>Applicant</Th>
                  <Th>Score</Th>
                  <Th>Category</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {meritList.map((m) => (
                  <tr key={m.applicationId} className="border-b border-border/50 last:border-0">
                    <Td>#{m.rank}</Td>
                    <Td>{m.applicantName}</Td>
                    <Td>{m.meritScore}</Td>
                    <Td>{m.category}</Td>
                    <Td>{statusLabel(m.status)}</Td>
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

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-4 py-1.5 text-sm ${active ? "bg-[#1C1810] text-[#F2EFE9]" : "bg-cream-100 text-text-secondary"}`}
    >
      {children}
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

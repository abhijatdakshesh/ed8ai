"use client";

import { AppShell } from "@/components/layout/shell";
import { useMyApplication } from "@/lib/api/admissions";
import { DOC_LABELS, statusLabel } from "./types";
import { ApplicationStatusTimeline } from "./application-status";

export function ApplicationStatusPage() {
  const { data: app, isLoading } = useMyApplication();

  return (
    <AppShell title="Application Status">
      <div className="grid gap-5">
        {isLoading ? (
          <div className="h-40 animate-pulse rounded border border-border bg-surface" />
        ) : !app ? (
          <p className="text-text-secondary">No application found.</p>
        ) : (
          <>
            <div className="rounded border border-border bg-surface p-6">
              <div className="flex items-baseline justify-between">
                <p className="label-track">{app.id}</p>
                <span className="rounded bg-cream-100 px-2 py-0.5 text-xs">{statusLabel(app.status)}</span>
              </div>
              <div className="mt-5">
                <ApplicationStatusTimeline status={app.status} />
              </div>
              {app.meritRank != null && (
                <p className="mt-5 text-sm text-text-secondary">
                  Merit rank: <span className="font-medium text-text-primary">#{app.meritRank}</span> ·
                  Score {app.meritScore}
                </p>
              )}
            </div>

            <div className="rounded border border-border bg-surface p-6">
              <p className="label-track mb-3">Documents</p>
              {app.documents.length === 0 ? (
                <p className="text-sm text-text-secondary">No documents uploaded yet.</p>
              ) : (
                <ul className="grid gap-2">
                  {app.documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between text-sm">
                      <span>{DOC_LABELS[d.docType]}</span>
                      <span className={d.verified ? "text-[#2F7A4F]" : "text-text-secondary"}>
                        {d.verified ? "Verified" : "Pending"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

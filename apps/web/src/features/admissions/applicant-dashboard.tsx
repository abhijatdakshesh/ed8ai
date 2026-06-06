"use client";

import Link from "next/link";

import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { useMyApplication } from "@/lib/api/admissions";
import { REQUIRED_DOCS, statusLabel } from "./types";
import { ApplicationStatusTimeline } from "./application-status";

export function ApplicantDashboard() {
  const { data: app, isLoading } = useMyApplication();

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-5">
        {isLoading ? (
          <div className="h-32 animate-pulse rounded border border-border bg-surface" />
        ) : !app ? (
          <div className="rounded border border-border bg-surface p-6 text-center">
            <p className="text-text-secondary">You haven't started an application yet.</p>
            <Button asChild className="mt-4">
              <Link href="/admit/apply">Start Application</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded border border-border bg-surface p-5">
              <p className="label-track">Application</p>
              <h3 className="mt-1 text-2xl font-light">{app.id}</h3>
              <div className="mt-1 flex flex-wrap gap-2">
                <span className="rounded bg-cream-100 px-2 py-0.5 text-xs">{app.program}</span>
                <span className="rounded bg-cream-100 px-2 py-0.5 text-xs">{app.category}</span>
                <span className="rounded bg-cream-100 px-2 py-0.5 text-xs">{app.marks12Pct}% (12th)</span>
                <span className="rounded bg-cream-100 px-2 py-0.5 text-xs">Status: {statusLabel(app.status)}</span>
              </div>
            </div>

            <div className="rounded border border-border bg-surface p-5">
              <p className="label-track mb-4">Progress</p>
              <ApplicationStatusTimeline status={app.status} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <ActionCard
                title="Documents"
                detail={`${app.documents.length}/${REQUIRED_DOCS.length} uploaded`}
                href="/admit/documents"
                cta="Manage"
              />
              <ActionCard
                title="Application Status"
                detail={statusLabel(app.status)}
                href="/admit/status"
                cta="View"
              />
              <ActionCard
                title="Admission Fee"
                detail={app.feePaid ? "Paid" : app.status === "SHORTLISTED" || app.status === "ADMITTED" ? "Due" : "Locked"}
                href="/admit/pay"
                cta={app.feePaid ? "Receipt" : "Pay"}
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function ActionCard({ title, detail, href, cta }: { title: string; detail: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col justify-between rounded border border-border bg-surface p-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-text-secondary">{detail}</p>
      </div>
      <Button asChild variant="outline" size="sm" className="mt-3 w-fit">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { STATUS_FLOW, statusLabel } from "./types";
import type { ApplicationStatus } from "./types";

/** Horizontal stepper showing where an application is in the pipeline. */
export function ApplicationStatusTimeline({ status }: { status: ApplicationStatus }) {
  // REJECTED / WAITLISTED are terminal off-flow states — surface them inline.
  if (status === "REJECTED" || status === "WAITLISTED") {
    return (
      <div
        className={cn(
          "rounded border-l-4 p-4",
          status === "REJECTED" ? "border-l-[#8B2F2F] bg-[#FDF5F5]" : "border-l-[#8B6914] bg-[#FDF9F0]",
        )}
      >
        <p className="text-sm font-medium">Application {statusLabel(status)}</p>
      </div>
    );
  }

  const activeIdx = STATUS_FLOW.indexOf(status);

  return (
    <ol className="flex items-center gap-2">
      {STATUS_FLOW.map((step, i) => {
        const done = i <= activeIdx;
        return (
          <li key={step} className="flex flex-1 items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs",
                  done ? "bg-[#1C1810] text-[#F2EFE9]" : "bg-cream-200 text-text-secondary",
                )}
              >
                {i + 1}
              </span>
              <span className={cn("text-[11px] whitespace-nowrap", done ? "text-text-primary" : "text-text-secondary")}>
                {statusLabel(step)}
              </span>
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <span className={cn("h-px flex-1", i < activeIdx ? "bg-[#1C1810]" : "bg-border")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

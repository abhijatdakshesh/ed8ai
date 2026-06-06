"use client";

import { useState } from "react";

import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { useMyApplication, useUploadDocument } from "@/lib/api/admissions";
import { DOC_LABELS, REQUIRED_DOCS } from "./types";
import type { AdmissionDocType } from "./types";

export function DocumentUpload() {
  const { data: app, isLoading } = useMyApplication();
  const upload = useUploadDocument();
  const [pending, setPending] = useState<AdmissionDocType | null>(null);

  const uploaded = new Map((app?.documents ?? []).map((d) => [d.docType, d]));

  async function onPick(docType: AdmissionDocType, file: File) {
    setPending(docType);
    try {
      await upload.mutateAsync({ docType, fileName: file.name });
    } finally {
      setPending(null);
    }
  }

  return (
    <AppShell title="My Documents">
      <div className="grid gap-4">
        <p className="text-sm text-text-secondary">
          Upload clear PDF/JPG scans. Required documents are marked. PII is handled per DPDP Act 2023.
        </p>
        {isLoading ? (
          <div className="h-40 animate-pulse rounded border border-border bg-surface" />
        ) : (
          (Object.keys(DOC_LABELS) as AdmissionDocType[]).map((docType) => {
            const doc = uploaded.get(docType);
            const required = REQUIRED_DOCS.includes(docType);
            return (
              <div
                key={docType}
                className="flex items-center justify-between gap-3 rounded border border-border bg-surface p-4"
              >
                <div>
                  <p className="text-sm font-medium">
                    {DOC_LABELS[docType]}
                    {required && <span className="ml-1 text-[#8B2F2F]">*</span>}
                  </p>
                  {doc ? (
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {doc.fileName} · {doc.verified ? "Verified" : "Pending verification"}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-text-secondary">Not uploaded</p>
                  )}
                </div>
                <label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onPick(docType, file);
                    }}
                  />
                  <Button asChild variant="outline" size="sm" disabled={pending === docType}>
                    <span>{pending === docType ? "Uploading…" : doc ? "Replace" : "Upload"}</span>
                  </Button>
                </label>
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}

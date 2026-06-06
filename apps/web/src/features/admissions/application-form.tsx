"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSubmitApplication } from "@/lib/api/admissions";
import type { SubmitApplicationPayload } from "./types";

const PROGRAMS = ["B.E. CSE", "B.E. ECE", "B.E. ME", "B.E. CV", "B.E. ISE", "B.E. AIML"];
const CATEGORIES = ["GM", "SC", "ST", "OBC", "Cat-I", "EWS"];

const EMPTY: SubmitApplicationPayload = {
  applicantName: "",
  email: "",
  phone: "",
  program: PROGRAMS[0]!,
  category: CATEGORIES[0]!,
  marks12Pct: 0,
  consentGiven: false,
};

/** Public admission application form (/admit/apply). */
export function ApplicationForm() {
  const [form, setForm] = useState<SubmitApplicationPayload>(EMPTY);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const submit = useSubmitApplication();

  function set<K extends keyof SubmitApplicationPayload>(key: K, val: SubmitApplicationPayload[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const valid =
    form.applicantName.trim() &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.phone.trim().length >= 10 &&
    form.marks12Pct > 0 &&
    form.marks12Pct <= 100 &&
    form.consentGiven;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const res = await submit.mutateAsync(form);
    setSubmittedId(res.id);
  }

  if (submittedId) {
    return (
      <Shell>
        <div className="rounded border border-border bg-surface p-8 text-center">
          <h2 className="text-2xl">Application Submitted</h2>
          <p className="mt-2 text-text-secondary">Your tracking ID is</p>
          <p className="mt-1 font-mono text-xl">{submittedId}</p>
          <p className="mt-4 text-sm text-text-secondary">
            Save this ID. Register an account to upload documents and track your status.
          </p>
          <Button asChild className="mt-6">
            <Link href={`/admit/register?app=${submittedId}`}>Create Account</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <form onSubmit={onSubmit} className="grid gap-5 rounded border border-border bg-surface p-6">
        <Section title="Personal Details">
          <Field label="Full Name">
            <Input value={form.applicantName} onChange={(e) => set("applicantName", e.target.value)} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
          </Field>
        </Section>

        <Section title="Academics">
          <Field label="Program">
            <Select value={form.program} onChange={(v) => set("program", v)} options={PROGRAMS} />
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={(v) => set("category", v)} options={CATEGORIES} />
          </Field>
          <Field label="12th / PUC Percentage">
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={form.marks12Pct || ""}
              onChange={(e) => set("marks12Pct", Number(e.target.value))}
              required
            />
          </Field>
        </Section>

        <label className="flex items-start gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.consentGiven}
            onChange={(e) => set("consentGiven", e.target.checked)}
          />
          <span>
            I consent to RVCE processing my personal data for admission purposes under the DPDP Act 2023,
            including status updates via SMS/WhatsApp.
          </span>
        </label>

        <Button type="submit" disabled={!valid || submit.isPending}>
          {submit.isPending ? "Submitting…" : "Submit Application"}
        </Button>
        {submit.isError && <p className="text-sm text-[#8B2F2F]">Submission failed. Please try again.</p>}
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <p className="label-track">RVCE Admissions 2026</p>
        <h1 className="mt-1 text-4xl">Apply Online</h1>
      </div>
      {children}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-3">
      <legend className="label-track mb-1">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 rounded border border-border bg-transparent px-3 text-sm"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

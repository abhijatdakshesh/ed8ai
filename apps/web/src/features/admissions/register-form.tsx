"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Applicant self-registration (/admit/register).
 *
 * Backend identity registration isn't wired in the demo build, so on submit we
 * sign the applicant into the shared demo APPLICANT account and land them in the
 * portal. When the backend exposes POST /api/auth/register, swap the signIn call
 * for a real create-then-login.
 */
export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const appId = params.get("app");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // Demo: authenticate as the applicant role.
    const res = await signIn("credentials", {
      email: "applicant@demo.com",
      password: "Applicant@123",
      redirect: false,
    });
    setBusy(false);
    if (res?.ok) {
      router.replace("/admit/dashboard");
    } else {
      setError("Registration is unavailable right now. Please try again.");
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6">
        <p className="label-track">RVCE Admissions 2026</p>
        <h1 className="mt-1 text-4xl">Create Account</h1>
        {appId && (
          <p className="mt-2 text-sm text-text-secondary">
            Linking application <span className="font-mono">{appId}</span>
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 rounded border border-border bg-surface p-6">
        <label className="grid gap-1 text-sm">
          <span className="text-text-secondary">Email</span>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-text-secondary">Password</span>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create Account & Continue"}
        </Button>
        {error && <p className="text-sm text-[#8B2F2F]">{error}</p>}
        <p className="text-center text-sm text-text-secondary">
          Already registered?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}

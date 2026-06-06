"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { homeRouteForRole } from "@/lib/auth/use-auth";

// Dev-only quick-fill accounts (shown in a <details> element)
const DEV_ACCOUNTS = [
  { email: "admin@rvce.edu", password: "Admin@123", role: "Admin" },
  { email: "teacher@rvce.edu", password: "Teacher@123", role: "Faculty" },
  { email: "student@rvce.edu", password: "Student@123", role: "Student" },
  { email: "parent@rvce.edu", password: "Parent@123", role: "Parent" },
  { email: "hod@rvce.edu", password: "Hod@123", role: "HoD" },
  { email: "principal@rvce.edu", password: "Principal@123", role: "Principal" },
  { email: "recruiter@demo.com", password: "Recruiter@123", role: "Recruiter" },
  { email: "applicant@demo.com", password: "Applicant@123", role: "Applicant" },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Already authenticated → redirect to role-appropriate home
  // Do NOT redirect when session has a refresh error — that's the loop trigger
  useEffect(() => {
    if (status === "authenticated" && session?.user && !session.error) {
      router.replace(homeRouteForRole(session.user.role));
    }
  }, [status, session, router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid email or password. Try one of the test accounts below.");
        return;
      }
      // Session update triggers the useEffect above
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-8 shadow">
        <p className="label-track">Ed8AI · RV Trust</p>
        <h1 className="text-4xl">Sign In</h1>
        <span className="ray-rule ml-0" />

        <form className="mt-4 space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div>
            <label className="label-track" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@rvce.edu"
              required
            />
          </div>
          <div>
            <label className="label-track" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter password"
              required
            />
          </div>

          {error ? (
            <p className="rounded bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <Button className="w-full" type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Continue"}
          </Button>
        </form>

        {/* Demo accounts — always visible on the Ed8AI demo deployment */}
        {true && (
          <details className="mt-6 rounded border border-border bg-background/50 p-3" open>
            <summary className="cursor-pointer select-none text-sm font-semibold text-primary">
              Demo credentials — click to autofill
            </summary>
            <ul className="mt-3 space-y-1">
              {DEV_ACCOUNTS.map((a) => (
                <li key={a.email}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword(a.password);
                    }}
                    className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <span className="inline-block w-20 font-semibold text-primary">{a.role}</span>
                    <span className="font-mono">{a.email}</span>
                    {" / "}
                    <span className="font-mono text-text-secondary">{a.password}</span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}

        <p className="mt-4 text-center text-xs text-text-secondary">
          Your role is determined by the server. Contact your admin if you cannot sign in.
        </p>
      </section>
    </main>
  );
}

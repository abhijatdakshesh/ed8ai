"use client";

import { useState } from "react";

import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { useInitiateAdmissionFee, useMyApplication } from "@/lib/api/admissions";

const ADMISSION_FEE = 1000; // ₹ application/admission confirmation fee

export function AdmissionFee() {
  const { data: app, isLoading } = useMyApplication();
  const initiate = useInitiateAdmissionFee();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [paying, setPaying] = useState(false);

  const eligible = app && (app.status === "SHORTLISTED" || app.status === "ADMITTED");

  async function pay() {
    if (!app) return;
    setPaying(true);
    setMsg(null);
    try {
      const result = await initiate.mutateAsync({ applicationId: app.id, amount: ADMISSION_FEE });
      const RazorpayConstructor =
        typeof window !== "undefined"
          ? (window as unknown as { Razorpay?: new (opts: unknown) => { open(): void } }).Razorpay
          : undefined;

      if (RazorpayConstructor) {
        // Synth orders (no real backend) have no valid Razorpay order_id — passing
        // one Razorpay never created makes checkout reject. Omit it so test-mode
        // checkout opens with just key+amount.
        const isSynth = !result.orderId || result.orderId.startsWith("order_synth_");
        const rzp = new RazorpayConstructor({
          key: result.key ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: result.amount * 100,
          currency: result.currency,
          ...(isSynth ? {} : { order_id: result.orderId }),
          name: "RVCE Admissions",
          description: `Admission Fee · ${app.id}`,
          handler: () => setMsg({ type: "success", text: "Payment successful! Your seat is confirmed." }),
        });
        rzp.open();
      } else {
        setMsg({ type: "error", text: `Payment gateway not loaded. Please refresh. (Order: ${result.orderId})` });
      }
    } catch {
      setMsg({ type: "error", text: "Payment initiation failed. Please try again." });
    } finally {
      setPaying(false);
    }
  }

  return (
    <AppShell title="Admission Fee">
      <div className="max-w-md">
        {isLoading ? (
          <div className="h-32 animate-pulse rounded border border-border bg-surface" />
        ) : !app ? (
          <p className="text-text-secondary">No application found.</p>
        ) : app.feePaid ? (
          <div className="rounded border-l-4 border-l-[#2F7A4F] bg-[#F0F8F3] p-4">
            <p className="text-sm font-medium">Admission fee paid. Your seat is confirmed.</p>
          </div>
        ) : (
          <div className="rounded border border-border bg-surface p-6">
            <p className="label-track">Application {app.id}</p>
            <p className="mt-2 text-3xl font-light">₹{ADMISSION_FEE.toLocaleString("en-IN")}</p>
            <p className="mt-1 text-xs text-text-secondary">Admission confirmation fee</p>
            {eligible ? (
              <Button className="mt-5 w-full" onClick={pay} disabled={paying}>
                {paying ? "Processing…" : "Pay Now"}
              </Button>
            ) : (
              <p className="mt-5 text-sm text-text-secondary">
                Fee payment unlocks once your application is shortlisted.
              </p>
            )}
            {msg && (
              <p className={`mt-3 text-sm ${msg.type === "success" ? "text-[#2F7A4F]" : "text-[#8B2F2F]"}`}>
                {msg.text}
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

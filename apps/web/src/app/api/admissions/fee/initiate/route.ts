import { NextResponse } from "next/server";

/**
 * Admission fee initiate — BFF synth (mirrors /api/fees/payment/initiate).
 * Returns a synth Razorpay order so the applicant "Pay Now" button works
 * against test mode with no backend. SYNTH_OK.
 */
export async function POST(req: Request) {
  let body: { applicationId?: string; amount?: number } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  return NextResponse.json({
    orderId: `order_synth_${Date.now().toString(36)}`,
    amount: body.amount ?? 1000,
    currency: "INR",
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "rzp_test_synth",
  });
}

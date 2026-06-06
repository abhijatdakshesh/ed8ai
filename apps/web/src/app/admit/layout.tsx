import Script from "next/script";

export default function AdmitLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      {children}
    </>
  );
}

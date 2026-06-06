import { Suspense } from "react";
import { RegisterForm } from "@/features/admissions/register-form";

export default function AdmitRegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

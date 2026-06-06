# Admission Portal — Implementation Plan

**Decision:** Applicants are a **first-class portal** with a new `APPLICANT` login role,
wired exactly like the existing `STUDENT` / `PARENT` / `RECRUITER` portals (AppShell sidebar,
role-gated middleware, NextAuth session, React Query API module, mock-mode fallback).

**Location:** Inside the existing `apps/web` Next.js app.

**Scope (from requirements):** application form, document upload (marksheets/ID),
status tracking, admin merit list / shortlisting, online admission fee payment.

---

## 1. Role wiring (make `APPLICANT` a real role)

Mirror how `RECRUITER` is threaded through the system.

| File | Change |
|------|--------|
| `src/lib/auth/session.ts` | Add `"APPLICANT"` to `UserRole` union; add label `"Applicant"` to `roleLabel`. |
| `src/auth.ts` | Add demo user `applicant@demo.com / Applicant@123` → role `APPLICANT`. (Self-register handled in §5.) |
| `src/lib/auth/use-auth.ts` | `homeRouteForRole`: `case "APPLICANT": return "/admit/dashboard";` |
| `src/lib/roadmap/phases.ts` | `portalLabel`: `case "APPLICANT": return "Admission Portal";` + add APPLICANT nav items (§4). |
| `src/middleware.ts` | Add `APPLICANT` to `Role`; gate `/admit/*` to `APPLICANT` (+ ADMIN for preview); `homeForRole` → `/admit/dashboard`. Keep `/admit/apply` + `/admit/register` **public** (pre-login). |

---

## 2. Data model — `src/features/admissions/types.ts`

```ts
export type ApplicationStatus =
  | "DRAFT" | "SUBMITTED" | "UNDER_REVIEW"
  | "SHORTLISTED" | "ADMITTED" | "REJECTED" | "WAITLISTED";

export type AdmissionDocType =
  | "MARKSHEET_10" | "MARKSHEET_12" | "ID_PROOF"
  | "TRANSFER_CERT" | "CASTE_CERT" | "PHOTO";

export interface AdmissionDoc {
  id: string; docType: AdmissionDocType; fileName: string;
  url: string; uploadedAt: string; verified: boolean;
}

export interface Application {
  id: string;                 // e.g. ADM-2026-00042 (also the tracking ID)
  applicantName: string; email: string; phone: string;
  program: string;            // e.g. "B.E. CSE"
  category: string;           // GM / SC / ST / OBC ...
  marks12Pct: number;
  documents: AdmissionDoc[];
  status: ApplicationStatus;
  meritScore?: number;        // computed for shortlisting
  meritRank?: number;
  feePaid: boolean;
  submittedAt?: string; createdAt: string; updatedAt: string;
}

export interface AdmissionFee { applicationId: string; amount: number; paid: boolean; }
```

---

## 3. API module — `src/lib/api/admissions.ts`

React Query hooks via `apiGet/apiPost/apiPatch`, with `NEXT_PUBLIC_USE_MOCKS` short-circuit
(copy the `users.ts` pattern: `MOCK_APPLICATIONS` + `USE_MOCKS ? mockFn : apiFn`).

**Applicant-facing**
- `useSubmitApplication()` → `POST /api/admissions`
- `useMyApplication()` → `GET /api/admissions/mine`
- `useUploadDocument()` → `POST /api/admissions/documents`
- `useApplicationStatus(id)` → `GET /api/admissions/:id/status`
- `useInitiateAdmissionFee()` → reuse `POST /api/fees/payment/initiate` (Razorpay already loaded)

**Admin-facing**
- `useApplications(filter)` → `GET /api/admissions` (filter by status/program/category)
- `useReviewApplication()` → `PATCH /api/admissions/:id` (status + notes)
- `useShortlist()` → `POST /api/admissions/:id/shortlist`
- `useGenerateMeritList(program)` → `POST /api/admissions/merit-list`
- `useVerifyDocument()` → `POST /api/admissions/documents/:id/verify`

---

## 4. Routes & navigation

### Applicant portal (`/admit/*`, group `"Admission"` in `navItems`)
| Route | Page | nav |
|-------|------|-----|
| `/admit/dashboard` | status summary + next action | ✅ |
| `/admit/apply` | multi-step application form (**public** until submit→register) | — |
| `/admit/documents` | upload marksheets / ID, see verification state | ✅ |
| `/admit/status` | timeline of `SUBMITTED→…→ADMITTED` | ✅ |
| `/admit/pay` | admission fee payment (Razorpay) | ✅ |
| `/admit/register` | self-signup (**public**) | — |

### Admin section (extend existing Admin portal nav)
| Route | Page | nav (group "Admin") |
|-------|------|--------------------|
| `/admin/admissions` | applications table: filter, review docs, shortlist, generate merit list | ✅ `allowedRoles: ["ADMIN","PRINCIPAL","DEAN"]` |

Add to `navItems` in `phases.ts`:
```ts
// ── ADMISSION PORTAL ──
{ key:"adm-dashboard", title:"Dashboard",   route:"/admit/dashboard", allowedRoles:["APPLICANT"], group:"Admission" },
{ key:"adm-documents", title:"My Documents",route:"/admit/documents", allowedRoles:["APPLICANT"], group:"Admission" },
{ key:"adm-status",    title:"Application Status", route:"/admit/status", allowedRoles:["APPLICANT"], group:"Admission" },
{ key:"adm-pay",       title:"Admission Fee", route:"/admit/pay",     allowedRoles:["APPLICANT"], group:"Admission" },
// ── ADMIN review ──
{ key:"admissions-admin", title:"Admissions", route:"/admin/admissions", allowedRoles:["ADMIN","PRINCIPAL","DEAN"], group:"Admin" },
```

---

## 5. Feature components — `src/features/admissions/`
- `types.ts` (above)
- `application-form.tsx` — multi-step (personal → academics → docs → review/submit)
- `document-upload.tsx` — reuse upload pattern from `features/documents`
- `application-status.tsx` — status timeline component
- `admission-fee.tsx` — Razorpay initiate (mirror `features/fees`)
- `admin-admissions.tsx` — admin table + review drawer + shortlist + merit-list button
- `register-form.tsx` — applicant self-signup

Thin route pages just render the feature (e.g. `src/app/admit/dashboard/page.tsx`).

---

## 6. BFF synth routes (backend has no admission endpoints yet)
Add prefix `"/api/admissions/"` to `BFF_PREFIXES` in `src/lib/api/client.ts`, and create
synth handlers under `src/app/api/admissions/*/route.ts` (mirror `app/api/fees/payment/initiate`).
This keeps the demo working with no backend, same as the rest of the app.

---

## 7. Compliance (CLAUDE.md)
- DPDP consent checkbox before submit (storing PII) and before any SMS/WhatsApp status alert.
- No applicant PII in console logs / error boundaries.
- Merit % display uses VTU rounding helper, not JS default.

---

## 8. Build order (≈14–16 files)
1. `types.ts`
2. Role wiring (§1) — 5 files
3. `api/admissions.ts` + mocks
4. BFF synth routes (§6)
5. Feature components (§5)
6. Route pages (`/admit/*`, `/admin/admissions`)
7. `navItems` + `portalLabel` (§4)
8. Demo applicant login + smoke test (`pnpm --filter @rv/web build`)

Per CLAUDE.md: new branch off `main` → commit → PR → you merge after CI.

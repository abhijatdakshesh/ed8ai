# EdAI — AI Features Build Plan

**Five predictive/AI features on top of the existing EdAI platform.**
Grounded in the current monorepo: `EdAI-Backend` (20 NestJS microservices) + `EdAI-Frontend` (Next.js 14 web, Flutter mobile).

> Author's note: All five features share one core dependency — a **feature store + prediction service**. Build that foundation first (Phase 0), then ship features in ROI/data-readiness order.

---

## 0. Shared Foundation (Phase 0 — build once, reused by all 5)

Every feature below is a variation on: *pull signals → score/forecast → recommend action → surface in a portal (often vernacular voice)*. Don't build five isolated ML stacks. Build one.

### 0.1 Feature Store (`services/ai-platform`)
A canonical, versioned table of per-entity signals, refreshed on a schedule + on real-time events.

| Entity | Example signals |
|--------|-----------------|
| Student | attendance %, IA/CIE marks trend, backlog count, placement-test scores, drive participation, fee status, behavior flags, income/category |
| Faculty | qualifications, FDP hours, student-feedback score, class attendance trend, research output |
| Criterion (NAAC/NBA) | S:T ratio, publications, MoUs, pass %, placement %, infra metrics |

- **Source:** existing services via internal APIs / DB read-replicas (`attendance`, `academics`, `fees`, `placements`, `behavior`).
- **Store:** a `feature_snapshots` table (Postgres) + optional Redis for hot reads.
- **Refresh:** cron (nightly full) + Socket.IO event hooks (incremental on attendance/marks writes).

### 0.2 Prediction Service (`services/ai-engine`)
- **Interface:** `POST /predict/{model}` → `{ score, breakdown, confidence, drivers[] }`.
- **Model strategy:** start **rules/heuristics** (explainable, shippable week 1) → graduate to **ML** (logistic/gradient-boosted) once labelled history exists. Keep the API contract identical so UI never changes.
- **Explainability is mandatory** — every score returns its top drivers (Deans/TPOs/parents need the "why", and NAAC auditors will ask).

### 0.3 Recommendation + Action Layer (`services/ai-engine` + `report-engine`)
- Maps a score/gap → a **time-bound action plan** (templated, then LLM-refined).
- Writes actions as tasks/alerts routed to the right portal (`alerts`, `automation`, `comms`, `voice`).

### 0.4 Vernacular Voice/Chat Rail (`services/voice` + `services/chatbot`)
- Shared multi-language (Kannada/Hindi/Tamil/…) TTS + STT + intent layer.
- Reused by Features 3 (scholarship reminders) and 5 (parent agent).

**Phase 0 deliverable:** feature store populated for students + a `/predict` endpoint returning rule-based scores with drivers. ~2–3 weeks.

---

## 1. Predictive Accreditation Gap Analyzer
**Extends:** `naac`, `report-engine`, `ai-engine`, `analytics`
**Priority:** #2 (board-level value, data mostly exists)

### What ships
Per-criterion **forecasted score** + **exact gap** + **time-bound action plan**, e.g. *"Research & Extension: 14/20 → needs 3 publications + 2 MoUs before the visit."*

### Architecture
- **New:** `services/accreditation` (or extend existing `compliance`/`naac` module).
- **Criterion model config:** encode NAAC/NBA rubric per criterion (weight, target, formula) as versioned JSON — auditable, editable by admin.
- **Forecast:** feature-store criterion signals + historical trend (linear/seasonal extrapolation to visit date) → projected score via `/predict/accreditation`.
- **Gap engine:** `target − projected` per sub-metric → ranked shortfalls → LLM drafts action plan with owners + deadlines.
- **Report:** `report-engine` renders the evidence pack + the forecast dashboard (extends existing `admin/naac`, `admin/report-generator`).

### Data model (new)
```
accreditation_criteria(id, framework, code, title, weight, target, formula_json, version)
criterion_snapshots(criterion_id, snapshot_date, projected_score, drivers_json, gap_json)
action_plans(criterion_id, item, owner_role, due_date, status)
```

### Endpoints
- `GET /accreditation/forecast?framework=NAAC` → all criteria scores + gaps
- `GET /accreditation/criterion/{code}` → drill-down + drivers
- `POST /accreditation/action-plan/{code}/generate`

### UI
- Extend `app/admin/naac` → add "Forecast" tab (criterion cards, projected vs target gauges, gap list, action-plan table).
- Dean view: single "target grade" dial + progress-to-target.

### Success metric
Dean can see projected grade ≥90 days before visit; action items auto-tracked to closure.

---

## 2. Student Placement Risk & Intervention Engine
**Extends:** `placements`, `ai-engine`, `analytics`, `behavior`, `academics`
**Priority:** #1 — ship first (data already exists, #1 marketing number)

### What ships
Per-student **placement-readiness score** (0–100) + risk flag + **auto-suggested interventions** (training modules, mock interviews, mentor alerts). TPO dashboard with **funnel-leakage** + predictive offer→joining rate.

### Architecture
- **New:** `services/placement-intelligence` (or extend `placements`).
- **Signals (feature store):** CGPA/backlogs (`academics`), attendance (`attendance`), placement-test scores, soft-skill/behavior flags (`behavior`), past drive participation + shortlist/reject history (`placements`).
- **Readiness score:** `/predict/placement-readiness` → score + drivers (e.g. "aptitude 40th pctile", "2 backlogs", "0 mock interviews").
- **Intervention mapping:** rules → module/mock/mentor. Writes mentor alerts via `mentorship` + `alerts`.
- **Funnel analytics:** eligible → applied → shortlisted → offered → joined, per drive/department; leakage = drop between stages; predictive joining rate from historical conversion.

### Data model (new)
```
placement_readiness(student_id, score, band, drivers_json, computed_at)
interventions(student_id, type, resource_ref, status, assigned_by)
drive_funnel(drive_id, stage, count, snapshot_date)
```

### Endpoints
- `GET /placement/readiness/{studentId}`
- `GET /placement/at-risk?dept=&threshold=`
- `GET /placement/funnel?driveId=`
- `POST /placement/interventions` (auto + manual)

### UI
- **TPO/recruiter:** extend `app/recruiter/analytics` + `app/admin/placement` → funnel viz, at-risk cohort table, predicted placement %.
- **Faculty/mentor:** at-risk mentees + suggested actions (`app/teacher/perf-drop` pattern).
- **Student:** readiness score + "how to improve" (`app/student/placement`).

### Success metric
Placement % ↑; measurable reduction in funnel leakage stage-over-stage.

---

## 3. AI-Powered Scholarship & Financial Aid Recommender
**Extends:** `fees`, `finance`, `ai-engine`, scholarship routes (`parent/scholarship`, `student`)
**Priority:** #3

### What ships
Auto-matches each student to **every scholarship they qualify for** (incl. unapplied govt schemes), auto-fills forms from existing data, tracks disbursal, sends **vernacular voice reminders**, and flags fee-default risk with custom payment-plan suggestions.

### Architecture
- **New:** `services/scholarship` (or extend `finance`).
- **Eligibility engine:** scheme rules (category/income/merit/sports/govt scheme) as versioned JSON → match against student profile (`identity` + `academics` + `finance`).
- **Auto-fill:** map stored profile fields → application templates; generate pre-filled PDF/portal payload.
- **Disbursal tracking:** state machine (eligible → applied → sanctioned → disbursed).
- **Default risk:** `/predict/fee-default` from payment history + income + fee balance → payment-plan generator.
- **Reminders:** `voice` + `comms` vernacular calls/SMS to parents (DPDP consent-gated).

### Data model (new)
```
scholarships(id, name, source, rules_json, deadline, amount)
scholarship_matches(student_id, scholarship_id, status, confidence, auto_filled_ref)
fee_default_risk(student_id, score, drivers_json, suggested_plan_json)
```

### Endpoints
- `GET /scholarships/matches/{studentId}`
- `POST /scholarships/{id}/autofill/{studentId}`
- `GET /finance/default-risk?dept=`
- `POST /finance/payment-plan/{studentId}`

### UI
- **Student/Parent:** extend `student` + `parent/scholarship` → "You qualify for N scholarships" cards + one-tap apply + disbursal tracker.
- **Admin/Finance:** extend `admin/fees` → default-risk cohort + inclusion metrics (NAAC/NIRF).

### Compliance
DPDP consent before any parent voice/SMS; caste/income data access-controlled + audit-logged.

### Success metric
Scholarship utilization ↑; fee-default rate ↓; inclusion metrics for NAAC/NIRF captured.

---

## 4. Faculty Upskilling & Development Auto-Scheduler
**Extends:** `analytics`, `academics`, `ai-engine`, `compliance`
**Priority:** #5 (lower urgency; strong compliance value)

### What ships
Tracks faculty qualifications, student feedback, class attendance trends, research output → cross-references NAAC/UGC/AICTE FDP mandates → **personalised training plans** + auto-drafted **department FDP calendar**.

### Architecture
- **New:** `services/faculty-development` (or extend `academics` HR side).
- **Faculty feature store:** qualifications, FDP hours completed vs mandated, feedback score, research count.
- **Gap engine:** mandated FDP hours/topics − completed → per-faculty plan; recommend courses/workshops (internal + external catalog).
- **Calendar drafter:** aggregate dept gaps → LLM drafts a balanced FDP calendar (no clashes with teaching schedule via `timetable`).
- **Compliance link:** feeds NAAC Criterion 3 & 4 evidence into Feature 1's report-engine.

### Data model (new)
```
faculty_profile(faculty_id, qualifications_json, feedback_score, research_count, fdp_hours)
fdp_requirements(role, framework, required_hours, topics_json)
fdp_plans(faculty_id, item, type, provider, target_date, status)
```

### Endpoints
- `GET /faculty/{id}/development-plan`
- `GET /faculty/fdp-gaps?dept=`
- `POST /faculty/fdp-calendar/generate?dept=`

### UI
- **Admin/HOD:** new `app/admin/faculty-development` → dept FDP calendar, per-faculty gap cards, compliance status.
- **Faculty:** growth-path view in `app/teacher/profile`.

### Success metric
FDP compliance % up with zero manual HR tracking; Criterion 3/4 evidence auto-populated.

---

## 5. Multilingual Parent-Teacher AI Insight Agent
**Extends:** `voice`, `chatbot`, `analytics`, `attendance`, `academics`, `behavior`
**Priority:** #4 (high engagement/retention value; depends on Phase 0 voice rail)

### What ships
Conversational, vernacular parent agent that **explains** data (not just displays it): *"She missed 6 of last 10 first-hour lectures — common for off-campus students. Book a 5-min mentor call?"* Schedules PTA meetings, sends weekly summary voice calls, flags behavioral concerns.

### Architecture
- **Extend** `services/chatbot` + `services/voice`.
- **Retrieval + reasoning:** parent query → intent → pull relevant analytics (attendance/marks/behavior for their child) → LLM generates explanation with cause hypotheses (grounded in feature-store drivers, not hallucinated).
- **Action tools:** the agent can *do* things — book mentor call (`mentorship`), schedule PTA (`comms`/calendar), escalate behavior flag (`behavior`/`grievance`).
- **Weekly summary:** scheduled vernacular voice call (`voice`) per parent (DPDP consent-gated).
- **Guardrails:** child-scoped access control; no PII beyond the parent's own child; audit log.

### Data model (mostly reuse)
```
parent_agent_sessions(parent_id, child_id, transcript_ref, language)
agent_actions(session_id, action_type, target_ref, status)
```

### Endpoints
- `POST /agent/parent/query` (text/voice, multilingual)
- `POST /agent/parent/action` (book-call / schedule-pta / request-summary)
- `POST /agent/parent/weekly-summary/schedule`

### UI
- Extend `app/parent/chatbot` + `app/parent/calls` → conversational UI with language switch + "book call" / "schedule PTA" CTAs.
- Mobile (Flutter parent app) is the primary surface for tier-2/3 reach.

### Success metric
Parent engagement rate ↑ (vernacular sessions/week); measurable retention improvement; admin call-volume ↓.

---

## Build Sequence & Rollout

| Phase | Scope | Est. |
|-------|-------|------|
| **0** | Feature store + `/predict` (rules) + voice rail | 2–3 wks |
| **1** | Feature 2 — Placement Risk Engine (data ready, #1 metric) | 3–4 wks |
| **2** | Feature 1 — Accreditation Gap Analyzer | 3–4 wks |
| **3** | Feature 3 — Scholarship Recommender | 3 wks |
| **4** | Feature 5 — Parent AI Insight Agent (uses voice rail) | 3–4 wks |
| **5** | Feature 4 — Faculty Upskilling Scheduler | 2–3 wks |

**Cross-cutting rules**
- **Explainability:** every score/forecast ships its drivers. Non-negotiable for Deans, TPOs, auditors, parents.
- **Rules-before-ML:** ship heuristic scores week 1; swap in ML behind the same API once labelled history accrues.
- **DPDP compliance:** consent-gate every voice/SMS/parent flow; access-scope + audit-log sensitive (caste/income/behavior) data.
- **Multi-tenant:** all new tables carry `tenant_id`; reuse `shared/tenant-guard`.
- **Branch/PR workflow:** per `CLAUDE.md` — feature branch → PR → CI → manual merge. Never push to `main`.

---

## Reusability Map (why Phase 0 pays off)

| Component | F1 | F2 | F3 | F4 | F5 |
|-----------|----|----|----|----|----|
| Feature store | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/predict` engine | ✓ | ✓ | ✓ | ✓ | ✓ |
| Recommendation/action layer | ✓ | ✓ | ✓ | ✓ | ✓ |
| Vernacular voice rail | — | — | ✓ | — | ✓ |
| report-engine | ✓ | ✓ | — | ✓ | — |

Build the shared spine once; each feature becomes config + a thin service + a portal view.

# EdAI — Product Specification & Build Status

**Version:** April 2026 | **Audience:** Engineering Team | **Status:** Active Development

---

## 1. Product Overview

EdAI is an AI-powered ERP for Indian higher education institutions. Pilot: RV College of Engineering (RVCE) and RVITM, Bengaluru. Target buyers: Principals, Chairpersons, IT Heads at NAAC-accredited colleges.

**Core value props:**
- Automated NAAC/AQAR report generation
- AI-driven dropout/attendance early warning with automated parent calls
- VTU compliance and exam registration management
- Placement CRM with AI-assisted candidate scoring
- Multi-language parent communication (Kannada, Hindi, Tamil, Telugu, Malayalam, English)

---

## 2. System Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend services | NestJS (TypeScript), FastAPI (Python 3.12), Go 1.22 |
| Databases | PostgreSQL 16 + pgvector (per service), ClickHouse (analytics), Redis 7 |
| Message bus | Apache Kafka (Avro schemas) — Redpanda locally, AWS MSK in prod |
| Auth | JWT + Keycloak 24 (OIDC) |
| Web frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui, React Query, Zustand, Socket.IO |
| Mobile app | Flutter 3.4, Riverpod, GoRouter, Dio |
| Infrastructure | AWS EKS (ap-south-1), Terraform, Argo CD |
| AI/ML | Python FastAPI ai-engine (LiteLLM, Anthropic, OpenAI, Sarvam, AI4Bharat — integrations pending) |

### Repositories

| Repo | Purpose |
|------|---------|
| `EdAI-Backend` | 19 NestJS/FastAPI/Go microservices |
| `EdAI-Frontend` | Next.js web portals + Flutter mobile app (pnpm monorepo) |

### Multi-tenancy

All services are scoped by `INSTITUTION_ID` (e.g. `rvce`, `rvitm`). Every entity carries `institutionId`.

---

## 3. User Roles

| Role | Access |
|------|--------|
| `STUDENT` | Own data: attendance, marks, fees, assignments, chatbot, VTU registration |
| `PARENT` | Child's data: attendance, results, fees, call history, notifications |
| `FACULTY` | Classes: mark attendance, enter IA marks, create assignments, view at-risk students |
| `HOD` | Department-level: class management, performance reports, VTU oversight |
| `DEAN` | Institution-wide: analytics, compliance, escalation reports |
| `PRINCIPAL` | All modules + NAAC compliance |
| `TRUSTEE` | Read-only dashboards |
| `COUNSELLOR` | Student wellness, behavioral incidents, chatbot escalations |
| `ADMIN` | Full CRUD: users, classes, courses, system settings, bulk import |

---

## 4. Backend Services — Build Status

### ✅ IMPLEMENTED (production-ready logic)

#### Identity Service (Port 3001)
Auth, RBAC, user management.

**Endpoints:**
- `POST /api/auth/login` — Email + password → access + refresh tokens
- `POST /api/auth/refresh` — Rotate refresh token
- `POST /api/auth/logout` — Invalidate session
- `GET /api/auth/me` — Current user profile
- `GET /api/users` — Paginated user list (filterable by role, department)
- `POST /api/users` — Create user (ADMIN only)
- `PATCH /api/users/:id` — Update user
- `PATCH /api/users/:id/status` — Activate / deactivate
- `POST /api/users/:id/reset-password` — Generate temp password
- `GET /api/users/export` — CSV export

**Key entities:** `User` (role, institutionId, sapId, preferredLanguage), `Student` (USN, biometricRef), `Parent` (consentFlags: voice|whatsapp|sms|email, KMS-encrypted phoneToken)

---

#### Attendance Service (Port 3002)
Biometric ingestion, VTU eligibility, escalation engine.

**Endpoints:**
- `POST /api/attendance/mark` — Single attendance record
- `POST /api/attendance/mark/bulk` — Bulk mark
- `GET /api/attendance/students/:id/summary` — Student summary (present/absent/%)
- `GET /api/attendance/classes/:id/today` — Today's class attendance
- `GET /api/attendance/classes/:id/absentees` — Today's absentees
- `GET /api/attendance/classes/:id/at-risk` — Students below 75% threshold
- `GET /api/attendance/at-risk` — Institution-wide at-risk
- `GET /api/attendance/students/:usn/vtu-eligibility` — Per-subject VTU eligibility (≥75%)
- `PUT /api/attendance/records/:id/excuse` — Excuse absence with reason
- `POST /api/attendance/escalation/run` — Manual escalation trigger

**Kafka produced:** `attendance.absent.marked`, `attendance.escalation.triggered`

**Escalation levels:** DAY3 → DAY5 → DAY7 → DAY10 (WhatsApp → voice call → teacher alert → PTM scheduled)

---

#### Academics Service (Port 3003)
Marks, AI validation, performance drop detection.

**Endpoints:**
- `POST /api/academics/marks/bulk` — AI-validate bulk marks entry (returns outlier flags)
- `POST /api/academics/marks/bulk/confirm` — Save after teacher review
- `GET /api/academics/marks/student/:id` — Student marks history
- `GET /api/academics/marks/subject/:id` — Marks by subject + component
- `POST /api/academics/marks/verify/:id` — Teacher sign-off
- `GET /api/academics/predictive/at-risk` — AI at-risk predictions
- `GET /api/classes` — List classes (filterable: dept, semester, academicYear)
- `GET /api/classes/:id/students` — Enrolled students
- `POST /api/classes` — Create class
- `GET /api/courses` — List courses (filterable: dept, semester, type)
- `POST /api/courses` — Create course
- `PATCH /api/courses/:id` — Update / soft-deactivate

**AI validation flags:** `STATISTICAL_OUTLIER`, `HISTORICAL_MISMATCH`, `MISSING_ENTRY`, `INVALID_SCORE`, `UNUSUAL_PATTERN`, `DECIMAL_ERROR`

**Kafka produced:** `academics.performance.drop` (when score drops >15% from rolling average)

---

#### Finance Service (Port 3013)
Fee records, Razorpay integration, scholarship detection.

**Endpoints:**
- `GET /api/fees/student/:studentId` — All fee records
- `GET /api/finance/dues/:studentId` — Outstanding dues
- `GET /api/finance/history/:studentId` — Payment history
- `POST /api/finance/initiate-payment` — Start Razorpay order
- `POST /api/finance/verify-payment` — Verify Razorpay signature + update status
- `POST /api/fees/webhooks/razorpay` — Razorpay webhook handler
- `GET /api/finance/overdue-students` — Institution-wide overdue analysis

**Key entities:** `FeeRecord` (componentCode, daysOverdue, payerProfile), `PaymentTransaction` (gateway, gatewayOrderId, GST), `Scholarship`, `StudentScholarship`

**Kafka produced:** `finance.fee.paid`, `comms.scholarship.eligible`

---

#### Behavior Service (Port 3014)
Incident logging, AI severity classification, escalation routing.

**Endpoints:**
- `POST /api/behavior/incidents` — Log incident (AI classifies severity)
- `GET /api/behavior/incidents/student/:id` — Student incident history
- `GET /api/behavior/incidents/class/:id` — Class incidents
- `GET /api/behavior/patterns/student/:id` — AI behavior patterns
- `PUT /api/behavior/incidents/:id/resolve` — Resolve with notes
- `GET /api/behavior/dashboard` — Dashboard (counts by severity/status)

**Incident types:** `DISRUPTION`, `DRESS_CODE`, `LATE_ARRIVAL`, `ASSIGNMENT_REFUSAL`, `PHYSICAL`, `MISCONDUCT`, `SAFETY_VIOLATION`, `SUBSTANCE`, `OTHER`

**AI:** Calls ai-engine `/llm/classify-incident` for severity; falls back to rule-based classification.

**Kafka produced:** `behavior.incident.logged` (MEDIUM/HIGH severity only)

---

#### Chatbot Service (Port 3015)
Student/parent conversational AI with teacher escalation.

**Endpoints:**
- `POST /api/chatbot/sessions` — Create session (role: STUDENT|PARENT)
- `POST /api/chatbot/sessions/:id/messages` — Send message → AI response
- `GET /api/chatbot/sessions/:id/history` — Conversation history
- `GET /api/chatbot/escalations/teacher/:id` — Teacher's pending escalations
- `POST /api/chatbot/escalations/:id/respond` — Teacher responds

**AI:** Calls ai-engine `/llm/chat`. Confidence < 0.7 → auto-escalates to class teacher with AI-generated student context summary.

---

#### Communications Service (Port 3010)
Multi-channel notifications, event timeline.

**Endpoints:**
- `POST /api/comms/send` — Send via WhatsApp | SMS | PUSH | EMAIL
- `GET /api/comms/logs/:recipientId` — Notification history
- `POST /api/comms/templates` — Create template (language-specific)
- `GET /api/comms/timeline/:studentId` — Student event timeline

**Timeline event types:** `ABSENT_MARKED`, `CALL_PLACED`, `CALL_COMPLETED`, `CALL_MISSED`, `ASSIGNMENT_DUE/SUBMITTED/MISSED`, `MARKS_PUBLISHED`, `PERFORMANCE_DROP/IMPROVED`, `FEE_DUE/PAID/OVERDUE`, `BEHAVIORAL_INCIDENT`, `PTM_SCHEDULED`, `WEEKLY_REPORT`, `ESCALATION_TRIGGERED`

**Kafka consumed:** `attendance.AbsenteeDetected`, `academics.performance.drop`, `behavior.incident.logged`, `finance.fee.paid/overdue`

**Status:** WhatsApp/SMS provider integrations stubbed — need Gupshup/WATI API keys.

---

### ⚠️ SCAFFOLDED (structure done, logic pending)

#### Placements Service (Port 3007)
- CRUD: create drive, list drives, apply, update application status — in-memory only
- **Missing:** eligibility CGPA checks, offer letter generation, campus drive scheduling automation

#### Analytics Service (Port 3008)
- Endpoints defined: dashboard KPIs, attendance heatmap, YoY trends, subject intelligence
- **Missing:** ClickHouse integration — all responses are hardcoded stubs

#### Compliance Service
- Report lifecycle: DRAFT → IN_REVIEW → APPROVED → SUBMITTED
- Evidence upload structure
- **Missing:** Actual NAAC/AQAR report generation logic, template rendering, evidence validation

#### SAP-Bridge Service (Port 3011)
- Job queue for: `ATTENDANCE_SYNC`, `FEE_WRITEBACK`, `STUDENT_MASTER_PULL`, `MARKS_EXPORT`
- **Missing:** Actual SAP SLCM OData/IDoc/BAPI calls

#### AI-Engine (FastAPI, Port 8001)
- Routers defined: ASR (batch + streaming WebSocket), TTS, NMT, LLM (dialogue, summarise, chat, classify)
- **Missing:** All ML model integrations (Sarvam ASR, AI4Bharat NMT, Claude/OpenAI for LLM)

---

### Kafka Event Schema Registry

All Avro schemas in `shared/kafka/schemas/`. Currently most emissions are `// TODO: KAFKA` stubs.

| Event | Producer | Consumers |
|-------|---------|-----------|
| `attendance.AbsenteeDetected` | attendance | communications, voice |
| `attendance.EscalationTriggered` | attendance | communications |
| `academics.performance.drop` | academics | communications, analytics |
| `academics.MarksPublished` | academics | communications |
| `behavior.incident.logged` | behavior | communications, voice |
| `finance.fee.paid` | finance | analytics |
| `finance.fee.overdue` | finance | communications |
| `voice.call.completed` | voice | attendance, timeline |
| `assignments.missed` | assignments | communications |

---

## 5. Frontend — Build Status

### Web App (Next.js 14) — 91 pages across 5 portals

#### ✅ Fully Implemented Pages

**Admin Portal:**
- User management (list, create, edit, activate/deactivate, password reset, CSV export)
- Class management (create, assign teachers, view students)
- Course management (create, update, deactivate)
- VTU window setup + eligibility monitoring
- IA submission tracking
- Bulk user import

**Teacher Portal:**
- Mark attendance (per class, bulk)
- Attendance summary report
- IA marks entry with AI outlier validation
- Marks entry + confirmation workflow
- Assignment creation + submission grading
- Performance-drop alerts dashboard
- VTU eligibility check per subject

**Student Portal:**
- Dashboard (attendance KPI, CGPA, pending assignments, VTU banner)
- Per-course attendance breakdown with can-miss calculator
- Assignment list (pending/submitted/graded) + submission
- Fee summary + payment history + Razorpay payment flow
- VTU multi-step registration with eligibility check
- Results by semester

**Parent Portal:**
- Dashboard with children overview
- Child attendance per course
- Child results + CGPA
- Child fee status

#### ⚠️ Scaffolded Pages (structure only, mock data)
- Behavior tracking dashboard
- Placements / job portal
- Announcements
- AI Chatbot
- Event Timeline
- Study Plans
- Exam Prep
- Counselor Booking
- Grievance Portal
- Mentorship
- Hostel Management

---

### Mobile App (Flutter 3.4) — 82 screens across 4 portals

#### ✅ Implemented Screens
- Login (all roles) with Riverpod auth + token refresh
- Student: Dashboard, Attendance, Results, Assignments, Fees, VTU Registration, Profile
- Teacher: Dashboard, Mark Attendance, Attendance Summary, VTU Oversight
- Admin: Dashboard, Users, Classes
- Parent: Dashboard, Child Attendance, Child Results
- Notifications (cross-role)

#### ⚠️ Scaffolded Screens
- Chatbot, Study Plan, Counselor, Exam Prep, Jobs, Hostel, HR Directory, Messages, Call History, Reports

**Note:** Most mobile repositories use mock data — real API wiring needed for: attendance, chatbot, counselor, study plan, voice calls, notifications.

---

## 6. API Integration Map

| Web API Module | Backend Service | Status |
|----------------|----------------|--------|
| `attendance.ts` | Attendance (3002) | ✅ Connected |
| `marks.ts` | Academics (3003) | ✅ Connected |
| `assignments.ts` | Assignments service | ✅ Connected |
| `fees.ts` | Finance (3013) | ✅ Connected |
| `vtu.ts` | Identity + Academics | ✅ Connected |
| `users.ts` | Identity (3001) | ✅ Connected |
| `analytics.ts` | Analytics (3008) | ⚠️ Returns stubs |
| `comms.ts` | Communications (3010) | ⚠️ WhatsApp/SMS stubbed |
| `counselor.ts` | Not yet built | ⚠️ Mock data |
| `jobs.ts` | Placements (3007) | ⚠️ Scaffold only |
| `parent.ts` | Identity + Academics | ✅ Connected |
| `promotion.ts` | Academics (3003) | ✅ Connected |

---

## 7. What's Missing / Next Priorities

### Priority 1 — Required for pilot go-live
| Item | Owner needed |
|------|-------------|
| WhatsApp integration (Gupshup or WATI) | Backend |
| AI-Engine ML integrations (Sarvam ASR, Claude LLM) | Backend + AI |
| Kafka emissions in attendance, academics, finance | Backend |
| ClickHouse wiring for analytics | Backend |
| NAAC report generation logic | Backend |
| Mobile API wiring (attendance, notifications) | Mobile |

### Priority 2 — Post-pilot
| Item | Owner needed |
|------|-------------|
| SAP SLCM OData integration | Backend |
| Counselor booking service | Backend + Frontend |
| Exam prep + study plan AI | Backend + AI |
| Grievance workflow | Backend + Frontend |
| Mentorship module | Backend + Frontend |

### Priority 3 — Scale
| Item | Owner needed |
|------|-------------|
| SMS / voice fallback | Backend |
| Hostel management | Backend + Mobile |
| Placement CRM + eligibility engine | Backend |
| Multi-institution onboarding automation | Backend + DevOps |

---

## 8. Local Development Setup

### Backend

```bash
# Prerequisites: Docker, Node 20, Python 3.12, Go 1.22
cd EdAI-Backend
docker-compose up -d           # Infra: Postgres, Redis, Kafka, Keycloak, ClickHouse
npm install
npm run migrate:all
npm run dev:all                # identity(3001) + attendance(3002) + academics(3003) + 6 more
```

### Frontend Web

```bash
cd EdAI-Frontend
pnpm install
cp apps/web/.env.example apps/web/.env.local
# Set IDENTITY_SERVICE_URL=http://localhost:3001
pnpm dev:web                   # http://localhost:3000
```

**Dev test credentials:** `admin@rvce.edu / Admin@123` | `teacher@rvce.edu / Teacher@123` | `student@rvce.edu / Student@123` | `parent@rvce.edu / Parent@123`

### Mobile

```bash
cd EdAI-Frontend/apps/mobile
flutter pub get
flutter run                   # Android emulator: API_BASE_URL=http://10.0.2.2:3001
```

---

## 9. Compliance Requirements

All features touching student data must satisfy:
- **DPDP Act 2023** — data residency in `ap-south-1`, explicit consent before WhatsApp/SMS opt-in
- **No student PII in logs** (backend or browser console)
- **VTU marks rounding** — use VTU-specific rounding rules, not default JS/Python rounding
- **Attendance 75% boundary** — exact match, no approximation
- **NAAC report formats** — must match official NAAC AQAR templates exactly

---

## 10. Expert Review Gates (CI)

Every `git push` auto-runs 6 review panels via `.githooks/pre-push`:

| Panel | Reviewer | Blocks push on |
|-------|---------|----------------|
| Code Quality | Daniel (Senior Engineer) | `Verdict: BLOCK` |
| Architecture | Dev (FAANG Principal Engineer) | `Verdict: REDESIGN REQUIRED` |
| Test Coverage | Priya (ERP QA, SAP veteran) | `Verdict: FIX TESTS FIRST` |
| Buyer Necessity | Kaveri (RV College Chairman) | Advisory |
| GTM Value | Sujit (McKinsey ERP) | Advisory |
| Investment Metrics | Anand (VC, 20yr) | Advisory |

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ed8ai** — AI-powered ERP for Indian higher education institutions (colleges, deemed universities). Target buyers: Principals, Chairpersons, and IT heads at NAAC-accredited colleges. Stack TBD — fill in when decided.

Core value props: NAAC/AQAR auto-reporting, dropout prediction, placement probability scoring, VTU/AICTE compliance, NEP 2020 (ABC credit framework) native.

---

## Domain Expert Panel

All agents live at `~/.claude/agents/` and are available globally. Invoke manually or auto-triggered on `git push`.

| Invoke | Persona | When to use |
|--------|---------|-------------|
| `/daniel` | Senior code reviewer | Before every commit — BLOCK verdict stops push |
| `/dev` | FAANG principal engineer | Architecture / system design decisions — REDESIGN REQUIRED stops push |
| `/kaveri` | RV College Chairman (buyer) | Feature necessity check from buyer's POV |
| `/sujit` | McKinsey ERP consultant | GTM value, pricing, Indian EdTech strategy |
| `/anand` | VC investor (20 yr) | Fundability, metrics gap, 90-day sprint to investment |

**Pre-push gate** (`.githooks/pre-push`) runs all 5 panels automatically. Daniel + Dev are hard blockers; Kaveri + Sujit + Anand are advisory.

Wire hooks after `git init`:
```bash
git config core.hooksPath .githooks
```

---

## Response Style

Global rule: `~/.claude/output-styles/team-concise.md` — ≤100 words, bullets only, end with `Want an elaborative answer?`

Elaborate triggers: `elaborate`, `deep dive`, `detailed plan`, `full answer`, `expand`, `long form`

---

## Session Protocol

On every `SessionStart`, the hook auto-loads `.claude/sessions/latest.md` (previous session summary).

1. Check `.claude/sessions/latest.md` for prior context
2. Read `WORKING-CONTEXT.md` for live sprint state (create when sprint starts)
3. Check `.claude/compact-state.md` if resuming after compaction

---

## Pipeline (every feature / bug fix)

```
UNDERSTAND → PLAN (get approval) → IMPLEMENT (TDD) → VERIFY → REVIEW (/daniel) → SHIP
```

- VERIFY = lint + build + test + type-check before committing
- SHIP = branch → commit → `gh pr create --fill` → STOP. User merges manually after CI.

**HARD RULE: Never push directly to `main` or `master`. Every change goes on a feature branch + PR.**

---

## Branch Hygiene

- **Always branch**: `git checkout main && git pull && git checkout -b <type>/<short-desc>`
  - Examples: `fix/vtu-null-check`, `feat/smoke-tests`, `chore/strict-types`
- **Always PR**: `gh pr create --fill` after pushing — never merge yourself
- **User merges manually** after CI passes and review is done
- Pre-commit hook blocks commits on already-merged branches
- Pre-push hook blocks direct pushes to `main` (use `ALLOW_BRANCHLESS_PUSH=1` only for repo init)
- Never `--no-verify`

---

## Key Tracking Files (create as project grows)

- `WORKING-CONTEXT.md` — live sprint board
- `TASK_TRACKER.md` — feature backlog
- `AUDIT.md` — change log

---

## Compliance Non-Negotiables

Any feature touching student data must satisfy:
- DPDP Act 2023 (data residency in India, consent flows)
- No student PII in logs
- VTU/AICTE report formats must match official templates exactly

# Lab 7 — Change Request, Impact Analysis & Contract Revision (`BR-03` v1.1.0)

- **Project:** SprintDUO — Course Project Management System (Theme 6)
- **Team:** GG EZ (Team 23, Section 31) — `67070501084` (`@JinggXd`) & `67070501036` (`@yuminnini`)
- **Change Request Issue:** `#36` (`lab7`)
- **Contract Version:** `v1.1.0` (revised from accepted Sprint 1 baseline `v1.0.0`)
- **Date Authored (Pre-Implementation):** `2026-11-25` (Thailand Time, ICT)

---

## 1. Baseline & Pre-Change Version Identity

| Reference Point | Exact Version / Identifier | Notes |
| :--- | :--- | :--- |
| **Original Sprint 1 Baseline** | Tag `v1.0.0` (`docs/sprints/sprint-1/contracts.md` v1.0.0) | Delivered `F-01`, `F-02`, `AC-01`–`AC-06`, `BR-01`–`BR-03`, `NFR-01`–`NFR-03`. |
| **Accepted Sprint 1 Release (Lab 6) & Actual Pre-Change Implementation** | `main` commit `91db0b1ebdf073baa4749040cd346113d4a08ebb` (`91db0b1`) / Cloud Run revision `sprintduo-00006-wp7` (Deploy Run `#45115211670`) | Independently retested and accepted by Partner Team `TH-042_P6` (`2026-11-25 ICT`, *Accepted with explicitly documented minor limitations*). |
| **Intervening Development** | None (`0` commits between `91db0b1` and this contract revision branch `docs/lab7-br03-contract`) | Maintenance change is isolated cleanly before Sprint 2 (`F-03`) feature development begins. |
| **Approval Status** | Course instructor waived individual pre-implementation TA/instructor approval due to pre-final-exam schedule (`2026-11-25 ICT`); teammate `@yuminnini` reviews & approves this contract/impact PR **before** any code implementation. | Preserved honestly in Issue `#36` and Git commit/PR history. |

---

## 2. Old vs. New Requirement & Exact Boundary Specification

### 2.1 Original Sprint 1 Rule (`BR-03` v1.0.0 on `91db0b1`)
- `POST /api/milestones/:milestoneId/submissions` checks `isDeadlinePassed(milestone.dueDate, serverNow)` (`serverNow > milestone.dueDate`).
- Any submission strictly after `milestone.dueDate` (even 1 second late) is rejected with HTTP `400 DEADLINE_PASSED` (`"Milestone deadline has passed"`).
- `Submission` records carry no lateness indicator.

### 2.2 Approved New Rule (`BR-03` v1.1.0 — 24-Hour Late Grace Window with `isLate` Flag)
- **Stakeholder Rationale:** Course instructors updated the milestone submission policy so student teams experiencing last-minute link/deployment delays can still submit within a **bounded 24-hour late grace window (`86,400,000 ms`)** after `milestone.dueDate`, provided the system transparently records and displays `isLate: true` (`LATE` badge) for supervisor review while hard-blocking submissions strictly beyond `dueDate + 24 hours`.
- **Exact Server-Clock Boundary Table (`LATE_GRACE_WINDOW_MS = 24 * 60 * 60 * 1000 = 86,400,000 ms`):**

| Condition (`serverNow` vs. `milestone.dueDate`) | Boundary Example (`dueDate = T`) | Outcome | HTTP Status & Payload | Persisted `isLate` | UI Milestone / Submission Badges |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `serverNow <= dueDate` | `T - 1h`, `T` (exact dueDate) | **Accepted (On-Time)** | `201 Created` `{ submission: { ..., isLate: false } }` | `false` | Milestone: `OPEN` (green)<br>Submission: standard status badge |
| `dueDate < serverNow <= dueDate + 24h` | `T + 1ms`, `T + 12h`, `T + 24h` (exact inclusive cutoff) | **Accepted (Late Grace Window)** | `201 Created` `{ submission: { ..., isLate: true } }` | `true` | Milestone: `GRACE PERIOD (24H)` (amber)<br>Submission: status badge + **`LATE`** badge |
| `serverNow > dueDate + 24h` | `T + 24h + 1ms`, seeded Milestone 0 (`T - 48h`) | **Rejected (Cutoff Expired)** | `400 Bad Request` `{ error: "DEADLINE_PASSED", message: "Milestone deadline has passed (24-hour grace window expired)" }` | None (not saved) | Milestone: `PAST DUE` (red)<br>Alert banner (`role="alert"`) |

- **Invalid Cases & Ordering:**
  - Non-canonical or INT4-overflow `:milestoneId` (`2147483648`, `1e0`, `+1`) → `404 NOT_FOUND` (preserved from Lab 6 `#29`).
  - Missing/expired session cookie → `401 UNAUTHORIZED` (`NFR-01`).
  - `SUPERVISOR` role or non-member `STUDENT` → `403 FORBIDDEN` (`BR-01`, `BR-02`), evaluated **before** deadline checks (never leaked to unauthorized callers).
  - Invalid `artifactUrl` (non-`http://`/`https://`), short/long `title` (`<3` or `>150`), or short/long `description` (`<5` or `>2000`) → `400 VALIDATION_ERROR` with field `details` (both on-time and during the 24h grace window; zero rows stored).
  - Oversized JSON payload (`> 64 KB`) → `413 PAYLOAD_TOO_LARGE` (preserved from Lab 6 `#30`).

---

## 3. Compact Change Impact Analysis Table

| Impact Dimension | Affected Artifacts / Modules | Specific Change Required (or Reason N/A) |
| :--- | :--- | :--- |
| **Requirement IDs** | `FR-03`, `BR-03`, `DD-02` | Revise `BR-03` and `DD-02` in `docs/srs.md` (`v1.0.0 → v1.1.0`) to introduce the 24-hour grace window and `isLate` flag. `FR-01`, `FR-02`, `FR-04`, `BR-01`, `BR-02`, `NFR-01`–`NFR-03` unchanged. |
| **Feature & Contract** | `F-02` (`docs/sprints/sprint-1/contracts.md` §2.1, §2.2, §3) | Update `F-02` deadline rule, add `isLate: boolean` to `POST /api/milestones/:milestoneId/submissions`, `GET /api/submissions/:id`, and `GET /api/teams/:teamId/milestones`; revise `AC-03` & `AC-04` (`v1.1.0`). `F-01` contract unchanged. |
| **System-Level SDS** | `docs/system-sds.md` §1.2 (ERD), §1.3 (Migrations), §2.1 (UI) | Add `boolean isLate` (`@default(false)`) to `Submission` entity in ERD; document additive migration & `GRACE PERIOD (24H)` / `LATE` UI badges. Role/Permission Matrix (§2.3) and Auth (§2.4) unchanged. |
| **STS Test IDs** | `docs/sprints/sprint-1/sts-and-dod.md` (`TEST-04`, new `TEST-07`) | Revise `TEST-04` expected rejection threshold to `> dueDate + 24h` (and updated message); add **`TEST-07`** covering exact boundaries (`<= dueDate`, `dueDate + 1ms`, `dueDate + 24h`, `dueDate + 24h + 1ms`), `isLate` persistence, UI badges, and preserved `401`/`403` guards. |
| **Backend Validation & Callers** | `server/src/utils/validation.ts` (`evaluateSubmissionDeadline`, `LATE_GRACE_WINDOW_MS`) | Add `LATE_GRACE_WINDOW_MS = 24 * 60 * 60 * 1000` and `evaluateSubmissionDeadline(dueDate, now)`. Retain `isDeadlinePassed(dueDate, now)` for nominal due-date checks so existing unit callers remain accurate and documented. |
| **Backend API Routes** | `server/src/routes/student.ts`, `server/src/routes/supervisor.ts` | `POST /api/milestones/:milestoneId/submissions` calls `evaluateSubmissionDeadline`, rejects `CUTOFF_PASSED` with `400 DEADLINE_PASSED`, persists `isLate`, returns `isLate`. `GET /api/submissions/:id` explicitly includes `isLate`. `GET /api/teams/:teamId/milestones` returns `isLate` automatically via Prisma `include: { submissions }`. `auth.ts` — **N/A** (no login/session change). |
| **Frontend UI** | `client/src/App.tsx` | Compute milestone window (`OPEN` / `GRACE PERIOD (24H)` / `PAST DUE`) using `24h` grace constant; render amber `GRACE PERIOD (24H)` badge on milestone card and amber/red `LATE` badge (`data-testid="submission-late-badge-${sub.id}"`) on submissions with `isLate === true`. Form reset (`DEF-SD-05`) and alert clearing (`DEF-SD-02`) unchanged. |
| **Persistence, Historical Data & Migrations** | `server/prisma/schema.prisma`, `server/prisma/migrations/20261125150000_add_submission_is_late/migration.sql` | Additive, non-breaking migration: `ALTER TABLE "Submission" ADD COLUMN "isLate" BOOLEAN NOT NULL DEFAULT false;`. **Historical Data Impact:** 100% of existing Sprint 1 / Lab 5 / Lab 6 submissions (all submitted on-time under `v1.0.0`) automatically retain `isLate = false` with zero data loss or table locks. Executed automatically in CI and GCP Cloud Run via `sprintduo-migrate`. |
| **Roles & Ownership** | `server/src/middleware/sessionAuth.ts`, `BR-01`, `BR-02` | **No relaxation of permissions (N/A for change, mandatory regression):** Grace-window submissions still require authenticated (`401`) `STUDENT` (`403` for `SUPERVISOR`) belonging to `milestone.teamId` (`403` for other teams). |
| **Secrets, Docker & CI/CD** | `Dockerfile`, `.github/workflows/*.yml`, Cloud Run secrets | **N/A** — No new env vars or secrets required; existing Lab 5 CI (`test-and-docker`) and `deploy.yml` (`sprintduo-migrate` + Cloud Run deploy) apply the Prisma migration automatically. |

---

## 4. Preserved Existing Behavior & Regression Protection Plan

The following Sprint 1 and Lab 6 behaviors **must remain completely unchanged** and are guarded by existing + new automated tests:

1. **Authentication & Session Lifecycle (`AC-01`, `AC-05`, `NFR-01`, `NFR-02`):** Protected routes return `401`; login/logout/Argon2id/SHA-256 cookie behavior preserved → protected by `server/tests/f01-supervisor.test.ts` (`TEST-01`, `TEST-05`) and `server/tests/lab5-runtime.test.ts`.
2. **Role Separation & Cross-Team Isolation (`AC-06`, `BR-01`, `BR-02`):** Supervisors (`403`) and foreign-team students (`403`) remain blocked from submitting — including during the 24-hour grace window → protected by `server/tests/f02-student.test.ts` (`TEST-06`) and `server/tests/lab7-br03-grace-window.test.ts` (`TEST-07`).
3. **Supervisor Milestone & Atomic Feedback Workflow (`AC-02`, `FR-02`, `FR-04`):** Supervisors create milestones and record `APPROVED`/`CHANGES_REQUESTED` feedback atomically inside `prisma.$transaction`, including on late-flagged submissions → protected by `server/tests/f01-supervisor.test.ts` (`TEST-02`).
4. **Input Validation & Lab 6 Security Hardening (`DEF-SD-01`, `DEF-SD-02`, `DEF-SD-04`, `DEF-SD-05`):** Non-HTTP URLs (`400`), INT4-overflow/non-canonical IDs (`404`), 80k-char payloads (`413`), malformed JSON (`400`), NUL-byte login (`401`), and client alert/draft clearing on logout/login remain green → protected by `server/tests/lab6-uat-defects.test.ts` and `client/tests/App.test.tsx`.

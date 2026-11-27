# Part A: Software Requirements Specification (SRS) and Product Scope

- **Project Name:** SprintDUO — Course Project Management System
- **Assigned Theme:** Theme 6 — Course Project Management System
- **Team Members:** `67070501084` (`JinggXd`) & `67070501036` (`yuminnini`)
- **Baseline Version:** `2.1.0-rc1` (Deliverable 2 Integrated Release Candidate — Sprints 1 & 2 Complete, Sprint 3 `F-04a` Implemented & Tested, `F-04b` Planned for 13 Dec)

---

## 1. Stakeholder Problem, Context, and Actors

### 1.1 Stakeholder Problem & Context
University course supervision programs require student teams to submit milestone deliverables, iterate on supervisor feedback across revisions, and monitor milestone progress transparently. Managing submissions via chat or email causes lost links, unclear deadline enforcement, lost revision history, and privacy leaks across teams. **SprintDUO** provides a centralized web platform for managing **Teams**, **Milestones**, **Submission Revisions**, **Feedback**, and **Progress Visibility**.

### 1.2 Actors and Responsibilities
| Actor | Role Code | Responsibilities |
| :--- | :--- | :--- |
| **Student** | `STUDENT` | Logs in; views only their own team's milestones, status filters, and Team Progress Board (`F-04a`); submits milestone work (`title`, `description`, `artifactUrl`) within the deadline/24-hour grace window (`BR-03 v1.1.0`); submits revised deliverables (`Rev #2+`) when `CHANGES_REQUESTED` while preserving prior history (`BR-04`); views persisted submissions and supervisor feedback. |
| **Supervisor** | `SUPERVISOR` | Logs in; views only assigned teams and each team's Progress Board (`F-04a`); creates, edits, extends due dates, and locks/unlocks milestones (`FR-02`, `FR-05`); filters milestones by status; reviews student submissions/revisions and records atomic feedback (`APPROVED` or `CHANGES_REQUESTED`); *(Planned for `v3.0.0`)* views course-wide summary report across supervised teams (`F-04b`). |

### 1.3 Product Scope and Exclusions
- **In Scope:** Session login/logout (`FR-01`, Sprint 1), supervisor milestone creation (`FR-02`, Sprint 1), student milestone submission with 24-hour grace deadline & late flagging (`FR-03`/`BR-03 v1.1.0`, Sprint 1 + Lab 7), atomic supervisor feedback (`FR-04`, Sprint 1), milestone editing/locking, status filtering, and multi-revision resubmission history (`FR-05`/`BR-04`, Sprint 2 `v2.0.0`), Team Progress Board (`FR-06`/`F-04a`, Sprint 3 `v2.1.0-rc1`), and Supervisor Course-Wide Summary Report (`FR-06`/`F-04b`, Planned for Final Delivery `v3.0.0`).
- **Explicitly Excluded:** Self-registration, password recovery, raw binary file storage (submissions use validated `http(s)://` URLs), numeric course letter grading, and automated code compilation.

---

## 2. Functional Requirements (FR)

| ID | Requirement Description (Observable Behavior) | Target Sprint | Current Checkpoint Status (`v2.1.0-rc1`) |
| :--- | :--- | :---: | :---: |
| **FR-01** | **Authentication & Session Identity:** Users log in (`POST /api/auth/login`), retrieve current identity (`GET /api/auth/me`), and log out (`POST /api/auth/logout`) using server-side sessions. | Sprint 1 | **Implemented & Verified** (`v1.0.0`–`v2.1.0-rc1`) |
| **FR-02** | **Milestone Creation & Listing:** Supervisors create milestones (`title`, `description`, `dueDate`) for a supervised team (`POST /api/teams/:teamId/milestones`); team members and the assigned supervisor view the team's milestones (`GET /api/teams/:teamId/milestones`). | Sprint 1 | **Implemented & Verified** (`v1.0.0`–`v2.1.0-rc1`) |
| **FR-03** | **Milestone Submission & Retrieval:** Students submit work (`title`, `description`, `artifactUrl`) to an unlocked team milestone (`POST /api/milestones/:milestoneId/submissions`) and retrieve persisted submission details (`GET /api/submissions/:id`, `GET /api/milestones/:milestoneId/submissions`). | Sprint 1 (extended Lab 7 & Sprint 2) | **Implemented & Verified** (`v1.0.0`–`v2.1.0-rc1`) |
| **FR-04** | **Supervisor Feedback Recording:** Supervisors record feedback (`comment`, `status`: `APPROVED` or `CHANGES_REQUESTED`) on a team's submission (`POST /api/submissions/:id/feedback`), atomically updating that submission's status. | Sprint 1 | **Implemented & Verified** (`v1.0.0`–`v2.1.0-rc1`) |
| **FR-05** | **Submission Revisions & Milestone Editing/Locking/Filtering:** Supervisors edit title/description/dueDate or lock/unlock milestones (`PATCH /api/milestones/:id`), filter milestones by status (`?status=...`), and students submit revised versions (`Rev #N+1`) after `CHANGES_REQUESTED` with full history retrieval (`GET /api/milestones/:id/submissions`). | Sprint 2 | **Implemented & Verified** (`v2.0.0` / `v2.1.0-rc1`) |
| **FR-06** | **Progress Board (`F-04a`) & Course Summary Report (`F-04b`):** Teams and supervisors view a live 4-column Team Milestone Progress Board (`GET /api/teams/:teamId/progress`, **`F-04a`**); supervisors view an aggregated course-wide completion/feedback summary across supervised teams (`GET /api/supervisor/summary`, **`F-04b`**). | Sprint 3 | **Partial:** `F-04a` **Implemented & Verified** (`v2.1.0-rc1`); `F-04b` **Planned** (`v3.0.0`, 13 Dec) |

---

## 3. Business Rules (BR)

| ID | Business Rule Specification | Target Sprint | Current Checkpoint Status |
| :--- | :--- | :---: | :---: |
| **BR-01** | **Team & Supervision Scope Isolation:** A `STUDENT` may only access teams, milestones, submissions, and progress boards where they are a registered member (`TeamMember`). A `SUPERVISOR` may only access or mutate teams where `team.supervisorId === user.id`. Cross-team requests return HTTP `403`. | Sprint 1–3 | **Implemented & Verified** |
| **BR-02** | **Role Separation of Duties:** Only a `SUPERVISOR` may create/edit/lock milestones, record feedback, or view the Supervisor Course Summary Report (`F-04b`). Only a `STUDENT` may create a milestone submission or revision. Role violations return HTTP `403`. | Sprint 1–3 | **Implemented & Verified** (`F-01`–`F-04a`); `F-04b` **Planned** |
| **BR-03** | **Deadline, 24-Hour Grace Window, Lock Guard & Input Validation (`v1.1.0` + Sprint 2):** Locked milestones (`isLocked === true`) reject student submissions with HTTP `400 MILESTONE_LOCKED`. Unlocked milestones accept submissions at or before `dueDate` (`201`, `isLate: false`) and inside the 24-hour grace window (`dueDate < serverNow <= dueDate + 24h` → `201`, `isLate: true`), and reject strictly after `dueDate + 24h` with `400 DEADLINE_PASSED` (zero stored). `artifactUrl` must start with `http://` or `https://`. | Sprint 1 (Lab 7 `v1.1.0`, Sprint 2 `v2.0.0`) | **Implemented & Verified** |
| **BR-04** | **Revision History Preservation:** Initial submission creates `Rev #1` (`parentSubmissionId: null`). When latest submission is `SUBMITTED`, duplicate posts return `409 SUBMISSION_PENDING_REVIEW`; when `APPROVED`, further posts return `409 MILESTONE_ALREADY_APPROVED`. When `CHANGES_REQUESTED`, students submit `Rev #N+1` linked via `parentSubmissionId` without overwriting or deleting prior submissions or feedbacks. | Sprint 2 (`v2.0.0`) | **Implemented & Verified** |

---

## 4. Non-Functional Requirements (NFR)

| ID | Requirement & Measurable Target | Verification Method | Target Sprint | Current Status |
| :--- | :--- | :--- | :---: | :---: |
| **NFR-01** | **Unauthenticated Rejection:** 100% of protected API endpoints reject unauthenticated requests with HTTP `401` and return zero private data. | API integration tests (`TEST-05`, `TEST-12`, `TEST-14`; `TEST-16` planned) | Sprint 1–3 | **Verified** (`F-01`–`F-04a`) |
| **NFR-02** | **Password & Session Security:** Passwords stored as Argon2id hashes; session tokens hashed with SHA-256 in PostgreSQL and sent via `HttpOnly` cookies; `64 KB` JSON limit (`413`) and canonical INT4 ID parsing (`404`). | Unit & API tests (`TEST-01`, `lab6-uat-defects.test.ts`) | Sprint 1 + Lab 6 | **Verified** |
| **NFR-03** | **Cloud Deployment Readiness:** Stateless Express + React container built via multi-stage Dockerfile (`VITE_COMMIT_SHA`/`VITE_APP_VERSION`), deployed automatically to Google Cloud Run + Cloud SQL via GitHub OIDC/WIF CI/CD with additive Prisma migrations and smoke tests. | CI `test-and-docker`, `Deploy demo`, live Cloud Run checks | Sprint 2 (Lab 5–7, `v2.0.0`, `v2.1.0-rc1`) | **Verified** |

---

## 5. Assumptions, Domain Clarifications, and Design Decisions

| ID | Topic / Theme 6 Question | Assumption / Decision & Resolution |
| :--- | :--- | :--- |
| **DD-01** | **Team Membership & Supervision Scope** | Teams (2–4 students) and supervisor assignments are pre-seeded in PostgreSQL (`TeamMember` and `Team.supervisorId`). Students cannot switch teams, and supervisors only manage assigned teams (`BR-01`). |
| **DD-02** | **Deadline & Locking Policy (`BR-03`)** | **v1.0.0:** Blocked immediately after `dueDate`. **v1.1.0 (Lab 7 #36):** Added bounded 24-hour late grace window (`isLate: true`, `LATE` badge; `> dueDate + 24h` blocked `400 DEADLINE_PASSED`). **v2.0.0 (Sprint 2 #7/#33):** Supervisors can extend `dueDate` or lock/unlock milestones (`400 MILESTONE_LOCKED`); Student UI hides the submit form on `PAST DUE` and `LOCKED` milestones while backend enforcement remains strict. |
| **DD-03** | **Revision Policy & Feedback Visibility (`BR-04`)** | **v1.0.0:** Single submission per milestone. **v2.0.0 (Sprint 2 #7):** Full multi-revision history (`revisionNumber`, self-FK `parentSubmissionId`): students resubmit only after `CHANGES_REQUESTED`; `SUBMITTED` (`409`) and `APPROVED` (`409`) prevent overwrites; all prior revisions and feedbacks remain immutable and visible to team members and the assigned supervisor (`BR-01`). |
| **DD-04** | **Artifact Storage Format** | Submissions store validated `http://` or `https://` URLs rather than binary uploads, keeping Cloud Run stateless (`NFR-03`). |

---

## 6. Revision History

| Version | Date | Author(s) | Summary of Change |
| :--- | :--- | :--- | :--- |
| `1.0.0` | 2026-11-04 | `JinggXd`, `yuminnini` | Initial Sprint 1–3 SRS baseline (`FR-01`–`FR-06`, `BR-01`–`BR-04`, `NFR-01`–`NFR-03`). |
| `1.1.0` | 2026-11-25 | `JinggXd` (reviewed by `yuminnini`) | Lab 7 Issue `#36`: Revised `BR-03` and `DD-02` to 24-hour late grace window with persisted `isLate`. |
| `2.1.0-rc1` | 2026-11-27 | `JinggXd` (reviewed by `yuminnini`) | Deliverable 2 baseline update: reflected completed Sprint 2 (`FR-05`, `BR-04`, `isLocked`, `#33`, `v2.0.0`) and Sprint 3 `F-04a` Team Progress Board (`FR-06`, `v2.1.0-rc1`), with `F-04b` explicitly retained as Planned for Final Delivery (`v3.0.0`). |

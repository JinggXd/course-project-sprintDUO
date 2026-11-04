# Part A: Software Requirements Specification (SRS) and Product Scope

- **Project Name:** SprintDUO — Course Project Management System
- **Assigned Theme:** Theme 6 — Course Project Management System
- **Team Members:** `67070501084` (`JinggXd`) & `67070501036` (`yuminnini`)

---

## 1. Stakeholder Problem, Context, and Actors

### 1.1 Stakeholder Problem & Context
University course supervision programs require student teams to submit milestone deliverables and receive structured supervisor feedback. Managing submissions via chat or email causes lost links, unclear deadline enforcement, and privacy leaks across teams. **SprintDUO** provides a centralized web platform for managing **Teams**, **Milestones**, **Submissions**, and **Feedback**.

### 1.2 Actors and Responsibilities
| Actor | Role Code | Responsibilities |
| :--- | :--- | :--- |
| **Student** | `STUDENT` | Logs in; views only their own team's milestones; submits milestone work (`title`, `description`, `artifactUrl`) before the deadline; views persisted submissions and supervisor feedback. |
| **Supervisor** | `SUPERVISOR` | Logs in; views only assigned teams; creates milestones (`title`, `description`, `dueDate`) for supervised teams; reviews student submissions and records feedback (`comment`, `status`). |

### 1.3 Product Scope and Exclusions
- **In Scope:** Session login/logout (Sprint 1), supervisor milestone creation (Sprint 1), student milestone submission with deadline enforcement (Sprint 1), supervisor feedback recording (Sprint 1), submission revision history & milestone editing (Sprint 2), and progress board & summary reports (Sprint 3).
- **Explicitly Excluded:** Self-registration, password recovery, raw binary file storage (submissions use validated URLs), numeric course letter grading, and automated code compilation.

---

## 2. Functional Requirements (FR)

| ID | Requirement Description (Observable Behavior) | Target Sprint |
| :--- | :--- | :---: |
| **FR-01** | **Authentication & Session Identity:** Users log in (`POST /api/auth/login`), retrieve current identity (`GET /api/auth/me`), and log out (`POST /api/auth/logout`) using server-side sessions. | Sprint 1 |
| **FR-02** | **Milestone Creation & Listing:** Supervisors create milestones (`title`, `description`, `dueDate`) for a supervised team (`POST /api/teams/:teamId/milestones`); team members and the assigned supervisor view the team's milestones (`GET /api/teams/:teamId/milestones`). | Sprint 1 |
| **FR-03** | **Milestone Submission & Retrieval:** Students submit work (`title`, `description`, `artifactUrl`) to a team milestone (`POST /api/milestones/:milestoneId/submissions`) and retrieve persisted submission details (`GET /api/submissions/:id`). | Sprint 1 |
| **FR-04** | **Supervisor Feedback Recording:** Supervisors record feedback (`comment`, `status`: `APPROVED` or `CHANGES_REQUESTED`) on a team's submission (`POST /api/submissions/:id/feedback`), updating the submission's status. | Sprint 1 |
| **FR-05** | **Submission Revisions & Milestone Editing:** Students submit revised versions when changes are requested, and supervisors edit or lock existing milestones. | Sprint 2 |
| **FR-06** | **Progress Board & Course Summary Report:** Teams view a milestone progress board and supervisors view an aggregated completion/feedback summary across supervised teams. | Sprint 3 |

---

## 3. Business Rules (BR)

| ID | Business Rule Specification | Target Sprint |
| :--- | :--- | :---: |
| **BR-01** | **Team & Supervision Scope Isolation:** A `STUDENT` may only access teams where they are a registered member (`TeamMember`). A `SUPERVISOR` may only access teams where `team.supervisorId === user.id`. Cross-team requests return HTTP `403`. | Sprint 1 |
| **BR-02** | **Role Separation of Duties:** Only a `SUPERVISOR` may create milestones or record feedback. Only a `STUDENT` may create a milestone submission. Role violations return HTTP `403`. | Sprint 1 |
| **BR-03** | **Deadline & Input Validation Rule:** A student cannot submit work to a milestone whose `dueDate` has already passed (`serverNow > milestone.dueDate` -> HTTP `400 DEADLINE_PASSED`), and `artifactUrl` must be a valid `http://` or `https://` URL. | Sprint 1 |
| **BR-04** | **Revision History Preservation:** Resubmissions in Sprint 2 preserve prior submission records and associated supervisor feedback without overwriting history. | Sprint 2 |

---

## 4. Non-Functional Requirements (NFR)

| ID | Requirement & Measurable Target | Verification Method | Target Sprint |
| :--- | :--- | :--- | :---: |
| **NFR-01** | **Unauthenticated Rejection:** 100% of protected API endpoints reject unauthenticated requests with HTTP `401` and return zero private data. | API integration test (`TEST-05`) | Sprint 1 |
| **NFR-02** | **Password & Session Security:** Passwords are stored as Argon2id hashes; session tokens are hashed with SHA-256 in PostgreSQL and sent via `HttpOnly` cookies. | Unit & API login test (`TEST-01`) | Sprint 1 |
| **NFR-03** | **Cloud Deployment Readiness:** Stateless Express + React architecture configured via environment variables (`DATABASE_URL`, `PORT`) ready for Docker & GCP in Lab 5. | Local build in Sprint 1; Docker + GCP in Sprint 2 (Lab 5) | Sprint 1 & 2 |

---

## 5. Assumptions, Domain Clarifications, and Design Decisions

| ID | Topic / Theme 6 Question | Assumption / Decision & Resolution |
| :--- | :--- | :--- |
| **DD-01** | **Team Membership & Supervision Scope** | **Assumption & Decision:** Teams (2–4 students) and supervisor assignments are pre-seeded in the database (`TeamMember` and `Team.supervisorId`). Students cannot switch teams, and supervisors only manage their assigned teams (`BR-01`). |
| **DD-02** | **Deadline Policy (`BR-03`)** | **Question:** Should submissions after `dueDate` be blocked or flagged late?<br>**Resolution:** Strictly block submissions after `milestone.dueDate` with HTTP `400 DEADLINE_PASSED` using the server's clock. Supervisors can extend `dueDate` in Sprint 2 (`FR-05`). |
| **DD-03** | **Revision Policy & Feedback Visibility** | **Question:** When can students resubmit, and who may view feedback?<br>**Resolution:** In Sprint 1, each milestone accepts one submission (`SUBMITTED`) which the supervisor evaluates (`APPROVED` or `CHANGES_REQUESTED`). Full multi-version resubmission history after `CHANGES_REQUESTED` is delivered in Sprint 2 (`BR-04`). Feedback is visible only to members of that team and the assigned supervisor (`BR-01`). |
| **DD-04** | **Artifact Storage Format** | **Decision:** Submissions store validated `http://` or `https://` URLs (e.g., GitHub release or document link) rather than binary file uploads, keeping the container stateless for GCP deployment in Lab 5. |

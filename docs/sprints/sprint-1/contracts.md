# Part E: Sprint 1 Engineering Contracts

- **Project Name:** SprintDUO — Course Project Management System (Theme 6)
- **Team Members:** `67070501084` (`JinggXd`) & `67070501036` (`yuminnini`)
- **Version:** `1.1.0` (Revised for Lab 7 Issue `#36`; supersedes `1.0.0`)

---

## 1. Feature Contract `F-01`: Auth, Supervisor Milestone & Feedback Workflow

- **Linked Requirements:** `FR-01`, `FR-02`, `FR-04`, `BR-01`, `BR-02`, `NFR-01`, `NFR-02`
- **Dependencies:** None (Foundation)
- **Owner / Reviewer:** Author: `JinggXd` (`67070501084`) | Reviewer: `yuminnini` (`67070501036`)

### 1.1 Behavior, Rules, Validation, and Permissions
1. **Authentication (`POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`):**
   - Verifies email and Argon2id password hash; creates a `Session` record and sets `sprintduo_session` (`HttpOnly` cookie). Missing fields return `400`; invalid credentials return `401`.
2. **Supervisor Milestone Creation (`POST /api/teams/:teamId/milestones`):**
   - **Permissions (`BR-01`, `BR-02`):** Only a `SUPERVISOR` assigned to `:teamId` (`team.supervisorId === req.user.id`) may create a milestone. Students or unassigned supervisors receive `403`.
   - **Validation:** `title` (required, 3–150 trimmed chars), `description` (required, 5–2000 trimmed chars), and `dueDate` (valid ISO-8601 date string). Invalid fields return `400`.
3. **Supervisor Feedback (`POST /api/submissions/:id/feedback`):**
   - **Permissions (`BR-01`, `BR-02`):** Only the `SUPERVISOR` assigned to the submission's team may record feedback. Students or unassigned supervisors receive `403`.
   - **Validation & Transaction:** Requires `comment` (3–2000 trimmed chars) and `status` (`"APPROVED"` or `"CHANGES_REQUESTED"`). Atomically creates `Feedback` and updates `Submission.status` inside `prisma.$transaction`.

### 1.2 UI, API Request/Response Shapes, and Data Specification
- **UI Behavior:** Login form (`email`, `password`) with error banner (`role="alert"`); authenticated navbar showing user name, role badge, and `Log Out` button; Supervisor **"Create Milestone"** form; Supervisor **"Record Feedback"** form on submitted work.
- **API Shapes:**
  | Method & Path | Request Body Shape | Success Response Shape | Error Status & Shape |
  | :--- | :--- | :--- | :--- |
  | `POST /api/auth/login` | `{ email: string, password: string }` | `200 { user: { id, name, email, role } }` + `Set-Cookie` | `400` / `401 { error, message }` |
  | `GET /api/auth/me` | None (uses `sprintduo_session` cookie) | `200 { user: { id, name, email, role } }` | `401 { error, message }` |
  | `POST /api/auth/logout` | None | `204 No Content` | `500 { error, message }` |
  | `POST /api/teams/:teamId/milestones` | `{ title: string, description: string, dueDate: string }` | `201 { milestone: { id, teamId, title, description, dueDate, createdById } }` | `400` (validation), `401`, `403` (role/scope), `404` |
  | `POST /api/submissions/:id/feedback` | `{ comment: string, status: "APPROVED" \| "CHANGES_REQUESTED" }` | `201 { feedback: { id, submissionId, supervisorId, comment, status, createdAt }, submission: { id, status } }` | `400` (validation), `401`, `403` (role/scope), `404` |
- **Data Layer:** Uses initial migration tables `User`, `Session`, `Milestone`, and `Feedback` (no additional schema changes needed beyond initial migration).

---

## 2. Feature Contract `F-02`: Student Team View, Submission & Deadline Rule

- **Linked Requirements:** `FR-02`, `FR-03`, `BR-01`, `BR-02`, `BR-03`, `NFR-01`
- **Dependencies:** `F-01`
- **Owner / Reviewer:** Author: `yuminnini` (`67070501036`) | Reviewer: `JinggXd` (`67070501084`)

### 2.1 Behavior, Rules, Validation, and Permissions
1. **Scoped Team & Milestone Retrieval (`GET /api/teams`, `GET /api/teams/:teamId/milestones`):**
   - Returns only teams where the student is a member (`TeamMember`) or the supervisor is assigned (`BR-01`). Requesting another team's milestones returns `403`.
2. **Student Milestone Submission (`POST /api/milestones/:milestoneId/submissions`):**
   - **Permissions (`BR-01`, `BR-02`):** Only a `STUDENT` who is a member of `milestone.teamId` may submit work. Supervisors or students from other teams receive `403`.
   - **Deadline & 24-Hour Grace Window Rule (`BR-03` v1.1.0, Lab 7 Issue `#36`):**
     - `serverNow <= milestone.dueDate` → Accepted on time (`201 Created`, persisted with `isLate: false`).
     - `milestone.dueDate < serverNow <= milestone.dueDate + 24 hours` (`86,400,000 ms`, inclusive) → Accepted inside the 24-hour late grace window (`201 Created`, persisted with `isLate: true`).
     - `serverNow > milestone.dueDate + 24 hours` → Rejected with HTTP `400` (`{ "error": "DEADLINE_PASSED", "message": "Milestone deadline has passed (24-hour grace window expired)" }`) and zero record stored.
   - **Validation (`BR-03`):** Requires `title` (3–150 trimmed chars), `description` (5–2000 trimmed chars), and `artifactUrl` starting with `http://` or `https://`. Invalid inputs return `400` with `details` (both on-time and during the grace window).
3. **Persisted Submission View (`GET /api/submissions/:id`):**
   - Returns the persisted submission (including `isLate`) along with its milestone info, submitter info, and recorded supervisor `feedbacks`. Rejects cross-team access with `403`.

### 2.2 UI, API Request/Response Shapes, and Data Specification
- **UI Behavior:** Team overview header, Milestone list with due date badge (`OPEN` when `now <= dueDate`, `GRACE PERIOD (24H)` when `dueDate < now <= dueDate + 24h`, and `PAST DUE` when `now > dueDate + 24h`), Student **"Submit Milestone Work"** form (`title`, `description`, `artifactUrl`), error alert (`role="alert"`) when grace cutoff has passed or URL is invalid, and persisted Submission + Feedback card displaying a **`LATE`** badge whenever `submission.isLate === true`.
- **API Shapes:**
  | Method & Path | Request Body Shape | Success Response Shape | Error Status & Shape |
  | :--- | :--- | :--- | :--- |
  | `GET /api/teams` | None | `200 { teams: [{ id, code, name, projectTitle, supervisor, members }] }` | `401 { error, message }` |
  | `GET /api/teams/:teamId/milestones` | None | `200 { team, milestones: [{ id, title, description, dueDate, submissions: [{ ..., isLate }] }] }` | `401`, `403` (cross-team), `404` |
  | `POST /api/milestones/:milestoneId/submissions` | `{ title: string, description: string, artifactUrl: string }` | `201 { submission: { id, milestoneId, submittedById, title, description, artifactUrl, status, isLate, submittedAt } }` | `400` (`DEADLINE_PASSED` or `VALIDATION_ERROR`), `401`, `403`, `404`, `413` |
  | `GET /api/submissions/:id` | None | `200 { submission: { id, title, description, artifactUrl, status, isLate, submittedBy, milestone, feedbacks } }` | `401`, `403` (cross-team), `404` |
- **Data Layer:** Uses tables `Team`, `TeamMember`, `Milestone`, and `Submission` (plus Lab 7 `v1.1.0` additive column `Submission.isLate BOOLEAN NOT NULL DEFAULT false`).

---

## 3. Sprint 1 Acceptance Criteria (`AC-01` to `AC-06` — Revised `v1.1.0`)

| AC ID | Feature | Acceptance Criterion (Observable Outcome) |
| :--- | :---: | :--- |
| **AC-01** | `F-01` | **Authentication Lifecycle:** Valid login returns `200` with session cookie and `/api/auth/me` returns user identity; invalid login returns `401`; logout returns `204` and revokes the session. |
| **AC-02** | `F-01` | **Supervisor Milestone & Feedback:** An assigned `SUPERVISOR` can create a milestone (`201`) for their supervised team and record feedback (`APPROVED` / `CHANGES_REQUESTED`) on a submission (`201`), updating the submission's status. |
| **AC-03** | `F-02` | **Student Submission, Late Grace Marking & Persisted Retrieval (`v1.1.0`):** A `STUDENT` team member submitting valid `title`, `description`, and `artifactUrl` at or before `dueDate` creates a persisted submission (`201`, `isLate: false`); submitting within the 24-hour grace window (`dueDate < serverNow <= dueDate + 24h`) creates a persisted late submission (`201`, `isLate: true`) retrievable via API (`200`) and displayed with a `LATE` badge in UI. |
| **AC-04** | `F-02` | **Grace Cutoff & Validation Rejection (`BR-03` v1.1.0):** Submitting strictly after `dueDate + 24h` (`serverNow > dueDate + 24h`, `DEADLINE_PASSED`) or submitting an invalid URL/length (`VALIDATION_ERROR`) is rejected with HTTP `400` and no submission is stored. |
| **AC-05** | `F-01`, `F-02` | **Unauthenticated Access Protection (`NFR-01`):** Calling any protected team, milestone, submission, or feedback endpoint without an active session returns HTTP `401`. |
| **AC-06** | `F-01`, `F-02` | **Role & Cross-Team Access Restrictions (`BR-01`, `BR-02`):** A `STUDENT` attempting to create a milestone or feedback, or any user attempting to view/modify another team's milestones or submissions (including during the 24-hour grace window), is rejected with HTTP `403`. |

---

## 4. Contract Revision History

| Version | Date | Author(s) | Summary of Change |
| :--- | :--- | :--- | :--- |
| `1.0.0` | 2026-11-04 | `JinggXd`, `yuminnini` | Initial Sprint 1 baseline: strict rejection (`400 DEADLINE_PASSED`) immediately when `serverNow > milestone.dueDate`. |
| `1.1.0` | 2026-11-25 | `JinggXd` (reviewed by `yuminnini`) | Lab 7 Issue `#36`: Revised `F-02` (`BR-03`, `AC-03`, `AC-04`) to permit submissions within a 24-hour grace window (`dueDate < serverNow <= dueDate + 24h`) marked `isLate: true`, rejecting strictly after `dueDate + 24h` with `400 DEADLINE_PASSED`. |

# Sprint 2 Software Test Specification (STS) and Definition of Done

- **Project Name:** SprintDUO — Course Project Management System (Theme 6)
- **Team Members:** `67070501084` (`JinggXd`) & `67070501036` (`yuminnini`)
- **Version:** `1.0.0` (Pre-implementation Sprint 2 baseline — authored before Sprint 2 code)

---

## 1. Sprint 2 Software Test Specification (`TEST-08` to `TEST-12`)

| Test ID | Linked AC | Test Level | Preconditions / Input | Action | Expected Result |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **TEST-08** | `AC-07` | Unit + API / DB Integration | Logged in as `sup.advisor1@sprintduo.edu` (Team Alpha supervisor); existing past-due or open milestone | 1) Unit-test `validateMilestoneUpdateInput` on empty `{}`, short title, invalid date, non-boolean `isLocked`, and valid partial payloads.<br>2) Call `PATCH /api/milestones/:id` updating `title`, `description`, and extending `dueDate` into the future.<br>3) Student submits to the extended milestone. | 1) Invalid inputs return `isValid: false` with field errors; API returns `400 VALIDATION_ERROR` without mutating DB.<br>2) `PATCH` returns `200` with persisted updated fields.<br>3) Extending a past-due milestone's `dueDate` allows subsequent student submission (`201`, `isLate: false`). |
| **TEST-09** | `AC-08` | API / DB Integration + Client UI (RTL) | Assigned `SUPERVISOR`, Team Alpha `STUDENT`, open milestone and `PAST DUE` milestone | 1) Supervisor calls `PATCH /api/milestones/:id` with `{ isLocked: true }`.<br>2) Student calls `POST /api/milestones/:id/submissions`.<br>3) Supervisor unlocks (`{ isLocked: false }`) and student submits.<br>4) Render Student UI on locked and `PAST DUE` milestones. | 1) Returns `200` with `isLocked: true`.<br>2) Student submission rejected with `400 MILESTONE_LOCKED`, zero record stored.<br>3) Unlocking restores submission eligibility (`201`).<br>4) UI displays `LOCKED` / `PAST DUE` badges, hides the Submit Milestone Work form (closing `#33` `DEF-SD-03`), and shows explicit closed/locked notices. |
| **TEST-10** | `AC-09` | API / DB Integration + Client UI (RTL) | Team Alpha with milestones across `NOT_STARTED`, `SUBMITTED`, `CHANGES_REQUESTED`, `APPROVED`, and `LOCKED` states | 1) Call `GET /api/teams/:teamId/milestones?status=<each>` and `?status=INVALID`.<br>2) Select filter options in Client UI filter bar. | 1) Each valid filter returns `200` with only matching milestones (derived from latest submission revision or `isLocked`); `?status=INVALID` returns `400 VALIDATION_ERROR`; omitted `?status` returns all milestones.<br>2) UI updates rendered milestone list to match selected filter and shows empty-filter message when zero match. |
| **TEST-11** | `AC-10` | API / DB Integration + Client UI (RTL) | Team Alpha `STUDENT` and `SUPERVISOR` on an open unlocked milestone | 1) Student submits `Rev #1` (`201`, `revisionNumber: 1`, `parentSubmissionId: null`).<br>2) Student attempts duplicate submission while `SUBMITTED`.<br>3) Supervisor records `CHANGES_REQUESTED` feedback on `Rev #1`.<br>4) Student submits `Rev #2`.<br>5) Supervisor records `APPROVED` on `Rev #2`.<br>6) Student attempts `Rev #3` after approval.<br>7) Call `GET /api/milestones/:id/submissions` and render in Client UI. | 1) `Rev #1` created (`201`).<br>2) Duplicate while `SUBMITTED` rejected with `409 SUBMISSION_PENDING_REVIEW` (0 added).<br>3) `Rev #1` status updated to `CHANGES_REQUESTED`.<br>4) `Rev #2` created (`201`, `revisionNumber: 2`, `parentSubmissionId: rev1.id`, `status: "SUBMITTED"`).<br>5) `Rev #2` approved (`201`).<br>6) Post-approval attempt rejected with `409 MILESTONE_ALREADY_APPROVED` (0 added).<br>7) History endpoint (`200`) and UI return BOTH `Rev #2` (newest) and `Rev #1` with each revision's original feedback completely preserved. |
| **TEST-12** | `AC-11` | API / DB Integration | Unauthenticated caller, Team Alpha `STUDENT`, Team Beta `STUDENT`, Team Beta `SUPERVISOR` | 1) Unauthenticated `PATCH /api/milestones/:id` and `GET /api/milestones/:id/submissions`.<br>2) Student calls `PATCH /api/milestones/:id`.<br>3) Advisor 2 (Team Beta) calls `PATCH /api/milestones/:alphaId` and `GET /api/milestones/:alphaId/submissions`.<br>4) Team Beta student calls `GET /api/milestones/:alphaId/submissions`.<br>5) Overflow IDs (`2147483648`) on new Sprint 2 endpoints. | 1) Returns `401 UNAUTHENTICATED`.<br>2–4) All role & cross-team violations return `403 FORBIDDEN` (`BR-01`, `BR-02`) with zero DB mutation.<br>5) Overflow/non-canonical IDs return `404 NOT_FOUND` (preserving Lab 6 `DEF-SD-01`). |

---

## 2. Legitimate Existing Test Adaptation Note (Closing Lab 6 `#33` `DEF-SD-03`)

- **Backend `TEST-04` (`f02-student.test.ts` & `lab7-br03-grace-window.test.ts`):** **Unchanged.** Server-side `400 DEADLINE_PASSED` and `400 VALIDATION_ERROR` enforcement remains 100% tested directly against Express API endpoints.
- **Client UI `TEST-04` & `DEF-SD-02` (`client/tests/App.test.tsx`):** Because closing Lab 6 Minor Defect `#33` (`DEF-SD-03`) intentionally hides the "Submit Milestone Work" form on `PAST DUE` milestones in the Student UI, the Client RTL `TEST-04` and `DEF-SD-02` specs will be updated to:
  1. Assert that `PAST DUE` milestones hide the form and display `"Submissions closed (24-hour grace window expired)"` (`#33` / `AC-08`), and
  2. Trigger server `400` validation error alerts (`role="alert"`) on an open milestone (invalid URL / server error) so both error-banner display (`TEST-04`) and logout alert clearing (`DEF-SD-02`) remain strictly verified.

---

## 3. Sprint 2 Definition of Done (DoD)

1. Pre-implementation Sprint 2 contracts (`docs/sprints/sprint-2/contracts.md`) and STS (`docs/sprints/sprint-2/sts-and-dod.md`) reviewed, approved, and merged into `staging` **before** Sprint 2 implementation code.
2. All planned Sprint 2 features (`F-03a`: Milestone Edit/Extend/Lock + Status Filter + `#33` closure + `TD-01`/`TD-02`; `F-03b`: `BR-04` Submission Revision History preserving prior records & feedback) implemented across Prisma/PostgreSQL, Express API, and modularized React UI with additive non-breaking migration.
3. TDD RED → GREEN evidence captured on Sprint 2 tests (`TEST-08`–`TEST-12`), plus **≥ 2 new Client RTL tests** (`TD-02`), and **100% passing regression** across all Sprint 1 (`TEST-01`–`TEST-06`), Lab 5, Lab 6, and Lab 7 (`TEST-07`) suites on real PostgreSQL 16 (zero failed, zero skipped).
4. Feature PR reviewed/merged into `staging` and Release PR reviewed/merged into `main` by teammate (`@yuminnini`), closing Issues `#7` and `#33`, tagged **`v2.0.0`**, and deployed to Google Cloud Run via automated CI/CD.

---

## 4. Revision History

| Version | Date | Author(s) | Summary of Change |
| :--- | :--- | :--- | :--- |
| `1.0.0` | 2026-11-26 | `JinggXd` (for review by `yuminnini`) | Initial pre-implementation Sprint 2 STS (`TEST-08`–`TEST-12`), `#33` UI test adaptation note, and Sprint 2 DoD. |

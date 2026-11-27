# Part B: Feature Inventory

- **Project Name:** SprintDUO — Course Project Management System (Theme 6)
- **Team Members:** `67070501084` (`JinggXd`) & `67070501036` (`yuminnini`)
- **Baseline Version:** `2.1.0-rc1` (Updated for Deliverable 2 — 27 Nov 2026)

---

## Product Feature List (Sprints 1–3)

| Feature ID | Feature Name | Short Description | Related Requirements | Dependencies | Planned Sprint | Deliverable 2 Status (`v2.1.0-rc1`) |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **F-01** | **Auth, Supervisor Milestone & Feedback Workflow** | Session login/logout/me (`POST /api/auth/login`, `/logout`, `GET /api/auth/me`), supervisor milestone creation (`POST /api/teams/:teamId/milestones`), and atomic supervisor feedback recording (`POST /api/submissions/:id/feedback`). | `FR-01`, `FR-02`, `FR-04`, `BR-01`, `BR-02`, `NFR-01`, `NFR-02` | None | **Sprint 1** (`JinggXd`) | **Accepted & Regression-Verified** (`v1.0.0` → `v2.1.0-rc1`) |
| **F-02** | **Student Team View, Submission & 24h Grace Deadline Rule** | Scoped team/milestone listing (`GET /api/teams`, `GET /api/teams/:teamId/milestones`), student submission (`POST /api/milestones/:milestoneId/submissions`) enforcing `BR-03 v1.1.0` (24h late grace window + persisted `isLate`), and submission retrieval (`GET /api/submissions/:id`). | `FR-02`, `FR-03`, `BR-01`, `BR-02`, `BR-03`, `NFR-01` | `F-01` | **Sprint 1** (`yuminnini`, Lab 7 maintained `v1.1.0`) | **Accepted & Regression-Verified** (`v1.0.0` → `v1.1.0` → `v2.1.0-rc1`) |
| **F-03a** | **Supervisor Milestone Edit, Locking, Status Filter & `#33`/`TD-01`/`TD-02`** | Supervisor milestone editing/due-date extension & locking (`PATCH /api/milestones/:id`), `400 MILESTONE_LOCKED` guard, milestone status filtering (`?status=...`), UI form closure on `PAST DUE`/`LOCKED` milestones (closing `#33`), build SHA UI footer (`TD-01`), modularized UI components (`TD-02`), and Cloud Run/Docker CI/CD (`NFR-03`). | `FR-05`, `BR-01`, `BR-02`, `BR-03`, `NFR-01`, `NFR-03` | `F-01`, `F-02` | **Sprint 2** (`JinggXd` / `yuminnini`, Issue `#7`, `#33`) | **Completed, Reviewed & Released** (`v2.0.0` `914936d` → `v2.1.0-rc1`) |
| **F-03b** | **Student Submission Revision History (`BR-04`)** | Multi-revision resubmission (`Rev #N+1` linked via `parentSubmissionId`) after `CHANGES_REQUESTED`, preserving all prior revisions & feedbacks intact, `GET /api/milestones/:id/submissions`, and `409 SUBMISSION_PENDING_REVIEW` / `409 MILESTONE_ALREADY_APPROVED` guards. | `FR-05`, `BR-01`, `BR-02`, `BR-03`, `BR-04`, `NFR-01` | `F-02`, `F-03a` | **Sprint 2** (`JinggXd` / `yuminnini`, Issue `#7`) | **Completed, Reviewed & Released** (`v2.0.0` `914936d` → `v2.1.0-rc1`) |
| **F-04a** | **Team Milestone Progress Board** | Scoped Team Progress API (`GET /api/teams/:teamId/progress`, `BR-01`) with `computeTeamProgress` aggregation (`NOT_STARTED`/`SUBMITTED`/`CHANGES_REQUESTED`/`APPROVED`, `completionPercent`, `lockedCount`, `lateSubmissionCount`) and visual 4-column `TeamProgressBoard` UI component. | `FR-06`, `BR-01`, `BR-03`, `BR-04`, `NFR-01` | `F-01`–`F-03b` | **Sprint 3** (Issue `#8`) | **Implemented & Tested in RC** (`v2.1.0-rc1`) |
| **F-04b** | **Supervisor Course-Wide Summary Report** | Supervisor-only aggregated summary endpoint (`GET /api/supervisor/summary`, `BR-01`/`BR-02`) across all supervised teams with summary table UI and CSV export. | `FR-06`, `BR-01`, `BR-02`, `NFR-01` | `F-04a` | **Sprint 3** (Issue `#8`) | **Contract & STS Complete; Implementation Planned** (Target: Final Delivery `v3.0.0`, 13 Dec) |

# Part B: Feature Inventory

- **Project Name:** SprintDUO — Course Project Management System (Theme 6)
- **Team Members:** `67070501084` (`JinggXd`) & `67070501036` (`yuminnini`)

---

## Product Feature List (Sprints 1–3)

Sprint 1 is divided into **2 core features** (`F-01` and `F-02`), corresponding directly to the two team members' GitHub Issues and Pull Requests. Sprints 2 and 3 add `F-03` and `F-04`.

| Feature ID | Feature Name | Short Description | Related Requirements | Dependencies | Planned Sprint |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **F-01** | **Auth, Supervisor Milestone & Feedback Workflow** | Session login/logout/me (`POST /api/auth/login`, `/logout`, `GET /api/auth/me`), supervisor milestone creation (`POST /api/teams/:teamId/milestones`), and supervisor feedback recording (`POST /api/submissions/:id/feedback`). | `FR-01`, `FR-02`, `FR-04`, `BR-01`, `BR-02`, `NFR-01`, `NFR-02` | None | **Sprint 1** (`JinggXd`) |
| **F-02** | **Student Team View, Submission & Deadline Rule** | Team & milestone listing (`GET /api/teams`, `GET /api/teams/:teamId/milestones`), student milestone submission (`POST /api/milestones/:milestoneId/submissions`) enforcing the deadline rule (`BR-03`), and persisted submission retrieval (`GET /api/submissions/:id`). | `FR-02`, `FR-03`, `BR-01`, `BR-02`, `BR-03`, `NFR-01` | `F-01` | **Sprint 1** (`yuminnini`) |
| **F-03** | **Submission Revisions & Milestone Management** | Resubmission history when status is `CHANGES_REQUESTED`, supervisor milestone editing/deadline extension, and status filtering (`FR-05`, `BR-04`), plus Docker/GCP deployment (`NFR-03`). | `FR-05`, `BR-04`, `NFR-03` | `F-01`, `F-02` | **Sprint 2** |
| **F-04** | **Team Progress Board & Supervisor Summary Report** | Visual progress board per team and supervisor course-wide summary dashboard aggregating completion and approval counts (`FR-06`). | `FR-06` | `F-01`–`F-03` | **Sprint 3** |

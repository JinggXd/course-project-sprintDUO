# Part D: Three-Sprint Plan

- **Project Name:** SprintDUO — Course Project Management System (Theme 6)
- **Team Members:** `67070501084` (`JinggXd`) & `67070501036` (`yuminnini`)

---

## 1. Three-Sprint Schedule and Allocation

| Sprint | Checkpoint | Sprint Goal | Included Feature IDs | Dependencies | Completion Outcome |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **Sprint 1** | **Deliverable 1**<br>(8 Nov 2026) | Deliver working vertical slice: session authentication, supervisor milestone creation, student submission with deadline validation, supervisor feedback, and role/team access control. | `F-01`, `F-02` | None | Working release on `main` (`v1.0.0`) with automated unit, API/DB integration, and UI tests. |
| **Sprint 2** | **Lab 5 & Deliverable 2**<br>(15 / 29 Nov 2026) | Deploy containerized app to GCP (Lab 5) and implement submission revision history (`CHANGES_REQUESTED` resubmission) and milestone editing/filtering. | `F-03` | `F-01`, `F-02` | Deployed GCP release candidate (`v2.0.0`), CI/CD pipeline, and UAT defect management (Lab 6). |
| **Sprint 3** | **Final Delivery**<br>(13 Dec 2026) | Implement Team Progress Board and Supervisor Course Summary Report, complete maintenance/metrics (Lab 7), and verify full product. | `F-04` | `F-01`–`F-03` | Final verified product on GCP (`v3.0.0`), final report PDF, and 10-minute demo video. |

---

## 2. Sprint 1 Scope and Team Member Responsibilities

Sprint 1 is partitioned into two reviewable features so each student leads one feature branch/PR and reviews their teammate's PR:
1. **`F-01` — Auth, Supervisor Milestone & Feedback Workflow (Led by `67070501084` / `JinggXd`, Reviewed by `yuminnini`):**
   - Session login/logout/me, supervisor milestone creation (`POST /api/teams/:teamId/milestones`), and supervisor feedback recording (`POST /api/submissions/:id/feedback`).
2. **`F-02` — Student Team View, Submission & Deadline Rule (Led by `67070501036` / `yuminnini`, Reviewed by `JinggXd`):**
   - Scoped team/milestone viewing (`GET /api/teams`, `GET /api/teams/:teamId/milestones`), student submission with deadline & URL validation (`POST /api/milestones/:milestoneId/submissions`), and persisted submission retrieval (`GET /api/submissions/:id`).

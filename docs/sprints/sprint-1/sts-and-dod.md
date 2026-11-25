# Part E: Sprint 1 Software Test Specification (STS) and Definition of Done

- **Project Name:** SprintDUO — Course Project Management System (Theme 6)
- **Team Members:** `67070501084` (`JinggXd`) & `67070501036` (`yuminnini`)
- **Version:** `1.1.0` (Revised for Lab 7 Issue `#36`; supersedes `1.0.0`)

---

## 1. Software Test Specification (STS)

| Test ID | Linked AC | Test Level | Preconditions / Input | Action | Expected Result |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **TEST-01** | `AC-01` | Unit + API Integration | Seeded user `sup.advisor1@sprintduo.edu` | Verify Argon2id password helper; call `POST /api/auth/login` (valid & invalid), `GET /api/auth/me`, and `POST /api/auth/logout` | Valid login returns `200` + cookie; invalid returns `401`; `/me` returns user role; `/logout` returns `204` and subsequent `/me` returns `401`. |
| **TEST-02** | `AC-02` | API / DB Integration | Logged in as `sup.advisor1@sprintduo.edu` (Team Alpha supervisor) | Create milestone via `POST /api/teams/:teamId/milestones`, then record feedback via `POST /api/submissions/:id/feedback` with `status: "APPROVED"` | Milestone creation returns `201`; feedback creation returns `201` and updates persisted `submission.status` to `"APPROVED"`. |
| **TEST-03** | `AC-03` | API / DB + Client UI (RTL) | Logged in as `stu.jing@sprintduo.edu` (Team Alpha student) on an open future milestone | Submit `title`, `description`, and `https://...` link via `POST /api/milestones/:id/submissions`, then retrieve via `GET /api/submissions/:id` and render in UI | Returns `201` (`isLate: false`); persisted submission and supervisor feedback are retrieved (`200`) and displayed in the UI without `LATE` badge. |
| **TEST-04** | `AC-04` | Unit + API Integration + UI (RTL) | Milestone strictly beyond 24h grace cutoff (`dueDate < now - 24h`, e.g., seeded Milestone 0 due `-48h`) or invalid `artifactUrl` (`"not-a-url"`) | Call deadline/URL validator and `POST /api/milestones/:pastCutoffId/submissions` | Rejects request with HTTP `400` (`DEADLINE_PASSED` with `"Milestone deadline has passed (24-hour grace window expired)"` / `VALIDATION_ERROR`); no submission record is saved in PostgreSQL. |
| **TEST-05** | `AC-05` | API Integration | Unauthenticated client (no session cookie) | Request `GET /api/teams`, `POST /api/teams/1/milestones`, `POST /api/milestones/1/submissions`, `GET /api/submissions/1` | All protected endpoints reject with HTTP `401` and return no private data. |
| **TEST-06** | `AC-06` | API Integration | 1) Student `stu.jing@sprintduo.edu` (Team Alpha)<br>2) Student `stu.other@sprintduo.edu` (Team Beta) | 1) Student attempts `POST /api/teams/:id/milestones` and `POST /api/submissions/:id/feedback`.<br>2) Team Beta student requests Team Alpha's milestones/submissions. | All unauthorized role and cross-team requests are rejected with HTTP `403 Forbidden`. |
| **TEST-07** *(Lab 7 `v1.1.0`)* | `AC-03`, `AC-04`, `AC-06` | Unit + API / DB Integration + Client UI (RTL) | Milestone `dueDate = T`; boundaries `T`, `T + 1ms`, `T + 12h`, `T + 24h`, `T + 24h + 1ms`; callers: Team Alpha student, Team Beta student, Supervisor Alpha | 1) Unit-test `evaluateSubmissionDeadline` across all 5 boundary timestamps.<br>2) Student submits to milestone due `-12h` (inside grace window) and retrieves via `GET /api/submissions/:id` & `GET /api/teams/:id/milestones`.<br>3) Student submits with invalid URL inside grace window (`400 VALIDATION_ERROR`).<br>4) Team Beta student and Supervisor attempt submission during grace window (`403`).<br>5) Render grace-window milestone & `isLate: true` submission in Client UI. | 1) `<= T` -> `ON_TIME` (`isLate: false`); `T+1ms..T+24h` -> `LATE_GRACE` (`isLate: true`, allowed); `T+24h+1ms` -> `CUTOFF_PASSED` (blocked).<br>2) API returns `201` with `isLate: true` and persists `isLate: true` in DB.<br>3) Invalid URL still returns `400 VALIDATION_ERROR` (nothing stored).<br>4) Cross-team & supervisor callers still rejected with `403`.<br>5) UI displays `GRACE PERIOD (24H)` on milestone card and `LATE` badge on late submission. |

---

## 2. Product Definition of Done (DoD)

1. Required Sprint 1 behavior (`F-01`, `F-02`, including Lab 7 `BR-03` v1.1.0) implemented across UI, Express API, and PostgreSQL/Prisma.
2. Planned verification (`TEST-01` to `TEST-07`) executed and passing with zero skipped tests.
3. Feature/maintenance branches reviewed via Pull Request by the teammate and integrated into `staging` and `main`.
4. `README.md` setup/seed/test instructions current and incomplete later-sprint items (`F-03`, `F-04`) disclosed.

---

## 3. Version History

| Version | Date | Author(s) | Description |
| :--- | :--- | :--- | :--- |
| `1.0.0` | 2026-11-04 | `JinggXd`, `yuminnini` | Initial Sprint 1 contracts (`F-01`, `F-02`), `AC-01`–`AC-06`, `TEST-01`–`TEST-06`, and DoD. |
| `1.1.0` | 2026-11-25 | `JinggXd` (reviewed by `yuminnini`) | Lab 7 Issue `#36`: Updated `TEST-04` cutoff threshold to `> dueDate + 24h` and added `TEST-07` covering 24-hour late grace boundaries, `isLate` persistence/UI badges, and preserved `403`/`400` validation during grace period. |

# Part E: Sprint 1 Software Test Specification (STS) and Definition of Done

- **Project Name:** SprintDUO — Course Project Management System (Theme 6)
- **Team Members:** `67070501084` (`JinggXd`) & `67070501036` (`yuminnini`)
- **Version:** 1.0.0

---

## 1. Software Test Specification (STS)

| Test ID | Linked AC | Test Level | Preconditions / Input | Action | Expected Result |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **TEST-01** | `AC-01` | Unit + API Integration | Seeded user `sup.advisor1@sprintduo.edu` | Verify Argon2id password helper; call `POST /api/auth/login` (valid & invalid), `GET /api/auth/me`, and `POST /api/auth/logout` | Valid login returns `200` + cookie; invalid returns `401`; `/me` returns user role; `/logout` returns `204` and subsequent `/me` returns `401`. |
| **TEST-02** | `AC-02` | API / DB Integration | Logged in as `sup.advisor1@sprintduo.edu` (Team Alpha supervisor) | Create milestone via `POST /api/teams/:teamId/milestones`, then record feedback via `POST /api/submissions/:id/feedback` with `status: "APPROVED"` | Milestone creation returns `201`; feedback creation returns `201` and updates persisted `submission.status` to `"APPROVED"`. |
| **TEST-03** | `AC-03` | API / DB + Client UI (RTL) | Logged in as `stu.jing@sprintduo.edu` (Team Alpha student) on an open future milestone | Submit `title`, `description`, and `https://...` link via `POST /api/milestones/:id/submissions`, then retrieve via `GET /api/submissions/:id` and render in UI | Returns `201`; persisted submission and supervisor feedback are retrieved (`200`) and displayed in the UI. |
| **TEST-04** | `AC-04` | Unit + API Integration | Past-due milestone (`dueDate < now`) or invalid `artifactUrl` (`"not-a-url"`) | Call deadline/URL validator and `POST /api/milestones/:pastDueId/submissions` | Rejects request with HTTP `400` (`DEADLINE_PASSED` / validation error); no submission record is saved in PostgreSQL. |
| **TEST-05** | `AC-05` | API Integration | Unauthenticated client (no session cookie) | Request `GET /api/teams`, `POST /api/teams/1/milestones`, `POST /api/milestones/1/submissions`, `GET /api/submissions/1` | All protected endpoints reject with HTTP `401` and return no private data. |
| **TEST-06** | `AC-06` | API Integration | 1) Student `stu.jing@sprintduo.edu` (Team Alpha)<br>2) Student `stu.other@sprintduo.edu` (Team Beta) | 1) Student attempts `POST /api/teams/:id/milestones` and `POST /api/submissions/:id/feedback`.<br>2) Team Beta student requests Team Alpha's milestones/submissions. | All unauthorized role and cross-team requests are rejected with HTTP `403 Forbidden`. |

---

## 2. Product Definition of Done (DoD)

1. Required Sprint 1 behavior (`F-01`, `F-02`) implemented across UI, Express API, and PostgreSQL/Prisma.
2. Planned verification (`TEST-01` to `TEST-06`) executed and passing with zero skipped tests.
3. Feature branches reviewed via Pull Request by the teammate and integrated into `staging` and `main`.
4. `README.md` setup/seed/test instructions current and incomplete later-sprint items (`F-03`, `F-04`) disclosed.

---

## 3. Version History

| Version | Date | Author(s) | Description |
| :--- | :--- | :--- | :--- |
| `1.0.0` | 2026-11-04 | `JinggXd`, `yuminnini` | Initial Sprint 1 contracts (`F-01`, `F-02`), `AC-01`–`AC-06`, `TEST-01`–`TEST-06`, and DoD. |

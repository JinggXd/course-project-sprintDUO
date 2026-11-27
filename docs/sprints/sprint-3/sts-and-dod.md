# Sprint 3 Software Test Specification (STS) and Definition of Done

- **Project Name:** SprintDUO — Course Project Management System (Theme 6)
- **Team Members:** `67070501084` (`JinggXd`) & `67070501036` (`yuminnini`)
- **Version:** `1.0.0` (Pre-implementation Sprint 3 baseline — authored before Sprint 3 code)

---

## 1. Sprint 3 Software Test Specification (`TEST-13` to `TEST-16`)

| Test ID | Linked AC | Feature | Deliverable 2 Target | Test Level | Preconditions / Inputs | Action | Expected Result |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **TEST-13** | `AC-12` | `F-04a` | **Executed in `v2.1.0-rc1`** | Unit + API / DB Integration + Client UI (RTL) | Team Alpha with milestones spanning `NOT_STARTED`, `SUBMITTED` (incl. `isLate: true`), `CHANGES_REQUESTED`, `APPROVED` (after `Rev #2`), and `isLocked: true`; plus empty-team edge case (`0` milestones) | 1) Unit-test `computeTeamProgress` on empty array and mixed multi-revision/late/locked milestones.<br>2) Call `GET /api/teams/:teamId/progress` as Team Alpha `STUDENT` and assigned `SUPERVISOR`.<br>3) Render `TeamProgressBoard` inside Client UI and verify progress bar, KPI counts, and 4 columns. | 1) Empty team returns `completionPercent: 0` and zero counts; mixed team reflects latest revision per milestone, exact `completionPercent = Math.round(approved/total * 100)`, `lateSubmissionCount`, and `lockedCount`.<br>2) API returns `200` with matching `summary` and 4 `columns`.<br>3) UI renders accurate completion percentage, column badges, and updates live after state changes. |
| **TEST-14** | `AC-13` | `F-04a` | **Executed in `v2.1.0-rc1`** | API / DB Integration | Unauthenticated client; Team Beta `STUDENT` (`stu.other@sprintduo.edu`); Team Beta `SUPERVISOR` (`sup.advisor2@sprintduo.edu`); overflow ID `2147483648` | Call `GET /api/teams/:alphaId/progress` without cookie, as Team Beta student, as Advisor 2, and with `/api/teams/2147483648/progress` | Unauth returns `401 UNAUTHENTICATED`; Team Beta student and Advisor 2 return `403 FORBIDDEN` (`BR-01`); overflow/non-canonical ID returns `404 NOT_FOUND`. |
| **TEST-15** | `AC-14` | `F-04b` | **Planned (`v3.0.0`, 12–13 Dec)** | Unit + API / DB Integration + Client UI (RTL) | Seeded `sup.advisor1@sprintduo.edu` (Team Alpha) and `sup.advisor2@sprintduo.edu` (Team Beta) with distinct milestone/submission states | Call `GET /api/supervisor/summary` as Advisor 1 and as Advisor 2; render Supervisor Summary table and trigger CSV export in UI | Advisor 1 receives `200` with ONLY Team Alpha metrics; Advisor 2 receives `200` with ONLY Team Beta metrics; `overall` totals match sum of supervised teams; UI renders summary table & CSV export cleanly. |
| **TEST-16** | `AC-15` | `F-04b` | **Planned (`v3.0.0`, 12–13 Dec)** | API / DB Integration | Unauthenticated client; `STUDENT` (`stu.jing@sprintduo.edu`) | Call `GET /api/supervisor/summary` unauthenticated and as `STUDENT` | Unauthenticated returns `401 UNAUTHENTICATED`; `STUDENT` returns `403 FORBIDDEN` (`BR-02`) with zero summary data leaked. |

---

## 2. Sprint 3 Definition of Done (DoD — Staged Across Deliverable 2 & Final Delivery)

### Deliverable 2 Checkpoint (`v2.1.0-rc1`, Due 29 Nov 2026)
1. Complete Sprint 3 contracts (`F-04a` & `F-04b`), `AC-12`–`AC-15`, and STS `TEST-13`–`TEST-16` reviewed and merged to `staging` before Sprint 3 code.
2. **`F-04a` (Team Milestone Progress Board)** implemented via RED → GREEN TDD across Express API (`GET /api/teams/:teamId/progress`), pure aggregation helper (`computeTeamProgress`), and modular React UI (`TeamProgressBoard.tsx`).
3. `TEST-13` and `TEST-14` (unit + real PostgreSQL 16 integration + ≥ 2 Client RTL assertions) executed and passing with 100% Sprint 1, Lab 5–7, and Sprint 2 regression passing.
4. Updated baseline documents (`docs/srs.md`, `docs/features.md`, `docs/system-sds.md`, `docs/traceability.md`, `docs/sprints/plan.md`, `README.md`), integrated on `main` (`v2.1.0-rc1`), deployed to GCP Cloud Run, and live-verified.
5. Remaining `F-04b` work (`AC-14`, `AC-15`, `TEST-15`, `TEST-16`), final regression/UAT, and ≤ 4-minute demo video explicitly tracked in the dated completion plan for 13 Dec (planned around 1–11 Dec final exams).

### Final Delivery (`v3.0.0`, Due 13 Dec 2026)
1. **`F-04b` (Supervisor Course-Wide Summary Report)** implemented via RED → GREEN TDD (`TEST-15`, `TEST-16` passing on PG 16 + RTL) and Issue `#8` closed via reviewed PRs.
2. Full end-to-end regression + UAT verification across `F-01`–`F-04` on deployed Cloud Run release `v3.0.0`, final report PDF, and ≤ 4-minute YouTube demo video presented jointly by both students.

---

## 3. Revision History

| Version | Date | Author(s) | Summary of Change |
| :--- | :--- | :--- | :--- |
| `1.0.0` | 2026-11-26 | `JinggXd` (for review by `yuminnini`) | Initial pre-implementation Sprint 3 STS (`TEST-13`–`TEST-16`) and staged Deliverable 2 (`v2.1.0-rc1`) / Final Delivery (`v3.0.0`) Definition of Done. |

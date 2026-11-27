# Part D: Updated Requirements-to-Feature-to-Test Traceability Matrix

- **Project Name:** SprintDUO — Course Project Management System (Theme 6)
- **Team Members:** `67070501084` (`JinggXd`) & `67070501036` (`yuminnini`)
- **Assessed Release Candidate:** `v2.1.0-rc1` (Deliverable 2 — Updated 27 Nov 2026)

---

## 1. Complete Baseline Traceability Matrix (`FR-01`–`FR-06`, `BR-01`–`BR-04`, `NFR-01`–`NFR-03`)

Every baseline requirement and approved revision is mapped end-to-end from **Requirement → Feature → Sprint → AC / Verification → Planned Test → Actual File/Test → Honest Result & Version**.

| Req ID | Feature / Responsibility | Sprint | AC / Verification | Planned Test | Actual Executable File / Measurement | Implemented? | Verification Result & Version |
| :--- | :--- | :---: | :---: | :---: | :--- | :---: | :--- |
| **FR-01** | `F-01` Session Auth (Login/Me/Logout) | Sprint 1 | `AC-01` | `TEST-01` | `server/tests/f01-supervisor.test.ts` (`TEST-01`) + `client/tests/App.test.tsx` (`DEF-SD-02`, `DEF-SD-05`) | Yes | **PASSED** (`v1.0.0` → `v2.1.0-rc1`) |
| **FR-02** | `F-01` Create Milestone, `F-02` Scoped Listing | Sprint 1 | `AC-02`, `AC-03` | `TEST-02`, `TEST-03` | `server/tests/f01-supervisor.test.ts` (`TEST-02`), `server/tests/f02-student.test.ts` (`TEST-03`), `client/tests/App.test.tsx` (`TEST-03`) | Yes | **PASSED** (`v1.0.0` → `v2.1.0-rc1`) |
| **FR-03** | `F-02` Student Submission & Retrieval | Sprint 1 + Lab 7 | `AC-03` (`v1.1.0`) | `TEST-03`, `TEST-07` | `server/tests/f02-student.test.ts` (`TEST-03`, `TEST-07`), `server/tests/lab7-br03-grace-window.test.ts` (`TEST-07`), `client/tests/App.test.tsx` (`TEST-03`, `TEST-07`) | Yes | **PASSED** (`v1.1.0` → `v2.1.0-rc1`) |
| **FR-04** | `F-01` Atomic Supervisor Feedback | Sprint 1 | `AC-02` | `TEST-02` | `server/tests/f01-supervisor.test.ts` (`TEST-02`), `server/tests/f02-student.test.ts` (`TEST-03`) | Yes | **PASSED** (`v1.0.0` → `v2.1.0-rc1`) |
| **FR-05** *(Edit/Lock/Filter)* | `F-03a` Milestone Edit, Lock & Status Filter (incl. `#33`) | Sprint 2 | `AC-07`, `AC-08`, `AC-09`, `AC-11` | `TEST-08`, `TEST-09`, `TEST-10`, `TEST-12` | `server/tests/f03-sprint2.test.ts` + `server/tests/f03-sprint2-pg.test.ts` (`TEST-08`–`10`, `TEST-12`) + `client/tests/App.test.tsx` (`TEST-04 #33`, `TEST-09`, `TEST-10`) | Yes | **PASSED** (`v2.0.0` → `v2.1.0-rc1`) |
| **FR-05** *(Revisions)* | `F-03b` Submission Revision History (`BR-04`) | Sprint 2 | `AC-10`, `AC-11` | `TEST-11`, `TEST-12` | `server/tests/f03-sprint2.test.ts` + `server/tests/f03-sprint2-pg.test.ts` (`TEST-11`, `TEST-12`) + `client/tests/App.test.tsx` (`TEST-11`) | Yes | **PASSED** (`v2.0.0` → `v2.1.0-rc1`) |
| **FR-06** *(Progress Board)* | `F-04a` Team Milestone Progress Board | Sprint 3 (D2 RC) | `AC-12`, `AC-13` | `TEST-13`, `TEST-14` | `server/tests/f04a-progress.test.ts` + `server/tests/f04a-progress-pg.test.ts` (`TEST-13`, `TEST-14`) + `client/tests/App.test.tsx` (`TEST-13a`, `TEST-13b`) | Yes | **PASSED** (`v2.1.0-rc1`) |
| **FR-06** *(Summary Report)* | `F-04b` Supervisor Course-Wide Summary Report | Sprint 3 (Final) | `AC-14`, `AC-15` | `TEST-15`, `TEST-16` | *Planned:* `server/tests/f04b-summary.test.ts`, `f04b-summary-pg.test.ts`, `client/tests/App.test.tsx` | **No (Planned)** | **PLANNED** (Target `v3.0.0`, 12–13 Dec — **NOT run**) |
| **BR-01** | Team & Supervision Scope Isolation (`403`) | Sprint 1–3 | `AC-06`, `AC-11`, `AC-13`, `AC-14` | `TEST-06`, `TEST-07`, `TEST-12`, `TEST-14`, `TEST-15` | `f01-supervisor.test.ts`, `f02-student.test.ts`, `lab7-br03-grace-window.test.ts`, `f03-sprint2*.test.ts`, `f04a-progress*.test.ts` | Yes (`F-01`–`F-04a`) | **PASSED** (`F-01`–`F-04a` on `v2.1.0-rc1`); `F-04b` `TEST-15` **PLANNED** |
| **BR-02** | Role Separation of Duties (`403`) | Sprint 1–3 | `AC-06`, `AC-11`, `AC-15` | `TEST-06`, `TEST-07`, `TEST-12`, `TEST-16` | `f01-supervisor.test.ts`, `f02-student.test.ts`, `lab7-br03-grace-window.test.ts`, `f03-sprint2*.test.ts` | Yes (`F-01`–`F-03b`) | **PASSED** (`F-01`–`F-03b` on `v2.1.0-rc1`); `F-04b` `TEST-16` **PLANNED** |
| **BR-03** *(Revised `v1.1.0` + Lock)* | 24h Late Grace Window, Cutoff (`400`), Lock Guard (`400`), URL Validation (`400`) | Sprint 1 + Lab 7 + Sprint 2 | `AC-03`, `AC-04`, `AC-08` | `TEST-04`, `TEST-07`, `TEST-09` | `server/tests/f02-student.test.ts`, `server/tests/lab7-br03-grace-window.test.ts`, `server/tests/f03-sprint2*.test.ts`, `client/tests/App.test.tsx` | Yes | **PASSED** (`v1.1.0` → `v2.1.0-rc1`) |
| **BR-04** | Revision History Preservation & `409` Conflict Guards | Sprint 2 | `AC-10` | `TEST-11` | `server/tests/f03-sprint2.test.ts`, `server/tests/f03-sprint2-pg.test.ts`, `client/tests/App.test.tsx` (`TEST-11`) | Yes | **PASSED** (`v2.0.0` → `v2.1.0-rc1`) |
| **NFR-01** | Unauthenticated Rejection (`401`) Across All Protected Routes | Sprint 1–3 | `AC-05`, `AC-11`, `AC-13`, `AC-15` | `TEST-05`, `TEST-12`, `TEST-14`, `TEST-16` | `f01-supervisor.test.ts`, `f02-student.test.ts`, `lab5-runtime.test.ts`, `lab7-br03-grace-window.test.ts`, `f03-sprint2*.test.ts`, `f04a-progress*.test.ts` | Yes (`F-01`–`F-04a`) | **PASSED** (`F-01`–`F-04a`); `F-04b` `TEST-16` **PLANNED** |
| **NFR-02** | Argon2id + SHA-256 `HttpOnly` Sessions + `413`/`404` Hardening | Sprint 1 + Lab 6 | `AC-01` + Lab 6 `DEF-SD-01`/`04` | `TEST-01` + Lab 6 suite | `server/tests/f01-supervisor.test.ts` (`TEST-01`), `server/tests/lab6-uat-defects.test.ts` (`DEF-SD-01`, `DEF-SD-04`) | Yes | **PASSED** (`v1.0.0` → `v2.1.0-rc1`) |
| **NFR-03** | Multi-Stage Docker, GitHub Actions CI/CD, Cloud SQL Migrations & Cloud Run | Sprint 2 (Lab 5–7, `v2.0.0`, `v2.1.0-rc1`) | Lab 5 Ep.1–8 + `TD-01` | CI `test-and-docker`, `Deploy demo`, `deploy/tests/*`, live checks | `server/tests/lab5-runtime.test.ts`, `deploy/tests/test_deploy_stub.sh`, `test_release_stub.sh`, `test_smoke.py`, GitHub Actions `Deploy demo` + Cloud Run smoke & live checks | Yes | **PASSED** (`v2.0.0` & `v2.1.0-rc1`) |

---

## 2. Explicit Coverage Gaps & Approved Baseline Changes

- **Explicit Uncovered / Remaining Scope at Deliverable 2 (`v2.1.0-rc1`):**
  - **`FR-06` / `F-04b` (Supervisor Course-Wide Summary Report — `AC-14`, `AC-15`, `TEST-15`, `TEST-16`):** Contract & STS are complete and reviewed (PR `#43`), while code implementation and test execution are honestly disclosed as **`PLANNED`** (NOT yet implemented or executed). Scheduled for implementation and final verification on **12–13 Dec 2026** (following the 1–11 Dec final examination period) for Final Delivery **`v3.0.0`** (Issue `#8`).
  - **Open Defects:** **0 Critical, 0 Major, 0 Minor** — all 5 Lab 6 defects (`#29`–`#33`) are now resolved and regression-tested (`#33` closed in Sprint 2 `v2.0.0`).
- **Approved Baseline Revisions Recorded Without Rewriting History:**
  1. **Lab 7 (`v1.1.0`, Issue `#36`, PRs `#37`–`#39`):** Revised `BR-03` & `DD-02` to a 24-hour late grace window (`isLate: boolean`, `TEST-07`).
  2. **Sprint 2 (`v2.0.0`, Issues `#7` & `#33`, PRs `#40`–`#42`):** Completed `FR-05` & `BR-04` (`F-03a` milestone edit/extend/lock/filter + `#33` UI closure + `TD-01`/`TD-02`; `F-03b` multi-revision submission history).
  3. **Sprint 3 Deliverable 2 Checkpoint (`v2.1.0-rc1`, Issue `#8`, PRs `#43`–`#45`):** Authored full Sprint 3 contracts (`F-04a` & `F-04b`) and delivered tested `F-04a` Team Milestone Progress Board.

# Part D: Three-Sprint Plan & Remaining-Work Schedule

- **Project Name:** SprintDUO — Course Project Management System (Theme 6)
- **Team Members:** `67070501084` (`JinggXd`) & `67070501036` (`yuminnini`)
- **Last Updated:** 27 November 2026 (`v2.1.0-rc1` Deliverable 2 Checkpoint)

---

## 1. Three-Sprint Schedule and Checkpoint Status

| Sprint | Checkpoint | Sprint Goal | Included Feature IDs | Dependencies | Target & Actual Outcome |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **Sprint 1** | **Deliverable 1 & Labs 5–7**<br>(8 / 15 / 22 / 29 Nov 2026) | Deliver working vertical slice (auth, milestones, submissions, feedback, isolation), deploy via CI/CD to GCP (Lab 5), complete independent UAT (Lab 6), and maintain `BR-03` 24h grace window (Lab 7). | `F-01`, `F-02` | None | **COMPLETED:** `v1.0.0` (`d71971d`) → Lab 6 accepted (`91db0b1`) → Lab 7 `v1.1.0` (`88ac148`). |
| **Sprint 2** | **Deliverable 2**<br>(29 Nov 2026) | Complete `FR-05` & `BR-04`: supervisor milestone editing/extension/locking, status filtering, multi-revision submission history, close Lab 6 `#33` & Lab 7 `TD-01`/`TD-02`. | `F-03a`, `F-03b` | `F-01`, `F-02` | **COMPLETED:** Reviewed PRs `#40`–`#42`, tagged **`v2.0.0`** (`914936d`), Issues `#7` & `#33` closed, deployed to Cloud Run (`Deploy #45936491901`). |
| **Sprint 3** | **Deliverable 2 RC (29 Nov) & Final Delivery (13 Dec 2026)** | Specify `F-04a` & `F-04b`, deliver tested `F-04a` Team Progress Board in Deliverable 2 RC (`v2.1.0-rc1`), then finish bounded `F-04b` Supervisor Summary Report, final regression/UAT, and ≤ 4-min demo video for `v3.0.0`. | `F-04a` (D2 RC), `F-04b` (Final) | `F-01`–`F-03b` | **IN PROGRESS (Controlled):** `F-04a` implemented, tested & deployed in **`v2.1.0-rc1`**; `F-04b` scheduled 12–13 Dec after 1–11 Dec exams. |

---

## 2. Explicit Remaining-Work Plan for Final Delivery (Planned Around 1–11 Dec Final Exams)

| Item ID | Feature / Defect | Current Status (`v2.1.0-rc1`) | Remaining Action & Dependencies | Owner & Target Date |
| :--- | :--- | :--- | :--- | :--- |
| **`F-04b`** (Issue `#8`) | Supervisor Course-Wide Summary Report (`FR-06`, `AC-14`, `AC-15`) | **Contract & STS Complete** (PR `#43` `a8bc687`); code & `TEST-15`/`TEST-16` **PLANNED** | Implement `GET /api/supervisor/summary` (reusing `computeTeamProgress` from `F-04a`) + `SupervisorSummaryReport.tsx` + CSV export via RED → GREEN TDD (`TEST-15`, `TEST-16`), PR review, and close Issue `#8`. | `@yuminnini` (author) & `@JinggXd` (reviewer); **12 Dec 2026** (immediately post-exams) |
| **`FIN-01`** | Full Integrated Regression & Final Live Verification | All Sprint 1, Lab 5–7, Sprint 2, and `F-04a` suites **PASSING** on `v2.1.0-rc1` | Run full PG 16 + Client RTL regression including `TEST-15`/`TEST-16`, promote Release PR to `main`, tag **`v3.0.0`**, deploy to Cloud Run, and execute live smoke/UAT pass. | Both (`@JinggXd` & `@yuminnini`); **12–13 Dec 2026** |
| **`FIN-02`** | Final Delivery Report PDF & ≤ 4-Min Joint YouTube Demo Video | Not yet started (depends on `v3.0.0`) | Record ≤ 4-minute demo video with **both students presenting together** covering `F-01`–`F-04b` live on Cloud Run, finalize Final Delivery PDF (`final_delivery_sec31_GG EZ.pdf`), and submit via LEB2. | Both (`@JinggXd` & `@yuminnini`); **13 Dec 2026 (before 23:59)** |

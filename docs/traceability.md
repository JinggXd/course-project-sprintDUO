# Part B: Requirements-to-Feature-to-Sprint Traceability Matrix

- **Project Name:** SprintDUO — Course Project Management System (Theme 6)
- **Team Members:** `67070501084` (`JinggXd`) & `67070501036` (`yuminnini`)

---

## 1. Traceability Table

Every Functional Requirement (`FR-01`–`FR-06`), Business Rule (`BR-01`–`BR-04`), and Non-Functional Requirement (`NFR-01`–`NFR-03`) is mapped to its feature, target sprint, Acceptance Criterion (`AC`), and executable test (`TEST`).

| Requirement | Feature or Responsibility | Sprint and Verification |
| :--- | :--- | :--- |
| **FR-01** (Login, `/me`, Logout) | `F-01` Auth, Supervisor Milestone & Feedback | Sprint 1; `AC-01` / `TEST-01` |
| **FR-02** (Create & List Milestones) | `F-01` Supervisor Milestone, `F-02` Team View | Sprint 1; `AC-02`, `AC-03` / `TEST-02`, `TEST-03` |
| **FR-03** (Submit & View Submission) | `F-02` Student Submission & Deadline Rule | Sprint 1; `AC-03` / `TEST-03` |
| **FR-04** (Record Supervisor Feedback) | `F-01` Auth, Supervisor Milestone & Feedback | Sprint 1; `AC-02` / `TEST-02` |
| **FR-05** (Revisions & Milestone Edit) | `F-03` Submission Revisions & Milestone Mgmt | Sprint 2; Planned Sprint 2 Contract |
| **FR-06** (Progress Board & Reports) | `F-04` Progress Board & Summary Report | Sprint 3; Planned Sprint 3 Contract |
| **BR-01** (Team & Supervision Scope `403`) | `F-01`, `F-02` Access Control | Sprint 1; `AC-06` / `TEST-06` |
| **BR-02** (Role Separation `403`) | `F-01`, `F-02` Access Control | Sprint 1; `AC-06` / `TEST-06` |
| **BR-03** (Deadline & URL Validation `400`) | `F-02` Student Submission & Deadline Rule | Sprint 1; `AC-04` / `TEST-04` |
| **BR-04** (Revision History Preservation) | `F-03` Submission Revisions & Milestone Mgmt | Sprint 2; Planned Sprint 2 Contract |
| **NFR-01** (Unauthenticated Rejection `401`) | `F-01`, `F-02` Session Guard (`requireAuth`) | Sprint 1; `AC-05` / `TEST-05` |
| **NFR-02** (Argon2id & SHA-256 Sessions) | `F-01` Auth, Supervisor Milestone & Feedback | Sprint 1; `AC-01` / `TEST-01` |
| **NFR-03** (Docker & GCP Deployment) | `F-03` Delivery & Cloud Deployment (Lab 5) | Sprint 1 (local build) & Sprint 2 (Lab 5 GCP) |

---

## 2. Coverage Gaps and Approved Changes
- **Uncovered Requirements:** None (all 6 FRs, 4 BRs, and 3 NFRs are covered).
- **Approved Changes:** Baseline `v1.0.0` approved by both team members on 4 Nov 2026.

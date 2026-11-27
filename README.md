# SprintDUO — Course Project Management System (Theme 6)

**CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)**

## Team Members & Deployment
- **Student 1:** พงศธร พุทธสอน (`67070501084`) — GitHub: [`@JinggXd`](https://github.com/JinggXd)
- **Student 2:** รพีพิชชา วราสินกุลภัทร์ (`67070501036`) — GitHub: [`@yuminnini`](https://github.com/yuminnini)
- **Assigned Theme:** Theme 6 — Course Project Management System
- **Live Cloud Run URL:** `https://sprintduo-hbiakb2znq-as.a.run.app` (GCP `cpe334-team23`, `asia-southeast1`)
- **Current Release Candidate:** `v2.1.0-rc1` (Deliverable 2 — Sprint 1 `v1.0.0` + Lab 7 `v1.1.0` + Sprint 2 `v2.0.0` Complete + Sprint 3 `F-04a` Team Progress Board Implemented & Tested; `F-04b` Supervisor Summary Report Planned for Final Delivery `v3.0.0`)

---

## 1. Engineering Documentation (`docs/`)

- **SRS & Product Scope (`v2.1.0-rc1`):** [`docs/srs.md`](docs/srs.md)
- **Feature Inventory & Traceability Matrix:** [`docs/features.md`](docs/features.md) and [`docs/traceability.md`](docs/traceability.md)
- **System-Level SDS (`v2.1.0-rc1`):** [`docs/system-sds.md`](docs/system-sds.md)
- **Three-Sprint Plan & Remaining-Work Schedule:** [`docs/sprints/plan.md`](docs/sprints/plan.md)
- **Sprint 1 Contracts & STS (`v1.1.0`):** [`docs/sprints/sprint-1/contracts.md`](docs/sprints/sprint-1/contracts.md), [`docs/sprints/sprint-1/sts-and-dod.md`](docs/sprints/sprint-1/sts-and-dod.md)
- **Lab 7 Change Impact Analysis:** [`docs/labs/lab-07/change-impact.md`](docs/labs/lab-07/change-impact.md)
- **Sprint 2 Contracts & STS (`F-03a`/`F-03b`):** [`docs/sprints/sprint-2/contracts.md`](docs/sprints/sprint-2/contracts.md), [`docs/sprints/sprint-2/sts-and-dod.md`](docs/sprints/sprint-2/sts-and-dod.md)
- **Sprint 3 Contracts & STS (`F-04a`/`F-04b`):** [`docs/sprints/sprint-3/contracts.md`](docs/sprints/sprint-3/contracts.md), [`docs/sprints/sprint-3/sts-and-dod.md`](docs/sprints/sprint-3/sts-and-dod.md)
- **Cloud Deployment Runbook:** [`docs/deployment.md`](docs/deployment.md)

---

## 2. Technology Stack

- **Frontend (`client/`):** React 18 + TypeScript + Vite + Bootstrap 5 (`App.tsx`, `TeamProgressBoard.tsx`, `MilestoneEditForm.tsx`, `SubmissionHistoryList.tsx`)
- **Backend (`server/`):** Node.js 24 + Express 4 + TypeScript + Argon2id + Server-Side SHA-256 `HttpOnly` Cookie Sessions
- **Database (`server/prisma/`):** PostgreSQL 16 + Prisma ORM (3 additive migrations)
- **Delivery & Testing:** Multi-stage Docker + GitHub Actions (`CI & Docker Build` + keyless OIDC `Deploy demo` to Google Cloud Run & Cloud SQL); Vitest + Supertest (Unit & API/DB PG 16 Integration) + React Testing Library (Client UI).

---

## 3. Local Setup and Reproduction Instructions

### 3.1 Prerequisites
- Node.js `>= 20.x` (CI & Docker use Node 24) and npm
- Docker Desktop (for local PostgreSQL via `docker compose up -d` and container builds)

### 3.2 Start PostgreSQL via Docker & Configure Environment Variables
```bash
docker compose up -d
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Example `server/.env` (local disposable PostgreSQL on port `5434` — never commit real secrets):
```env
DATABASE_URL="postgresql://sprintduo:sprintduo@localhost:5434/sprintduo_dev?schema=public"
DATABASE_URL_TEST="postgresql://sprintduo:sprintduo@localhost:5434/sprintduo_test?schema=public"
PORT=3000
CLIENT_ORIGIN="http://localhost:5173"
```

### 3.3 Install Dependencies, Migrate, and Seed
```bash
npm install
npm --prefix server install
npm --prefix client install

# Apply additive Prisma migrations & seed synthetic local demo accounts
npm --prefix server run prisma:migrate
npm --prefix server run prisma:seed
```

### 3.4 Synthetic Demo Accounts (Created by `prisma:seed`)
Local seed uses synthetic `@sprintduo.edu` accounts configured via `SEED_DEMO_PASSWORD` (local development default only; live Cloud Run test credentials are supplied separately through the private course handoff and are never stored in Git or PDFs):

| Email | Role | Team Assignment | Purpose |
| :--- | :--- | :--- | :--- |
| `sup.advisor1@sprintduo.edu` | `SUPERVISOR` | Supervises **Team Alpha** (`TEAM-ALPHA`) | Primary Supervisor demo & tests |
| `sup.advisor2@sprintduo.edu` | `SUPERVISOR` | Supervises **Team Beta** (`TEAM-BETA`) | Cross-team `403` isolation tests |
| `stu.jing@sprintduo.edu` | `STUDENT` | Member of **Team Alpha** (`TEAM-ALPHA`) | Student 1 (`67070501084`) demo & tests |
| `stu.yumi@sprintduo.edu` | `STUDENT` | Member of **Team Alpha** (`TEAM-ALPHA`) | Student 2 (`67070501036`) demo & tests |
| `stu.other@sprintduo.edu` | `STUDENT` | Member of **Team Beta** (`TEAM-BETA`) | Cross-team `403` isolation tests |
| `stu.other2@sprintduo.edu` | `STUDENT` | Member of **Team Beta** (`TEAM-BETA`) | Keeps Team Beta within 2–4 members |

### 3.5 Running, Testing & Deploying
```bash
# Start Backend API (http://localhost:3000) & Frontend Dev Server (http://localhost:5173)
npm --prefix server run dev
npm --prefix client run dev

# Typecheck & Production Build (Server + Client)
npm run build

# Run Automated Test Suites
npm run test:server   # Vitest + Supertest (Unit, Mocked API, and PG 16 Integration)
npm run test:client   # Vitest + React Testing Library (10 UI tests)

# Build Unified Production Container Locally
docker build --build-arg VITE_COMMIT_SHA=local --build-arg VITE_APP_VERSION=v2.1.0-rc1 -t sprintduo:local .
```

Production deployments to Google Cloud Run run automatically via `.github/workflows/deploy.yml` on every reviewed merge to `main` (runs `CI & Docker Build`, builds/pushes the SHA-tagged image, executes `sprintduo-migrate` on Cloud SQL `sprintduo-pg`, rolls out Cloud Run `sprintduo`, and executes `deploy/smoke_test.py`).

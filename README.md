# SprintDUO — Course Project Management System (Theme 6)

**CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)**

## Team Members
- **Student 1:** `67070501084` — GitHub: [`JinggXd`](https://github.com/JinggXd)
- **Student 2:** `67070501036` — GitHub: [`yuminnini`](https://github.com/yuminnini)
- **Assigned Theme:** Theme 6 — Course Project Management System

---

## 1. Engineering Documentation (Deliverable 1 Parts A–E)

All specification, design, traceability, and Sprint 1 engineering contract documents are stored in `docs/`:

- **Part A — SRS & Product Scope:** [`docs/srs.md`](docs/srs.md)
- **Part B — Feature Inventory & Traceability:** [`docs/features.md`](docs/features.md) and [`docs/traceability.md`](docs/traceability.md)
- **Part C — System-Level SDS:** [`docs/system-sds.md`](docs/system-sds.md)
- **Part D — Three-Sprint Plan:** [`docs/sprints/plan.md`](docs/sprints/plan.md)
- **Part E — Sprint 1 Engineering Contracts & STS:** [`docs/sprints/sprint-1/contracts.md`](docs/sprints/sprint-1/contracts.md) and [`docs/sprints/sprint-1/sts-and-dod.md`](docs/sprints/sprint-1/sts-and-dod.md)

---

## 2. Technology Stack

- **Frontend (`client/`):** React 18 + TypeScript + Vite + Bootstrap 5
- **Backend (`server/`):** Node.js + Express 4 + TypeScript + Argon2id + Server-Side `HttpOnly` Cookie Sessions
- **Database (`server/prisma/`):** PostgreSQL + Prisma ORM
- **Automated Testing:** Vitest + Supertest (Unit & API/DB Integration), Vitest + React Testing Library (Client UI). Browser E2E (Playwright) is planned for Sprint 3 and is not set up yet.

---

## 3. Local Setup and Reproduction Instructions

### 3.1 Prerequisites
- Node.js `>= 20.x` and npm
- PostgreSQL `>= 15.x` running locally

### 3.2 Environment Variables
Copy the example environment files and configure your local PostgreSQL connection strings:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Example `server/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sprintduo_dev?schema=public"
DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5432/sprintduo_test?schema=public"
PORT=3000
CLIENT_ORIGIN="http://localhost:5173"
```

### 3.3 Install Dependencies, Migrate, and Seed
```bash
npm install
npm --prefix server install
npm --prefix client install

# Run Prisma schema migration & seed synthetic demo data
npm --prefix server run prisma:migrate
npm --prefix server run prisma:seed
```

### 3.4 Synthetic Demo Accounts (Created by `prisma:seed`)

All synthetic local demo accounts use the default local development password `Password123!`:

| Email | Role | Team Assignment | Purpose |
| :--- | :--- | :--- | :--- |
| `sup.advisor1@sprintduo.edu` | `SUPERVISOR` | Supervises **Team Alpha** (`TEAM-ALPHA`) | Primary Supervisor demo & tests |
| `sup.advisor2@sprintduo.edu` | `SUPERVISOR` | Supervises **Team Beta** (`TEAM-BETA`) | Cross-team `403` isolation tests |
| `stu.jing@sprintduo.edu` | `STUDENT` | Member of **Team Alpha** (`TEAM-ALPHA`) | Student 1 (`67070501084`) demo & tests |
| `stu.yumi@sprintduo.edu` | `STUDENT` | Member of **Team Alpha** (`TEAM-ALPHA`) | Student 2 (`67070501036`) demo & tests |
| `stu.other@sprintduo.edu` | `STUDENT` | Member of **Team Beta** (`TEAM-BETA`) | Cross-team `403` isolation tests |
| `stu.other2@sprintduo.edu` | `STUDENT` | Member of **Team Beta** (`TEAM-BETA`) | Keeps Team Beta within the 2–4 member rule |

### 3.5 Running the Application & Automated Tests
```bash
# Start Backend API (http://localhost:3000)
npm --prefix server run dev

# Start Frontend Dev Server (http://localhost:5173)
npm --prefix client run dev

# Build both Server and Client
npm run build

# Run Automated Test Suites
npm run test:server
npm run test:client
```


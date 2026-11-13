# Lab 5 Deployment Specification & Runbook — SprintDUO

**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  
**Project:** SprintDUO — Course Project Management System (Theme 6)  
**Team Members:**
- พงศธร พุทธสอน (`67070501084`) — GitHub: `@JinggXd`
- รพีพิชชา วราสินกุลภัทร์ (`67070501036`) — GitHub: `@yuminnini` (`b4ymin`)

---

## 1. Architecture Stack & Adaptation from Reference Starter Kit

SprintDUO uses the course reference stack adapted from the TokTickIT Lab 5 Starter Kit:

| Layer / Component | Technology | Adaptation from Starter Kit (`toktickit` -> `sprintduo`) |
| :--- | :--- | :--- |
| **Frontend UI** | React 18, TypeScript, Vite, CSS (`client/`) | Built in Stage 1 of root `Dockerfile` and copied to `/app/client/dist` for single-container Cloud Run serving; served via Nginx (`client/Dockerfile`) on `localhost:5173` in local Docker Compose. |
| **Backend API** | Node.js 24, Express, TypeScript, Prisma 5 (`server/`) | Compiled via `server/tsconfig.build.json` (`dist/index.js`). Serves `/api/*` routes, `/api/health`, `/api/ready`, and static SPA assets from `/app/client/dist` when `NODE_ENV=production`. |
| **Database** | PostgreSQL 16 (Cloud SQL in GCP / `postgres:16-alpine` locally) | All application data (users, teams, team memberships, milestones, submissions, feedback) is persisted in PostgreSQL outside the container. |
| **Authentication & Sessions** | Signed `HttpOnly` Cookie (`sprintduo_session`) + DB User verification | Stateless HMAC-SHA256 signed token verified against PostgreSQL `User` record on every `/api/*` request (`sessionAuth.ts`). No server-memory session store is used, so sessions survive container restarts, horizontal scaling, and redeployments (`R-04`). `trust proxy` is enabled so `Secure` cookies work behind Cloud Run HTTPS termination. |
| **Container Runtime** | Multi-stage `Dockerfile` (`node:24-alpine`, non-root `USER node`) | Listens on `0.0.0.0:${PORT}` (default `3000`). Migrations and seeding run in a dedicated Cloud Run Job (`sprintduo-migrate`) before updating the Cloud Run Service (`sprintduo`). |
| **CI/CD Pipeline** | GitHub Actions (`ci-docker.yml`, `deploy.yml`) + GCP Workload Identity Federation (WIF) | Keyless OIDC authentication (`google-github-actions/auth@v3`) scoped to GitHub Environment `demo` (`main` branch only). Images are tagged with the 40-character commit SHA and deployed by immutable `@sha256:...` digest. |

### Episode 2 Cloud-Readiness Checklist (Student Guide 2.2)

- [x] **1. Uploaded files are not saved in a local folder:** SprintDUO stores submission artifact links/metadata in PostgreSQL (`Submission` table); no user files are written to container disk (`R-04`).
- [x] **2. The seed is safe for production:** `server/prisma/seed.ts` reads `ADMIN_PASSWORD` and `DEMO_USER_PASSWORD` from environment variables (never hardcoded in production), defaults `SEED_DEMO_DATA` to `false` in production, and uses non-destructive `upsert` (`update: {}`) so re-running never overwrites existing records.
- [x] **3. No dev shortcuts in production:** All protected routes require real `/api/auth/login` authentication and server-side RBAC (`SUPERVISOR` / `STUDENT`). No plaintext passwords are stored or displayed on screen.
- [x] **4. Sessions survive restarts and scaling:** Session tokens are signed with `SESSION_SECRET` and verified against the PostgreSQL `User` table on each request (`server/src/middleware/sessionAuth.ts`), with zero in-memory session state.
- [x] **5. The server reads its port from `PORT`:** `server/src/index.ts` reads `Number(process.env.PORT) || 3000`.
- [x] **6. `/api/ready` exists:** `GET /api/ready` executes `SELECT 1` via Prisma and returns `200 {"status":"ready","db":"connected"}` when PostgreSQL is reachable or `503 {"status":"not_ready","db":"disconnected"}` when unreachable.

---

## 2. Environment Variables (`R-02`)

Placeholder templates are committed in `server/.env.example` and `client/.env.example`. Real `.env` files and secrets are never committed to Git.

| Variable | Layer | Secret? | Required? | Purpose | Where Value Comes From |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `DATABASE_URL` | Server / Prisma | **Yes** | Yes | PostgreSQL connection string (`postgresql://...`) | Local `.env` / Compose fallback; **GCP Secret Manager** (`sprintduo-database-url`) in Cloud Run & Migrate Job |
| `DATABASE_URL_TEST` | Server Tests | No | CI/Test only | PostgreSQL connection string used by Vitest integration tests | Local `.env` or GitHub Actions `ci-docker.yml` PostgreSQL service container |
| `SESSION_SECRET` | Server Auth | **Yes** | Yes (Prod) | HMAC-SHA256 signing key for `sprintduo_session` cookies | Local `.env` / Compose fallback; **GCP Secret Manager** (`sprintduo-admin-password`) in Cloud Run |
| `ADMIN_PASSWORD` | Server Seed | **Yes** | Yes (Prod Seed) | Initial password for seeded supervisor (`sup.advisor1@sprintduo.edu`) | Local `.env` / Compose fallback; **GCP Secret Manager** (`sprintduo-admin-password`) in Cloud Run Migrate Job |
| `SEED_DEMO_DATA` | Server Seed | No | Optional | `"true"` or `"false"`. Controls whether demo student accounts, team, and sample milestone are seeded (default `"true"` locally, `"false"` in production unless `--demo` is passed) | Cloud Run Migrate Job `--set-env-vars` / `docker-compose.yml` |
| `DEMO_USER_PASSWORD` | Server Seed | **Yes** | When `SEED_DEMO_DATA=true` in Prod | Initial password for demo accounts (`stu.jing@sprintduo.edu`, `stu.yumin@sprintduo.edu`, `sup.advisor2@sprintduo.edu`) | **GCP Secret Manager** (`sprintduo-demo-password`) when deployed with `--demo` |
| `PORT` | Server Runtime | No | Optional | HTTP port the Express server listens on (default `3000`) | Set automatically by Cloud Run (`--port 3000`) or local `.env` |
| `NODE_ENV` | Server Runtime | No | Optional | Runtime mode (`development`, `test`, `production`). Enables static SPA serving and production seed guards | Cloud Run `--set-env-vars NODE_ENV=production` / `Dockerfile` |
| `CORS_ORIGIN` | Server Runtime | No | Optional | Comma-separated allowed origins when UI is hosted separately (default `http://localhost:5173` in dev; same-origin allowed automatically in prod) | Local `.env` or Cloud Run env vars |
| `CLIENT_DIST_PATH` | Server Runtime | No | Optional | Override path to built frontend assets (default `/app/client/dist` in container) | Used in unit tests (`lab5-runtime.test.ts`); optional in runtime |
| `VITE_API_URL` | Client Build | No | Optional | Base URL for API requests (`""` in Docker/Cloud Run same-origin; `http://localhost:3000` in standalone Vite dev) | `client/.env` or Docker build arg `VITE_API_URL` |

### GitHub Environment (`demo`) Variables & Secrets (Episode 6 & 7)

Configured in **GitHub Settings -> Environments -> `demo`** (restricted to branch `main` only):

| Name | Type | Purpose |
| :--- | :---: | :--- |
| `GCP_PROJECT_ID` | Environment Variable | Target Google Cloud Project ID |
| `GCP_REGION` | Environment Variable | Target GCP region (`asia-southeast1`) |
| `WIF_PROVIDER` | Environment Variable | Full Workload Identity Provider resource name (`projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/github-actions/providers/github-main`) |
| `WIF_SERVICE_ACCOUNT` | Environment Variable | Deployer service account email (`sprintduo-deployer@<PROJECT_ID>.iam.gserviceaccount.com`) |
| `SMOKE_EMAIL` | Environment Variable (Optional) | Low-privilege student account email for post-deploy login smoke check |
| `SMOKE_PASSWORD` | Environment Secret (Optional) | Password for `SMOKE_EMAIL` used by `deploy/smoke_test.py` |

---

## 3. Build, Test, Run, Migrate, and Seed Commands (`R-01`, `C-03`)

### 3.1 Local Docker Compose (Recommended Clean-Clone Verification — `C-03`)

```bash
# 1. Build images from scratch and start PostgreSQL, migration/seed job, API (port 3000), and web app (port 5173)
docker compose up --build -d

# 2. Verify container status (db, server, client running; migrate exited 0)
docker compose ps -a

# 3. Verify health and database readiness endpoints
curl --fail http://localhost:3000/api/health
curl --fail http://localhost:3000/api/ready

# 4. Verify persistence across container restart
docker compose down
docker compose up -d
```

- **Local Docker Compose Web UI:** `http://localhost:5173`
- **Local Docker Compose API:** `http://localhost:3000`
- **Local Docker Compose PostgreSQL Port:** `localhost:5434` (mapped to container port `5432`)

### 3.2 Standalone Production Container Build

```bash
docker build -t sprintduo-lab5:latest .
```

### 3.3 Local Node.js Development, Migration, Seed, and Automated Tests

```bash
# Backend install, migrate, seed, typecheck, test, and build
cd server
cp .env.example .env
npm ci
npx prisma migrate deploy
npm run prisma:seed
npm run typecheck
npm test
npm run build

# Frontend install, test, and build
cd ../client
cp .env.example .env
npm ci
npm test
npm run build

# Offline deployment & smoke script tests (no GCP connection required)
cd ..
bash -n server/docker-entrypoint.sh deploy/deploy.sh deploy/teardown.sh deploy/release.sh
bash deploy/tests/test_deploy_stub.sh
bash deploy/tests/test_release_stub.sh
python3 -m unittest discover -s deploy/tests -p "test_smoke.py" -v
```

---

## 4. GCP Project, Region, and Resource Names (`R-03`, `R-04`)

All GCP resources are provisioned in region **`asia-southeast1`** (Singapore) by `deploy/deploy.sh`:

| Resource Type | Resource Name / Identifier | Configuration / Role |
| :--- | :--- | :--- |
| **GCP Region** | `asia-southeast1` | Default region across `deploy.sh`, `release.sh`, and `deploy.yml` |
| **Artifact Registry Repository** | `sprintduo` | Docker repository (`asia-southeast1-docker.pkg.dev/<PROJECT_ID>/sprintduo/sprintduo`) |
| **Cloud SQL Instance** | `sprintduo-pg` | PostgreSQL 16 (`POSTGRES_16`, `db-f1-micro`, `10GB` SSD, `--no-storage-auto-increase`) |
| **Cloud SQL Database & User** | Database: `sprintduo` / User: `sprintduo` | Managed PostgreSQL database storing all application tables |
| **Secret Manager Secrets** | `sprintduo-database-url`<br>`sprintduo-admin-password`<br>`sprintduo-demo-password` | Stores Cloud SQL Unix socket URL and generated passwords (`--replication-policy=automatic`) |
| **Runtime Service Account** | `sprintduo-runner@<PROJECT_ID>.iam.gserviceaccount.com` | Least-privilege runtime identity (`roles/cloudsql.client` on project; `roles/secretmanager.secretAccessor` on app secrets only) |
| **Deployer Service Account** | `sprintduo-deployer@<PROJECT_ID>.iam.gserviceaccount.com` | Keyless CI/CD identity via WIF (`roles/run.developer`, `roles/artifactregistry.writer` on `sprintduo`, `roles/iam.serviceAccountUser` on `sprintduo-runner`) |
| **Cloud Run Migration Job** | `sprintduo-migrate` | Runs `npx prisma migrate deploy && npm run prisma:seed` before each service deployment |
| **Cloud Run Service** | `sprintduo` | Public HTTPS service (`--min-instances 0`, `--max-instances 3`, `512Mi`, `1` CPU, port `3000`) |

---

## 5. Repeatable Release, Commit Identification, and Rollback Procedure (`R-07`, `R-08`)

### 5.1 Normal Release Procedure (`staging` -> `main` -> Auto Deploy)

1. **Issue & Branch:** Create a GitHub Issue labeled `lab5` (assigned to both team members) and branch from `staging`.
2. **Pull Request to `staging`:** Push the branch and open a PR into `staging`. GitHub Actions automatically runs **CI & Docker Build (`test-and-docker`)**.
3. **Teammate Review:** The teammate (not the PR author) reviews the code, tests, and CI run, writes a specific review comment, approves, and merges into `staging`.
4. **Release Pull Request (`staging` -> `main`):** Open a Release PR from `staging` into `main`. The `protect-main` ruleset enforces:
   - Pull request required with **1 approving review** (authors cannot approve their own PR)
   - Required status check **`test-and-docker`** passing and branch up to date
   - Empty bypass list (no force-pushes or direct commits to `main`)
5. **Automatic Deployment (`Deploy demo`):** Merging into `main` triggers `.github/workflows/deploy.yml`:
   - Re-runs `ci-docker.yml` (`test-and-docker`) on the merged `main` commit
   - Authenticates to GCP via Workload Identity Federation (no JSON keys)
   - Builds and pushes `asia-southeast1-docker.pkg.dev/$PROJECT_ID/sprintduo/sprintduo:$GITHUB_SHA`
   - Runs `bash deploy/release.sh` (resolves the immutable `@sha256:...` digest, updates and executes `sprintduo-migrate`, then updates Cloud Run service `sprintduo` to that exact digest)
   - Runs `python3 deploy/smoke_test.py "$SERVICE_URL"` (`/api/health`, `/api/ready`, `/`, and optional login/me/logout)
   - Writes the deployment summary to the GitHub Actions run page.

### 5.2 How to Identify Which Commit is Running (`R-08`, `C-06`)

1. **In GitHub Actions:** Open **Actions -> Deploy demo -> latest green run -> Summary**. Read:
   - `Commit image tag`: the full 40-character Git commit SHA from `main`
   - `Digest`: the exact `asia-southeast1-docker.pkg.dev/.../sprintduo@sha256:...` image digest deployed
   - `URL`: the live Cloud Run service URL.
2. **In Google Cloud Console:**
   - Open **Cloud Run -> Services -> `sprintduo` -> Revisions**. The active revision serving `100%` of traffic displays the container image `@sha256:...` digest matching the GitHub Actions run summary.
   - Open **Artifact Registry -> Repositories -> `sprintduo` -> `sprintduo`**. The digest is tagged with the 40-character commit SHA.

### 5.3 Rollback and Roll-Forward Procedure (Episode 8)

1. Copy the full 40-character commit SHA of a previous successful release from **Actions -> Deploy demo -> Summary (`Commit image tag`)**.
2. Go to **Actions -> Deploy demo -> Run workflow**, select branch `main`, paste the 40-character SHA into `image_tag`, and click **Run workflow**.
3. When `image_tag` is provided, `deploy.yml` skips tests, image rebuild, and database migration (`ROLLBACK=true`), resolves the existing image digest in Artifact Registry, updates Cloud Run `sprintduo` to serve that digest, and runs `smoke_test.py`.
4. To **roll forward**, run **Deploy demo -> Run workflow** again with the newer release's 40-character commit SHA (or leave `image_tag` empty to test, rebuild, and deploy current `main`).

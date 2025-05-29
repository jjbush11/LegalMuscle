# Evidence‑MVP Copilot Checklist

**Save as** `.project/rules/00_implementation_tasks.md`

> **How to use**
> • Work strictly **top‑to‑bottom** – finish every sub‑checkbox befo  * [ ] `GET /api/v1/items` → GeoJSON FeatureCollection of all evidence for user's org
  * [ ] Include both ProofMode bundles and general uploads with location data
  * [ ] Paginate or bbox‑filter with query params moving on.
> • Commit after each top‑level task; include the checkbox ID in the commit message (e.g. `[P3‑T2]`).
> • When a phase is 100 % complete, tag the repo (`v0.x`).

Legend   `P#` = phase number  |  `T#` = task number

---

Project Overview

The Evidence‑MVP is a single‑VM, open‑source stack that lets field volunteers
upload tamper‑evident proof packages (ZIPs containing photos/videos, metadata and
pre‑computed SHA‑256 hashes) once they regain connectivity. A FastAPI gateway:

Validates each bundle (recomputes hashes, checks manifest integrity).

Stores raw bytes in a MinIO bucket with Object Lock (COMPLIANCE mode) so the
evidence is physically immutable.

Indexes rich metadata & GPS coordinates in Postgres/PostGIS for fast map queries.

Appends a ledger transaction to immudb for cryptographic, append‑only audit.

A lightweight React/Vue SPA lives in the same Compose stack. It lets staff:

Drag‑and‑drop uploads, see progress.

View all submissions on a Leaflet map.

Select entries and generate a courtroom‑ready dossier (Docx→optional PDF) via
a micro‑service using docxtpl.

Everything runs on a $5 DigitalOcean Droplet orchestrated by Docker Compose;
Caddy (or Traefik) fronts HTTPS via Let’s Encrypt. Nightly rclone can mirror the
MinIO bucket to an off‑site cloud for DR.

This checklist guides Copilot through building that system end‑to‑end, from
repo bootstrap to final documentation.


## P0 · Repository & Tooling

* [X] **P0‑T1 Create mono‑repo skeleton**

  * [X] Make folders `api/`, `spa/`, `ops/`, `docs/`, `.project/rules/`.
  * [X] Add this file at the correct path.
* [X] **P0‑T2 Git hygiene**

  * [X] Initialise repo; add root `.gitignore` covering Python, Node, Docker, OS dust.
  * [X] Set default branch `main`, protect against force‑push.
* [X] **P0‑T3 Editor & linting**

  * [X] `.editorconfig` (UTF‑8, LF, 2‑sp YAML, 4‑sp code).
  * [X] `pre‑commit` with `black`, `ruff`, `isort` (Python) + `eslint`, `prettier` (TS).
* [X] **P0‑T4 Continuous integration stub**

  * [X] `.github/workflows/ci.yml` builds `api` (3.12) and `spa` (Node 18), runs linters.

---

## P1 · Infrastructure Bootstrap (Day 1)

* [X] **P1‑T1 Compose stack**

  * [X] Draft `docker-compose.yml` with services:

    * `api`, `db`, `minio`, `immudb`, `spa`.
  * [X] Define named volumes: `pg_data`, `minio_data`, `immudb_data`.
  * [X] Map ports: `80→api`, `5173→spa`, `9000/9001→minio`, `5432→db`, `3322→immudb`.
* [X] **P1‑T2 Environment template**

  * [X] Create `.env.example`; include **all** required vars (`POSTGRES_DB`, `MINIO_BUCKET`, etc.).
  * [X] Add real `.env` to `.gitignore` (never committed).
* [X] **P1‑T3 Dockerfiles**

  * [X] `api/Dockerfile` (python:3.12‑slim, copies `requirements.txt`, installs, sets Uvicorn CMD).
  * [X] `spa/Dockerfile` (node\:lts‑alpine, copies `package.json`, installs, `npm run dev`).
* [X] **P1‑T4 Local smoke test**

  * [X] Run `docker compose up -d --build` → ensure all containers healthy with `docker compose ps`.

---

## P2 · Back‑end Stub (Day 1)

* [X] **P2‑T1 FastAPI scaffold**

  * [X] `api/app/main.py` → `FastAPI(title="Evidence‑MVP")`.
  * [X] Route `GET /health` returns `{status:"ok"}`.
  * [X] Route `POST /api/v1/upload` returns placeholder JSON `{id:"demo", sha256:"DEADBEEF"}`.
* [X] **P2‑T2 Unit test harness**

  * [X] Add `pytest`, `httpx` to `requirements-dev.txt`.
  * [X] Write test asserting `/health` 200 OK.

---

## P3 · Front‑end Stub (Day 1)

* [X] **P3‑T1 Scaffold SPA**

  * [X] Run `npm create vite@latest spa -- --template react-ts` (or `vue-ts`).
  * [X] Install `leaflet` + `@types/leaflet` (if React).
* [X] **P3‑T2 Upload page**

  * [X] Implement file picker + submit button.
  * [X] On submit, `fetch('POST /api/v1/upload')` and render JSON response.
* [X] **P3‑T3 Vite dev proxy**

  * [X] Configure `/api` proxy to `http://localhost:8000` when running outside Docker.

---

## P4 · End‑to‑End Slice (Day 1‑2)

* [X] **P4‑T1 Integrate SPA service**

  * [X] Add `spa` service to compose; mount local code for live reload.
* [X] **P4‑T2 Public droplet deploy**

  * [X] Script `ops/bootstrap.sh` installs Docker & compose plugin on Ubuntu 22.04.
  * [X] SSH to droplet, clone repo, run compose.
  * [X] Confirm `/health` & SPA root reachable via public IP.
* [X] **P4‑T3 CI push**

  * [X] Configure GitHub Actions to build & push images to GHCR on every `main` commit.

---

## P5 · Manifest Parsing & DB Schema (Day 3‑4)

* [X] **P5‑T1 Strict upload validation**

  * [X] Accept `application/zip` MIME and other types.
  * [X] Stream ZIP to temp dir; iterate entries.
  * [X] Compute SHA‑256 of each file; parse `manifest.json` (Tella) or `metadata.yaml` (eyeWitness).
  * [X] Reject upload on mismatch; return details.
* [X] **P5‑T2 Database migrations**

  * [X] Add `alembic`; generate initial migration creating tables:

    * `evidence_objects (id UUID PK, org_id FK, object_name, sha256, created_at, minio_version_id)`
    * `evidence_files (id UUID PK, object_id FK, filename, sha256, geometry GEOGRAPHY(Point,4326), captured_at)`.

---

## P6 · MinIO Object‑Lock Integration (Day 3‑4)

* [X] **P6‑T1 Bucket bootstrap**

  * [X] Init script runs:

    * `mc mb minio/evidence --with-lock`
    * `mc retention set --default COMPLIANCE 2555d minio/evidence`
* [ ] **P6‑T2 Upload with retention**
  * [X] Implement dual upload system with MinIO object lock:

    * General uploads (`/api/v1/upload_refined`) for images and Tella/eyeWitness ZIPs
    * ProofMode uploads (`/api/v1/upload/proofmode`) for forensic ZIP packages with GPG verification
  * [X] Apply retention headers: `x-amz-object-lock-mode: COMPLIANCE`, `x-amz-object-lock-retain-until-date: +7y`
  * [ ] Store returned `version_id` in DB.
* [X] **P6‑T3 Signed URL retrieval**

  * [X] Implement `GET /api/v1/files/{uuid}` returning presigned GET link valid 15 min.

---

## P7 · Spatial API & Map Data (Day 5)

* [X] **P7‑T1 Insert geometry**

  * [X] Extract lat/long from ProofMode metadata; store in PostGIS column (implemented in `/api/v1/upload/proofmode`)
  * [X] Add database insertion logic to store extracted coordinates
  * [ ] Handle location data from Tella/eyeWitness manifests (if present)
* [X] **P7‑T2 GeoJSON endpoint**

  * [X] `GET /api/v1/items` → GeoJSON FeatureCollection of all evidence for user’s org.
  * [X] Paginate or bbox‑filter with query params.

---

## P8 · immudb Ledger (Day 5‑6)

* [X] **P8‑T1 Write transaction**

  * [X] After successful DB commit, send JSON (object\_id, sha256, minio\_version\_id, timestamp) to immudb.
  * [X] Save immudb `tx_id` back in Postgres.
* [X] **P8‑T2 Audit CLI**

  * [X] Add `ops/audit.sh` that runs nightly: verifies root hash, emails on mismatch.

* [ ] **P8-T3 Fix Alembic migration**

---

## P9 · Evidence Map UI (Day 5‑6)

* [X] **P9‑T1 Leaflet map**

  * [X] Load GeoJSON; add marker cluster layer.
  * [X] On marker click, open sidebar with file list, SHA‑256, captured date.
* [X] **P9‑T2 Thumbnail fetch**

  * [X] Use presigned URLs to show image previews (if image filetype).

---

## P10 · Dossier Generator (Day 7‑9)

* [X] **P10‑T1 Docx template**

  * [X] Design `dossier_template.docx` with placeholder fields (`{{case_id}}`, `{% for evidence %}` loop).
* [X] **P10‑T2 Generate route**

  * [X] `POST /api/v1/dossier` with JSON `{ids:[...]}`.
  * [X] Fetch files, build mapsnap, render Docx via `docxtpl`, save to MinIO `dossiers` bucket.
  * [X] Respond with presigned download URL.
* [X] **P10‑T3 Optional PDF**

  * [X] If LibreOffice present, convert Docx→PDF using `python-docx2pdf`.

---

## P11 · Auth & Organisation Scopes (Day 8‑9)

* [ ] **P11‑T1 User model**

  * [ ] Integrate `fastapi-users`; tables `users`, `organisations`, `user_org_link`.
  * [ ] JWT auth; passwordv reset via email (console backend for dev).
* [ ] **P11‑T2 Auth guards**

  * [ ] Protect `/upload`, `/items`, `/dossier` routes; restrict to org scope.

---

## P12 · Off‑site Backup (Day 10)

* [ ] **P12‑T1 rclone container**

  * [ ] Add service `rclone` mounting MinIO data via S3 gateway.
  * [ ] Nightly cron sync to Google Drive / Nextcloud remote.
* [ ] **P12‑T2 Alerting**

  * [ ] On non‑zero exit, send email via Mailgun or DO SMTP.

---

## P13 · CI/CD Pipeline (Day 10‑11)

* [ ] **P13‑T1 Multi‑arch images**

  * [ ] Github Actions build and push `api` & `spa` for `linux/amd64,arm64` to GHCR.
* [ ] **P13‑T2 Zero‑downtime deploy**

  * [ ] `ops/deploy.sh` pulls new images, `docker compose up -d --pull always`, runs DB migrations.
* [ ] **P13‑T3 Caddy HTTPS**

  * [ ] Add `ops/Caddyfile`; enable ACME, reverse‑proxy `/`→spa, `/api/*`→api.

---

## P14 · Testing & UX (Day 11‑12)

* [ ] **P14‑T1 Playwright E2E**

  * [ ] Script uploads sample ZIP, verifies map pin, downloads dossier.
* [ ] **P14‑T2 Usability session**

  * [ ] Run System‑Usability‑Scale survey with 1 volunteer; record scores in `docs/usability.md`.

---

## P15 · Documentation & Release (Day >12)

* [ ] **P15‑T1 README overhaul**

  * [ ] Quick‑start (clone, set .env, compose up), architecture diagram, API examples.
* [ ] **P15‑T2 Architecture SVG**

  * [ ] Generate `docs/architecture.svg` (draw\.io) ; embed in README.
* [ ] **P15‑T3 License & changelog**

  * [ ] MIT license file; `CHANGELOG.md` summarising each version tag.

---

✔️ When every checkbox is ticked, the MVP is complete and ready for the thesis demonstration.



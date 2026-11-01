# VaultShield - Secure Document Management & Collaboration Platform

VaultShield is an enterprise-grade, secure document management and collaboration platform engineered for individuals and organizations to store, organize, share, and collaborate on files — featuring **AES-256 Envelope Encryption at rest**, **full version history**, **granular RBAC**, **Audit Activity Logging**, and **password/expiry protected share links**.

---

## 🌟 Key Features

1. **Envelope Encryption at Rest (AES-256-GCM)**
   - Every file version upload generates a cryptographically random 256-bit Data Encryption Key (DEK).
   - The file payload is encrypted with AES-256-GCM using the DEK and a 12-byte IV.
   - The DEK is wrapped (encrypted) using a Master Key (KEK) stored securely in environment secrets.
   - Files are stored on disk / cloud in encrypted binary format. Unencrypted bytes never hit persistent storage.

2. **JWT Authentication & Redis Session Control**
   - Access tokens (short-lived 15m) + Refresh tokens (long-lived 7d) stored in Redis with family rotation detection.
   - Redis-backed rate limiting on auth and upload endpoints.

3. **Folder & Document Management**
   - Hierarchical folder tree structure with drag-and-drop move/reorganize.
   - Upload, download, rename, soft delete (trash), restore, tag filtering, search by name/mime.

4. **Version History & Rollbacks**
   - Immutable version history snapshots. Every edit/upload creates a version.
   - View version metadata (author, timestamp, file size, SHA-256 checksum, change summary).
   - One-click rollback to any historical version.

5. **Granular Access Control & Secure Sharing**
   - Document/Folder permissions: `OWNER`, `EDITOR`, `VIEWER`.
   - Shareable public links with optional password protection and expiration dates.
   - Registered-user invitations, acceptance/rejection, collaborator role management, revocation, and inherited folder access.
   - Dedicated **Shared With Me**, **Shared By Me**, and collaboration notification views.

6. **Audit Activity Log & Collaboration**
   - Full audit trail recording all user actions (`VIEWED`, `EDITED`, `SHARED`, `DOWNLOADED`, `DELETED`, `RESTORED`).
   - Discussion comments and nested replies per document.

---

## 🚀 Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Custom Glassmorphism CSS Design System
- **Backend:** Node.js + Express.js + TypeScript
- **Database:** PostgreSQL (Primary data store) + Prisma ORM
- **Cache/Queue:** Redis (Token rotation, rate limiting, in-memory fallback)
- **Encryption:** AES-256-GCM Envelope Encryption (Node `crypto`)
- **Infra:** Docker + docker-compose (multi-container orchestration)

---

## 🛠️ Quick Start with Docker Compose

To bring up the full platform (Frontend, Backend, PostgreSQL, Redis) with a single command:

```bash
# 1. Navigate to the repository root
cd C:\VAULTSHIELD

# 2. Copy the environment template and set unique secrets
Copy-Item .env.example .env
# Run this four times. Paste each output into POSTGRES_PASSWORD, JWT_SECRET,
# JWT_REFRESH_SECRET, and MASTER_ENCRYPTION_KEY, respectively.
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# For manual backend development, also update DATABASE_URL with POSTGRES_PASSWORD.
# Never reuse the JWT keys or encryption key across environments.

# 3. Spin up services using Docker Compose
docker compose up --build
```

Access the Web Application in your browser:
- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Backend REST API:** [http://localhost:5000/api/v1](http://localhost:5000/api/v1)

## Temporary demo deployment on Railway

Railway's free trial is suitable for a short-lived demo, not reliable always-on hosting. It currently includes a one-time $5 usage grant for up to 30 days, then reverts to the Free plan with $1 of monthly usage credit. Free/Trial volumes are limited to 0.5 GB. Check [Railway's current plan limits](https://docs.railway.com/pricing/plans) before deploying.

Push this repository to GitHub, then create a Railway project from that repository. Do not commit `.env` files or deployment secrets.

Create these four services in the same Railway project/environment:

1. **PostgreSQL** and **Redis** using Railway's database services.
2. **Backend** from the GitHub repository. Set its root directory to `/backend` and Dockerfile path to `docker/Dockerfile`. Leave the start command as the Dockerfile default.
3. **Frontend** from the same GitHub repository. Set its root directory to `/frontend` and Dockerfile path to `docker/Dockerfile`.

Configure the backend service with:

- `NODE_ENV=production`
- `PORT=5000`
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `REDIS_URL=${{Redis.REDIS_URL}}`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `MASTER_ENCRYPTION_KEY`, each set to a different unique 64-character hexadecimal secret. Generate each with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`; enter them directly in Railway, not in source control.
- `STORAGE_DIR=/data/encrypted`
- `CLIENT_URL` set to the frontend's HTTPS Railway domain (set this after generating the domain below).

Attach a Railway volume to the backend at `/data` so uploaded encrypted files survive redeployments. Set the backend's pre-deploy command to `npx prisma migrate deploy` to apply database migrations.

Set the frontend service variable `BACKEND_HOST=backend.railway.internal` (the backend service must be named `backend`). Generate a public domain for the frontend and set its target port to `80`. The Nginx frontend serves the site and proxies `/api/` requests to the private backend, so do not generate a public backend domain. After the frontend domain is available, copy its HTTPS URL into the backend's `CLIENT_URL` and redeploy the backend.

The Railway trial is temporary and the Free plan's monthly credit may not keep all services running. Keep backups of both the database and uploaded files; the trial's small volume is only suitable for a demo.

### Database migrations

For a new database, deploy the committed migrations before starting the backend:

```bash
cd backend
npx prisma migrate deploy
```

This repository now has an initial baseline migration followed by the collaboration migration. If upgrading a database that already has the original schema but no Prisma migration history, mark the baseline as applied and then deploy:

```bash
cd backend
npx prisma migrate resolve --applied 20261026000000_initial_schema
npx prisma migrate deploy
```

If the database has already been synchronized to the current Prisma schema with `prisma db push`, mark both migrations as applied instead of replaying their SQL:

```bash
cd backend
npx prisma migrate resolve --applied 20261026000000_initial_schema
npx prisma migrate resolve --applied 20261026230000_collaboration_module
```

### Collaboration API

All endpoints require a valid access token except the existing public share-link access route. Collaborator management endpoints are scoped to the resource and enforce owner/admin authorization on the backend.

- `GET/POST /api/v1/shares/document/:documentId/collaborators`
- `PATCH/DELETE /api/v1/shares/document/:documentId/collaborators/:shareId`
- `GET/POST /api/v1/shares/folder/:folderId/collaborators`
- `PATCH/DELETE /api/v1/shares/folder/:folderId/collaborators/:shareId`
- `GET /api/v1/shares/invitations`
- `POST /api/v1/shares/invitations/:invitationId/respond` (`accept` or `reject`)
- `DELETE /api/v1/shares/invitations/:invitationId` (cancel a pending invitation)
- `GET /api/v1/shares/documents/shared-with-me`
- `GET /api/v1/shares/documents/shared-by-me`
- `GET /api/v1/shares/notifications`
- `PATCH /api/v1/shares/notifications/:notificationId/read`

---

## 💻 Manual Local Development Setup

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Run database migrations (Ensure PostgreSQL is running locally or via Docker)
npx prisma migrate dev

# Run unit tests (Auth, Encryption, Versioning)
npm test

# Start backend dev server
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

---

## 🔐 Envelope Encryption Architecture

```
                       [ RAW FILE UPLOAD ]
                                |
                   Generate Random 256-bit DEK
                                |
             +------------------+------------------+
             |                                     |
    Encrypt File Payload                  Wrap DEK with Master KEK
   (AES-256-GCM + File IV)                 (AES-256-GCM + DEK IV)
             |                                     |
    [ Encrypted Buffer ]                  [ Wrapped DEK String ]
             \                                     /
              +-----------------+-----------------+
                                |
                    Save Payload to Storage
                 Save Metadata & Wrapped DEK to DB
```

When downloading, the process is reversed:
1. Fetch wrapped DEK & GCM Auth Tag from `DOCUMENT_VERSIONS` table.
2. Unwrap DEK using `MASTER_ENCRYPTION_KEY` (KEK).
3. Decrypt the file stream in-memory using DEK.
4. Stream decrypted bytes to authorized user browser.

---

## 🧪 Unit Tests

Run backend service unit tests:

```bash
cd backend
npm test
```
Tests verify:
- Envelope Encryption payload symmetry and tampering detection.
- AuthService JWT token generation & registration.
- VersionService history formatting and rollbacks.

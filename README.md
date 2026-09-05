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
# 1. Clone repo & navigate to root
cd "c:\FSD ANTIGRAVITY"

# 2. Copy environment template
cp .env.example .env

# 3. Spin up services using Docker Compose
docker-compose up --build
```

Access the Web Application in your browser:
- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Backend REST API:** [http://localhost:5000/api/v1](http://localhost:5000/api/v1)

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

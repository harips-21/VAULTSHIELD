# REST API Documentation - Secure Document Management & Collaboration Platform

All API endpoints are versioned with the `/api/v1` prefix.

---

## 1. Authentication & Workspace Management

| Method | Endpoint | Auth | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | `{ email, password, fullName, orgName? }` | Register user & create default workspace organization |
| `POST` | `/api/v1/auth/login` | Public | `{ email, password }` | Authenticate user & return JWT Access + Refresh tokens |
| `POST` | `/api/v1/auth/refresh` | Public | `{ refreshToken }` | Rotate refresh token & issue new access token |
| `POST` | `/api/v1/auth/logout` | Bearer | `{ refreshToken }` | Revoke refresh token family in Redis |

---

## 2. Folder Management

| Method | Endpoint | Auth | Request Body / Query | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/folders` | Bearer | `?parentFolderId=&isTrashed=&organizationId=` | List folders in specified directory/trash |
| `GET` | `/api/v1/folders/tree` | Bearer | `?organizationId=` | Retrieve complete folder tree hierarchy |
| `POST` | `/api/v1/folders` | Bearer | `{ name, organizationId, parentFolderId? }` | Create a new directory folder |
| `PATCH` | `/api/v1/folders/:folderId` | Bearer | `{ name }` | Rename folder |
| `PATCH` | `/api/v1/folders/:folderId/move` | Bearer | `{ newParentFolderId }` | Move folder to a new parent folder |
| `DELETE` | `/api/v1/folders/:folderId` | Bearer | None | Soft delete folder and subcontents to trash |
| `POST` | `/api/v1/folders/:folderId/restore` | Bearer | None | Restore folder and subcontents from trash |

---

## 3. Document Management & Envelope Storage

| Method | Endpoint | Auth | Request Body / Query | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/documents` | Bearer | `?folderId=&search=&tag=&mimeType=&isTrashed=` | Search & list documents with metadata |
| `POST` | `/api/v1/documents/upload` | Bearer | `multipart/form-data` (`file`, `organizationId`, `folderId?`, `tags?`) | Encrypt file with AES-256-GCM & upload version 1 |
| `GET` | `/api/v1/documents/:documentId/download` | Bearer (RBAC) | `?versionId=` | Decrypt file payload stream for authorized user |
| `PATCH` | `/api/v1/documents/:documentId` | Bearer (RBAC) | `{ name }` | Rename document |
| `PATCH` | `/api/v1/documents/:documentId/move` | Bearer (RBAC) | `{ folderId }` | Move document to another folder |
| `DELETE` | `/api/v1/documents/:documentId` | Bearer (RBAC) | None | Soft delete document to trash |
| `POST` | `/api/v1/documents/:documentId/restore` | Bearer (RBAC) | None | Restore document from trash |

---

## 4. Document Versioning

| Method | Endpoint | Auth | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/documents/:documentId/versions` | Bearer (RBAC) | None | Get version history list with metadata & checksums |
| `POST` | `/api/v1/documents/:documentId/versions` | Bearer (RBAC) | `multipart/form-data` (`file`, `changeSummary?`) | Upload a new version snapshot |
| `POST` | `/api/v1/documents/:documentId/versions/:versionId/restore` | Bearer (RBAC) | None | Rollback document active pointer to historical version |

---

## 5. Sharing & Public Link Access

| Method | Endpoint | Auth | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/shares/document` | Bearer | `{ documentId, permission, isPublicLink, password?, expiresInDays? }` | Share document with user or generate link |
| `POST` | `/api/v1/shares/folder` | Bearer | `{ folderId, permission, isPublicLink, password?, expiresInDays? }` | Share folder with user or generate link |
| `POST` | `/api/v1/shares/access/:shareToken` | Public | `{ password? }` | Access public share link (validates expiry/password) |

---

## 6. Audit Activity Log & Discussion Comments

| Method | Endpoint | Auth | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/activity/workspace` | Bearer | `?organizationId=` | Get workspace activity log audit feed |
| `GET` | `/api/v1/activity/document/:documentId` | Bearer | None | Get audit trail for a specific document |
| `GET` | `/api/v1/comments/document/:documentId` | Bearer | None | List discussion comments & nested replies |
| `POST` | `/api/v1/comments` | Bearer | `{ documentId, content, parentCommentId? }` | Add comment or nested reply to document |
| `DELETE` | `/api/v1/comments/:commentId` | Bearer | None | Delete comment authoring |

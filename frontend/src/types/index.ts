export type Role = 'OWNER' | 'ADMIN' | 'MEMBER';
export type PermissionLevel = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  memberships?: {
    orgId: string;
    orgName: string;
    role: Role;
  }[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Folder {
  id: string;
  name: string;
  organizationId: string;
  createdByUserId: string;
  parentFolderId?: string | null;
  isTrashed: boolean;
  trashedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; fullName: string; email: string };
  _count?: { childFolders: number; documents: number };
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileSize: string;
  checksumSha256: string;
  changeSummary?: string | null;
  createdAt: string;
  uploadedBy?: { id: string; fullName: string; email: string };
}

export interface DocumentItem {
  id: string;
  name: string;
  mimeType: string;
  fileSize: string;
  organizationId: string;
  folderId?: string | null;
  ownerId: string;
  tags: string[];
  isTrashed: boolean;
  trashedAt?: string | null;
  currentVersionId?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; fullName: string; email: string };
  folder?: { id: string; name: string };
}

export interface ActivityLogItem {
  id: string;
  action: 'VIEWED' | 'EDITED' | 'SHARED' | 'DOWNLOADED' | 'DELETED' | 'RESTORED' | 'VERSION_RESTORED';
  createdAt: string;
  user: { id: string; fullName: string; email: string };
  document?: { id: string; name: string };
  folder?: { id: string; name: string };
  metadata?: any;
}

export interface CommentItem {
  id: string;
  documentId: string;
  content: string;
  createdAt: string;
  user: { id: string; fullName: string; email: string; avatarUrl?: string };
  replies?: CommentItem[];
}

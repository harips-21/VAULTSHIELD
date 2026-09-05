import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';

export class ShareService {
  /**
   * Share a document with a specific user or generate a public share link
   */
  static async shareDocument(params: {
    documentId: string;
    sharedWithUserId?: string;
    permission: 'OWNER' | 'EDITOR' | 'VIEWER';
    isPublicLink?: boolean;
    password?: string;
    expiresInDays?: number;
  }) {
    let passwordHash: string | null = null;
    if (params.password) {
      passwordHash = await bcrypt.hash(params.password, 10);
    }

    let expiresAt: Date | null = null;
    if (params.expiresInDays) {
      expiresAt = new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000);
    }

    const shareToken = params.isPublicLink ? uuidv4() : null;

    return prisma.documentShare.create({
      data: {
        documentId: params.documentId,
        sharedWithUserId: params.sharedWithUserId || null,
        permission: params.permission,
        shareToken,
        passwordHash,
        expiresAt,
      },
      include: {
        sharedWith: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  /**
   * Share a folder with a specific user or generate a public share link
   */
  static async shareFolder(params: {
    folderId: string;
    sharedWithUserId?: string;
    permission: 'EDITOR' | 'VIEWER';
    isPublicLink?: boolean;
    password?: string;
    expiresInDays?: number;
  }) {
    let passwordHash: string | null = null;
    if (params.password) {
      passwordHash = await bcrypt.hash(params.password, 10);
    }

    let expiresAt: Date | null = null;
    if (params.expiresInDays) {
      expiresAt = new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000);
    }

    const shareToken = params.isPublicLink ? uuidv4() : null;

    return prisma.folderShare.create({
      data: {
        folderId: params.folderId,
        sharedWithUserId: params.sharedWithUserId || null,
        permission: params.permission,
        shareToken,
        passwordHash,
        expiresAt,
      },
      include: {
        sharedWith: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  /**
   * Access document or folder via public share link (validates password & expiry)
   */
  static async accessShareLink(shareToken: string, password?: string) {
    // Check Document Shares first
    const docShare = await prisma.documentShare.findUnique({
      where: { shareToken },
      include: { document: true },
    });

    if (docShare) {
      if (docShare.expiresAt && new Date() > docShare.expiresAt) {
        throw new Error('This share link has expired');
      }

      if (docShare.passwordHash) {
        if (!password) {
          throw new Error('Password required to access this share link');
        }
        const isValid = await bcrypt.compare(password, docShare.passwordHash);
        if (!isValid) {
          throw new Error('Incorrect share link password');
        }
      }

      return {
        type: 'document',
        permission: docShare.permission,
        resource: docShare.document,
      };
    }

    // Check Folder Shares
    const folderShare = await prisma.folderShare.findUnique({
      where: { shareToken },
      include: { folder: true },
    });

    if (folderShare) {
      if (folderShare.expiresAt && new Date() > folderShare.expiresAt) {
        throw new Error('This share link has expired');
      }

      if (folderShare.passwordHash) {
        if (!password) {
          throw new Error('Password required to access this share link');
        }
        const isValid = await bcrypt.compare(password, folderShare.passwordHash);
        if (!isValid) {
          throw new Error('Incorrect share link password');
        }
      }

      return {
        type: 'folder',
        permission: folderShare.permission,
        resource: folderShare.folder,
      };
    }

    throw new Error('Share link not found or invalid');
  }

  /**
   * Evaluates user permission level for a given document (RBAC Engine)
   */
  static async getDocumentPermission(userId: string, documentId: string): Promise<'OWNER' | 'EDITOR' | 'VIEWER' | 'NONE'> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        shares: { where: { sharedWithUserId: userId } },
        organization: {
          include: { memberships: { where: { userId } } },
        },
      },
    });

    if (!document) return 'NONE';

    // 1. Direct Document Owner
    if (document.ownerId === userId) return 'OWNER';

    // 2. Organization Owner/Admin
    const orgMembership = document.organization.memberships[0];
    if (orgMembership?.role === 'OWNER' || orgMembership?.role === 'ADMIN') {
      return 'OWNER';
    }

    // 3. Direct Document Shares
    const directShare = document.shares[0];
    if (directShare) {
      return directShare.permission as any;
    }

    // 4. Inherited Folder Shares (if inside a folder)
    if (document.folderId) {
      let currentFolderId: string | null = document.folderId;
      while (currentFolderId) {
        const folderShare = await prisma.folderShare.findFirst({
          where: { folderId: currentFolderId, sharedWithUserId: userId },
        });

        if (folderShare) {
          return folderShare.permission as any;
        }

        const parent: { parentFolderId: string | null } | null = await prisma.folder.findUnique({
          where: { id: currentFolderId },
          select: { parentFolderId: true },
        });

        currentFolderId = parent?.parentFolderId || null;
      }
    }

    // 5. Default Organization Member View Access if not trashed
    if (orgMembership) {
      return 'EDITOR';
    }

    return 'NONE';
  }
}

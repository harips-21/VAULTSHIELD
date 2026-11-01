import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { CryptoUtil } from '../utils/crypto';
import { prisma } from '../utils/prisma';
import { getStorageProvider } from './storage/storageFactory';

export class DocumentService {
  /**
   * Upload a new document (Creates Document + DocumentVersion v1 with Envelope Encryption)
   */
  static async uploadDocument(params: {
    name: string;
    mimeType: string;
    buffer: Buffer;
    organizationId: string;
    ownerId: string;
    folderId?: string;
    tags?: string[];
  }) {
    if (params.folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: params.folderId },
        select: { organizationId: true, isTrashed: true },
      });
      if (!folder || folder.organizationId !== params.organizationId || folder.isTrashed) {
        throw new Error('Destination folder not found or invalid');
      }
    }

    const storageProvider = getStorageProvider();
    const fileSize = BigInt(params.buffer.length);

    // Encrypt payload with envelope encryption
    const envelope = CryptoUtil.encryptFileWithEnvelope(params.buffer, env.MASTER_ENCRYPTION_KEY);

    const docId = uuidv4();
    const versionId = uuidv4();
    const relativeStoragePath = `org_${params.organizationId}/${docId}_v1.enc`;

    // Write encrypted buffer to storage provider
    await storageProvider.write(relativeStoragePath, envelope.encryptedBuffer);

    // Create document & version 1 in Prisma
    const document = await prisma.$transaction(
      async (tx) => {
        const doc = await tx.document.create({
          data: {
            id: docId,
            name: params.name,
            mimeType: params.mimeType,
            fileSize,
            organizationId: params.organizationId,
            folderId: params.folderId || null,
            ownerId: params.ownerId,
            tags: params.tags || [],
            currentVersionId: versionId,
          },
        });

        await tx.documentVersion.create({
          data: {
            id: versionId,
            documentId: doc.id,
            versionNumber: 1,
            storagePath: relativeStoragePath,
            checksumSha256: envelope.checksumSha256,
            fileSize,
            encryptedDek: envelope.encryptedDek,
            iv: envelope.iv,
            authTag: envelope.authTag,
            uploadedByUserId: params.ownerId,
            changeSummary: 'Initial upload',
          },
        });

        return doc;
      },
      { timeout: 30_000 }
    );

    return document;
  }

  /**
   * Download and decrypt a document's current or specific version
   */
  static async downloadDocument(documentId: string, versionId?: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        versions: true,
      },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const targetVersionId = versionId || document.currentVersionId;
    const version = document.versions.find((v) => v.id === targetVersionId);

    if (!version) {
      throw new Error('Requested document version not found');
    }

    const storageProvider = getStorageProvider();
    const encryptedBuffer = await storageProvider.read(version.storagePath);

    const decryptedBuffer = CryptoUtil.decryptFileWithEnvelope(
      encryptedBuffer,
      version.encryptedDek,
      version.iv,
      version.authTag,
      env.MASTER_ENCRYPTION_KEY
    );

    return {
      buffer: decryptedBuffer,
      fileName: document.name,
      mimeType: document.mimeType,
      versionNumber: version.versionNumber,
    };
  }

  /**
   * Search and list documents in workspace or folder
   */
  static async listDocuments(params: {
    organizationId: string;
    folderId?: string | null;
    search?: string;
    tag?: string;
    mimeType?: string;
    isTrashed?: boolean;
  }) {
    const whereClause: any = {
      organizationId: params.organizationId,
      isTrashed: params.isTrashed ?? false,
    };

    // Handle folderId filtering: empty string means root level
    if (params.folderId !== undefined) {
      whereClause.folderId = params.folderId === "" ? null : params.folderId;
    }

    if (params.search) {
      whereClause.name = { contains: params.search, mode: 'insensitive' };
    }

    if (params.tag) {
      whereClause.tags = { has: params.tag };
    }

    if (params.mimeType) {
      whereClause.mimeType = { startsWith: params.mimeType };
    }

    const docs = await prisma.document.findMany({
      where: whereClause,
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        folder: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return docs.map((d) => ({
      ...d,
      fileSize: d.fileSize.toString(),
    }));
  }

  static async moveDocument(documentId: string, newFolderId: string | null) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { organizationId: true },
    });
    if (!document) {
      throw new Error('Document not found');
    }

    if (newFolderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: newFolderId },
        select: { organizationId: true, isTrashed: true },
      });
      if (!folder || folder.organizationId !== document.organizationId || folder.isTrashed) {
        throw new Error('Destination folder not found or invalid');
      }
    }

    return prisma.document.update({
      where: { id: documentId },
      data: { folderId: newFolderId },
    });
  }

  static async renameDocument(documentId: string, newName: string) {
    return prisma.document.update({
      where: { id: documentId },
      data: { name: newName },
    });
  }

  static async softDeleteDocument(documentId: string) {
    return prisma.document.update({
      where: { id: documentId },
      data: { isTrashed: true, trashedAt: new Date() },
    });
  }

  static async restoreDocument(documentId: string) {
    return prisma.document.update({
      where: { id: documentId },
      data: { isTrashed: false, trashedAt: null },
    });
  }
}

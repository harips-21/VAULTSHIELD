import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { CryptoUtil } from '../utils/crypto';
import { prisma } from '../utils/prisma';
import { getStorageProvider } from './storage/storageFactory';

export class VersionService {
  /**
   * Upload a new version for an existing document
   */
  static async uploadNewVersion(params: {
    documentId: string;
    buffer: Buffer;
    uploadedByUserId: string;
    changeSummary?: string;
  }) {
    const document = await prisma.document.findUnique({
      where: { id: params.documentId },
      include: { versions: { orderBy: { versionNumber: 'desc' } } },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const latestVersion = document.versions[0];
    const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;

    const storageProvider = getStorageProvider();
    const fileSize = BigInt(params.buffer.length);

    // Encrypt new version payload
    const envelope = CryptoUtil.encryptFileWithEnvelope(params.buffer, env.MASTER_ENCRYPTION_KEY);

    const versionId = uuidv4();
    const relativeStoragePath = `org_${document.organizationId}/${document.id}_v${newVersionNumber}.enc`;

    await storageProvider.write(relativeStoragePath, envelope.encryptedBuffer);

    const version = await prisma.documentVersion.create({
      data: {
        id: versionId,
        documentId: document.id,
        versionNumber: newVersionNumber,
        storagePath: relativeStoragePath,
        checksumSha256: envelope.checksumSha256,
        fileSize,
        encryptedDek: envelope.encryptedDek,
        iv: envelope.iv,
        authTag: envelope.authTag,
        uploadedByUserId: params.uploadedByUserId,
        changeSummary: params.changeSummary || `Version ${newVersionNumber} upload`,
      },
    });

    // Update active version pointer on document
    await prisma.document.update({
      where: { id: document.id },
      data: {
        currentVersionId: versionId,
        fileSize,
        updatedAt: new Date(),
      },
    });

    return {
      ...version,
      fileSize: version.fileSize.toString(),
    };
  }

  /**
   * List all versions of a document
   */
  static async getVersionHistory(documentId: string) {
    const versions = await prisma.documentVersion.findMany({
      where: { documentId },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { versionNumber: 'desc' },
    });

    return versions.map((v) => ({
      ...v,
      fileSize: v.fileSize.toString(),
    }));
  }

  /**
   * Restore a historical version to be the active version
   */
  static async restoreVersion(documentId: string, versionId: string) {
    const version = await prisma.documentVersion.findFirst({
      where: { id: versionId, documentId },
    });

    if (!version) {
      throw new Error('Specified version does not exist for this document');
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        currentVersionId: version.id,
        fileSize: version.fileSize,
        updatedAt: new Date(),
      },
    });

    return { message: `Restored document to version ${version.versionNumber}` };
  }

  /**
   * Version pruning policy: retain maximum N versions per document
   */
  static async pruneVersions(documentId: string, maxVersions: number = 10) {
    const versions = await prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
    });

    if (versions.length <= maxVersions) {
      return { prunedCount: 0 };
    }

    const versionsToPrune = versions.slice(maxVersions);
    const storageProvider = getStorageProvider();

    for (const ver of versionsToPrune) {
      await storageProvider.delete(ver.storagePath);
      await prisma.documentVersion.delete({ where: { id: ver.id } });
    }

    return { prunedCount: versionsToPrune.length };
  }
}

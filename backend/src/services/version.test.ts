import { VersionService } from './version.service';

jest.mock('../utils/prisma', () => ({
  prisma: {
    document: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    documentVersion: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('./storage/storageFactory', () => ({
  getStorageProvider: () => ({
    write: jest.fn().mockResolvedValue('path/to/encrypted.enc'),
    read: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
  }),
}));

describe('VersionService', () => {
  test('should format version history with stringified file size', async () => {
    const { prisma } = require('../utils/prisma');
    prisma.documentVersion.findMany.mockResolvedValue([
      {
        id: 'ver-1',
        documentId: 'doc-1',
        versionNumber: 1,
        fileSize: BigInt(2048),
        uploadedBy: { id: 'u1', fullName: 'User One', email: 'u1@example.com' },
        createdAt: new Date(),
      },
    ]);

    const result = await VersionService.getVersionHistory('doc-1');
    expect(result).toHaveLength(1);
    expect(result[0].fileSize).toBe('2048');
  });
});

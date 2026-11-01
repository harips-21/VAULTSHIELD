import { prisma } from '../utils/prisma';
import { FolderService } from './folder.service';

jest.mock('../utils/prisma', () => ({
  prisma: {
    folder: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    document: { updateMany: jest.fn() },
  },
}));

describe('FolderService.moveFolder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects a destination folder in a different organization', async () => {
    (prisma.folder.findUnique as jest.Mock)
      .mockResolvedValueOnce({ organizationId: 'org-1' })
      .mockResolvedValueOnce({ organizationId: 'org-2', isTrashed: false });

    await expect(FolderService.moveFolder('folder-1', 'folder-2', 'org-1')).rejects.toThrow(
      'Destination folder not found or invalid'
    );
    expect(prisma.folder.update).not.toHaveBeenCalled();
  });
});

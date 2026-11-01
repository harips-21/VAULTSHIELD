import { prisma } from '../utils/prisma';

export class FolderService {
  static async createFolder(data: {
    name: string;
    organizationId: string;
    createdByUserId: string;
    parentFolderId?: string;
  }) {
    if (data.parentFolderId) {
      const parent = await prisma.folder.findUnique({
        where: { id: data.parentFolderId },
      });
      if (!parent || parent.organizationId !== data.organizationId || parent.isTrashed) {
        throw new Error('Parent folder not found or invalid');
      }
    }

    return prisma.folder.create({
      data: {
        name: data.name,
        organizationId: data.organizationId,
        createdByUserId: data.createdByUserId,
        parentFolderId: data.parentFolderId || null,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  static async getFolders(organizationId: string, parentFolderId?: string, isTrashed: boolean = false) {
    return prisma.folder.findMany({
      where: {
        organizationId,
        parentFolderId: parentFolderId || null,
        isTrashed,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        _count: {
          select: {
            childFolders: true,
            documents: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getFolderTree(organizationId: string) {
    const allFolders = await prisma.folder.findMany({
      where: { organizationId, isTrashed: false },
      select: {
        id: true,
        name: true,
        parentFolderId: true,
      },
      orderBy: { name: 'asc' },
    });

    const buildTree = (parentId: string | null): any[] => {
      return allFolders
        .filter((f) => f.parentFolderId === parentId)
        .map((f) => ({
          ...f,
          children: buildTree(f.id),
        }));
    };

    return buildTree(null);
  }

  static async moveFolder(folderId: string, newParentFolderId: string | null, organizationId: string) {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      select: { organizationId: true },
    });
    if (!folder || folder.organizationId !== organizationId) {
      throw new Error('Folder not found');
    }

    // Prevent moving folder into itself or its own subfolder
    if (newParentFolderId === folderId) {
      throw new Error('Cannot move folder into itself');
    }

    if (newParentFolderId) {
      const newParent = await prisma.folder.findUnique({
        where: { id: newParentFolderId },
        select: { organizationId: true, isTrashed: true, parentFolderId: true },
      });
      if (!newParent || newParent.organizationId !== organizationId || newParent.isTrashed) {
        throw new Error('Destination folder not found or invalid');
      }

      let currentId: string | null = newParentFolderId;
      while (currentId) {
        if (currentId === folderId) {
          throw new Error('Cannot move folder into one of its subfolders');
        }
        const parent: { parentFolderId: string | null } | null = await prisma.folder.findUnique({
          where: { id: currentId },
          select: { parentFolderId: true },
        });
        currentId = parent?.parentFolderId || null;
      }
    }

    return prisma.folder.update({
      where: { id: folderId },
      data: { parentFolderId: newParentFolderId },
    });
  }

  static async softDeleteFolder(folderId: string, organizationId: string) {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      select: { organizationId: true },
    });
    if (!folder || folder.organizationId !== organizationId) {
      throw new Error('Folder not found');
    }

    const now = new Date();
    // Recursively soft-delete child folders & documents
    const softDeleteRecursive = async (fId: string) => {
      await prisma.folder.updateMany({
        where: { id: fId, organizationId },
        data: { isTrashed: true, trashedAt: now },
      });

      await prisma.document.updateMany({
        where: { folderId: fId, organizationId },
        data: { isTrashed: true, trashedAt: now },
      });

      const children = await prisma.folder.findMany({
        where: { parentFolderId: fId, organizationId },
        select: { id: true },
      });

      for (const child of children) {
        await softDeleteRecursive(child.id);
      }
    };

    await softDeleteRecursive(folderId);
  }

  static async restoreFolder(folderId: string, organizationId: string) {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      select: { organizationId: true },
    });
    if (!folder || folder.organizationId !== organizationId) {
      throw new Error('Folder not found');
    }

    const restoreRecursive = async (fId: string) => {
      await prisma.folder.updateMany({
        where: { id: fId, organizationId },
        data: { isTrashed: false, trashedAt: null },
      });

      await prisma.document.updateMany({
        where: { folderId: fId, organizationId },
        data: { isTrashed: false, trashedAt: null },
      });

      const children = await prisma.folder.findMany({
        where: { parentFolderId: fId, organizationId },
        select: { id: true },
      });

      for (const child of children) {
        await restoreRecursive(child.id);
      }
    };

    await restoreRecursive(folderId);
  }

  static async renameFolder(folderId: string, name: string, organizationId: string) {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      select: { organizationId: true },
    });
    if (!folder || folder.organizationId !== organizationId) {
      throw new Error('Folder not found');
    }

    return prisma.folder.update({
      where: { id: folderId },
      data: { name },
    });
  }
}

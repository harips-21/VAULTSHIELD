import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ActivityService } from '../services/activity.service';
import { FolderService } from '../services/folder.service';

export class FolderController {
  static async createFolder(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, parentFolderId, organizationId } = req.body;
      const orgId = organizationId || req.user?.orgId;

      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const folder = await FolderService.createFolder({
        name,
        organizationId: orgId,
        createdByUserId: req.user!.userId,
        parentFolderId,
      });

      await ActivityService.log({
        organizationId: orgId,
        userId: req.user!.userId,
        action: 'EDITED',
        folderId: folder.id,
        metadata: { action: 'CREATED_FOLDER', folderName: name },
      });

      return res.status(201).json(folder);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }

  static async getFolders(req: AuthenticatedRequest, res: Response) {
    try {
      const { parentFolderId, isTrashed, organizationId } = req.query;
      const orgId = (organizationId as string) || req.user?.orgId;

      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const folders = await FolderService.getFolders(
        orgId,
        parentFolderId ? (parentFolderId as string) : undefined,
        isTrashed === 'true'
      );

      return res.status(200).json(folders);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getFolderTree(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = (req.query.organizationId as string) || req.user?.orgId;
      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const tree = await FolderService.getFolderTree(orgId);
      return res.status(200).json(tree);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async moveFolder(req: AuthenticatedRequest, res: Response) {
    try {
      const { folderId } = req.params;
      const { newParentFolderId } = req.body;
      const orgId = req.user?.orgId;

      const folder = await FolderService.moveFolder(folderId, newParentFolderId || null, orgId || '');

      return res.status(200).json(folder);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }

  static async renameFolder(req: AuthenticatedRequest, res: Response) {
    try {
      const { folderId } = req.params;
      const { name } = req.body;

      const folder = await FolderService.renameFolder(folderId, name);
      return res.status(200).json(folder);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }

  static async softDeleteFolder(req: AuthenticatedRequest, res: Response) {
    try {
      const { folderId } = req.params;
      const orgId = req.user?.orgId || '';

      await FolderService.softDeleteFolder(folderId, orgId);

      await ActivityService.log({
        organizationId: orgId,
        userId: req.user!.userId,
        action: 'DELETED',
        folderId,
      });

      return res.status(200).json({ message: 'Folder moved to trash' });
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }

  static async restoreFolder(req: AuthenticatedRequest, res: Response) {
    try {
      const { folderId } = req.params;

      await FolderService.restoreFolder(folderId);

      await ActivityService.log({
        organizationId: req.user?.orgId || '',
        userId: req.user!.userId,
        action: 'RESTORED',
        folderId,
      });

      return res.status(200).json({ message: 'Folder restored from trash' });
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }
}

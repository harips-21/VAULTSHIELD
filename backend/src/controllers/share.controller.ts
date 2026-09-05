import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ActivityService } from '../services/activity.service';
import { ShareService } from '../services/share.service';

export class ShareController {
  static async shareDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId, sharedWithUserId, permission, isPublicLink, password, expiresInDays } = req.body;

      const share = await ShareService.shareDocument({
        documentId,
        sharedWithUserId,
        permission,
        isPublicLink,
        password,
        expiresInDays,
      });

      await ActivityService.log({
        organizationId: req.user?.orgId || '',
        userId: req.user!.userId,
        action: 'SHARED',
        documentId,
        metadata: { sharedWithUserId, isPublicLink, permission },
      });

      return res.status(201).json(share);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }

  static async shareFolder(req: AuthenticatedRequest, res: Response) {
    try {
      const { folderId, sharedWithUserId, permission, isPublicLink, password, expiresInDays } = req.body;

      const share = await ShareService.shareFolder({
        folderId,
        sharedWithUserId,
        permission,
        isPublicLink,
        password,
        expiresInDays,
      });

      return res.status(201).json(share);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }

  static async accessShareLink(req: Request, res: Response) {
    try {
      const { shareToken } = req.params;
      const { password } = req.body;

      const result = await ShareService.accessShareLink(shareToken, password);
      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }
}

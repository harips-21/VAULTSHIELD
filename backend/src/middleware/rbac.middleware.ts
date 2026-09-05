import { NextFunction, Response } from 'express';
import { ShareService } from '../services/share.service';
import { AuthenticatedRequest } from './auth.middleware';

export function requireDocumentPermission(requiredPermission: 'OWNER' | 'EDITOR' | 'VIEWER') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const documentId = req.params.documentId || req.body.documentId;
    const userId = req.user?.userId;

    if (!userId || !documentId) {
      return res.status(400).json({ error: 'User context and Document ID are required' });
    }

    try {
      const userPermission = await ShareService.getDocumentPermission(userId, documentId);

      const levelMap = { OWNER: 3, EDITOR: 2, VIEWER: 1, NONE: 0 };
      if (levelMap[userPermission] < levelMap[requiredPermission]) {
        return res.status(403).json({ error: `Forbidden: Requires ${requiredPermission} permission` });
      }

      next();
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  };
}

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ActivityService } from '../services/activity.service';

export class ActivityController {
  static async getWorkspaceActivity(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = (req.query.organizationId as string) || req.user?.orgId;
      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const logs = await ActivityService.getWorkspaceActivity(orgId);
      return res.status(200).json(logs);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getDocumentActivity(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId } = req.params;
      const logs = await ActivityService.getDocumentActivity(documentId);
      return res.status(200).json(logs);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
}

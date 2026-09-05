import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ActivityService } from '../services/activity.service';
import { VersionService } from '../services/version.service';

export class VersionController {
  static async getVersionHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId } = req.params;
      const history = await VersionService.getVersionHistory(documentId);
      return res.status(200).json(history);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }

  static async uploadNewVersion(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId } = req.params;
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded for version update' });
      }

      const version = await VersionService.uploadNewVersion({
        documentId,
        buffer: req.file.buffer,
        uploadedByUserId: req.user!.userId,
        changeSummary: req.body.changeSummary,
      });

      await ActivityService.log({
        organizationId: req.user?.orgId || '',
        userId: req.user!.userId,
        action: 'EDITED',
        documentId,
        metadata: { versionNumber: version.versionNumber },
      });

      return res.status(201).json(version);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }

  static async restoreVersion(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId, versionId } = req.params;

      const result = await VersionService.restoreVersion(documentId, versionId);

      await ActivityService.log({
        organizationId: req.user?.orgId || '',
        userId: req.user!.userId,
        action: 'VERSION_RESTORED',
        documentId,
        metadata: { restoredVersionId: versionId },
      });

      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }
}

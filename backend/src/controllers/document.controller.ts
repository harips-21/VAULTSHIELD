import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ActivityService } from '../services/activity.service';
import { DocumentService } from '../services/document.service';

export class DocumentController {
  static async uploadDocument(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const orgId = (req.body.organizationId as string) || req.user?.orgId;
      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const tags = req.body.tags ? (typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags) : [];

      const doc = await DocumentService.uploadDocument({
        name: req.body.name || req.file.originalname,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
        organizationId: orgId,
        ownerId: req.user!.userId,
        folderId: req.body.folderId || undefined,
        tags,
      });

      await ActivityService.log({
        organizationId: orgId,
        userId: req.user!.userId,
        action: 'EDITED',
        documentId: doc.id,
        metadata: { action: 'UPLOAD_DOCUMENT', fileName: doc.name },
      });

      return res.status(201).json({
        ...doc,
        fileSize: doc.fileSize.toString(),
      });
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }

  static async listDocuments(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = (req.query.organizationId as string) || req.user?.orgId;
      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const docs = await DocumentService.listDocuments({
        organizationId: orgId,
        folderId: req.query.folderId !== undefined ? (req.query.folderId as string || null) : undefined,
        search: req.query.search as string,
        tag: req.query.tag as string,
        mimeType: req.query.mimeType as string,
        isTrashed: req.query.isTrashed === 'true',
      });

      return res.status(200).json(docs);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async downloadDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId } = req.params;
      const versionId = req.query.versionId as string;
      const isPreview = req.query.preview === 'true';

      const result = await DocumentService.downloadDocument(documentId, versionId);

      await ActivityService.log({
        organizationId: req.user?.orgId || '',
        userId: req.user!.userId,
        action: isPreview ? 'VIEWED' : 'DOWNLOADED',
        documentId,
        metadata: { versionNumber: result.versionNumber },
      });

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `${isPreview ? 'inline' : 'attachment'}; filename="${encodeURIComponent(result.fileName)}"`);
      return res.send(result.buffer);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }

  static async moveDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId } = req.params;
      const { folderId } = req.body;

      const doc = await DocumentService.moveDocument(documentId, folderId || null);
      return res.status(200).json({
        ...doc,
        fileSize: doc.fileSize.toString(),
      });
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }

  static async renameDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId } = req.params;
      const { name } = req.body;

      const doc = await DocumentService.renameDocument(documentId, name);
      return res.status(200).json({
        ...doc,
        fileSize: doc.fileSize.toString(),
      });
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }

  static async softDeleteDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId } = req.params;

      await DocumentService.softDeleteDocument(documentId);

      await ActivityService.log({
        organizationId: req.user?.orgId || '',
        userId: req.user!.userId,
        action: 'DELETED',
        documentId,
      });

      return res.status(200).json({ message: 'Document moved to trash' });
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }

  static async restoreDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId } = req.params;

      await DocumentService.restoreDocument(documentId);

      await ActivityService.log({
        organizationId: req.user?.orgId || '',
        userId: req.user!.userId,
        action: 'RESTORED',
        documentId,
      });

      return res.status(200).json({ message: 'Document restored from trash' });
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }
}

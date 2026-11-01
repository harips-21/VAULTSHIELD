import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CollaborationError, CollaborationService } from '../services/collaboration.service';

const documentParams = z.object({ documentId: z.string().min(1) });
const folderParams = z.object({ folderId: z.string().min(1) });
const invitationParams = z.object({ invitationId: z.string().min(1) });
const inviteBody = z.object({
  email: z.string().trim().email(),
  permission: z.enum(['EDITOR', 'VIEWER']),
});
const permissionBody = z.object({ permission: z.enum(['EDITOR', 'VIEWER']) });
const responseBody = z.object({ decision: z.enum(['accept', 'reject']) });
const idParams = z.object({ notificationId: z.string().min(1) });

function parseOrRespond<T>(schema: z.ZodType<T>, input: unknown, res: Response): T | null {
  const result = schema.safeParse(input);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation Error',
      details: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
    return null;
  }
  return result.data;
}

function sendError(error: unknown, res: Response) {
  if (error instanceof CollaborationError) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return res.status(500).json({ error: 'Collaboration request failed' });
}

export class CollaborationController {
  static async inviteDocument(req: AuthenticatedRequest, res: Response) {
    const params = parseOrRespond(documentParams, req.params, res);
    const body = parseOrRespond(inviteBody, req.body, res);
    if (!params || !body) return;
    try {
      return res.status(201).json(await CollaborationService.invite({
        type: 'document',
        resourceId: params.documentId,
        invitedByUserId: req.user!.userId,
        ...body,
      }));
    } catch (error) {
      return sendError(error, res);
    }
  }

  static async inviteFolder(req: AuthenticatedRequest, res: Response) {
    const params = parseOrRespond(folderParams, req.params, res);
    const body = parseOrRespond(inviteBody, req.body, res);
    if (!params || !body) return;
    try {
      return res.status(201).json(await CollaborationService.invite({
        type: 'folder',
        resourceId: params.folderId,
        invitedByUserId: req.user!.userId,
        ...body,
      }));
    } catch (error) {
      return sendError(error, res);
    }
  }

  static async getDocumentCollaborators(req: AuthenticatedRequest, res: Response) {
    const params = parseOrRespond(documentParams, req.params, res);
    if (!params) return;
    try {
      return res.json(await CollaborationService.getCollaborators('document', params.documentId, req.user!.userId));
    } catch (error) {
      return sendError(error, res);
    }
  }

  static async getFolderCollaborators(req: AuthenticatedRequest, res: Response) {
    const params = parseOrRespond(folderParams, req.params, res);
    if (!params) return;
    try {
      return res.json(await CollaborationService.getCollaborators('folder', params.folderId, req.user!.userId));
    } catch (error) {
      return sendError(error, res);
    }
  }

  static async changeDocumentPermission(req: AuthenticatedRequest, res: Response) {
    const params = parseOrRespond(documentParams.extend({ shareId: z.string().min(1) }), req.params, res);
    const body = parseOrRespond(permissionBody, req.body, res);
    if (!params || !body) return;
    try {
      return res.json(await CollaborationService.changePermission({
        type: 'document',
        resourceId: params.documentId,
        shareId: params.shareId,
        actorId: req.user!.userId,
        permission: body.permission,
      }));
    } catch (error) {
      return sendError(error, res);
    }
  }

  static async changeFolderPermission(req: AuthenticatedRequest, res: Response) {
    const params = parseOrRespond(folderParams.extend({ shareId: z.string().min(1) }), req.params, res);
    const body = parseOrRespond(permissionBody, req.body, res);
    if (!params || !body) return;
    try {
      return res.json(await CollaborationService.changePermission({
        type: 'folder',
        resourceId: params.folderId,
        shareId: params.shareId,
        actorId: req.user!.userId,
        permission: body.permission,
      }));
    } catch (error) {
      return sendError(error, res);
    }
  }

  static async revokeDocument(req: AuthenticatedRequest, res: Response) {
    const params = parseOrRespond(documentParams.extend({ shareId: z.string().min(1) }), req.params, res);
    if (!params) return;
    try {
      return res.json(await CollaborationService.revoke({
        type: 'document',
        resourceId: params.documentId,
        shareId: params.shareId,
        actorId: req.user!.userId,
      }));
    } catch (error) {
      return sendError(error, res);
    }
  }

  static async revokeFolder(req: AuthenticatedRequest, res: Response) {
    const params = parseOrRespond(folderParams.extend({ shareId: z.string().min(1) }), req.params, res);
    if (!params) return;
    try {
      return res.json(await CollaborationService.revoke({
        type: 'folder',
        resourceId: params.folderId,
        shareId: params.shareId,
        actorId: req.user!.userId,
      }));
    } catch (error) {
      return sendError(error, res);
    }
  }

  static async getInvitations(req: AuthenticatedRequest, res: Response) {
    try {
      return res.json(await CollaborationService.getInvitations(req.user!.userId));
    } catch (error) {
      return sendError(error, res);
    }
  }

  static async respondToInvitation(req: AuthenticatedRequest, res: Response) {
    const params = parseOrRespond(invitationParams, req.params, res);
    const body = parseOrRespond(responseBody, req.body, res);
    if (!params || !body) return;
    try {
      return res.json(await CollaborationService.respondToInvitation({
        invitationId: params.invitationId,
        userId: req.user!.userId,
        decision: body.decision,
      }));
    } catch (error) {
      return sendError(error, res);
    }
  }

  static async revokeInvitation(req: AuthenticatedRequest, res: Response) {
    const params = parseOrRespond(invitationParams, req.params, res);
    if (!params) return;
    try {
      return res.json(await CollaborationService.revokeInvitation(params.invitationId, req.user!.userId));
    } catch (error) {
      return sendError(error, res);
    }
  }

  static async getSharedWithMe(req: AuthenticatedRequest, res: Response) {
    try {
      return res.json(await CollaborationService.getSharedWithMe(req.user!.userId));
    } catch (error) {
      return sendError(error, res);
    }
  }

  static async getSharedByMe(req: AuthenticatedRequest, res: Response) {
    try {
      return res.json(await CollaborationService.getSharedByMe(req.user!.userId));
    } catch (error) {
      return sendError(error, res);
    }
  }

  static async getNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      return res.json(await CollaborationService.getNotifications(req.user!.userId));
    } catch (error) {
      return sendError(error, res);
    }
  }

  static async markNotificationRead(req: AuthenticatedRequest, res: Response) {
    const params = parseOrRespond(idParams, req.params, res);
    if (!params) return;
    try {
      return res.json(await CollaborationService.markNotificationRead(params.notificationId, req.user!.userId));
    } catch (error) {
      return sendError(error, res);
    }
  }
}

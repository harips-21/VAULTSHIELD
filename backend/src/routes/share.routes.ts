import { Router } from 'express';
import { CollaborationController } from '../controllers/collaboration.controller';
import { ShareController } from '../controllers/share.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireOrganizationMembership } from '../middleware/organization.middleware';
import { requireDocumentPermission } from '../middleware/rbac.middleware';

const router = Router();

// Public share link access route
router.post('/access/:shareToken', ShareController.accessShareLink);

// Authenticated share routes
router.use(authenticateJWT);

router.get('/documents/shared-with-me', CollaborationController.getSharedWithMe);
router.get('/documents/shared-by-me', CollaborationController.getSharedByMe);
router.get('/invitations', CollaborationController.getInvitations);
router.post('/invitations/:invitationId/respond', CollaborationController.respondToInvitation);
router.delete('/invitations/:invitationId', CollaborationController.revokeInvitation);
router.get('/notifications', CollaborationController.getNotifications);
router.patch('/notifications/:notificationId/read', CollaborationController.markNotificationRead);

router.get(
  '/document/:documentId/collaborators',
  requireDocumentPermission('OWNER'),
  CollaborationController.getDocumentCollaborators
);
router.post(
  '/document/:documentId/collaborators',
  requireDocumentPermission('OWNER'),
  CollaborationController.inviteDocument
);
router.patch(
  '/document/:documentId/collaborators/:shareId',
  requireDocumentPermission('OWNER'),
  CollaborationController.changeDocumentPermission
);
router.delete(
  '/document/:documentId/collaborators/:shareId',
  requireDocumentPermission('OWNER'),
  CollaborationController.revokeDocument
);

router.get(
  '/folder/:folderId/collaborators',
  requireOrganizationMembership('folder'),
  CollaborationController.getFolderCollaborators
);
router.post(
  '/folder/:folderId/collaborators',
  requireOrganizationMembership('folder'),
  CollaborationController.inviteFolder
);
router.patch(
  '/folder/:folderId/collaborators/:shareId',
  requireOrganizationMembership('folder'),
  CollaborationController.changeFolderPermission
);
router.delete(
  '/folder/:folderId/collaborators/:shareId',
  requireOrganizationMembership('folder'),
  CollaborationController.revokeFolder
);

router.post('/document', requireDocumentPermission('OWNER'), ShareController.shareDocument);
router.post('/folder', requireOrganizationMembership('folder'), ShareController.shareFolder);

export default router;

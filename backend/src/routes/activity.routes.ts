import { Router } from 'express';
import { ActivityController } from '../controllers/activity.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireDocumentPermission } from '../middleware/rbac.middleware';
import { requireOrganizationMembership } from '../middleware/organization.middleware';

const router = Router();

router.use(authenticateJWT);

router.get('/workspace', requireOrganizationMembership(), ActivityController.getWorkspaceActivity);
router.get('/document/:documentId', requireDocumentPermission('VIEWER'), ActivityController.getDocumentActivity);

export default router;

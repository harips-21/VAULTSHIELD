import { Router } from 'express';
import { ActivityController } from '../controllers/activity.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.get('/workspace', ActivityController.getWorkspaceActivity);
router.get('/document/:documentId', ActivityController.getDocumentActivity);

export default router;

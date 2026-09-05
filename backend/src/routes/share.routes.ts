import { Router } from 'express';
import { ShareController } from '../controllers/share.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// Public share link access route
router.post('/access/:shareToken', ShareController.accessShareLink);

// Authenticated share routes
router.post('/document', authenticateJWT, ShareController.shareDocument);
router.post('/folder', authenticateJWT, ShareController.shareFolder);

export default router;

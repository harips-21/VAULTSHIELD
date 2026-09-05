import { Router } from 'express';
import multer from 'multer';
import { VersionController } from '../controllers/version.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireDocumentPermission } from '../middleware/rbac.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateJWT);

router.get('/:documentId/versions', requireDocumentPermission('VIEWER'), VersionController.getVersionHistory);
router.post(
  '/:documentId/versions',
  requireDocumentPermission('EDITOR'),
  upload.single('file'),
  VersionController.uploadNewVersion
);
router.post(
  '/:documentId/versions/:versionId/restore',
  requireDocumentPermission('OWNER'),
  VersionController.restoreVersion
);

export default router;

import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from '../controllers/document.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { createRateLimiter } from '../middleware/rateLimiter.middleware';
import { requireDocumentPermission } from '../middleware/rbac.middleware';
import { requireOrganizationMembership } from '../middleware/organization.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const uploadRateLimiter = createRateLimiter(30, 60);

router.use(authenticateJWT);

router.get('/', requireOrganizationMembership(), DocumentController.listDocuments);
router.post(
  '/upload',
  uploadRateLimiter,
  upload.single('file'),
  requireOrganizationMembership(),
  DocumentController.uploadDocument
);
router.get('/:documentId/download', requireDocumentPermission('VIEWER'), DocumentController.downloadDocument);
router.patch('/:documentId', requireDocumentPermission('EDITOR'), DocumentController.renameDocument);
router.patch('/:documentId/move', requireDocumentPermission('EDITOR'), DocumentController.moveDocument);
router.delete('/:documentId', requireDocumentPermission('OWNER'), DocumentController.softDeleteDocument);
router.post('/:documentId/restore', requireDocumentPermission('OWNER'), DocumentController.restoreDocument);

export default router;

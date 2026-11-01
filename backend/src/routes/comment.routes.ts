import { Router } from 'express';
import { CommentController } from '../controllers/comment.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireDocumentPermission } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateJWT);

router.post('/', requireDocumentPermission('EDITOR'), CommentController.addComment);
router.get('/document/:documentId', requireDocumentPermission('VIEWER'), CommentController.getDocumentComments);
router.delete('/:commentId', CommentController.deleteComment);

export default router;

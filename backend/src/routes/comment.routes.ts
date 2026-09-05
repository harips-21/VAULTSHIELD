import { Router } from 'express';
import { CommentController } from '../controllers/comment.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.post('/', CommentController.addComment);
router.get('/document/:documentId', CommentController.getDocumentComments);
router.delete('/:commentId', CommentController.deleteComment);

export default router;

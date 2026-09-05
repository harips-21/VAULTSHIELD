import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CommentService } from '../services/comment.service';

export class CommentController {
  static async addComment(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId, content, parentCommentId } = req.body;
      const comment = await CommentService.addComment({
        documentId,
        userId: req.user!.userId,
        content,
        parentCommentId,
      });

      return res.status(201).json(comment);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }

  static async getDocumentComments(req: AuthenticatedRequest, res: Response) {
    try {
      const { documentId } = req.params;
      const comments = await CommentService.getDocumentComments(documentId);
      return res.status(200).json(comments);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async deleteComment(req: AuthenticatedRequest, res: Response) {
    try {
      const { commentId } = req.params;
      await CommentService.deleteComment(commentId, req.user!.userId);
      return res.status(200).json({ message: 'Comment deleted' });
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }
}

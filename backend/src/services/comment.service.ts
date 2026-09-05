import { prisma } from '../utils/prisma';

export class CommentService {
  static async addComment(params: {
    documentId: string;
    userId: string;
    content: string;
    parentCommentId?: string;
  }) {
    return prisma.comment.create({
      data: {
        documentId: params.documentId,
        userId: params.userId,
        content: params.content,
        parentCommentId: params.parentCommentId || null,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      },
    });
  }

  static async getDocumentComments(documentId: string) {
    const comments = await prisma.comment.findMany({
      where: { documentId, parentCommentId: null },
      include: {
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        replies: {
          include: {
            user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return comments;
  }

  static async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.userId !== userId) {
      throw new Error('Comment not found or unauthorized');
    }

    return prisma.comment.delete({ where: { id: commentId } });
  }
}

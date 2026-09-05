import { ActivityAction } from '@prisma/client';
import { prisma } from '../utils/prisma';

export class ActivityService {
  static async log(data: {
    organizationId: string;
    userId: string;
    action: ActivityAction;
    documentId?: string;
    folderId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }) {
    return prisma.activityLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        documentId: data.documentId || null,
        folderId: data.folderId || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        metadata: data.metadata ? (data.metadata as any) : undefined,
      },
    });
  }

  static async getDocumentActivity(documentId: string, limit: number = 50) {
    return prisma.activityLog.findMany({
      where: { documentId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async getWorkspaceActivity(organizationId: string, limit: number = 50) {
    return prisma.activityLog.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        document: { select: { id: true, name: true } },
        folder: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

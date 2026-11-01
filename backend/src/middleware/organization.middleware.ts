import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { prisma } from '../utils/prisma';

export function requireOrganizationMembership(resource?: 'folder') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authenticatedUser = req.user;
    if (!authenticatedUser?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = authenticatedUser.userId;

    try {
      let organizationId =
        (req.body.organizationId as string | undefined) ||
        (req.query.organizationId as string | undefined) ||
        authenticatedUser.orgId;

      if (resource === 'folder') {
        const folderId = req.params.folderId || (req.body.folderId as string | undefined);
        if (folderId) {
          const folder = await prisma.folder.findUnique({
            where: { id: folderId },
            select: { organizationId: true },
          });

          if (!folder) {
            return res.status(404).json({ error: 'Folder not found' });
          }
          organizationId = folder.organizationId;
        }
      }

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const membership = await prisma.organizationMembership.findUnique({
        where: { userId_organizationId: { userId, organizationId } },
        select: { id: true },
      });

      if (!membership) {
        return res.status(403).json({ error: 'Forbidden: Organization membership required' });
      }

      authenticatedUser.orgId = organizationId;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

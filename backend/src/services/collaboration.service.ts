import { PermissionLevel } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';
import { ShareService } from './share.service';

type ResourceType = 'document' | 'folder';
type CollaboratorRole = 'EDITOR' | 'VIEWER';

export class CollaborationError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'CollaborationError';
  }
}

const userSelect = { id: true, fullName: true, email: true, avatarUrl: true } as const;

async function getResource(type: ResourceType, id: string) {
  if (type === 'document') {
    const document = await prisma.document.findUnique({
      where: { id },
      include: { owner: { select: userSelect } },
    });
    if (!document) throw new CollaborationError('Document not found', 404);
    return {
      id: document.id,
      name: document.name,
      organizationId: document.organizationId,
      ownerId: document.ownerId,
      owner: document.owner,
    };
  }

  const folder = await prisma.folder.findUnique({
    where: { id },
    include: { createdBy: { select: userSelect } },
  });
  if (!folder) throw new CollaborationError('Folder not found', 404);
  return {
    id: folder.id,
    name: folder.name,
    organizationId: folder.organizationId,
    ownerId: folder.createdByUserId,
    owner: folder.createdBy,
  };
}

async function assertCanManage(type: ResourceType, id: string, userId: string) {
  const resource = await getResource(type, id);
  if (resource.ownerId !== userId) {
    const membership = await prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId: resource.organizationId } },
      select: { role: true },
    });
    if (membership?.role !== 'OWNER' && membership?.role !== 'ADMIN') {
      throw new CollaborationError(`Only ${type} owners can manage collaborators`, 403);
    }
  }
  return resource;
}

function resourceWhere(type: ResourceType, id: string) {
  return type === 'document' ? { documentId: id } : { folderId: id };
}

export class CollaborationService {
  static async invite(params: {
    type: ResourceType;
    resourceId: string;
    invitedByUserId: string;
    email: string;
    permission: CollaboratorRole;
  }) {
    const resource = await assertCanManage(params.type, params.resourceId, params.invitedByUserId);
    const email = params.email.trim().toLowerCase();
    const invitee = await prisma.user.findUnique({ where: { email }, select: { ...userSelect, isActive: true } });
    if (!invitee || !invitee.isActive) {
      throw new CollaborationError('No active account is registered with that email address', 404);
    }
    if (invitee.id === params.invitedByUserId) {
      throw new CollaborationError('You cannot invite yourself', 400);
    }

    const inviterMembership = await prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: params.invitedByUserId, organizationId: resource.organizationId } },
      select: { id: true },
    });
    if (!inviterMembership) {
      throw new CollaborationError('Inviter is not a member of the resource organization', 403);
    }

    const where = resourceWhere(params.type, params.resourceId);
    const now = new Date();
    const activeGrant = params.type === 'document'
      ? await prisma.documentShare.findFirst({
          where: { ...where, sharedWithUserId: invitee.id, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        })
      : await prisma.folderShare.findFirst({
          where: { ...where, sharedWithUserId: invitee.id, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        });
    if (activeGrant) {
      throw new CollaborationError('This user already has access', 409);
    }

    await prisma.collaborationInvitation.updateMany({
      where: { ...where, invitedUserId: invitee.id, status: 'PENDING', expiresAt: { lte: now } },
      data: { status: 'EXPIRED', updatedAt: now },
    });
    const pending = await prisma.collaborationInvitation.findFirst({
      where: { ...where, invitedUserId: invitee.id, status: 'PENDING', expiresAt: { gt: now } },
    });
    if (pending) throw new CollaborationError('An invitation is already pending for this user', 409);

    const invitation = await prisma.$transaction(async (tx) => {
      const created = await tx.collaborationInvitation.create({
        data: {
          id: uuidv4(),
          ...where,
          invitedByUserId: params.invitedByUserId,
          invitedUserId: invitee.id,
          permission: params.permission,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        include: {
          invitedBy: { select: userSelect },
          invitedUser: { select: userSelect },
        },
      });
      await tx.notification.create({
        data: {
          userId: invitee.id,
          actorId: params.invitedByUserId,
          type: 'COLLABORATION_INVITATION',
          message: `You were invited to collaborate on "${resource.name}" as ${params.permission.toLowerCase()}.`,
          ...(params.type === 'document' ? { documentId: resource.id } : { folderId: resource.id }),
        },
      });
      await tx.activityLog.create({
        data: {
          organizationId: resource.organizationId,
          userId: params.invitedByUserId,
          action: 'COLLABORATOR_INVITED',
          ...(params.type === 'document' ? { documentId: resource.id } : { folderId: resource.id }),
          metadata: { invitedUserId: invitee.id, email, permission: params.permission },
        },
      });
      return created;
    });
    return invitation;
  }

  static async getCollaborators(type: ResourceType, resourceId: string, userId: string) {
    const resource = await assertCanManage(type, resourceId, userId);
    const where = resourceWhere(type, resourceId);
    const now = new Date();
    const [shares, invitations] = type === 'document'
      ? await Promise.all([
          prisma.documentShare.findMany({
            where: { ...where, sharedWithUserId: { not: null }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            include: { sharedWith: { select: userSelect } },
            orderBy: { createdAt: 'asc' },
          }),
          prisma.collaborationInvitation.findMany({
            where: { ...where, status: 'PENDING', expiresAt: { gt: now } },
            include: { invitedUser: { select: userSelect }, invitedBy: { select: userSelect } },
            orderBy: { createdAt: 'desc' },
          }),
        ])
      : await Promise.all([
          prisma.folderShare.findMany({
            where: { ...where, sharedWithUserId: { not: null }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            include: { sharedWith: { select: userSelect } },
            orderBy: { createdAt: 'asc' },
          }),
          prisma.collaborationInvitation.findMany({
            where: { ...where, status: 'PENDING', expiresAt: { gt: now } },
            include: { invitedUser: { select: userSelect }, invitedBy: { select: userSelect } },
            orderBy: { createdAt: 'desc' },
          }),
        ]);

    return {
      owner: { ...resource.owner, permission: 'OWNER' as const, status: 'ACCEPTED' as const },
      collaborators: shares.map((share) => ({
        id: share.id,
        user: share.sharedWith,
        permission: share.permission,
        status: 'ACCEPTED' as const,
        createdAt: share.createdAt,
      })),
      invitations: invitations.map((invitation) => ({
        id: invitation.id,
        user: invitation.invitedUser,
        invitedBy: invitation.invitedBy,
        permission: invitation.permission,
        status: invitation.status,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
      })),
    };
  }

  static async changePermission(params: {
    type: ResourceType;
    resourceId: string;
    shareId: string;
    actorId: string;
    permission: CollaboratorRole;
  }) {
    const resource = await assertCanManage(params.type, params.resourceId, params.actorId);
    const share = params.type === 'document'
      ? await prisma.documentShare.findFirst({
          where: { id: params.shareId, documentId: params.resourceId, sharedWithUserId: { not: null } },
        })
      : await prisma.folderShare.findFirst({
          where: { id: params.shareId, folderId: params.resourceId, sharedWithUserId: { not: null } },
        });
    if (!share || !share.sharedWithUserId) throw new CollaborationError('Collaborator not found', 404);
    const sharedWithUserId = share.sharedWithUserId;

    return prisma.$transaction(async (tx) => {
      const grantsWhere = {
        ...resourceWhere(params.type, params.resourceId),
        sharedWithUserId,
      };
      if (params.type === 'document') {
        await tx.documentShare.updateMany({ where: grantsWhere, data: { permission: params.permission } });
      } else {
        await tx.folderShare.updateMany({ where: grantsWhere, data: { permission: params.permission } });
      }
      await tx.collaboratorRevocation.deleteMany({
        where: { ...resourceWhere(params.type, params.resourceId), userId: sharedWithUserId },
      });
      await tx.notification.create({
        data: {
          userId: sharedWithUserId,
          actorId: params.actorId,
          type: 'PERMISSION_CHANGED',
          message: `Your access to "${resource.name}" was changed to ${params.permission.toLowerCase()}.`,
          ...(params.type === 'document' ? { documentId: resource.id } : { folderId: resource.id }),
        },
      });
      await tx.activityLog.create({
        data: {
          organizationId: resource.organizationId,
          userId: params.actorId,
          action: 'PERMISSION_CHANGED',
          ...(params.type === 'document' ? { documentId: resource.id } : { folderId: resource.id }),
          metadata: { permission: params.permission },
        },
      });
      return { updated: true };
    });
  }

  static async revoke(params: {
    type: ResourceType;
    resourceId: string;
    shareId: string;
    actorId: string;
  }) {
    const resource = await assertCanManage(params.type, params.resourceId, params.actorId);
    const share = params.type === 'document'
      ? await prisma.documentShare.findFirst({
          where: { id: params.shareId, documentId: params.resourceId, sharedWithUserId: { not: null } },
        })
      : await prisma.folderShare.findFirst({
          where: { id: params.shareId, folderId: params.resourceId, sharedWithUserId: { not: null } },
        });
    if (!share || !share.sharedWithUserId) throw new CollaborationError('Collaborator not found', 404);

    await prisma.$transaction(async (tx) => {
      const grantsWhere = {
        ...resourceWhere(params.type, params.resourceId),
        sharedWithUserId: share.sharedWithUserId,
      };
      if (params.type === 'document') await tx.documentShare.deleteMany({ where: grantsWhere });
      else await tx.folderShare.deleteMany({ where: grantsWhere });
      await tx.collaboratorRevocation.deleteMany({
        where: { ...resourceWhere(params.type, params.resourceId), userId: share.sharedWithUserId! },
      });
      await tx.collaboratorRevocation.create({
        data: { id: uuidv4(), ...resourceWhere(params.type, params.resourceId), userId: share.sharedWithUserId!, revokedByUserId: params.actorId },
      });
      await tx.notification.create({
        data: {
          userId: share.sharedWithUserId!,
          actorId: params.actorId,
          type: 'ACCESS_REVOKED',
          message: `Your access to "${resource.name}" was revoked.`,
          ...(params.type === 'document' ? { documentId: resource.id } : { folderId: resource.id }),
        },
      });
      await tx.activityLog.create({
        data: {
          organizationId: resource.organizationId,
          userId: params.actorId,
          action: 'ACCESS_REVOKED',
          ...(params.type === 'document' ? { documentId: resource.id } : { folderId: resource.id }),
          metadata: { revokedUserId: share.sharedWithUserId },
        },
      });
    });
    return { revoked: true };
  }

  static async respondToInvitation(params: {
    invitationId: string;
    userId: string;
    decision: 'accept' | 'reject';
  }) {
    const invitation = await prisma.collaborationInvitation.findUnique({
      where: { id: params.invitationId },
      include: { document: true, folder: true, invitedBy: { select: userSelect } },
    });
    if (!invitation || invitation.invitedUserId !== params.userId) {
      throw new CollaborationError('Invitation not found', 404);
    }
    if (invitation.status !== 'PENDING') {
      throw new CollaborationError(`Invitation is already ${invitation.status.toLowerCase()}`, 409);
    }
    if (invitation.expiresAt <= new Date()) {
      await prisma.collaborationInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new CollaborationError('This invitation has expired', 410);
    }

    const resourceType: ResourceType = invitation.documentId ? 'document' : 'folder';
    const resource = invitation.document || invitation.folder;
    if (!resource || resource.isTrashed) {
      throw new CollaborationError('The shared item is no longer available', 410);
    }
    const resourceName = resource.name;
    const resourceId = resource.id;
    const organizationId = resource.organizationId;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.collaborationInvitation.updateMany({
        where: { id: invitation.id, invitedUserId: params.userId, status: 'PENDING', expiresAt: { gt: new Date() } },
        data: { status: params.decision === 'accept' ? 'ACCEPTED' : 'REJECTED', respondedAt: new Date() },
      });
      if (updated.count !== 1) throw new CollaborationError('Invitation is no longer pending', 409);

      if (params.decision === 'accept') {
        if (resourceType === 'document') {
          const existing = await tx.documentShare.findFirst({
            where: { documentId: resourceId, sharedWithUserId: params.userId },
          });
          if (existing) {
            await tx.documentShare.updateMany({
              where: { documentId: resourceId, sharedWithUserId: params.userId },
              data: { permission: invitation.permission, createdByUserId: invitation.invitedByUserId },
            });
          } else {
            await tx.documentShare.create({
              data: {
                documentId: resourceId,
                sharedWithUserId: params.userId,
                permission: invitation.permission,
                createdByUserId: invitation.invitedByUserId,
              },
            });
          }
        } else {
          const existing = await tx.folderShare.findFirst({
            where: { folderId: resourceId, sharedWithUserId: params.userId },
          });
          if (existing) {
            await tx.folderShare.updateMany({
              where: { folderId: resourceId, sharedWithUserId: params.userId },
              data: { permission: invitation.permission, createdByUserId: invitation.invitedByUserId },
            });
          } else {
            await tx.folderShare.create({
              data: {
                folderId: resourceId,
                sharedWithUserId: params.userId,
                permission: invitation.permission,
                createdByUserId: invitation.invitedByUserId,
              },
            });
          }
        }
        await tx.collaboratorRevocation.deleteMany({
          where: { ...resourceWhere(resourceType, resourceId), userId: params.userId },
        });
      }

      await tx.notification.create({
        data: {
          userId: invitation.invitedByUserId,
          actorId: params.userId,
          type: 'INVITATION_RESPONSE',
          message: `A collaborator ${params.decision}ed the invitation to "${resourceName}".`,
          ...(resourceType === 'document' ? { documentId: resourceId } : { folderId: resourceId }),
        },
      });
      await tx.activityLog.create({
        data: {
          organizationId,
          userId: params.userId,
          action: params.decision === 'accept' ? 'INVITATION_ACCEPTED' : 'INVITATION_REJECTED',
          ...(resourceType === 'document' ? { documentId: resourceId } : { folderId: resourceId }),
          metadata: { invitationId: invitation.id, permission: invitation.permission },
        },
      });
      return { invitationId: invitation.id, status: params.decision === 'accept' ? 'ACCEPTED' : 'REJECTED' };
    });
  }

  static async revokeInvitation(invitationId: string, actorId: string) {
    const invitation = await prisma.collaborationInvitation.findUnique({
      where: { id: invitationId },
      include: { document: true, folder: true },
    });
    if (!invitation) throw new CollaborationError('Invitation not found', 404);
    if (invitation.status !== 'PENDING') {
      throw new CollaborationError('Invitation is no longer pending', 409);
    }
    const type: ResourceType = invitation.documentId ? 'document' : 'folder';
    const resourceId = invitation.documentId || invitation.folderId;
    if (!resourceId) throw new CollaborationError('Invitation resource not found', 404);
    const resource = await assertCanManage(type, resourceId, actorId);

    await prisma.$transaction(async (tx) => {
      const updated = await tx.collaborationInvitation.updateMany({
        where: { id: invitation.id, status: 'PENDING' },
        data: { status: 'REVOKED', respondedAt: new Date() },
      });
      if (updated.count !== 1) throw new CollaborationError('Invitation is no longer pending', 409);
      await tx.notification.create({
        data: {
          userId: invitation.invitedUserId,
          actorId,
          type: 'ACCESS_REVOKED',
          message: `Your invitation to "${resource.name}" was cancelled.`,
          ...(type === 'document' ? { documentId: resource.id } : { folderId: resource.id }),
        },
      });
      await tx.activityLog.create({
        data: {
          organizationId: resource.organizationId,
          userId: actorId,
          action: 'ACCESS_REVOKED',
          ...(type === 'document' ? { documentId: resource.id } : { folderId: resource.id }),
          metadata: { invitationId: invitation.id, revokedUserId: invitation.invitedUserId },
        },
      });
    });
    return { revoked: true };
  }

  static async getInvitations(userId: string) {
    const now = new Date();
    await prisma.collaborationInvitation.updateMany({
      where: { invitedUserId: userId, status: 'PENDING', expiresAt: { lte: now } },
      data: { status: 'EXPIRED', updatedAt: now },
    });
    return prisma.collaborationInvitation.findMany({
      where: { invitedUserId: userId, status: 'PENDING', expiresAt: { gt: now } },
      include: {
        invitedBy: { select: userSelect },
        document: { select: { id: true, name: true } },
        folder: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getSharedWithMe(userId: string) {
    const now = new Date();
    const directShares = await prisma.documentShare.findMany({
      where: {
        sharedWithUserId: userId,
        document: { isTrashed: false },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        document: { include: { owner: { select: userSelect }, folder: { select: { id: true, name: true } } } },
        createdBy: { select: userSelect },
      },
      orderBy: { createdAt: 'desc' },
    });

    const folderShares = await prisma.folderShare.findMany({
      where: {
        sharedWithUserId: userId,
        folder: { isTrashed: false },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: { folder: true, createdBy: { select: userSelect } },
    });
    const folderIds = new Set<string>();
    const permissions = new Map<string, PermissionLevel>();
    const sharedByFolder = new Map<string, (typeof folderShares)[number]['createdBy']>();
    if (folderShares.length) {
      const folders = await prisma.folder.findMany({
        where: { organizationId: { in: [...new Set(folderShares.map((share) => share.folder.organizationId))] }, isTrashed: false },
        select: { id: true, parentFolderId: true },
      });
      const children = new Map<string, string[]>();
      const parentByFolderId = new Map<string, string | null>();
      for (const folder of folders) {
        parentByFolderId.set(folder.id, folder.parentFolderId);
        if (folder.parentFolderId) {
          const list = children.get(folder.parentFolderId) || [];
          list.push(folder.id);
          children.set(folder.parentFolderId, list);
        }
      }
      const addDescendants = (id: string) => {
        if (folderIds.has(id)) return;
        folderIds.add(id);
        for (const child of children.get(id) || []) addDescendants(child);
      };
      for (const share of folderShares) addDescendants(share.folderId);
      const sharePermissions = new Map(folderShares.map((share) => [share.folderId, share.permission]));
      const shareOwners = new Map(folderShares.map((share) => [share.folderId, share.createdBy]));
      const permissionForFolder = (folderId: string | null) => {
        let currentFolderId = folderId;
        while (currentFolderId) {
          const permission = sharePermissions.get(currentFolderId);
          if (permission) return permission;
          currentFolderId = parentByFolderId.get(currentFolderId) || null;
        }
        return 'VIEWER' as const;
      };
      const folderPermissionMap = new Map([...folderIds].map((id) => [id, permissionForFolder(id)]));
      const ownerForFolder = (folderId: string | null) => {
        let currentFolderId = folderId;
        while (currentFolderId) {
          const owner = shareOwners.get(currentFolderId);
          if (owner) return owner;
          currentFolderId = parentByFolderId.get(currentFolderId) || null;
        }
        return null;
      };
      for (const id of folderIds) {
        permissions.set(id, folderPermissionMap.get(id) || 'VIEWER');
        sharedByFolder.set(id, ownerForFolder(id));
      }
    }
    const inheritedDocuments = folderIds.size
      ? await prisma.document.findMany({
          where: { folderId: { in: [...folderIds] }, isTrashed: false },
          include: { owner: { select: userSelect }, folder: { select: { id: true, name: true } } },
          orderBy: { updatedAt: 'desc' },
        })
      : [];
    const direct = directShares.map((share) => ({
      ...share.document,
      fileSize: share.document.fileSize.toString(),
      permission: share.permission,
      sharedBy: share.createdBy,
      shareSource: 'document' as const,
    }));
    const inherited = inheritedDocuments.map((document) => ({
      ...document,
      fileSize: document.fileSize.toString(),
      permission: permissions.get(document.folderId || '') || 'VIEWER',
      sharedBy: sharedByFolder.get(document.folderId || '') || null,
      shareSource: 'folder' as const,
    }));
    const merged = new Map<string, (typeof direct)[number] | (typeof inherited)[number]>();
    for (const document of inherited) merged.set(document.id, document);
    for (const document of direct) merged.set(document.id, document);
    const accessible = await Promise.all(
      [...merged.values()].map(async (document) => ({
        document,
        permission: await ShareService.getDocumentPermission(userId, document.id),
      }))
    );
    return accessible
      .filter(({ permission }) => permission !== 'NONE')
      .map(({ document }) => document);
  }

  static async getSharedByMe(userId: string) {
    const now = new Date();
    const [shares, invitations, folderShares] = await Promise.all([
      prisma.documentShare.findMany({
        where: { createdByUserId: userId, sharedWithUserId: { not: null }, document: { isTrashed: false }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        include: {
          document: { include: { owner: { select: userSelect }, folder: { select: { id: true, name: true } } } },
          sharedWith: { select: userSelect },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.collaborationInvitation.findMany({
        where: { invitedByUserId: userId, documentId: { not: null }, status: 'PENDING', expiresAt: { gt: now } },
        include: {
          invitedUser: { select: userSelect },
          document: { include: { owner: { select: userSelect }, folder: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.folderShare.findMany({
        where: {
          createdByUserId: userId,
          sharedWithUserId: { not: null },
          folder: { isTrashed: false },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        include: { folder: true, sharedWith: { select: userSelect } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const folders = folderShares.length
      ? await prisma.folder.findMany({
          where: {
            organizationId: { in: [...new Set(folderShares.map((share) => share.folder.organizationId))] },
            isTrashed: false,
          },
          select: { id: true, parentFolderId: true },
        })
      : [];
    const children = new Map<string, string[]>();
    const parentByFolderId = new Map<string, string | null>();
    for (const folder of folders) {
      parentByFolderId.set(folder.id, folder.parentFolderId);
      if (folder.parentFolderId) {
        const siblings = children.get(folder.parentFolderId) || [];
        siblings.push(folder.id);
        children.set(folder.parentFolderId, siblings);
      }
    }
    const sharedFolderIds = new Set<string>();
    const folderShareById = new Map(folderShares.map((share) => [share.folderId, share]));
    const addFolderTree = (folderId: string) => {
      if (sharedFolderIds.has(folderId)) return;
      sharedFolderIds.add(folderId);
      for (const childId of children.get(folderId) || []) addFolderTree(childId);
    };
    for (const share of folderShares) addFolderTree(share.folderId);
    const getSourceShare = (folderId: string | null) => {
      let currentFolderId = folderId;
      while (currentFolderId) {
        const share = folderShareById.get(currentFolderId);
        if (share) return share;
        currentFolderId = parentByFolderId.get(currentFolderId) || null;
      }
      return null;
    };
    const folderDocuments = sharedFolderIds.size
      ? await prisma.document.findMany({
          where: { folderId: { in: [...sharedFolderIds] }, isTrashed: false },
          include: { owner: { select: userSelect }, folder: { select: { id: true, name: true } } },
          orderBy: { updatedAt: 'desc' },
        })
      : [];
    const result = shares.map((share) => ({
      ...share.document,
      fileSize: share.document.fileSize.toString(),
      permission: share.permission,
      collaborator: share.sharedWith,
      invitationStatus: 'ACCEPTED' as 'ACCEPTED' | 'PENDING',
    }));
    const resultById = new Map(result.map((document) => [document.id, document]));
    for (const document of folderDocuments) {
      if (resultById.has(document.id)) continue;
      const sourceShare = getSourceShare(document.folderId);
      if (!sourceShare?.sharedWith) continue;
      const sharedDocument = {
        ...document,
        fileSize: document.fileSize.toString(),
        permission: sourceShare.permission,
        collaborator: sourceShare.sharedWith,
        invitationStatus: 'ACCEPTED' as const,
        shareSource: 'folder' as const,
      };
      result.push(sharedDocument);
      resultById.set(document.id, sharedDocument);
    }
    for (const invitation of invitations) {
      if (invitation.document && !resultById.has(invitation.document.id)) {
        result.push({
          ...invitation.document,
          fileSize: invitation.document.fileSize.toString(),
          permission: invitation.permission,
          collaborator: invitation.invitedUser,
          invitationStatus: 'PENDING' as const,
        });
      }
    }
    return result;
  }

  static async getNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  static async markNotificationRead(notificationId: string, userId: string) {
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
    if (!result.count) throw new CollaborationError('Notification not found', 404);
    return { read: true };
  }

}

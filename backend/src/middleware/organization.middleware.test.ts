import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { requireOrganizationMembership } from './organization.middleware';
import { prisma } from '../utils/prisma';

jest.mock('../utils/prisma', () => ({
  prisma: {
    folder: { findUnique: jest.fn() },
    organizationMembership: { findUnique: jest.fn() },
  },
}));

describe('requireOrganizationMembership', () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (overrides: Partial<AuthenticatedRequest>) =>
    Object.assign(
      {} as AuthenticatedRequest,
      {
        user: { userId: 'user-1', email: 'user@example.com', orgId: 'org-1' },
        body: {},
        query: {},
        params: {},
      },
      overrides
    );

  test('rejects a user who is not a member of the requested organization', async () => {
    const req = createRequest({ body: { organizationId: 'org-2' } });
    (prisma.organizationMembership.findUnique as jest.Mock).mockResolvedValue(null);

    await requireOrganizationMembership()(req, res, next);

    expect(prisma.organizationMembership.findUnique).toHaveBeenCalledWith({
      where: { userId_organizationId: { userId: 'user-1', organizationId: 'org-2' } },
      select: { id: true },
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('checks the folder workspace rather than a client-supplied organization', async () => {
    const req = createRequest({
      body: { organizationId: 'org-1' },
      params: { folderId: 'folder-2' },
    });
    (prisma.folder.findUnique as jest.Mock).mockResolvedValue({ organizationId: 'org-2' });
    (prisma.organizationMembership.findUnique as jest.Mock).mockResolvedValue(null);

    await requireOrganizationMembership('folder')(req, res, next);

    expect(prisma.organizationMembership.findUnique).toHaveBeenCalledWith({
      where: { userId_organizationId: { userId: 'user-1', organizationId: 'org-2' } },
      select: { id: true },
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('allows members and scopes subsequent handlers to the verified organization', async () => {
    const req = createRequest({ query: { organizationId: 'org-2' } });
    (prisma.organizationMembership.findUnique as jest.Mock).mockResolvedValue({ id: 'membership-1' });

    await requireOrganizationMembership()(req, res, next);

    expect(req.user?.orgId).toBe('org-2');
    expect(next).toHaveBeenCalledTimes(1);
  });
});

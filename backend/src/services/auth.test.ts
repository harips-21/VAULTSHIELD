import { AuthService } from './auth.service';

// Mock prisma and cache
jest.mock('../utils/prisma', () => {
  const users: any[] = [];
  const orgs: any[] = [];
  const memberships: any[] = [];

  return {
    prisma: {
      user: {
        findUnique: jest.fn(async ({ where }) => users.find((u) => u.email === where.email) || null),
        create: jest.fn(async ({ data }) => {
          const user = { id: `user-${users.length + 1}`, ...data, isActive: true, createdAt: new Date() };
          users.push(user);
          return user;
        }),
      },
      organization: {
        create: jest.fn(async ({ data }) => {
          const org = { id: `org-${orgs.length + 1}`, name: data.name, slug: data.slug, createdAt: new Date() };
          orgs.push(org);
          return org;
        }),
      },
    },
  };
});

jest.mock('../utils/redis', () => {
  const store = new Map<string, string>();
  return {
    cache: {
      set: jest.fn(async (key, val) => store.set(key, val)),
      get: jest.fn(async (key) => store.get(key) || null),
      del: jest.fn(async (key) => store.delete(key)),
    },
  };
});

describe('AuthService', () => {
  test('should register a new user and generate JWT tokens', async () => {
    const res = await AuthService.register({
      email: 'test@example.com',
      password: 'SecurePassword123!',
      fullName: 'Test User',
      orgName: 'Acme Corp',
    });

    expect(res.user).toBeDefined();
    expect(res.user.email).toBe('test@example.com');
    expect(res.organization).toBeDefined();
    expect(res.tokens.accessToken).toBeDefined();
    expect(res.tokens.refreshToken).toBeDefined();
  });
});

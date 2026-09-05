import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { prisma } from '../utils/prisma';
import { cache } from '../utils/redis';

export interface TokenPayload {
  userId: string;
  email: string;
  orgId?: string;
}

export class AuthService {
  static async register(data: { email: string; password: string; fullName: string; orgName?: string }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    
    // Create user and default organization workspace
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
      },
    });

    const orgName = data.orgName || `${data.fullName.split(' ')[0]}'s Workspace`;
    const orgSlug = `${orgName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${uuidv4().substring(0, 6)}`;

    const org = await prisma.organization.create({
      data: {
        name: orgName,
        slug: orgSlug,
        memberships: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
    });

    const tokens = await this.generateTokens({ userId: user.id, email: user.email, orgId: org.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      organization: org,
      tokens,
    };
  }

  static async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid email or password');
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const defaultOrg = user.memberships[0]?.organization;
    const tokens = await this.generateTokens({
      userId: user.id,
      email: user.email,
      orgId: defaultOrg?.id,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        memberships: user.memberships.map((m) => ({
          orgId: m.organizationId,
          orgName: m.organization.name,
          role: m.role,
        })),
      },
      tokens,
    };
  }

  static async generateTokens(payload: TokenPayload) {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
    const refreshFamilyId = uuidv4();
    const refreshToken = jwt.sign({ ...payload, familyId: refreshFamilyId }, env.JWT_REFRESH_SECRET, {
      expiresIn: '7d',
    });

    // Store refresh token in Redis with expiry
    await cache.set(`refresh:${payload.userId}:${refreshFamilyId}`, refreshToken, 'EX', 7 * 24 * 60 * 60);

    return { accessToken, refreshToken };
  }

  static async refreshToken(refreshToken: string) {
    try {
      const decoded: any = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
      const storedToken = await cache.get(`refresh:${decoded.userId}:${decoded.familyId}`);

      if (!storedToken || storedToken !== refreshToken) {
        // Potential token reuse / security breach - revoke token family
        if (decoded.familyId) {
          await cache.del(`refresh:${decoded.userId}:${decoded.familyId}`);
        }
        throw new Error('Invalid or revoked refresh token');
      }

      // Rotate token
      await cache.del(`refresh:${decoded.userId}:${decoded.familyId}`);
      return this.generateTokens({ userId: decoded.userId, email: decoded.email, orgId: decoded.orgId });
    } catch (e: any) {
      throw new Error('Expired or invalid refresh token');
    }
  }

  static async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      try {
        const decoded: any = jwt.decode(refreshToken);
        if (decoded && decoded.familyId) {
          await cache.del(`refresh:${userId}:${decoded.familyId}`);
        }
      } catch (e) {
        // Ignore decode error on logout
      }
    }
  }
}

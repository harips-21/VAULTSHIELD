import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthService } from '../services/auth.service';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fullName: z.string().min(2),
    orgName: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const result = await AuthService.register(req.body);
      return res.status(201).json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const result = await AuthService.login(req.body);
      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(401).json({ error: e.message });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }
      const tokens = await AuthService.refreshToken(refreshToken);
      return res.status(200).json(tokens);
    } catch (e: any) {
      return res.status(401).json({ error: e.message });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (req.user) {
        await AuthService.logout(req.user.userId, refreshToken);
      }
      return res.status(200).json({ message: 'Logged out successfully' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
}

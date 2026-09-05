import { Router } from 'express';
import { AuthController, loginSchema, registerSchema } from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { createRateLimiter } from '../middleware/rateLimiter.middleware';
import { validateRequest } from '../middleware/validate.middleware';

const router = Router();

const authRateLimiter = createRateLimiter(10, 60); // 10 requests per minute

router.post('/register', authRateLimiter, validateRequest(registerSchema), AuthController.register);
router.post('/login', authRateLimiter, validateRequest(loginSchema), AuthController.login);
router.post('/refresh', authRateLimiter, AuthController.refresh);
router.post('/logout', authenticateJWT, AuthController.logout);

export default router;

import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from '../controllers/authController';
import { authenticateJWT } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validateMiddleware';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.get('/me', authenticateJWT, getMe);
router.put('/profile', authenticateJWT, validateBody(updateProfileSchema), updateProfile);

export default router;

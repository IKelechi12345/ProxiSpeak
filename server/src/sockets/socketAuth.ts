import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import { logger } from '../utils/logger';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string;
      username: string;
      email: string;
      avatar: string;
    };
    officeId?: string;
    lastPosition?: { x: number; y: number };
    lastMoveTimestamp?: number;
  };
}

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization &&
        socket.handshake.headers.authorization.split(' ')[1]);

    if (!token) {
      logger.warn(`Socket connection rejected: No authentication token provided. Socket ID: ${socket.id}`);
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      username: string;
      email: string;
    };

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      logger.warn(`Socket connection rejected: User ${decoded.id} not found`);
      return next(new Error('User not found'));
    }

    // Attach validated identity to socket session
    socket.data.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    };

    logger.info(`Socket authenticated successfully: User ${user.username} (${user._id})`);
    next();
  } catch (err: any) {
    logger.warn(`Socket authentication error: ${err.message}`);
    next(new Error('Invalid or expired authentication token'));
  }
}

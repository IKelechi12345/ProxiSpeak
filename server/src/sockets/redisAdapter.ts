import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export async function setupRedisAdapter(io: Server): Promise<boolean> {
  if (!env.REDIS_URL) {
    logger.info('Redis URL not configured. Using standard high-performance in-memory Socket.io adapter.');
    return false;
  }

  try {
    logger.info(`Connecting to Redis at ${env.REDIS_URL} for multi-instance horizontal scaling...`);
    const pubClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Redis Pub/Sub adapter initialized successfully for multi-instance scaling.');
    return true;
  } catch (err: any) {
    logger.warn(`Could not connect to Redis (${err.message}). Falling back to in-memory Socket.io adapter.`);
    return false;
  }
}

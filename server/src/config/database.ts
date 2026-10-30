import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

let mongoMemoryServer: any = null;

export async function connectDatabase(): Promise<typeof mongoose> {
  // If explicitly configured with URI
  if (env.MONGODB_URI) {
    try {
      logger.info(`Connecting to configured MongoDB: ${env.MONGODB_URI}`);
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 4000,
      });
      logger.info('Connected to MongoDB successfully');
      return mongoose;
    } catch (err: any) {
      logger.warn(`Failed to connect to configured MongoDB (${err.message}). Falling back to Embedded MongoDB...`);
    }
  }

  // Fallback to MongoMemoryServer for seamless zero-config local development and testing
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    logger.info('Starting embedded MongoDB instance...');
    mongoMemoryServer = await MongoMemoryServer.create();
    const uri = mongoMemoryServer.getUri();
    await mongoose.connect(uri);
    logger.info(`Connected to embedded MongoDB at ${uri}`);
    return mongoose;
  } catch (error: any) {
    logger.error(`Critical: Unable to start MongoDB: ${error.message}`);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
  logger.info('Disconnected from MongoDB');
}

import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { socketAuthMiddleware } from './sockets/socketAuth';
import { setupRedisAdapter } from './sockets/redisAdapter';
import { registerSocketHandlers } from './sockets/socketHandler';
import { Office } from './models/Office';
import { User } from './models/User';
import { createDefaultOfficeLayout } from './services/persistence/officeService';
import { proximityEngine } from './services/proximity/proximityEngine';
import { logger } from './utils/logger';
import bcrypt from 'bcryptjs';

async function bootstrap() {
  try {
    // 1. Initialize MongoDB connection
    await connectDatabase();

    // 2. Ensure initial demo user and default office exist for effortless testing
    await ensureInitialSeedData();

    // 3. Create Express App & HTTP Server
    const app = createApp();
    const server = http.createServer(app);

    // 4. Initialize Socket.io Server
    const io = new Server(server, {
      cors: {
        origin: [
          env.CLIENT_URL,
          'http://localhost:3000',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173',
        ],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 20000,
      pingInterval: 10000,
    });

    // 5. Setup Redis Adapter if available
    await setupRedisAdapter(io);

    // 6. Register Socket Auth & Event Handlers
    io.use(socketAuthMiddleware as any);
    registerSocketHandlers(io);

    // 7. Start Listening
    server.listen(env.PORT, () => {
      logger.info(`🚀 ProxiSpeak Server running on port ${env.PORT} in [${env.NODE_ENV}] mode`);
      logger.info(`📡 Socket.io signaling active at ws://localhost:${env.PORT}`);
      logger.info(`📍 Proximity radius: ${env.PROXIMITY_RADIUS}px | Exit radius: ${env.PROXIMITY_EXIT_RADIUS}px`);
    });

    // Graceful Shutdown
    const handleShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      io.close();
      server.close(async () => {
        await disconnectDatabase();
        logger.info('Server closed. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error: any) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

async function ensureInitialSeedData(): Promise<void> {
  try {
    // Check if demo user exists
    let demoUser = await User.findOne({ email: 'demo@proxispeak.io' });
    if (!demoUser) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('password123', salt);
      demoUser = new User({
        username: 'Alex Rivera',
        email: 'demo@proxispeak.io',
        passwordHash,
        avatar: 'avatar-1',
      });
      await demoUser.save();
      logger.info('Seeded default demo user: demo@proxispeak.io / password123');
    }

    // Check if default office exists
    const officeCount = await Office.countDocuments();
    if (officeCount === 0) {
      const layout = createDefaultOfficeLayout();
      const defaultOffice = new Office({
        name: 'ProxiSpeak Headquarters & Open Campus',
        description: 'Flagship virtual workspace featuring open workstations, executive boardroom, acoustic glass sprint rooms, and coffee breakout lounge.',
        ownerId: demoUser._id,
        maxUsers: 75,
        layout,
      });
      await defaultOffice.save();
      proximityEngine.setOfficeObstacles(defaultOffice._id.toString(), layout.obstacles);
      logger.info(`Seeded default office: "${defaultOffice.name}" (ID: ${defaultOffice._id})`);
    } else {
      // Pre-load obstacles of all existing offices into proximity engine
      const offices = await Office.find();
      for (const off of offices) {
        if (off.layout?.obstacles) {
          proximityEngine.setOfficeObstacles(off._id.toString(), off.layout.obstacles);
        }
      }
    }
  } catch (err: any) {
    logger.warn(`Initial seed note: ${err.message}`);
  }
}

bootstrap();

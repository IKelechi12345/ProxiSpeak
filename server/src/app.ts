import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/authRoutes';
import officeRoutes from './routes/officeRoutes';
import auditRoutes from './routes/auditRoutes';
import { errorHandler } from './middleware/errorMiddleware';
import { env } from './config/env';

export function createApp(): Application {
  const app = express();

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows flexible canvas and media assets in dev
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: [
        env.CLIENT_URL,
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Parse JSON bodies
  app.use(express.json({ limit: '1mb' }));

  // Root healthcheck
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'ProxiSpeak API Server',
      version: '1.0.0',
      status: 'online',
      description: 'Geospatial Proximity Audio Ecosystem Backend',
    });
  });

  // Mount API modules
  app.use('/api/auth', authRoutes);
  app.use('/api/offices', officeRoutes);
  app.use('/api/audit', auditRoutes);

  // 404 fallback
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

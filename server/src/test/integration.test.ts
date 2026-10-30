import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import http from 'http';
import { Server } from 'socket.io';
import { io as ClientSocket } from 'socket.io-client';
import { createApp } from '../app';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { socketAuthMiddleware } from '../sockets/socketAuth';
import { registerSocketHandlers } from '../sockets/socketHandler';
import { User } from '../models/User';
import { Office } from '../models/Office';
import { createDefaultOfficeLayout } from '../services/persistence/officeService';

let server: http.Server;
let io: Server;
let app: any;
let port: number;
let testToken: string;
let testUserId: string;
let testOfficeId: string;

beforeAll(async () => {
  await connectDatabase();
  app = createApp();
  server = http.createServer(app);
  io = new Server(server, { cors: { origin: '*' } });
  io.use(socketAuthMiddleware as any);
  registerSocketHandlers(io);

  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      port = (server.address() as any).port;
      resolve();
    });
  });
});

afterAll(async () => {
  io.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectDatabase();
});

describe('ProxiSpeak REST API Integration Tests', () => {
  const testEmail = `test_${Date.now()}@proxispeak.io`;

  it('registers a new user and receives JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'TestAgent',
        email: testEmail,
        password: 'password123',
        avatar: 'avatar-2',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(testEmail);

    testToken = res.body.data.tokens.accessToken;
    testUserId = res.body.data.user.id;
  });

  it('logs in with registered credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
  });

  it('rejects invalid password on login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'wrong_password',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('fetches authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe('TestAgent');
  });

  it('creates an office with layout, furniture, and obstacles', async () => {
    const res = await request(app)
      .post('/api/offices')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'Engineering Lab',
        description: 'Virtual office for distributed real-time engineering teams',
        maxUsers: 40,
        layout: createDefaultOfficeLayout(),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
    expect(res.body.data.layout.furniture.length).toBeGreaterThan(0);
    expect(res.body.data.layout.obstacles.length).toBeGreaterThan(0);

    testOfficeId = res.body.data._id;
  });

  it('lists offices including active participant counts', async () => {
    const res = await request(app).get('/api/offices');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('runs the spatial performance benchmark and validates <20ms target', async () => {
    const res = await request(app)
      .post('/api/audit/benchmark?users=20&iterations=50');

    expect(res.status).toBe(200);
    expect(res.body.data.meetsTarget).toBe(true);
    expect(res.body.data.avgLatencyMs).toBeLessThan(20);
    expect(res.body.data.p95LatencyMs).toBeLessThan(20);
  });
});

describe('ProxiSpeak Real-Time Socket.io Tests', () => {
  it('connects via authenticated Socket.io and joins office room', async () => {
    const client = ClientSocket(`http://localhost:${port}`, {
      auth: { token: testToken },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => {
        client.emit('office:join', { officeId: testOfficeId }, (res: any) => {
          expect(res.success).toBe(true);
          expect(res.data.office._id).toBe(testOfficeId);
          client.disconnect();
          resolve();
        });
      });
      client.on('connect_error', (err) => reject(err));
    });
  });
});

import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(16).default('super_secret_proxispeak_jwt_token_key_change_in_production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  MONGODB_URI: z.string().optional().default(''),
  REDIS_URL: z.string().optional().default(''),
  PROXIMITY_RADIUS: z.string().default('100').transform((val) => parseFloat(val)),
  PROXIMITY_EXIT_RADIUS: z.string().default('120').transform((val) => parseFloat(val)),
  SPATIAL_GRID_CELL_SIZE: z.string().default('100').transform((val) => parseFloat(val)),
  STUN_SERVER_URL: z.string().default('stun:stun.l.google.com:19302'),
  TURN_SERVER_URL: z.string().optional().default(''),
  TURN_USERNAME: z.string().optional().default(''),
  TURN_CREDENTIAL: z.string().optional().default(''),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;

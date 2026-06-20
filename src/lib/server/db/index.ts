import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

// dynamic/private so DATABASE_URL is read at runtime (Docker env), not baked in.
const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });
export { schema };

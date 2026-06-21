import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from './db';
import { apps } from './db/schema';
import { eq } from 'drizzle-orm';

/**
 * Public REST API auth via per-app keys (table `apps`). Each consumer holds its
 * own key (`pk_…`), stored hashed. The resolved app owns the problems it creates
 * and may only edit/delete its own. Keys are sent as `Authorization: Bearer <key>`
 * or `x-api-key: <key>`.
 */
export function hashKey(k: string): string {
	return createHash('sha256').update(k).digest('hex');
}

export function generateKey(): string {
	return 'pk_' + randomBytes(24).toString('hex');
}

function extractKey(request: Request): string {
	const auth = request.headers.get('authorization') ?? '';
	const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
	return bearer || request.headers.get('x-api-key') || '';
}

export interface ApiApp {
	id: number;
	name: string;
}

/** Resolve the calling app from its key, or null if missing/invalid. */
export async function resolveApp(request: Request): Promise<ApiApp | null> {
	const provided = extractKey(request);
	if (!provided) return null;
	const h = hashKey(provided);
	const rows = await db.select({ id: apps.id, name: apps.name, keyHash: apps.keyHash }).from(apps).where(eq(apps.keyHash, h)).limit(1);
	const app = rows[0];
	// constant-time compare on the hash (lookup already matched, but be safe)
	if (!app || !timingSafeEqual(Buffer.from(app.keyHash), Buffer.from(h))) return null;
	return { id: app.id, name: app.name };
}

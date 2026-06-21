import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

/**
 * Stateless student session: an httpOnly cookie holding the local user id with
 * an HMAC signature (keyed by SESSION_SECRET) so it can't be forged.
 */
export const SESSION_COOKIE = 'probator_session';

function secret(): string {
	// Fall back to ADMIN_PASSWORD so a single-secret deploy still works, but
	// SESSION_SECRET is recommended (see .env.example).
	return env.SESSION_SECRET || env.ADMIN_PASSWORD || '';
}

export function makeSession(userId: number): string {
	const payload = String(userId);
	const sig = createHmac('sha256', secret()).update(payload).digest('hex');
	return `${payload}.${sig}`;
}

export function readSession(cookie: string | undefined): number | null {
	if (!cookie || !secret()) return null;
	const dot = cookie.lastIndexOf('.');
	if (dot < 0) return null;
	const payload = cookie.slice(0, dot);
	const sig = cookie.slice(dot + 1);
	const expected = createHmac('sha256', secret()).update(payload).digest('hex');
	const a = Buffer.from(sig);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
	const id = parseInt(payload, 10);
	return Number.isFinite(id) ? id : null;
}

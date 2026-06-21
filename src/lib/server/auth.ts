import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

/**
 * Minimal admin auth: a single password in ADMIN_PASSWORD. On login we set an
 * httpOnly cookie holding an HMAC token (keyed by the password) so it can't be
 * forged. No DB users — enough to gate the course's problem editor.
 */
export const ADMIN_COOKIE = 'probator_admin';

function secret(): string {
	return env.ADMIN_PASSWORD ?? '';
}

export function adminEnabled(): boolean {
	return secret().length > 0;
}

function safeEqual(a: string, b: string): boolean {
	const ba = Buffer.from(a);
	const bb = Buffer.from(b);
	return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function checkPassword(pw: string): boolean {
	return adminEnabled() && safeEqual(pw, secret());
}

export function sessionToken(): string {
	return createHmac('sha256', secret()).update('probator-admin-v1').digest('hex');
}

export function isValidSession(token: string | undefined): boolean {
	if (!token || !adminEnabled()) return false;
	return safeEqual(token, sessionToken());
}

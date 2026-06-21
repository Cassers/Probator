import { redirect, error, type Handle } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ADMIN_COOKIE, isValidSession } from '$lib/server/auth';
import { SESSION_COOKIE, readSession } from '$lib/server/session';
import { resolveApp } from '$lib/server/api';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

export const handle: Handle = async ({ event, resolve }) => {
	// REST API (/api/v1): authenticate by app key.
	event.locals.app = null;
	if (event.url.pathname.startsWith('/api/v1')) {
		const app = await resolveApp(event.request);
		if (!app) throw error(401, 'API key inválida o ausente (Authorization: Bearer <key>)');
		event.locals.app = app;
	}

	// Resolve the logged-in student (Discord session) into event.locals.user.
	event.locals.user = null;
	const uid = readSession(event.cookies.get(SESSION_COOKIE));
	if (uid != null) {
		const [u] = await db
			.select({
				id: users.id,
				discordId: users.discordId,
				username: users.username,
				displayName: users.displayName,
				avatar: users.avatar,
				role: users.role
			})
			.from(users)
			.where(eq(users.id, uid))
			.limit(1);
		if (u) event.locals.user = u;
	}

	// Gate /admin pages and /api/admin endpoints behind the admin session cookie.
	const path = event.url.pathname;
	const inAdminArea = path.startsWith('/admin') || path.startsWith('/api/admin');
	const isLoginRoute = path === '/admin/login' || path === '/api/admin/login';
	if (inAdminArea && !isLoginRoute && !isValidSession(event.cookies.get(ADMIN_COOKIE))) {
		if (path.startsWith('/api/')) throw error(401, 'No autorizado');
		throw redirect(303, `/admin/login?next=${encodeURIComponent(path)}`);
	}

	return resolve(event);
};

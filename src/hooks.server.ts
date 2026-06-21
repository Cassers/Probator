import { redirect, error, type Handle } from '@sveltejs/kit';
import { ADMIN_COOKIE, isValidSession } from '$lib/server/auth';

/** Gate /admin pages and /api/admin endpoints behind the admin session cookie. */
export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	const inAdminArea = path.startsWith('/admin') || path.startsWith('/api/admin');
	const isLoginRoute = path === '/admin/login' || path === '/api/admin/login';

	if (inAdminArea && !isLoginRoute && !isValidSession(event.cookies.get(ADMIN_COOKIE))) {
		if (path.startsWith('/api/')) throw error(401, 'No autorizado');
		throw redirect(303, `/admin/login?next=${encodeURIComponent(path)}`);
	}
	return resolve(event);
};

import { fail, redirect } from '@sveltejs/kit';
import { adminEnabled, checkPassword, sessionToken, ADMIN_COOKIE } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { configured: adminEnabled() };
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		if (!adminEnabled()) return fail(500, { message: 'ADMIN_PASSWORD no está configurado en el servidor' });
		const data = await request.formData();
		const pw = String(data.get('password') ?? '');
		if (!checkPassword(pw)) return fail(401, { message: 'Contraseña incorrecta' });

		cookies.set(ADMIN_COOKIE, sessionToken(), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: 60 * 60 * 24 * 30
		});
		const next = url.searchParams.get('next') ?? '/admin';
		throw redirect(303, next.startsWith('/admin') ? next : '/admin');
	}
};

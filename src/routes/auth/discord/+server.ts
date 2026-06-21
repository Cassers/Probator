import { error, redirect } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import { discordEnabled, authorizeUrl } from '$lib/server/discord';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url, cookies }) => {
	if (!discordEnabled()) throw error(503, 'Login con Discord no está configurado');
	const state = randomBytes(16).toString('hex');
	cookies.set('probator_oauth_state', state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: 600
	});
	const redirectUri = `${url.origin}/auth/discord/callback`;
	throw redirect(302, authorizeUrl(redirectUri, state));
};

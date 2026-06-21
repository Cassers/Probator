import { json, error } from '@sveltejs/kit';
import { runSubmission } from '$lib/server/judge/run';
import { discordEnabled } from '$lib/server/discord';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	// If auth is configured, require a logged-in student; otherwise allow anonymous.
	if (discordEnabled() && !locals.user) {
		throw error(401, 'Inicia sesión con Discord para enviar soluciones');
	}

	const body = await request.json().catch(() => null);
	if (!body) throw error(400, 'JSON inválido');
	const { slug, language, source } = body as { slug?: string; language?: string; source?: string };
	if (!slug || !language) throw error(400, 'Faltan campos: slug, language, source');

	const { result } = await runSubmission({
		slug,
		languageKey: language,
		source: source ?? '',
		userId: locals.user?.id ?? null
	});
	return json(result);
};

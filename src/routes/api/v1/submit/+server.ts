import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { runSubmission } from '$lib/server/judge/run';
import type { RequestHandler } from './$types';

/**
 * POST /api/v1/submit — run a solution and store the submission.
 * Body: { slug, language, source, discordId?, username? }
 * If discordId is given, the submission is attributed to that user (upserted).
 */
export const POST: RequestHandler = async ({ request }) => {
	const b = (await request.json().catch(() => null)) as {
		slug?: string;
		language?: string;
		source?: string;
		discordId?: string;
		username?: string;
	} | null;
	if (!b) throw error(400, 'JSON inválido');
	if (!b.slug || !b.language) throw error(400, 'Faltan campos: slug, language, source');

	let userId: number | null = null;
	if (b.discordId) {
		const [row] = await db
			.insert(users)
			.values({ discordId: String(b.discordId), username: b.username || String(b.discordId), lastLoginAt: new Date() })
			.onConflictDoUpdate({
				target: users.discordId,
				set: { lastLoginAt: new Date(), ...(b.username ? { username: b.username } : {}) }
			})
			.returning({ id: users.id });
		userId = row.id;
	}

	const { id, result } = await runSubmission({
		slug: b.slug,
		languageKey: b.language,
		source: b.source ?? '',
		userId
	});
	return json({ submissionId: id, ...result });
};

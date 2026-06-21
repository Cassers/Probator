import { json } from '@sveltejs/kit';
import { upsertProblem, type ProblemInput } from '$lib/server/problems';
import type { RequestHandler } from './$types';

/** Web admin: create/update any problem (no ownership enforcement). */
export const POST: RequestHandler = async ({ request }) => {
	const b = (await request.json().catch(() => null)) as ProblemInput | null;
	const { slug } = await upsertProblem(b as ProblemInput);
	return json({ ok: true, slug });
};

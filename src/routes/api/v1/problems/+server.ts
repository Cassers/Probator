import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { problems } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import { upsertProblem, type ProblemInput } from '$lib/server/problems';
import type { RequestHandler } from './$types';

/** GET /api/v1/problems — list all problems (read is public to any valid app). */
export const GET: RequestHandler = async ({ locals }) => {
	const rows = await db
		.select({
			id: problems.id,
			slug: problems.slug,
			title: problems.title,
			difficulty: problems.difficulty,
			mode: problems.mode,
			ownerAppId: problems.ownerAppId,
			createdAt: problems.createdAt
		})
		.from(problems)
		.orderBy(asc(problems.id));
	return json({
		problems: rows.map((p) => ({ ...p, mine: p.ownerAppId === locals.app!.id }))
	});
};

/** POST /api/v1/problems — create/update a problem owned by the calling app. */
export const POST: RequestHandler = async ({ request, locals }) => {
	const b = (await request.json().catch(() => null)) as ProblemInput | null;
	const { slug } = await upsertProblem(b as ProblemInput, {
		ownerAppId: locals.app!.id,
		enforceOwner: true
	});
	return json({ ok: true, slug }, { status: 201 });
};

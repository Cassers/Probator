import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { problems, testCases, languageTemplates, submissions } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { upsertProblem, type ProblemInput } from '$lib/server/problems';
import type { RequestHandler } from './$types';

/** GET /api/v1/problems/:slug — detail (sample cases + supported languages). */
export const GET: RequestHandler = async ({ params, locals }) => {
	const [p] = await db.select().from(problems).where(eq(problems.slug, params.slug)).limit(1);
	if (!p) throw error(404, 'Problema no encontrado');

	const samples = await db
		.select({ ordinal: testCases.ordinal, stdin: testCases.stdin, expectedOutput: testCases.expectedOutput })
		.from(testCases)
		.where(and(eq(testCases.problemId, p.id), eq(testCases.isSample, true)))
		.orderBy(asc(testCases.ordinal));

	const langs = await db
		.select({ language: languageTemplates.language })
		.from(languageTemplates)
		.where(eq(languageTemplates.problemId, p.id));

	return json({
		id: p.id,
		slug: p.slug,
		title: p.title,
		statement: p.statement,
		difficulty: p.difficulty,
		mode: p.mode,
		signature: p.signature,
		timeLimitMs: p.timeLimitMs,
		memoryLimitKb: p.memoryLimitKb,
		languages: langs.map((l) => l.language),
		samples,
		mine: p.ownerAppId === locals.app!.id
	});
};

/** PUT /api/v1/problems/:slug — update (owner app only). */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const b = (await request.json().catch(() => null)) as ProblemInput | null;
	if (!b) throw error(400, 'JSON inválido');
	const { slug } = await upsertProblem(
		{ ...b, slug: b.slug ?? params.slug, originalSlug: params.slug },
		{ ownerAppId: locals.app!.id, enforceOwner: true }
	);
	return json({ ok: true, slug });
};

/** DELETE /api/v1/problems/:slug — delete (owner app only). */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const [p] = await db
		.select({ id: problems.id, ownerAppId: problems.ownerAppId })
		.from(problems)
		.where(eq(problems.slug, params.slug))
		.limit(1);
	if (!p) throw error(404, 'Problema no encontrado');
	if (p.ownerAppId !== locals.app!.id) throw error(403, 'No eres el dueño de este ejercicio');
	await db.delete(submissions).where(eq(submissions.problemId, p.id));
	await db.delete(problems).where(eq(problems.id, p.id));
	return json({ ok: true });
};

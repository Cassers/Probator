import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { submissions, problems } from '$lib/server/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const slug = url.searchParams.get('slug');
	const language = url.searchParams.get('language');

	if (!slug || !language) {
		throw error(400, 'Faltan parámetros slug o language');
	}

	const [problem] = await db.select({ id: problems.id }).from(problems).where(eq(problems.slug, slug)).limit(1);
	if (!problem) throw error(404, 'Problema no encontrado');

	const stats = await db
		.select({ runtimeMs: submissions.runtimeMs })
		.from(submissions)
		.where(
			and(
				eq(submissions.problemId, problem.id),
				eq(submissions.language, language),
				eq(submissions.verdict, 'Accepted'),
				isNotNull(submissions.runtimeMs)
			)
		);

	const runtimes = stats.map((s) => s.runtimeMs as number);
	return json(runtimes);
};

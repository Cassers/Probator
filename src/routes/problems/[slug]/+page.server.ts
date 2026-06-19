import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { problems, testCases } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [problem] = await db.select().from(problems).where(eq(problems.slug, params.slug)).limit(1);
	if (!problem) throw error(404, 'Problema no encontrado');

	const samples = await db
		.select({
			ordinal: testCases.ordinal,
			stdin: testCases.stdin,
			expectedOutput: testCases.expectedOutput
		})
		.from(testCases)
		.where(and(eq(testCases.problemId, problem.id), eq(testCases.isSample, true)))
		.orderBy(asc(testCases.ordinal));

	return {
		problem: {
			slug: problem.slug,
			title: problem.title,
			statement: problem.statement,
			difficulty: problem.difficulty,
			timeLimitMs: problem.timeLimitMs
		},
		samples
	};
};

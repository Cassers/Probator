import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { problems, testCases, languageTemplates, submissions } from '$lib/server/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
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

	// In function mode, the editor starts from a per-language function stub.
	// (Harnesses stay server-side; never sent to the client.)
	const starters: Record<string, string> = {};
	if (problem.mode === 'function') {
		const tpls = await db
			.select({ language: languageTemplates.language, starter: languageTemplates.starter })
			.from(languageTemplates)
			.where(eq(languageTemplates.problemId, problem.id));
		for (const t of tpls) starters[t.language] = t.starter;
	}

	const history = await db
		.select({
			id: submissions.id,
			language: submissions.language,
			sourceCode: submissions.sourceCode,
			verdict: submissions.verdict,
			passedCount: submissions.passedCount,
			totalCount: submissions.totalCount,
			runtimeMs: submissions.runtimeMs,
			createdAt: submissions.createdAt
		})
		.from(submissions)
		.where(eq(submissions.problemId, problem.id))
		.orderBy(desc(submissions.createdAt))
		.limit(50);

	return {
		problem: {
			slug: problem.slug,
			title: problem.title,
			statement: problem.statement,
			difficulty: problem.difficulty,
			mode: problem.mode,
			timeLimitMs: problem.timeLimitMs
		},
		samples,
		starters,
		submissions: history
	};
};

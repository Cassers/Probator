import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { problems, testCases, languageTemplates } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { Signature } from '$lib/judge/codegen';
import type { PageServerLoad } from './$types';

const EMPTY = {
	slug: '',
	title: '',
	statement: '',
	difficulty: 'easy',
	mode: 'stdio' as 'stdio' | 'function',
	timeLimitMs: 2000,
	memoryLimitKb: 128000
};

export const load: PageServerLoad = async ({ params }) => {
	if (params.slug === 'new') {
		return {
			creating: true,
			problem: EMPTY,
			cases: [{ stdin: '', expectedOutput: '', isSample: true }],
			templates: {} as Record<string, { starter: string; harness: string }>,
			signature: null as Signature | null
		};
	}

	const [problem] = await db.select().from(problems).where(eq(problems.slug, params.slug)).limit(1);
	if (!problem) throw error(404, 'Problema no encontrado');

	const cases = await db
		.select({ stdin: testCases.stdin, expectedOutput: testCases.expectedOutput, isSample: testCases.isSample })
		.from(testCases)
		.where(eq(testCases.problemId, problem.id))
		.orderBy(asc(testCases.ordinal));

	const tpls = await db
		.select({ language: languageTemplates.language, starter: languageTemplates.starter, harness: languageTemplates.harness })
		.from(languageTemplates)
		.where(eq(languageTemplates.problemId, problem.id));

	const templates: Record<string, { starter: string; harness: string }> = {};
	for (const t of tpls) templates[t.language] = { starter: t.starter, harness: t.harness };

	return {
		creating: false,
		problem: {
			slug: problem.slug,
			title: problem.title,
			statement: problem.statement,
			difficulty: problem.difficulty,
			mode: problem.mode as 'stdio' | 'function',
			timeLimitMs: problem.timeLimitMs,
			memoryLimitKb: problem.memoryLimitKb
		},
		cases: cases.length ? cases : [{ stdin: '', expectedOutput: '', isSample: true }],
		templates,
		signature: (problem.signature ?? null) as Signature | null
	};
};

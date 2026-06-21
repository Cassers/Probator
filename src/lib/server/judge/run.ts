import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { problems, testCases, submissions, languageTemplates } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { getLanguage } from '$lib/judge/languages';
import { grade, type GradeResult } from './grade';
import { wrapSource } from '$lib/judge/wrap';
import { scanSource } from './blocklist';

const MAX_SOURCE = 64 * 1024;

/**
 * Validate, grade and store a submission. Shared by the web (/api/submit) and
 * the REST API (/api/v1/submit). Throws SvelteKit errors on bad input.
 */
export async function runSubmission(opts: {
	slug: string;
	languageKey: string;
	source: string;
	userId: number | null;
}): Promise<{ id: number; result: GradeResult }> {
	const { slug, languageKey, source, userId } = opts;
	if (typeof source !== 'string' || source.length === 0) throw error(400, 'Falta el código (source)');
	if (source.length > MAX_SOURCE) throw error(413, 'Código demasiado largo');

	const language = getLanguage(languageKey);
	if (!language) throw error(400, `Lenguaje no soportado: ${languageKey}`);

	const scan = scanSource(language.key, source);
	if (scan.blocked) throw error(422, `Código rechazado por seguridad — API no permitida: ${scan.matches.join(', ')}`);

	const [problem] = await db.select().from(problems).where(eq(problems.slug, slug)).limit(1);
	if (!problem) throw error(404, 'Problema no encontrado');

	const cases = await db
		.select()
		.from(testCases)
		.where(eq(testCases.problemId, problem.id))
		.orderBy(asc(testCases.ordinal));
	if (cases.length === 0) throw error(409, 'El problema no tiene casos de prueba');

	let runSource = source;
	if (problem.mode === 'function') {
		const [tpl] = await db
			.select()
			.from(languageTemplates)
			.where(and(eq(languageTemplates.problemId, problem.id), eq(languageTemplates.language, language.key)))
			.limit(1);
		if (!tpl) throw error(409, `Este problema no soporta ${language.label} todavía`);
		runSource = wrapSource(tpl.harness, source);
	}

	let result: GradeResult;
	try {
		result = await grade({
			language,
			source: runSource,
			cases,
			timeLimitMs: problem.timeLimitMs,
			memoryLimitKb: problem.memoryLimitKb
		});
	} catch (e) {
		console.error('[runSubmission] judge error', e);
		throw error(502, 'El motor de ejecución (Piston) no respondió');
	}

	const [row] = await db
		.insert(submissions)
		.values({
			problemId: problem.id,
			userId,
			language: language.key,
			sourceCode: source,
			verdict: result.verdict,
			passedCount: result.passedCount,
			totalCount: result.totalCount,
			runtimeMs: result.runtimeMs
		})
		.returning({ id: submissions.id });

	return { id: row.id, result };
}

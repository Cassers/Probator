import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { problems, testCases, submissions, languageTemplates } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { getLanguage } from '$lib/judge/languages';
import { grade } from '$lib/server/judge/grade';
import { wrapSource } from '$lib/judge/wrap';
import { scanSource } from '$lib/server/judge/blocklist';
import type { RequestHandler } from './$types';

const MAX_SOURCE = 64 * 1024; // 64 KB guard against abuse

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body) throw error(400, 'JSON inválido');

	const { slug, language: langKey, source } = body as {
		slug?: string;
		language?: string;
		source?: string;
	};

	if (!slug || !langKey || typeof source !== 'string') {
		throw error(400, 'Faltan campos: slug, language, source');
	}
	if (source.length > MAX_SOURCE) throw error(413, 'Código demasiado largo');

	const language = getLanguage(langKey);
	if (!language) throw error(400, `Lenguaje no soportado: ${langKey}`);

	// Defense-in-depth: reject obviously dangerous APIs before executing.
	const scan = scanSource(language.key, source);
	if (scan.blocked) {
		throw error(422, `Código rechazado por seguridad — usa API no permitida: ${scan.matches.join(', ')}`);
	}

	const [problem] = await db.select().from(problems).where(eq(problems.slug, slug)).limit(1);
	if (!problem) throw error(404, 'Problema no encontrado');

	const cases = await db
		.select()
		.from(testCases)
		.where(eq(testCases.problemId, problem.id))
		.orderBy(asc(testCases.ordinal));
	if (cases.length === 0) throw error(409, 'El problema no tiene casos de prueba');

	// In function mode, wrap the student's function with the problem's harness.
	let runSource = source;
	if (problem.mode === 'function') {
		const [tpl] = await db
			.select()
			.from(languageTemplates)
			.where(
				and(
					eq(languageTemplates.problemId, problem.id),
					eq(languageTemplates.language, language.key)
				)
			)
			.limit(1);
		if (!tpl) throw error(409, `Este problema no soporta ${language.label} todavía`);
		runSource = wrapSource(tpl.harness, source);
	}

	let result;
	try {
		result = await grade({
			language,
			source: runSource,
			cases,
			timeLimitMs: problem.timeLimitMs,
			memoryLimitKb: problem.memoryLimitKb
		});
	} catch (e) {
		console.error('[submit] judge error', e);
		throw error(502, 'El motor de ejecución (Piston) no respondió');
	}

	await db.insert(submissions).values({
		problemId: problem.id,
		language: language.key,
		sourceCode: source,
		verdict: result.verdict,
		passedCount: result.passedCount,
		totalCount: result.totalCount,
		runtimeMs: result.runtimeMs
	});

	return json(result);
};

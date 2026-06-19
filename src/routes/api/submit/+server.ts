import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { problems, testCases, submissions } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getLanguage } from '$lib/judge/languages';
import { grade } from '$lib/server/judge/grade';
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

	const [problem] = await db.select().from(problems).where(eq(problems.slug, slug)).limit(1);
	if (!problem) throw error(404, 'Problema no encontrado');

	const cases = await db
		.select()
		.from(testCases)
		.where(eq(testCases.problemId, problem.id))
		.orderBy(asc(testCases.ordinal));
	if (cases.length === 0) throw error(409, 'El problema no tiene casos de prueba');

	let result;
	try {
		result = await grade({
			language,
			source,
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

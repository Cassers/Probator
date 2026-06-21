import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { problems, testCases, languageTemplates } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { LANGUAGE_BY_KEY } from '$lib/judge/languages';

export interface ProblemInput {
	originalSlug?: string;
	slug: string;
	title: string;
	statement?: string;
	difficulty?: string;
	mode: 'stdio' | 'function';
	timeLimitMs?: number;
	memoryLimitKb?: number;
	cases: { stdin: string; expectedOutput: string; isSample: boolean }[];
	templates?: Record<string, { starter: string; harness: string }>;
	signature?: unknown;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Create or update a problem (with its test cases and language templates).
 * Ownership: when `ownerAppId` is provided (API calls), a new problem is owned by
 * that app and updates require matching ownership (403 otherwise). The web admin
 * passes no owner and may edit any problem without changing ownership.
 */
export async function upsertProblem(
	b: ProblemInput,
	opts: { ownerAppId?: number | null; enforceOwner?: boolean } = {}
): Promise<{ slug: string }> {
	if (!b || typeof b !== 'object') throw error(400, 'JSON inválido');
	if (!b.slug || !SLUG_RE.test(b.slug)) throw error(400, 'Slug inválido (minúsculas, números y guiones)');
	if (!b.title?.trim()) throw error(400, 'Falta el título');
	if (!['stdio', 'function'].includes(b.mode)) throw error(400, 'Modo inválido');
	if (!Array.isArray(b.cases) || b.cases.length === 0) throw error(400, 'Agrega al menos un caso de prueba');
	if (b.mode === 'function') {
		const langs = Object.keys(b.templates ?? {});
		if (langs.length === 0) throw error(400, 'En modo función define al menos un lenguaje (starter + harness)');
		for (const l of langs) {
			if (!LANGUAGE_BY_KEY.has(l)) throw error(400, `Lenguaje desconocido: ${l}`);
			if (!b.templates![l].harness?.includes('{{USER_CODE}}'))
				throw error(400, `El harness de ${l} debe incluir el marcador {{USER_CODE}}`);
		}
	}

	const timeLimitMs = Number(b.timeLimitMs) || 2000;
	const memoryLimitKb = Number(b.memoryLimitKb) || 128000;

	try {
		const [existing] = await db
			.select({ id: problems.id, ownerAppId: problems.ownerAppId })
			.from(problems)
			.where(eq(problems.slug, b.originalSlug || b.slug))
			.limit(1);

		const fields = {
			slug: b.slug,
			title: b.title.trim(),
			statement: b.statement ?? '',
			difficulty: b.difficulty || 'easy',
			mode: b.mode,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			signature: (b.mode === 'function' ? (b.signature ?? null) : null) as any
		};

		let problemId: number;
		if (existing) {
			if (opts.enforceOwner && existing.ownerAppId !== (opts.ownerAppId ?? null)) {
				throw error(403, 'No eres el dueño de este ejercicio');
			}
			await db.update(problems).set({ ...fields, timeLimitMs, memoryLimitKb }).where(eq(problems.id, existing.id));
			problemId = existing.id;
		} else {
			const [row] = await db
				.insert(problems)
				.values({ ...fields, timeLimitMs, memoryLimitKb, ownerAppId: opts.ownerAppId ?? null })
				.returning({ id: problems.id });
			problemId = row.id;
		}

		// Full replace of dependent rows.
		await db.delete(testCases).where(eq(testCases.problemId, problemId));
		await db.delete(languageTemplates).where(eq(languageTemplates.problemId, problemId));
		await db.insert(testCases).values(
			b.cases.map((c, i) => ({
				problemId,
				ordinal: i,
				stdin: c.stdin ?? '',
				expectedOutput: c.expectedOutput ?? '',
				isSample: !!c.isSample
			}))
		);
		if (b.mode === 'function' && b.templates) {
			await db.insert(languageTemplates).values(
				Object.entries(b.templates).map(([language, t]) => ({
					problemId,
					language,
					starter: t.starter ?? '',
					harness: t.harness ?? ''
				}))
			);
		}
		return { slug: b.slug };
	} catch (e) {
		if ((e as { status?: number }).status) throw e; // re-throw SvelteKit errors (403/400)
		const msg = String((e as Error)?.message ?? e);
		if (msg.includes('duplicate') || msg.includes('unique')) throw error(409, 'Ya existe un ejercicio con ese slug');
		console.error('[upsertProblem] error', e);
		throw error(500, 'Error al guardar el ejercicio');
	}
}

import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { problems, testCases, languageTemplates } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { LANGUAGE_BY_KEY } from '$lib/judge/languages';
import type { RequestHandler } from './$types';

interface Body {
	originalSlug?: string;
	slug: string;
	title: string;
	statement: string;
	difficulty: string;
	mode: 'stdio' | 'function';
	timeLimitMs: number;
	memoryLimitKb: number;
	cases: { stdin: string; expectedOutput: string; isSample: boolean }[];
	templates: Record<string, { starter: string; harness: string }>;
	signature?: unknown;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Create or update a problem along with its test cases and language templates. */
export const POST: RequestHandler = async ({ request }) => {
	const b = (await request.json().catch(() => null)) as Body | null;
	if (!b) throw error(400, 'JSON inválido');

	if (!b.slug || !SLUG_RE.test(b.slug)) throw error(400, 'Slug inválido (usa minúsculas, números y guiones)');
	if (!b.title?.trim()) throw error(400, 'Falta el título');
	if (!['stdio', 'function'].includes(b.mode)) throw error(400, 'Modo inválido');
	if (!Array.isArray(b.cases) || b.cases.length === 0) throw error(400, 'Agrega al menos un caso de prueba');
	if (b.mode === 'function') {
		const langs = Object.keys(b.templates ?? {});
		if (langs.length === 0) throw error(400, 'En modo función define al menos un lenguaje (starter + harness)');
		for (const l of langs) {
			if (!LANGUAGE_BY_KEY.has(l)) throw error(400, `Lenguaje desconocido: ${l}`);
			if (!b.templates[l].harness?.includes('{{USER_CODE}}'))
				throw error(400, `El harness de ${l} debe incluir el marcador {{USER_CODE}}`);
		}
	}

	const timeLimitMs = Number(b.timeLimitMs) || 2000;
	const memoryLimitKb = Number(b.memoryLimitKb) || 128000;

	try {
		const [existing] = await db
			.select({ id: problems.id })
			.from(problems)
			.where(eq(problems.slug, b.originalSlug || b.slug))
			.limit(1);

		let problemId: number;
		const fields = {
			slug: b.slug,
			title: b.title.trim(),
			statement: b.statement ?? '',
			difficulty: b.difficulty || 'easy',
			mode: b.mode,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			signature: (b.mode === 'function' ? (b.signature ?? null) : null) as any,
			timeLimitMs,
			memoryLimitKb
		};

		if (existing) {
			await db.update(problems).set(fields).where(eq(problems.id, existing.id));
			problemId = existing.id;
		} else {
			const [row] = await db.insert(problems).values(fields).returning({ id: problems.id });
			problemId = row.id;
		}

		// Full replace of dependent rows (keeps it simple and lets mode change).
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

		return json({ ok: true, slug: b.slug });
	} catch (e) {
		const msg = String((e as Error)?.message ?? e);
		if (msg.includes('duplicate') || msg.includes('unique')) throw error(409, 'Ya existe un problema con ese slug');
		console.error('[admin/problems] save error', e);
		throw error(500, 'Error al guardar el problema');
	}
};

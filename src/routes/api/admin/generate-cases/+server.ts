import { json, error } from '@sveltejs/kit';
import { getLanguage } from '$lib/judge/languages';
import { execute } from '$lib/server/judge/piston';
import { wrapSource } from '$lib/judge/wrap';
import type { RequestHandler } from './$types';

interface Body {
	mode: 'stdio' | 'function';
	// Reference (correct) solution that produces the expected outputs.
	language: string;
	referenceSource: string;
	harness?: string; // required in function mode (to wrap the reference)
	// Inputs: explicit list and/or a generator program run `count` times.
	inputs?: string[];
	generatorSource?: string;
	generatorLanguage?: string;
	count?: number;
	sampleCount?: number; // how many resulting cases to mark visible
	timeLimitMs?: number;
	memoryLimitKb?: number;
}

const MAX_CASES = 60;

/** Generate {stdin, expectedOutput} cases from a reference solution. */
export const POST: RequestHandler = async ({ request }) => {
	const b = (await request.json().catch(() => null)) as Body | null;
	if (!b) throw error(400, 'JSON inválido');

	const refLang = getLanguage(b.language);
	if (!refLang) throw error(400, `Lenguaje de referencia inválido: ${b.language}`);
	if (!b.referenceSource?.trim()) throw error(400, 'Falta la solución de referencia');
	if (b.mode === 'function' && !b.harness?.includes('{{USER_CODE}}'))
		throw error(400, 'En modo función necesitas el harness (con {{USER_CODE}}) del lenguaje de referencia');

	const timeLimitMs = Number(b.timeLimitMs) || 2000;
	const memoryLimitKb = Number(b.memoryLimitKb) || 128000;

	// 1) Collect inputs.
	let inputs: string[] = Array.isArray(b.inputs) ? b.inputs.filter((s) => s && s.trim() !== '') : [];

	if (b.generatorSource?.trim()) {
		const genLang = getLanguage(b.generatorLanguage || 'python');
		if (!genLang) throw error(400, 'Lenguaje del generador inválido');
		const count = Math.min(Math.max(Number(b.count) || 5, 1), MAX_CASES);
		const gen = await Promise.all(
			Array.from({ length: count }, (_, i) =>
				execute({
					language: genLang.piston.language,
					version: genLang.piston.version,
					fileName: genLang.fileName,
					source: b.generatorSource as string,
					stdin: String(i), // seed/index so each run can vary deterministically
					runTimeoutMs: timeLimitMs,
					runMemoryBytes: memoryLimitKb > 0 ? memoryLimitKb * 1024 : -1
				})
					.then((r) => {
						if (r.compile && r.compile.code !== 0) throw new Error('El generador no compila');
						return r.run.stdout ?? '';
					})
					.catch((e) => {
						throw new Error(`Generador falló: ${String((e as Error).message)}`);
					})
			)
		);
		inputs.push(...gen);
	}

	// Dedupe identical inputs; keep order.
	const seen = new Set<string>();
	inputs = inputs.filter((s) => (seen.has(s) ? false : (seen.add(s), true))).slice(0, MAX_CASES);
	if (inputs.length === 0) throw error(400, 'No hay entradas: escribe algunas o define un generador');

	// 2) Run the reference solution on each input to get expected outputs.
	const refProgram =
		b.mode === 'function' ? wrapSource(b.harness as string, b.referenceSource) : b.referenceSource;

	let results;
	try {
		results = await Promise.all(
			inputs.map((stdin) =>
				execute({
					language: refLang.piston.language,
					version: refLang.piston.version,
					fileName: refLang.fileName,
					source: refProgram,
					stdin,
					runTimeoutMs: timeLimitMs,
					runMemoryBytes: memoryLimitKb > 0 ? memoryLimitKb * 1024 : -1
				})
			)
		);
	} catch (e) {
		console.error('[generate-cases] piston error', e);
		throw error(502, 'El motor de ejecución (Piston) no respondió');
	}

	// If the reference fails to compile/run, surface it — the cases would be wrong.
	const compileErr = results.find((r) => r.compile && r.compile.code !== 0);
	if (compileErr) throw error(400, `La solución de referencia no compila: ${(compileErr.compile?.stderr || '').slice(0, 300)}`);
	const runErr = results.findIndex((r) => r.run.code !== 0 || r.run.signal);
	if (runErr >= 0)
		throw error(400, `La solución de referencia falló en una entrada (caso ${runErr + 1}): ${(results[runErr].run.stderr || results[runErr].run.signal || '').slice(0, 200)}`);

	const sampleCount = Math.min(Math.max(Number(b.sampleCount) || 2, 0), inputs.length);
	const cases = inputs.map((stdin, i) => ({
		stdin,
		expectedOutput: results[i].run.stdout ?? '',
		isSample: i < sampleCount
	}));

	return json({ cases });
};

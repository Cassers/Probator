import type { Language } from '$lib/judge/languages';
import type { TestCase } from '$lib/server/db/schema';
import { execute, type PistonResponse } from './piston';

export interface CaseResult {
	ordinal: number;
	isSample: boolean;
	status: string;
	passed: boolean;
	// Only populated for sample cases, so hidden tests stay hidden.
	stdin?: string;
	expectedOutput?: string;
	stdout?: string;
	stderr?: string;
}

export interface GradeResult {
	verdict: string;
	passedCount: number;
	totalCount: number;
	runtimeMs: number | null;
	compileOutput: string | null;
	cases: CaseResult[];
}

/** How many test cases to run against Piston at once. */
const CONCURRENCY = 4;

/**
 * Normalize program output for comparison: strip trailing whitespace on each
 * line and drop trailing blank lines. This is the usual lenient policy so a
 * stray final newline doesn't fail an otherwise-correct answer.
 */
function normalize(s: string): string {
	return s
		.replace(/\r\n/g, '\n')
		.split('\n')
		.map((line) => line.replace(/[ \t]+$/, ''))
		.join('\n')
		.replace(/\n+$/, '');
}

/** Classify a single Piston execution against its expected output. */
function classify(res: PistonResponse, expected: string): { status: string; passed: boolean } {
	if (res.compile && res.compile.code !== 0) {
		return { status: 'Compilation Error', passed: false };
	}
	const run = res.run;
	if (run.signal === 'SIGKILL') {
		// Piston kills on run_timeout (or memory) — surface as TLE for a course.
		return { status: 'Time Limit Exceeded', passed: false };
	}
	if (run.code !== 0) {
		return { status: 'Runtime Error', passed: false };
	}
	const passed = normalize(run.stdout) === normalize(expected);
	return { status: passed ? 'Accepted' : 'Wrong Answer', passed };
}

export async function grade(opts: {
	language: Language;
	source: string;
	cases: TestCase[];
	timeLimitMs: number;
	memoryLimitKb: number;
}): Promise<GradeResult> {
	const { language, source, cases, timeLimitMs, memoryLimitKb } = opts;
	const ordered = [...cases].sort((a, b) => a.ordinal - b.ordinal);

	// Run a single case first: if it's a compile error, every case would be —
	// bail early and report the compiler message once.
	const first = await runCase(ordered[0]);
	if (first.res.compile && first.res.compile.code !== 0) {
		return {
			verdict: 'Compilation Error',
			passedCount: 0,
			totalCount: ordered.length,
			runtimeMs: first.elapsed,
			compileOutput: first.res.compile.stderr || first.res.compile.output || 'Compilation error',
			cases: []
		};
	}

	const rest = await mapPool(ordered.slice(1), CONCURRENCY, runCase);
	const all = [first, ...rest];

	const caseResults: CaseResult[] = all.map(({ tc, res, verdict }) => {
		const base: CaseResult = {
			ordinal: tc.ordinal,
			isSample: tc.isSample,
			status: verdict.status,
			passed: verdict.passed
		};
		if (tc.isSample) {
			base.stdin = tc.stdin;
			base.expectedOutput = tc.expectedOutput;
			base.stdout = res.run.stdout;
			base.stderr = res.run.stderr;
		}
		return base;
	});

	const passedCount = caseResults.filter((c) => c.passed).length;
	const verdict =
		passedCount === caseResults.length
			? 'Accepted'
			: (caseResults.find((c) => !c.passed)?.status ?? 'Wrong Answer');

	return {
		verdict,
		passedCount,
		totalCount: caseResults.length,
		runtimeMs: Math.max(...all.map((a) => a.elapsed)),
		compileOutput: null,
		cases: caseResults
	};

	async function runCase(tc: TestCase) {
		const start = performance.now();
		const res = await execute({
			language: language.piston.language,
			version: language.piston.version,
			fileName: language.fileName,
			source,
			stdin: tc.stdin,
			runTimeoutMs: timeLimitMs,
			runMemoryBytes: memoryLimitKb > 0 ? memoryLimitKb * 1024 : -1
		});
		const elapsed = Math.round(performance.now() - start);
		return { tc, res, verdict: classify(res, tc.expectedOutput), elapsed };
	}
}

/** Run `fn` over `items` with at most `limit` in flight, preserving order. */
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;
	async function worker() {
		while (next < items.length) {
			const i = next++;
			results[i] = await fn(items[i]);
		}
	}
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

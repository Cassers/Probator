import type { Language } from '$lib/judge/languages';
import type { TestCase } from '$lib/server/db/schema';
import { createBatch, pollBatch, STATUS, type Judge0Submission } from './judge0';

export interface CaseResult {
	ordinal: number;
	isSample: boolean;
	status: string; // human-readable Judge0 status
	passed: boolean;
	timeMs: number | null;
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

/**
 * Run `source` against every test case and reduce to a single verdict.
 * Judge0 itself compares stdout to expected_output (trailing whitespace
 * trimmed server-side), so a case "passes" iff its status is Accepted.
 */
export async function grade(opts: {
	language: Language;
	source: string;
	cases: TestCase[];
	timeLimitMs: number;
	memoryLimitKb: number;
}): Promise<GradeResult> {
	const { language, source, cases, timeLimitMs, memoryLimitKb } = opts;

	const ordered = [...cases].sort((a, b) => a.ordinal - b.ordinal);
	const subs: Judge0Submission[] = ordered.map((tc) => ({
		source_code: source,
		language_id: language.judge0Id,
		stdin: tc.stdin,
		expected_output: tc.expectedOutput,
		cpu_time_limit: timeLimitMs / 1000,
		memory_limit: memoryLimitKb
	}));

	const tokens = await createBatch(subs);
	const results = await pollBatch(tokens);

	let maxTimeMs: number | null = null;
	let compileOutput: string | null = null;
	const caseResults: CaseResult[] = results.map((r, i) => {
		const tc = ordered[i];
		const timeMs = r.time != null ? Math.round(parseFloat(r.time) * 1000) : null;
		if (timeMs != null) maxTimeMs = Math.max(maxTimeMs ?? 0, timeMs);
		if (r.status.id === STATUS.COMPILATION_ERROR && !compileOutput) {
			compileOutput = r.compile_output ?? r.message ?? 'Compilation error';
		}
		const passed = r.status.id === STATUS.ACCEPTED;
		const base: CaseResult = {
			ordinal: tc.ordinal,
			isSample: tc.isSample,
			status: r.status.description,
			passed,
			timeMs
		};
		if (tc.isSample) {
			base.stdin = tc.stdin;
			base.expectedOutput = tc.expectedOutput;
			base.stdout = r.stdout ?? '';
			base.stderr = r.stderr ?? '';
		}
		return base;
	});

	const passedCount = caseResults.filter((c) => c.passed).length;
	const verdict = computeVerdict(results, passedCount, caseResults.length);

	return {
		verdict,
		passedCount,
		totalCount: caseResults.length,
		runtimeMs: maxTimeMs,
		compileOutput,
		cases: caseResults
	};
}

/** Overall verdict: Accepted only if every case is; else the first failure reason. */
function computeVerdict(
	results: { status: { id: number; description: string } }[],
	passedCount: number,
	total: number
): string {
	if (passedCount === total) return 'Accepted';
	const firstBad = results.find((r) => r.status.id !== STATUS.ACCEPTED);
	return firstBad?.status.description ?? 'Wrong Answer';
}

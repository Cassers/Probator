import { JUDGE0_URL, JUDGE0_AUTH_TOKEN } from '$env/static/private';

/**
 * Minimal Judge0 CE client. We talk to a self-hosted instance over HTTP, so
 * Judge0's GPLv3 license stays isolated behind the network boundary.
 *
 * Flow: createBatch() submits all test cases at once, then pollBatch() waits
 * until every submission leaves the "In Queue / Processing" states.
 */

export interface Judge0Submission {
	source_code: string;
	language_id: number;
	stdin?: string;
	expected_output?: string;
	cpu_time_limit?: number; // seconds
	memory_limit?: number; // kilobytes
}

export interface Judge0Result {
	token: string;
	stdout: string | null;
	stderr: string | null;
	compile_output: string | null;
	message: string | null;
	time: string | null; // seconds, as string
	memory: number | null; // kilobytes
	status: { id: number; description: string };
}

// Judge0 status ids: 1=In Queue, 2=Processing, 3=Accepted, 4=Wrong Answer,
// 5=Time Limit Exceeded, 6=Compilation Error, 7..12=runtime errors, 13=internal,
// 14=exec format error.
export const STATUS = {
	IN_QUEUE: 1,
	PROCESSING: 2,
	ACCEPTED: 3,
	WRONG_ANSWER: 4,
	TIME_LIMIT_EXCEEDED: 5,
	COMPILATION_ERROR: 6
} as const;

const headers: Record<string, string> = { 'Content-Type': 'application/json' };
if (JUDGE0_AUTH_TOKEN) headers['X-Auth-Token'] = JUDGE0_AUTH_TOKEN;

const base = JUDGE0_URL.replace(/\/+$/, '');
// Tokens are base64-encoded so binary stdin/stdout survives transport.
const FIELDS =
	'token,stdout,stderr,compile_output,message,time,memory,status';

function b64(s: string): string {
	return Buffer.from(s, 'utf8').toString('base64');
}

function decode(r: Judge0Result): Judge0Result {
	const d = (v: string | null) => (v == null ? v : Buffer.from(v, 'base64').toString('utf8'));
	return {
		...r,
		stdout: d(r.stdout),
		stderr: d(r.stderr),
		compile_output: d(r.compile_output),
		message: d(r.message)
	};
}

/** Submit a batch; returns the tokens in the same order as `subs`. */
export async function createBatch(subs: Judge0Submission[]): Promise<string[]> {
	const submissions = subs.map((s) => ({
		...s,
		source_code: b64(s.source_code),
		stdin: s.stdin != null ? b64(s.stdin) : undefined,
		expected_output: s.expected_output != null ? b64(s.expected_output) : undefined
	}));

	const res = await fetch(`${base}/submissions/batch?base64_encoded=true`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ submissions })
	});
	if (!res.ok) throw new Error(`Judge0 batch create failed: ${res.status} ${await res.text()}`);
	const data = (await res.json()) as { token: string }[];
	return data.map((t) => t.token);
}

/** Poll until all submissions finish (status id > 2) or we time out. */
export async function pollBatch(
	tokens: string[],
	{ intervalMs = 600, maxTries = 40 } = {}
): Promise<Judge0Result[]> {
	const query = `tokens=${tokens.join(',')}&base64_encoded=true&fields=${FIELDS}`;
	for (let i = 0; i < maxTries; i++) {
		const res = await fetch(`${base}/submissions/batch?${query}`, { headers });
		if (!res.ok) throw new Error(`Judge0 batch poll failed: ${res.status} ${await res.text()}`);
		const { submissions } = (await res.json()) as { submissions: Judge0Result[] };
		const pending = submissions.some(
			(s) => s.status.id === STATUS.IN_QUEUE || s.status.id === STATUS.PROCESSING
		);
		if (!pending) return submissions.map(decode);
		await new Promise((r) => setTimeout(r, intervalMs));
	}
	throw new Error('Judge0 batch timed out while waiting for results');
}

export async function health(): Promise<boolean> {
	try {
		const res = await fetch(`${base}/languages`, { headers });
		return res.ok;
	} catch {
		return false;
	}
}

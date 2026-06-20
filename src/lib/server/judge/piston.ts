import { env } from '$env/dynamic/private';

/**
 * Minimal Piston client. We talk to a self-hosted Piston over HTTP; it runs
 * untrusted code in an isolated sandbox (cgroup v2). Unlike Judge0, Piston is a
 * pure executor: it does NOT compare output — the caller compares stdout.
 *
 * One request runs one program against one stdin. Compiled languages compile
 * on every call (fine for a teaching judge with few test cases).
 *
 * dynamic/private so PISTON_URL is read at runtime (Docker env), not baked in.
 */

function baseUrl(): string {
	return (env.PISTON_URL ?? 'http://localhost:2000').replace(/\/+$/, '');
}

/**
 * Piston rejects run_timeout above its configured ceiling with a 400 (default
 * 3000ms). Clamp so a generous per-problem limit never turns into a hard error.
 * Override with PISTON_MAX_RUN_MS to match your instance's `max_run_timeout`.
 */
function maxRunMs(): number {
	const n = Number(env.PISTON_MAX_RUN_MS);
	return Number.isFinite(n) && n > 0 ? n : 3000;
}

export interface PistonStage {
	stdout: string;
	stderr: string;
	output: string;
	code: number | null;
	signal: string | null;
}

export interface PistonResponse {
	language: string;
	version: string;
	compile?: PistonStage;
	run: PistonStage;
}

export interface ExecuteOpts {
	language: string;
	version: string;
	fileName: string;
	source: string;
	stdin: string;
	runTimeoutMs: number;
	/** bytes; -1 = unlimited */
	runMemoryBytes?: number;
}

export async function execute(opts: ExecuteOpts): Promise<PistonResponse> {
	const res = await fetch(`${baseUrl()}/api/v2/execute`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			language: opts.language,
			version: opts.version,
			files: [{ name: opts.fileName, content: opts.source }],
			stdin: opts.stdin,
			run_timeout: Math.min(opts.runTimeoutMs, maxRunMs()),
			compile_timeout: 10000,
			run_memory_limit: opts.runMemoryBytes ?? -1
		})
	});
	if (!res.ok) {
		throw new Error(`Piston execute failed: ${res.status} ${await res.text()}`);
	}
	return (await res.json()) as PistonResponse;
}

export async function health(): Promise<boolean> {
	try {
		const res = await fetch(`${baseUrl()}/api/v2/runtimes`);
		return res.ok;
	} catch {
		return false;
	}
}

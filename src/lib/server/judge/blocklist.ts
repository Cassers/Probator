/**
 * Defense-in-depth source blocklist (see docs/SECURITY.md). Rejects obvious
 * dangerous APIs per language BEFORE running in Piston, with a clear message.
 *
 * NOT a security boundary — bypassable via reflection / string-building / asm.
 * The OS sandbox (Piston) is the real control. This catches lazy/accidental
 * misuse and produces educational errors. Reading stdin / writing stdout always
 * stays allowed.
 */

interface Rule {
	re: RegExp;
	label: string;
}

// JS and TS (Node) share rules.
const jsRules: Rule[] = [
	// fs intentionally NOT banned: stdio submissions read stdin via fs.readFileSync(0),
	// and the sandbox contains the (ephemeral) filesystem anyway.
	{ re: /\b(require\(|from\s+|import\s*\(?)\s*['"]node:?(child_process|net|http|https|dns|dgram|tls|worker_threads|cluster|vm|inspector|repl)['"]/, label: 'módulo peligroso (child_process/net/vm/...)' },
	{ re: /\bchild_process\b/, label: 'child_process' },
	{ re: /\beval\s*\(/, label: 'eval(' },
	{ re: /\bnew\s+Function\b/, label: 'new Function' },
	{ re: /\.constructor\s*\(\s*['"]/, label: 'constructor() (Function reach)' },
	{ re: /\bprocess\.(binding|dlopen|exit|env)\b/, label: 'process.binding/dlopen/exit/env' },
	{ re: /\bfetch\s*\(/, label: 'fetch(' },
	{ re: /\b(require|import)\s*\(\s*[^'")\s]/, label: 'require/import dinámico' }
];

const cRules: Rule[] = [
	{ re: /\b(std::)?system\s*\(/, label: 'system(' },
	{ re: /\bpopen\s*\(/, label: 'popen(' },
	{ re: /\bexec(l|v|lp|vp|le|ve|vpe|lpe)?\s*\(/, label: 'exec*(' },
	{ re: /\b(v?fork|clone)\s*\(/, label: 'fork/clone(' },
	{ re: /\b(socket|connect|bind|listen|accept)\s*\(/, label: 'red (socket/connect/...)' },
	{ re: /<sys\/socket\.h>|<netinet\/|<arpa\/inet\.h>|<netdb\.h>/, label: 'headers de red' },
	{ re: /__asm__|\basm\s*(volatile)?\s*[({]/, label: 'asm inline' },
	{ re: /\bsyscall\s*\(/, label: 'syscall(' },
	{ re: /\bptrace\s*\(/, label: 'ptrace(' }
];

const RULES: Record<string, Rule[]> = {
	python: [
		{ re: /\bsubprocess\b/, label: 'subprocess' },
		{ re: /\bos\.(system|popen|exec\w*|fork|spawn\w*|kill)\b/, label: 'os.system/popen/exec/fork/...' },
		{ re: /(?<![\w.])(eval|exec|compile)\s*\(/, label: 'eval/exec/compile' },
		{ re: /\b__(subclasses|builtins|globals|import)__\b/, label: 'introspección de escape (__subclasses__/__builtins__/...)' },
		{ re: /\bsocket\b/, label: 'socket' },
		{ re: /\b(urllib|requests|httpx|aiohttp)\b/, label: 'red (urllib/requests/...)' },
		{ re: /\bctypes\b/, label: 'ctypes' },
		{ re: /\bpty\b/, label: 'pty' }
	],
	ruby: [
		{ re: /`[^`]*`/, label: 'backticks (ejecución de comando)' },
		{ re: /%x[([{]/, label: '%x (ejecución de comando)' },
		{ re: /\b(system|exec|spawn|fork)\s*[\s('"]/, label: 'system/exec/spawn/fork' },
		{ re: /\bIO\.popen\b/, label: 'IO.popen' },
		{ re: /\bOpen3\b/, label: 'Open3' },
		{ re: /\bObjectSpace\b/, label: 'ObjectSpace' },
		{ re: /\b(instance_eval|class_eval|module_eval|eval)\s*[\s('"{]/, label: 'eval' },
		{ re: /\b(__send__|public_send|send)\s*\(\s*['"]/, label: 'send(:método)' },
		{ re: /\bFiddle\b/, label: 'Fiddle (FFI)' },
		{ re: /\b(TCPSocket|UDPSocket|Socket|Net::)/, label: 'red' }
	],
	javascript: jsRules,
	typescript: jsRules,
	c: cRules,
	cpp: cRules,
	java: [
		{ re: /\bRuntime\b/, label: 'Runtime' },
		{ re: /\bProcessBuilder\b/, label: 'ProcessBuilder' },
		{ re: /\bSystem\.(exit|load|loadLibrary)\b/, label: 'System.exit/load/loadLibrary' },
		{ re: /\bjava\.io\.File\b|\bnew\s+File\s*\(/, label: 'java.io.File' },
		{ re: /\bjava\.nio\.file\b|\bFiles\.|Paths\./, label: 'java.nio.file' },
		{ re: /\bjava\.net\b/, label: 'java.net (red)' },
		{ re: /\bjava\.lang\.reflect\b|\.setAccessible\b|\bMethodHandles\b/, label: 'reflexión' },
		{ re: /\bClass\.forName\b/, label: 'Class.forName' },
		{ re: /\b(sun\.misc\.)?Unsafe\b/, label: 'Unsafe' },
		{ re: /\bClassLoader\b|\bdefineClass\b/, label: 'ClassLoader' }
	],
	csharp: [
		{ re: /\b(System\.Diagnostics\.)?Process(StartInfo)?\b/, label: 'Process / ProcessStartInfo' },
		{ re: /\bEnvironment\.(Exit|FailFast)\b/, label: 'Environment.Exit' },
		{ re: /\bSystem\.IO\b/, label: 'System.IO (archivos)' },
		{ re: /\bSystem\.Net\b/, label: 'System.Net (red)' },
		{ re: /\bDllImport\b/, label: 'DllImport (P/Invoke)' },
		{ re: /\bSystem\.Reflection\b|\bActivator\b|\bAssembly\.Load\b/, label: 'reflexión' },
		{ re: /\bMarshal\b/, label: 'Marshal' },
		{ re: /\bAppDomain\b/, label: 'AppDomain' },
		{ re: /\bunsafe\s*\{/, label: 'unsafe {' }
	],
	go: [
		{ re: /"os\/exec"/, label: 'os/exec' },
		{ re: /\bos\.StartProcess\b/, label: 'os.StartProcess' },
		{ re: /\bsyscall\.(Exec|ForkExec)\b/, label: 'syscall.Exec' },
		{ re: /"syscall"/, label: 'syscall' },
		{ re: /"unsafe"/, label: 'unsafe' },
		{ re: /import\s+"C"/, label: 'cgo (import "C")' },
		{ re: /"net(\/http)?"/, label: 'net / net/http (red)' }
	],
	rust: [
		{ re: /\bstd::process::Command\b|\bCommand::new\b/, label: 'std::process::Command' },
		{ re: /\bstd::net\b/, label: 'std::net (red)' },
		{ re: /\b(extern\s+crate\s+)?libc\b/, label: 'libc (FFI)' },
		{ re: /\b(global_)?asm!/, label: 'asm!' },
		{ re: /extern\s+"C"/, label: 'extern "C" (FFI)' }
	]
};

/** Strip C-style line/block comments to cut false positives (keeps #include). */
function stripComments(src: string): string {
	return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

export interface ScanResult {
	blocked: boolean;
	matches: string[];
}

export function scanSource(langKey: string, source: string): ScanResult {
	const rules = RULES[langKey];
	if (!rules) return { blocked: false, matches: [] };
	const cleaned = stripComments(source);
	const matches: string[] = [];
	for (const r of rules) if (r.re.test(cleaned)) matches.push(r.label);
	return { blocked: matches.length > 0, matches: [...new Set(matches)] };
}

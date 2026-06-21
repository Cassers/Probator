/**
 * Signature-driven template generation. Given a function signature (name,
 * typed params, return type), produce per-language { starter, harness } so an
 * admin doesn't hand-write boilerplate for each language.
 *
 * Supported types: int, long, bool, string and 1D arrays of those.
 * I/O convention (whitespace-token stream on stdin): each scalar is one token;
 * each array is an integer length followed by that many element tokens. The
 * return value is printed deterministically (bools as true/false, arrays
 * space-separated) so the same value prints identically across languages — that
 * is what lets a reference solution in one language judge a student's in another.
 */
export type BaseType = 'int' | 'long' | 'bool' | 'string';
export type AbstractType = BaseType | `${BaseType}[]`;
export interface Param {
	name: string;
	type: AbstractType;
}
export interface Signature {
	functionName: string;
	params: Param[];
	returnType: AbstractType;
}

export const SUPPORTED_TYPES: AbstractType[] = [
	'int',
	'long',
	'bool',
	'string',
	'int[]',
	'long[]',
	'string[]'
];

// Languages we can auto-generate for. (C is omitted: array/string returns are
// impractical to generate generically.)
export const CODEGEN_LANGUAGES = [
	'python',
	'javascript',
	'typescript',
	'java',
	'cpp',
	'go',
	'rust',
	'csharp',
	'ruby'
];

const isArr = (t: AbstractType) => t.endsWith('[]');
const base = (t: AbstractType) => t.replace('[]', '') as BaseType;

type Gen = (sig: Signature) => { starter: string; harness: string };

// ---------------------------------------------------------------- Python
const py: Gen = ({ functionName: fn, params, returnType: rt }) => {
	const starter = `def ${fn}(${params.map((p) => p.name).join(', ')}):\n    # TODO: implementa la función\n    pass\n`;
	const read = params
		.map((p) => {
			const b = base(p.type);
			if (isArr(p.type)) {
				const conv = b === 'string' ? '_tok()' : '_toi(_tok())';
				return `${p.name} = [${conv} for _ in range(int(_tok()))]`;
			}
			if (b === 'bool') return `${p.name} = _tok().lower() in ("true", "1")`;
			if (b === 'string') return `${p.name} = _tok()`;
			return `${p.name} = int(_tok())`;
		})
		.join('\n');
	const args = params.map((p) => p.name).join(', ');
	const harness = `{{USER_CODE}}\n\nimport sys\n_T = sys.stdin.read().split()\n_pos = 0\ndef _tok():\n    global _pos\n    v = _T[_pos]; _pos += 1; return v\ndef _toi(x):\n    return int(x)\n${read}\n_res = ${fn}(${args})\n${pyPrint(rt)}`;
	return { starter, harness };
};
function pyPrint(rt: AbstractType): string {
	if (isArr(rt)) {
		if (base(rt) === 'bool') return 'print(" ".join("true" if x else "false" for x in _res))';
		return 'print(" ".join(str(x) for x in _res))';
	}
	if (base(rt) === 'bool') return 'print("true" if _res else "false")';
	return 'print(_res)';
}

// ---------------------------------------------------------------- JS / TS
function jsBody(sig: Signature): string {
	const read = sig.params
		.map((p) => {
			const b = base(p.type);
			if (isArr(p.type)) {
				const conv = b === 'string' ? '_t()' : 'Number(_t())';
				return `const ${p.name} = Array.from({ length: Number(_t()) }, () => ${conv});`;
			}
			if (b === 'bool') return `const ${p.name} = ["true", "1"].includes(_t().toLowerCase());`;
			if (b === 'string') return `const ${p.name} = _t();`;
			return `const ${p.name} = Number(_t());`;
		})
		.join('\n');
	const args = sig.params.map((p) => p.name).join(', ');
	return `const _T = require("fs").readFileSync(0, "utf8").split(/\\s+/).filter(Boolean);\nlet _pos = 0;\nconst _t = () => _T[_pos++];\n${read}\nconst _res = ${sig.functionName}(${args});\n${jsPrint(sig.returnType)}`;
}
function jsPrint(rt: AbstractType): string {
	if (isArr(rt)) {
		if (base(rt) === 'bool') return 'console.log(_res.map((x) => (x ? "true" : "false")).join(" "));';
		return 'console.log(_res.join(" "));';
	}
	if (base(rt) === 'bool') return 'console.log(_res ? "true" : "false");';
	return 'console.log(_res);';
}
const js: Gen = (sig) => ({
	starter: `function ${sig.functionName}(${sig.params.map((p) => p.name).join(', ')}) {\n  // TODO: implementa la función\n}\n`,
	harness: `{{USER_CODE}}\n${jsBody(sig)}\n`
});
const tsType = (t: AbstractType): string => {
	const m: Record<BaseType, string> = { int: 'number', long: 'number', bool: 'boolean', string: 'string' };
	return isArr(t) ? `${m[base(t)]}[]` : m[base(t)];
};
const ts: Gen = (sig) => ({
	starter: `function ${sig.functionName}(${sig.params
		.map((p) => `${p.name}: ${tsType(p.type)}`)
		.join(', ')}): ${tsType(sig.returnType)} {\n  // TODO: implementa la función\n}\n`,
	harness: `// @ts-nocheck\n{{USER_CODE}}\n${jsBody(sig)}\n`
});

// ---------------------------------------------------------------- Java
const javaType = (t: AbstractType): string => {
	const m: Record<BaseType, string> = { int: 'int', long: 'long', bool: 'boolean', string: 'String' };
	return isArr(t) ? `${m[base(t)]}[]` : m[base(t)];
};
const java: Gen = (sig) => {
	const starter = `static ${javaType(sig.returnType)} ${sig.functionName}(${sig.params
		.map((p) => `${javaType(p.type)} ${p.name}`)
		.join(', ')}) {\n    // TODO: implementa la función\n}\n`;
	const read = sig.params
		.map((p) => {
			const b = base(p.type);
			const elem = b === 'long' ? 's.nextLong()' : b === 'string' ? 's.next()' : b === 'bool' ? '(java.util.Arrays.asList("true","1").contains(s.next().toLowerCase()))' : 's.nextInt()';
			if (isArr(p.type)) {
				return `int _${p.name}n = s.nextInt(); ${javaType(p.type)} ${p.name} = new ${javaType(base(p.type))}[_${p.name}n]; for (int _k = 0; _k < _${p.name}n; _k++) ${p.name}[_k] = ${elem};`;
			}
			if (b === 'long') return `long ${p.name} = s.nextLong();`;
			if (b === 'string') return `String ${p.name} = s.next();`;
			if (b === 'bool') return `boolean ${p.name} = java.util.Arrays.asList("true","1").contains(s.next().toLowerCase());`;
			return `int ${p.name} = s.nextInt();`;
		})
		.join('\n        ');
	const args = sig.params.map((p) => p.name).join(', ');
	const harness = `import java.util.*;\n\npublic class Main {\n    {{USER_CODE}}\n\n    public static void main(String[] args) {\n        Scanner s = new Scanner(System.in);\n        ${read}\n        ${javaType(sig.returnType)} _res = ${sig.functionName}(${args});\n        ${javaPrint(sig.returnType)}\n    }\n}\n`;
	return { starter, harness };
};
function javaPrint(rt: AbstractType): string {
	if (isArr(rt)) {
		const map =
			base(rt) === 'bool'
				? '_res[_k] ? "true" : "false"'
				: 'String.valueOf(_res[_k])';
		return `StringBuilder _sb = new StringBuilder(); for (int _k = 0; _k < _res.length; _k++) { if (_k > 0) _sb.append(" "); _sb.append(${map}); } System.out.println(_sb.toString());`;
	}
	if (base(rt) === 'bool') return 'System.out.println(_res ? "true" : "false");';
	return 'System.out.println(_res);';
}

// ---------------------------------------------------------------- C++
const cppType = (t: AbstractType): string => {
	const m: Record<BaseType, string> = { int: 'int', long: 'long long', bool: 'bool', string: 'string' };
	return isArr(t) ? `vector<${m[base(t)]}>` : m[base(t)];
};
const cpp: Gen = (sig) => {
	const starter = `${cppType(sig.returnType)} ${sig.functionName}(${sig.params
		.map((p) => `${cppType(p.type)}${isArr(p.type) ? '&' : ''} ${p.name}`)
		.join(', ')}) {\n    // TODO: implementa la función\n}\n`;
	const read = sig.params
		.map((p) => {
			const b = base(p.type);
			if (isArr(p.type)) {
				return `int _${p.name}n; cin >> _${p.name}n; ${cppType(p.type)} ${p.name}(_${p.name}n); for (auto& _x : ${p.name}) cin >> _x;`;
			}
			if (b === 'bool') return `string _b${p.name}; cin >> _b${p.name}; bool ${p.name} = (_b${p.name} == "true" || _b${p.name} == "1");`;
			return `${cppType(p.type)} ${p.name}; cin >> ${p.name};`;
		})
		.join('\n    ');
	const args = sig.params.map((p) => p.name).join(', ');
	const harness = `#include <bits/stdc++.h>\nusing namespace std;\n\n{{USER_CODE}}\n\nint main() {\n    ${read}\n    auto _res = ${sig.functionName}(${args});\n    ${cppPrint(sig.returnType)}\n    return 0;\n}\n`;
	return { starter, harness };
};
function cppPrint(rt: AbstractType): string {
	if (isArr(rt)) {
		const elem = base(rt) === 'bool' ? '(_res[_k] ? "true" : "false")' : '_res[_k]';
		return `for (size_t _k = 0; _k < _res.size(); _k++) { if (_k) cout << " "; cout << ${elem}; } cout << endl;`;
	}
	if (base(rt) === 'bool') return 'cout << (_res ? "true" : "false") << endl;';
	return 'cout << _res << endl;';
}

// ---------------------------------------------------------------- Go
const goType = (t: AbstractType): string => {
	const m: Record<BaseType, string> = { int: 'int', long: 'int64', bool: 'bool', string: 'string' };
	return isArr(t) ? `[]${m[base(t)]}` : m[base(t)];
};
const go: Gen = (sig) => {
	const starter = `func ${sig.functionName}(${sig.params
		.map((p) => `${p.name} ${goType(p.type)}`)
		.join(', ')}) ${goType(sig.returnType)} {\n\t// TODO: implementa la función\n}\n`;
	const parseScalar = (b: BaseType, expr: string) => {
		if (b === 'long') return `func() int64 { v, _ := strconv.ParseInt(${expr}, 10, 64); return v }()`;
		if (b === 'int') return `func() int { v, _ := strconv.Atoi(${expr}); return v }()`;
		if (b === 'bool') return `func() bool { v := ${expr}; return v == "true" || v == "1" }()`;
		return expr; // string
	};
	const read = sig.params
		.map((p) => {
			const b = base(p.type);
			if (isArr(p.type)) {
				return `_${p.name}n, _ := strconv.Atoi(_t()); ${p.name} := make(${goType(p.type)}, _${p.name}n); for _k := 0; _k < _${p.name}n; _k++ { ${p.name}[_k] = ${parseScalar(b, '_t()')} }`;
			}
			return `${p.name} := ${parseScalar(b, '_t()')}`;
		})
		.join('\n\t');
	const args = sig.params.map((p) => p.name).join(', ');
	const needStrings = isArr(sig.returnType);
	const imports = `"bufio"; "fmt"; "os"; "strconv"${needStrings ? '; "strings"' : ''}`;
	const harness = `package main\nimport (${imports})\n\n{{USER_CODE}}\n\nfunc main() {\n\tsc := bufio.NewScanner(os.Stdin); sc.Buffer(make([]byte, 1<<20), 1<<20); sc.Split(bufio.ScanWords)\n\t_t := func() string { sc.Scan(); return sc.Text() }\n\t${read}\n\t_res := ${sig.functionName}(${args})\n\t${goPrint(sig.returnType)}\n}\n`;
	return { starter, harness };
};
function goPrint(rt: AbstractType): string {
	if (isArr(rt)) {
		const conv =
			base(rt) === 'bool'
				? 'if _v { _s[_k] = "true" } else { _s[_k] = "false" }'
				: base(rt) === 'string'
					? '_s[_k] = _v'
					: '_s[_k] = fmt.Sprint(_v)';
		return `_s := make([]string, len(_res)); for _k, _v := range _res { ${conv} }; fmt.Println(strings.Join(_s, " "))`;
	}
	if (base(rt) === 'bool') return 'if _res { fmt.Println("true") } else { fmt.Println("false") }';
	return 'fmt.Println(_res)';
}

// ---------------------------------------------------------------- Rust
const rustType = (t: AbstractType): string => {
	const m: Record<BaseType, string> = { int: 'i64', long: 'i64', bool: 'bool', string: 'String' };
	return isArr(t) ? `Vec<${m[base(t)]}>` : m[base(t)];
};
const rust: Gen = (sig) => {
	const starter = `fn ${sig.functionName}(${sig.params
		.map((p) => `${p.name}: ${rustType(p.type)}`)
		.join(', ')}) -> ${rustType(sig.returnType)} {\n    // TODO: implementa la función\n}\n`;
	const readScalar = (b: BaseType, into: string) => {
		if (b === 'bool') return `let ${into} = { let v = _t[_pos].clone(); _pos += 1; v == "true" || v == "1" };`;
		if (b === 'string') return `let ${into} = { let v = _t[_pos].clone(); _pos += 1; v };`;
		return `let ${into}: i64 = { let v = _t[_pos].parse().unwrap(); _pos += 1; v };`;
	};
	const read = sig.params
		.map((p) => {
			const b = base(p.type);
			if (isArr(p.type)) {
				const push =
					b === 'string'
						? `${p.name}.push(_t[_pos].clone()); _pos += 1;`
						: `${p.name}.push(_t[_pos].parse().unwrap()); _pos += 1;`;
				return `let _${p.name}n: usize = { let v = _t[_pos].parse().unwrap(); _pos += 1; v }; let mut ${p.name}: ${rustType(p.type)} = Vec::new(); for _ in 0.._${p.name}n { ${push} }`;
			}
			return readScalar(b, p.name);
		})
		.join('\n    ');
	const args = sig.params.map((p) => p.name).join(', ');
	const harness = `use std::io::*;\n\n{{USER_CODE}}\n\nfn main() {\n    let mut _s = String::new(); stdin().read_to_string(&mut _s).unwrap();\n    let _t: Vec<String> = _s.split_whitespace().map(|x| x.to_string()).collect();\n    let mut _pos = 0usize;\n    ${read}\n    let _res = ${sig.functionName}(${args});\n    ${rustPrint(sig.returnType)}\n}\n`;
	return { starter, harness };
};
function rustPrint(rt: AbstractType): string {
	if (isArr(rt)) {
		if (base(rt) === 'bool')
			return 'println!("{}", _res.iter().map(|x| if *x { "true".to_string() } else { "false".to_string() }).collect::<Vec<_>>().join(" "));';
		if (base(rt) === 'string') return 'println!("{}", _res.join(" "));';
		return 'println!("{}", _res.iter().map(|x| x.to_string()).collect::<Vec<_>>().join(" "));';
	}
	if (base(rt) === 'bool') return 'println!("{}", if _res { "true" } else { "false" });';
	return 'println!("{}", _res);';
}

// ---------------------------------------------------------------- C#
const csType = (t: AbstractType): string => {
	const m: Record<BaseType, string> = { int: 'int', long: 'long', bool: 'bool', string: 'string' };
	return isArr(t) ? `${m[base(t)]}[]` : m[base(t)];
};
const csharp: Gen = (sig) => {
	const starter = `static ${csType(sig.returnType)} ${sig.functionName}(${sig.params
		.map((p) => `${csType(p.type)} ${p.name}`)
		.join(', ')}) {\n    // TODO: implementa la función\n}\n`;
	const parse = (b: BaseType, expr: string) =>
		b === 'long' ? `long.Parse(${expr})` : b === 'string' ? expr : b === 'bool' ? `(${expr}.ToLower() == "true" || ${expr} == "1")` : `int.Parse(${expr})`;
	const read = sig.params
		.map((p) => {
			const b = base(p.type);
			if (isArr(p.type)) {
				return `int _${p.name}n = int.Parse(_t()); ${csType(p.type)} ${p.name} = new ${csType(base(p.type))}[_${p.name}n]; for (int _k = 0; _k < _${p.name}n; _k++) ${p.name}[_k] = ${parse(b, '_t()')};`;
			}
			if (b === 'bool') return `string _b${p.name} = _t().ToLower(); bool ${p.name} = (_b${p.name} == "true" || _b${p.name} == "1");`;
			return `${csType(p.type)} ${p.name} = ${parse(b, '_t()')};`;
		})
		.join('\n        ');
	const args = sig.params.map((p) => p.name).join(', ');
	const harness = `using System;\nusing System.Linq;\n\nclass Program {\n    {{USER_CODE}}\n\n    static string[] _T; static int _pos;\n    static string _t() { return _T[_pos++]; }\n    static void Main() {\n        _T = Console.In.ReadToEnd().Split(new[] { ' ', '\\n', '\\r', '\\t' }, StringSplitOptions.RemoveEmptyEntries); _pos = 0;\n        ${read}\n        var _res = ${sig.functionName}(${args});\n        ${csPrint(sig.returnType)}\n    }\n}\n`;
	return { starter, harness };
};
function csPrint(rt: AbstractType): string {
	if (isArr(rt)) {
		if (base(rt) === 'bool') return 'Console.WriteLine(string.Join(" ", _res.Select(x => x ? "true" : "false")));';
		return 'Console.WriteLine(string.Join(" ", _res));';
	}
	if (base(rt) === 'bool') return 'Console.WriteLine(_res ? "true" : "false");';
	return 'Console.WriteLine(_res);';
}

// ---------------------------------------------------------------- Ruby
const ruby: Gen = (sig) => {
	const starter = `def ${sig.functionName}(${sig.params.map((p) => p.name).join(', ')})\n  # TODO: implementa la función\nend\n`;
	const read = sig.params
		.map((p) => {
			const b = base(p.type);
			if (isArr(p.type)) {
				const conv = b === 'string' ? '_nx.call' : '_nx.call.to_i';
				return `${p.name} = Array.new(_nx.call.to_i) { ${conv} }`;
			}
			if (b === 'bool') return `${p.name} = ["true", "1"].include?(_nx.call.downcase)`;
			if (b === 'string') return `${p.name} = _nx.call`;
			return `${p.name} = _nx.call.to_i`;
		})
		.join('\n');
	const args = sig.params.map((p) => p.name).join(', ');
	const harness = `{{USER_CODE}}\n\n_T = STDIN.read.split\n_pos = 0\n_nx = -> { v = _T[_pos]; _pos += 1; v }\n${read}\n_res = ${sig.functionName}(${args})\n${rubyPrint(sig.returnType)}\n`;
	return { starter, harness };
};
function rubyPrint(rt: AbstractType): string {
	if (isArr(rt)) {
		if (base(rt) === 'bool') return 'puts _res.map { |x| x ? "true" : "false" }.join(" ")';
		return 'puts _res.join(" ")';
	}
	if (base(rt) === 'bool') return 'puts(_res ? "true" : "false")';
	return 'puts _res';
}

const GENERATORS: Record<string, Gen> = { python: py, javascript: js, typescript: ts, java, cpp, go, rust, csharp, ruby };

/** Generate { starter, harness } for every supported language. */
export function generateTemplates(sig: Signature): Record<string, { starter: string; harness: string }> {
	const out: Record<string, { starter: string; harness: string }> = {};
	for (const [lang, gen] of Object.entries(GENERATORS)) out[lang] = gen(sig);
	return out;
}

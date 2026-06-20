/**
 * Languages offered to students, mapped to Piston runtimes installed on the
 * engine (GET /api/v2/runtimes). Verify versions match your Piston instance.
 */
export interface Language {
	key: string;
	label: string;
	/** Piston runtime identifiers */
	piston: { language: string; version: string };
	/** File name Piston writes the source to (extension/class name matter) */
	fileName: string;
	/** CodeMirror highlighting key (see lib/components/CodeEditor.svelte) */
	cm: 'python' | 'cpp' | 'java' | 'javascript' | 'typescript' | 'go' | 'rust' | 'csharp' | 'ruby';
	starter: string;
}

export const LANGUAGES: Language[] = [
	{
		key: 'python',
		label: 'Python 3',
		piston: { language: 'python', version: '3.12.0' },
		fileName: 'main.py',
		cm: 'python',
		starter: '# Lee de stdin, escribe en stdout\n'
	},
	{
		key: 'cpp',
		label: 'C++ (GCC)',
		piston: { language: 'c++', version: '10.2.0' },
		fileName: 'main.cpp',
		cm: 'cpp',
		starter:
			'#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n'
	},
	{
		key: 'c',
		label: 'C (GCC)',
		piston: { language: 'c', version: '10.2.0' },
		fileName: 'main.c',
		cm: 'cpp',
		starter: '#include <stdio.h>\n\nint main(void) {\n    \n    return 0;\n}\n'
	},
	{
		key: 'java',
		label: 'Java',
		piston: { language: 'java', version: '15.0.2' },
		fileName: 'Main.java', // class must be named Main
		cm: 'java',
		starter:
			'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n'
	},
	{
		key: 'javascript',
		label: 'JavaScript (Node)',
		piston: { language: 'javascript', version: '20.11.1' },
		fileName: 'main.js',
		cm: 'javascript',
		starter: '// Lee de stdin, escribe en stdout\n'
	},
	{
		key: 'typescript',
		label: 'TypeScript',
		// Piston's tsc has no @types/node, so Node APIs (require/process) fail
		// type-checking. @ts-nocheck lets it compile+run — we judge runtime output.
		piston: { language: 'typescript', version: '5.0.3' },
		fileName: 'main.ts',
		cm: 'typescript',
		starter: '// @ts-nocheck\n// Lee de stdin, escribe en stdout\n'
	},
	{
		key: 'go',
		label: 'Go',
		piston: { language: 'go', version: '1.16.2' },
		fileName: 'main.go',
		cm: 'go',
		starter:
			'package main\n\nimport "fmt"\n\nfunc main() {\n\t_ = fmt.Sprint\n}\n'
	},
	{
		key: 'rust',
		label: 'Rust',
		piston: { language: 'rust', version: '1.68.2' },
		fileName: 'main.rs',
		cm: 'rust',
		starter: 'use std::io::*;\n\nfn main() {\n    \n}\n'
	},
	{
		key: 'csharp',
		label: 'C# (Mono)',
		piston: { language: 'csharp', version: '6.12.0' },
		fileName: 'main.cs',
		cm: 'csharp',
		starter:
			'using System;\n\nclass Program {\n    static void Main() {\n        \n    }\n}\n'
	},
	{
		key: 'ruby',
		label: 'Ruby',
		piston: { language: 'ruby', version: '3.0.1' },
		fileName: 'main.rb',
		cm: 'ruby',
		starter: '# Lee de stdin, escribe en stdout\n'
	}
];

export const LANGUAGE_BY_KEY = new Map(LANGUAGES.map((l) => [l.key, l]));

export function getLanguage(key: string): Language | undefined {
	return LANGUAGE_BY_KEY.get(key);
}

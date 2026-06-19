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
	/** CodeMirror language key (see lib/components/CodeEditor.svelte) */
	cm: 'python' | 'cpp' | 'java';
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
	}
];

export const LANGUAGE_BY_KEY = new Map(LANGUAGES.map((l) => [l.key, l]));

export function getLanguage(key: string): Language | undefined {
	return LANGUAGE_BY_KEY.get(key);
}

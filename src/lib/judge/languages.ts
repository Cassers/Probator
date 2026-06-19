/**
 * Languages offered to students, mapped to Judge0 CE language IDs.
 * These IDs are stable in Judge0 CE; verify against GET /languages on your
 * instance if you swap Judge0 versions.
 */
export interface Language {
	key: string;
	label: string;
	judge0Id: number;
	/** CodeMirror language key (see lib/components/CodeEditor.svelte) */
	cm: 'python' | 'cpp' | 'java';
	starter: string;
}

export const LANGUAGES: Language[] = [
	{
		key: 'python',
		label: 'Python 3',
		judge0Id: 71,
		cm: 'python',
		starter: '# Lee de stdin, escribe en stdout\n'
	},
	{
		key: 'cpp',
		label: 'C++ (GCC)',
		judge0Id: 54,
		cm: 'cpp',
		starter: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n'
	},
	{
		key: 'c',
		label: 'C (GCC)',
		judge0Id: 50,
		cm: 'cpp',
		starter: '#include <stdio.h>\n\nint main(void) {\n    \n    return 0;\n}\n'
	},
	{
		key: 'java',
		label: 'Java',
		judge0Id: 62,
		cm: 'java',
		starter: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n'
	}
];

export const LANGUAGE_BY_KEY = new Map(LANGUAGES.map((l) => [l.key, l]));

export function getLanguage(key: string): Language | undefined {
	return LANGUAGE_BY_KEY.get(key);
}

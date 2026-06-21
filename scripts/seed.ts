/**
 * Seeds Probator with a few sample problems so you can test the full flow
 * end to end. Run with: pnpm db:seed
 *
 * Standalone script (runs outside SvelteKit) — reads DATABASE_URL from .env.
 */
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { problems, testCases, languageTemplates } from '../src/lib/server/db/schema';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

interface SeedCase {
	stdin: string;
	expected: string;
	sample?: boolean;
}
interface SeedTemplate {
	starter: string;
	harness: string; // includes {{USER_CODE}}
}
interface SeedProblem {
	slug: string;
	title: string;
	difficulty: string;
	statement: string;
	mode?: 'stdio' | 'function';
	cases: SeedCase[];
	templates?: Record<string, SeedTemplate>;
}

const data: SeedProblem[] = [
	{
		slug: 'suma-dos-numeros',
		title: 'Suma de dos números',
		difficulty: 'easy',
		mode: 'function',
		statement:
			'Implementa la función que recibe dos enteros A y B.\n' +
			'Devuelve la suma de ambos.\n\n' +
			'Restricciones: -10^9 ≤ A, B ≤ 10^9\n' +
			'Ejemplo: A = 2, B = 3 → 5',
		cases: [
			{ stdin: '2 3\n', expected: '5\n', sample: true },
			{ stdin: '-4 10\n', expected: '6\n', sample: true },
			{ stdin: '1000000000 1000000000\n', expected: '2000000000\n' },
			{ stdin: '0 0\n', expected: '0\n' }
		],
		templates: {
			python: {
				starter: 'def suma_dos_numeros(a, b):\n    # devuelve la suma de a y b\n    pass\n',
				harness: '{{USER_CODE}}\n\nimport sys\na, b = map(int, sys.stdin.read().split())\nprint(suma_dos_numeros(a, b))\n'
			},
			cpp: {
				starter: 'int suma_dos_numeros(int a, int b) {\n    // devuelve la suma de a y b\n    return 0;\n}\n',
				harness: '#include <bits/stdc++.h>\nusing namespace std;\n\n{{USER_CODE}}\n\nint main() {\n    int a, b;\n    if (cin >> a >> b) cout << suma_dos_numeros(a, b) << endl;\n    return 0;\n}\n'
			},
			c: {
				starter: 'int suma_dos_numeros(int a, int b) {\n    /* devuelve la suma de a y b */\n    return 0;\n}\n',
				harness: '#include <stdio.h>\n\n{{USER_CODE}}\n\nint main(void) {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) printf("%d\\n", suma_dos_numeros(a, b));\n    return 0;\n}\n'
			},
			java: {
				starter: 'static int sumaDosNumeros(int a, int b) {\n    // devuelve la suma de a y b\n    return 0;\n}\n',
				harness: 'import java.util.*;\n\npublic class Main {\n    {{USER_CODE}}\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int a = sc.nextInt();\n            int b = sc.nextInt();\n            System.out.println(sumaDosNumeros(a, b));\n        }\n    }\n}\n'
			},
			javascript: {
				starter: "function sumaDosNumeros(a, b) {\n  // devuelve la suma de a y b\n}\n",
				harness: "{{USER_CODE}}\nconst A=require(\"fs\").readFileSync(0,\"utf8\").trim().split(/\\s+/).filter(s=>s.length).map(Number);\nconsole.log(sumaDosNumeros(A[0], A[1]));\n"
			},
			typescript: {
				starter: "function sumaDosNumeros(a: number, b: number): number {\n  // devuelve la suma de a y b\n  return 0;\n}\n",
				harness: "// @ts-nocheck\n{{USER_CODE}}\nconst A=require(\"fs\").readFileSync(0,\"utf8\").trim().split(/\\s+/).filter(s=>s.length).map(Number);\nconsole.log(sumaDosNumeros(A[0], A[1]));\n"
			},
			go: {
				starter: "func sumaDosNumeros(a, b int) int {\n\t// devuelve la suma de a y b\n\treturn 0\n}\n",
				harness: "package main\nimport(\"bufio\";\"fmt\";\"os\";\"strconv\")\n{{USER_CODE}}\nfunc main(){sc:=bufio.NewScanner(os.Stdin);sc.Buffer(make([]byte,1048576),1048576);sc.Split(bufio.ScanWords);A:=[]int{};for sc.Scan(){v,_:=strconv.Atoi(sc.Text());A=append(A,v)};fmt.Println(sumaDosNumeros(A[0],A[1]))}\n"
			},
			rust: {
				starter: "fn suma_dos_numeros(a: i64, b: i64) -> i64 {\n    // devuelve la suma de a y b\n    0\n}\n",
				harness: "use std::io::*;\n{{USER_CODE}}\nfn main(){let mut s=String::new();stdin().read_to_string(&mut s).unwrap();let a:Vec<i64>=s.split_whitespace().map(|x|x.parse().unwrap()).collect();println!(\"{}\",suma_dos_numeros(a[0],a[1]));}\n"
			},
			csharp: {
				starter: "static long SumaDosNumeros(long a, long b) {\n    // devuelve la suma de a y b\n    return 0;\n}\n",
				harness: "using System;using System.Linq;\nclass Program{\n{{USER_CODE}}\nstatic void Main(){var a=Console.In.ReadToEnd().Split(new[]{' ','\\n','\\r','\\t'},StringSplitOptions.RemoveEmptyEntries).Select(long.Parse).ToArray();Console.WriteLine(SumaDosNumeros(a[0],a[1]));}}\n"
			},
			ruby: {
				starter: "def suma_dos_numeros(a, b)\n  # devuelve la suma de a y b\nend\n",
				harness: "{{USER_CODE}}\na=STDIN.read.split.map(&:to_i)\nputs(suma_dos_numeros(a[0],a[1]))\n"
			}
		}
	},
	{
		slug: 'maximo-de-lista',
		title: 'Máximo de una lista',
		difficulty: 'easy',
		mode: 'function',
		statement:
			'Implementa la función que recibe una lista de enteros y devuelve el valor máximo.\n' +
			'El tamaño de la lista N será (1 ≤ N ≤ 1000).\n\n' +
			'Ejemplo: [3, 1, 4, 1, 5] → 5',
		cases: [
			{ stdin: '5\n3 1 4 1 5\n', expected: '5\n', sample: true },
			{ stdin: '1\n-7\n', expected: '-7\n', sample: true },
			{ stdin: '4\n-10 -20 -3 -5\n', expected: '-3\n' },
			{ stdin: '6\n100 99 100 1 2 3\n', expected: '100\n' }
		],
		templates: {
			python: {
				starter: 'def maximo_lista(nums):\n    # nums: lista de enteros. Devuelve el máximo.\n    pass\n',
				harness: '{{USER_CODE}}\n\nimport sys\nlines = sys.stdin.read().split()\nif len(lines) > 1:\n    nums = list(map(int, lines[1:]))\n    print(maximo_lista(nums))\n'
			},
			cpp: {
				starter: 'int maximo_lista(vector<int>& nums) {\n    // devuelve el valor máximo\n    return 0;\n}\n',
				harness: '#include <bits/stdc++.h>\nusing namespace std;\n\n{{USER_CODE}}\n\nint main() {\n    int n, x; vector<int> nums;\n    if (cin >> n) {\n        while (n-- && cin >> x) nums.push_back(x);\n        cout << maximo_lista(nums) << endl;\n    }\n    return 0;\n}\n'
			},
			c: {
				starter: 'int maximo_lista(int* nums, int n) {\n    /* devuelve el valor máximo */\n    return 0;\n}\n',
				harness: '#include <stdio.h>\n\n{{USER_CODE}}\n\nint main(void) {\n    static int buf[1000]; int n, i = 0;\n    if (scanf("%d", &n) == 1) {\n        while (i < n && scanf("%d", &buf[i]) == 1) i++;\n        printf("%d\\n", maximo_lista(buf, i));\n    }\n    return 0;\n}\n'
			},
			java: {
				starter: 'static int maximoLista(int[] nums) {\n    // devuelve el valor máximo\n    return 0;\n}\n',
				harness: 'import java.util.*;\n\npublic class Main {\n    {{USER_CODE}}\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            int[] nums = new int[n];\n            for (int i = 0; i < n && sc.hasNextInt(); i++) nums[i] = sc.nextInt();\n            System.out.println(maximoLista(nums));\n        }\n    }\n}\n'
			},
			javascript: {
				starter: "function maximoLista(nums) {\n  // devuelve el valor máximo\n}\n",
				harness: "{{USER_CODE}}\nconst A=require(\"fs\").readFileSync(0,\"utf8\").trim().split(/\\s+/).filter(s=>s.length).map(Number);\nconsole.log(maximoLista(A.slice(1)));\n"
			},
			typescript: {
				starter: "function maximoLista(nums: number[]): number {\n  // devuelve el valor máximo\n  return 0;\n}\n",
				harness: "// @ts-nocheck\n{{USER_CODE}}\nconst A=require(\"fs\").readFileSync(0,\"utf8\").trim().split(/\\s+/).filter(s=>s.length).map(Number);\nconsole.log(maximoLista(A.slice(1)));\n"
			},
			go: {
				starter: "func maximoLista(nums []int) int {\n\t// devuelve el valor máximo\n\treturn 0\n}\n",
				harness: "package main\nimport(\"bufio\";\"fmt\";\"os\";\"strconv\")\n{{USER_CODE}}\nfunc main(){sc:=bufio.NewScanner(os.Stdin);sc.Buffer(make([]byte,1048576),1048576);sc.Split(bufio.ScanWords);A:=[]int{};for sc.Scan(){v,_:=strconv.Atoi(sc.Text());A=append(A,v)};fmt.Println(maximoLista(A[1:]))}\n"
			},
			rust: {
				starter: "fn maximo_lista(nums: Vec<i64>) -> i64 {\n    // devuelve el valor máximo\n    0\n}\n",
				harness: "use std::io::*;\n{{USER_CODE}}\nfn main(){let mut s=String::new();stdin().read_to_string(&mut s).unwrap();let a:Vec<i64>=s.split_whitespace().map(|x|x.parse().unwrap()).collect();println!(\"{}\",maximo_lista(a[1..].to_vec()));}\n"
			},
			csharp: {
				starter: "static long MaximoLista(long[] nums) {\n    // devuelve el valor máximo\n    return 0;\n}\n",
				harness: "using System;using System.Linq;\nclass Program{\n{{USER_CODE}}\nstatic void Main(){var a=Console.In.ReadToEnd().Split(new[]{' ','\\n','\\r','\\t'},StringSplitOptions.RemoveEmptyEntries).Select(long.Parse).ToArray();Console.WriteLine(MaximoLista(a.Skip(1).ToArray()));}}\n"
			},
			ruby: {
				starter: "def maximo_lista(nums)\n  # devuelve el valor máximo\nend\n",
				harness: "{{USER_CODE}}\na=STDIN.read.split.map(&:to_i)\nputs(maximo_lista(a[1..]))\n"
			}
		}
	},
	{
		slug: 'es-primo',
		title: '¿Es primo?',
		difficulty: 'medium',
		mode: 'function',
		statement:
			'Implementa una función que reciba un entero N (1 ≤ N ≤ 10^9) y devuelva si es primo.\n' +
			'El sistema verificará tu respuesta automáticamente imprimiendo "YES" o "NO".\n\n' +
			'Ejemplo: 7 → YES\n' +
			'Ejemplo: 1000000 → NO',
		cases: [
			{ stdin: '7\n', expected: 'YES\n', sample: true },
			{ stdin: '1\n', expected: 'NO\n', sample: true },
			{ stdin: '2\n', expected: 'YES\n' },
			{ stdin: '1000000007\n', expected: 'YES\n' },
			{ stdin: '1000000\n', expected: 'NO\n' }
		],
		templates: {
			python: {
				starter: 'def es_primo(n):\n    # devuelve True si n es primo, False en caso contrario\n    return False\n',
				harness: '{{USER_CODE}}\n\nimport sys\nn = int(sys.stdin.read().strip())\nprint("YES" if es_primo(n) else "NO")\n'
			},
			cpp: {
				starter: 'bool es_primo(long long n) {\n    // devuelve true si n es primo\n    return false;\n}\n',
				harness: '#include <bits/stdc++.h>\nusing namespace std;\n\n{{USER_CODE}}\n\nint main() {\n    long long n;\n    if (cin >> n) cout << (es_primo(n) ? "YES" : "NO") << endl;\n    return 0;\n}\n'
			},
			c: {
				starter: 'int es_primo(long long n) {\n    /* devuelve 1 si n es primo, 0 en caso contrario */\n    return 0;\n}\n',
				harness: '#include <stdio.h>\n\n{{USER_CODE}}\n\nint main(void) {\n    long long n;\n    if (scanf("%lld", &n) == 1) printf("%s\\n", es_primo(n) ? "YES" : "NO");\n    return 0;\n}\n'
			},
			java: {
				starter: 'static boolean esPrimo(long n) {\n    // devuelve true si n es primo\n    return false;\n}\n',
				harness: 'import java.util.*;\n\npublic class Main {\n    {{USER_CODE}}\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLong()) {\n            long n = sc.nextLong();\n            System.out.println(esPrimo(n) ? "YES" : "NO");\n        }\n    }\n}\n'
			},
			javascript: {
				starter: "function esPrimo(n) {\n  // devuelve true si n es primo\n  return false;\n}\n",
				harness: "{{USER_CODE}}\nconst A=require(\"fs\").readFileSync(0,\"utf8\").trim().split(/\\s+/).filter(s=>s.length).map(Number);\nconsole.log(esPrimo(A[0])?\"YES\":\"NO\");\n"
			},
			typescript: {
				starter: "function esPrimo(n: number): boolean {\n  // devuelve true si n es primo\n  return false;\n}\n",
				harness: "// @ts-nocheck\n{{USER_CODE}}\nconst A=require(\"fs\").readFileSync(0,\"utf8\").trim().split(/\\s+/).filter(s=>s.length).map(Number);\nconsole.log(esPrimo(A[0])?\"YES\":\"NO\");\n"
			},
			go: {
				starter: "func esPrimo(n int) bool {\n\t// devuelve true si n es primo\n\treturn false\n}\n",
				harness: "package main\nimport(\"bufio\";\"fmt\";\"os\";\"strconv\")\n{{USER_CODE}}\nfunc main(){sc:=bufio.NewScanner(os.Stdin);sc.Buffer(make([]byte,1048576),1048576);sc.Split(bufio.ScanWords);A:=[]int{};for sc.Scan(){v,_:=strconv.Atoi(sc.Text());A=append(A,v)};r:=\"NO\";if esPrimo(A[0]){r=\"YES\"};fmt.Println(r)}\n"
			},
			rust: {
				starter: "fn es_primo(n: i64) -> bool {\n    // devuelve true si n es primo\n    false\n}\n",
				harness: "use std::io::*;\n{{USER_CODE}}\nfn main(){let mut s=String::new();stdin().read_to_string(&mut s).unwrap();let a:Vec<i64>=s.split_whitespace().map(|x|x.parse().unwrap()).collect();println!(\"{}\",if es_primo(a[0]){\"YES\"}else{\"NO\"});}\n"
			},
			csharp: {
				starter: "static bool EsPrimo(long n) {\n    // devuelve true si n es primo\n    return false;\n}\n",
				harness: "using System;using System.Linq;\nclass Program{\n{{USER_CODE}}\nstatic void Main(){var a=Console.In.ReadToEnd().Split(new[]{' ','\\n','\\r','\\t'},StringSplitOptions.RemoveEmptyEntries).Select(long.Parse).ToArray();Console.WriteLine(EsPrimo(a[0])?\"YES\":\"NO\");}}\n"
			},
			ruby: {
				starter: "def es_primo(n)\n  # devuelve true si n es primo\n  false\nend\n",
				harness: "{{USER_CODE}}\na=STDIN.read.split.map(&:to_i)\nputs(es_primo(a[0]) ? \"YES\" : \"NO\")\n"
			}
		}
	},
	{
		slug: 'suma-de-arreglo',
		title: 'Suma de un arreglo (modo función)',
		difficulty: 'easy',
		mode: 'function',
		statement:
			'Implementa la función que recibe un arreglo de enteros y devuelve la suma\n' +
			'de todos sus elementos. No tienes que leer la entrada: el sistema llama a tu\n' +
			'función con el arreglo ya parseado.\n\nEjemplo: [1, 2, 3, 4, 5] → 15',
		cases: [
			{ stdin: '1 2 3 4 5\n', expected: '15\n', sample: true },
			{ stdin: '-5 5\n', expected: '0\n', sample: true },
			{ stdin: '100\n', expected: '100\n' },
			{ stdin: '0 0 0\n', expected: '0\n' },
			{ stdin: '10 20 30 40\n', expected: '100\n' }
		],
		templates: {
			python: {
				starter: 'def suma_arreglo(nums):\n    # nums: lista de enteros. Devuelve su suma.\n    pass\n',
				harness: '{{USER_CODE}}\n\nimport sys\nnums = list(map(int, sys.stdin.read().split()))\nprint(suma_arreglo(nums))\n'
			},
			cpp: {
				starter: 'int suma_arreglo(vector<int>& nums) {\n    // devuelve la suma de nums\n    return 0;\n}\n',
				harness: '#include <bits/stdc++.h>\nusing namespace std;\n\n{{USER_CODE}}\n\nint main() {\n    vector<int> nums; int x;\n    while (cin >> x) nums.push_back(x);\n    cout << suma_arreglo(nums) << endl;\n    return 0;\n}\n'
			},
			c: {
				starter: 'int suma_arreglo(int* nums, int n) {\n    /* devuelve la suma de los n elementos */\n    return 0;\n}\n',
				harness: '#include <stdio.h>\n\n{{USER_CODE}}\n\nint main(void) {\n    static int buf[100000]; int n = 0;\n    while (scanf("%d", &buf[n]) == 1) n++;\n    printf("%d\\n", suma_arreglo(buf, n));\n    return 0;\n}\n'
			},
			java: {
				starter: 'static int sumaArreglo(int[] nums) {\n    // devuelve la suma de nums\n    return 0;\n}\n',
				harness: 'import java.util.*;\n\npublic class Main {\n    {{USER_CODE}}\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        ArrayList<Integer> l = new ArrayList<>();\n        while (sc.hasNextInt()) l.add(sc.nextInt());\n        int[] nums = new int[l.size()];\n        for (int i = 0; i < l.size(); i++) nums[i] = l.get(i);\n        System.out.println(sumaArreglo(nums));\n    }\n}\n'
			},
			javascript: {
				starter: "function sumaArreglo(nums) {\n  // devuelve la suma de nums\n}\n",
				harness: "{{USER_CODE}}\nconst A=require(\"fs\").readFileSync(0,\"utf8\").trim().split(/\\s+/).filter(s=>s.length).map(Number);\nconsole.log(sumaArreglo(A));\n"
			},
			typescript: {
				starter: "function sumaArreglo(nums: number[]): number {\n  // devuelve la suma de nums\n  return 0;\n}\n",
				harness: "// @ts-nocheck\n{{USER_CODE}}\nconst A=require(\"fs\").readFileSync(0,\"utf8\").trim().split(/\\s+/).filter(s=>s.length).map(Number);\nconsole.log(sumaArreglo(A));\n"
			},
			go: {
				starter: "func sumaArreglo(nums []int) int {\n\t// devuelve la suma de nums\n\treturn 0\n}\n",
				harness: "package main\nimport(\"bufio\";\"fmt\";\"os\";\"strconv\")\n{{USER_CODE}}\nfunc main(){sc:=bufio.NewScanner(os.Stdin);sc.Buffer(make([]byte,1048576),1048576);sc.Split(bufio.ScanWords);A:=[]int{};for sc.Scan(){v,_:=strconv.Atoi(sc.Text());A=append(A,v)};fmt.Println(sumaArreglo(A))}\n"
			},
			rust: {
				starter: "fn suma_arreglo(nums: Vec<i64>) -> i64 {\n    // devuelve la suma de nums\n    0\n}\n",
				harness: "use std::io::*;\n{{USER_CODE}}\nfn main(){let mut s=String::new();stdin().read_to_string(&mut s).unwrap();let a:Vec<i64>=s.split_whitespace().map(|x|x.parse().unwrap()).collect();println!(\"{}\",suma_arreglo(a.clone()));}\n"
			},
			csharp: {
				starter: "static long SumaArreglo(long[] nums) {\n    // devuelve la suma de nums\n    return 0;\n}\n",
				harness: "using System;using System.Linq;\nclass Program{\n{{USER_CODE}}\nstatic void Main(){var a=Console.In.ReadToEnd().Split(new[]{' ','\\n','\\r','\\t'},StringSplitOptions.RemoveEmptyEntries).Select(long.Parse).ToArray();Console.WriteLine(SumaArreglo(a));}}\n"
			},
			ruby: {
				starter: "def suma_arreglo(nums)\n  # devuelve la suma de nums\nend\n",
				harness: "{{USER_CODE}}\na=STDIN.read.split.map(&:to_i)\nputs(suma_arreglo(a))\n"
			}
		}
	}
];

async function main() {
	// Seed only when the DB is empty, so edits made via the admin panel survive
	// redeploys. Force a reseed by truncating the problems table.
	const existing = await db.select({ id: problems.id }).from(problems).limit(1);
	if (existing.length > 0) {
		console.log('Probator ya tiene problemas — omito el seed (las ediciones del admin se conservan).');
		await client.end();
		return;
	}
	console.log('Seeding Probator…');
	for (const p of data) {
		const modeVal = p.mode ?? 'stdio';
		const [row] = await db
			.insert(problems)
			.values({
				slug: p.slug,
				title: p.title,
				difficulty: p.difficulty,
				statement: p.statement,
				mode: modeVal
			})
			.onConflictDoUpdate({ 
				target: problems.slug,
				set: {
					title: p.title,
					difficulty: p.difficulty,
					statement: p.statement,
					mode: modeVal
				}
			})
			.returning({ id: problems.id });

		if (!row) {
			console.log(`  · ${p.slug} error al hacer upsert`);
			continue;
		}

		// Limpiar dependencias existentes para este problema (casos y plantillas)
		// De esta manera podemos actualizar los casos o cambiar de modo libremente
		await db.delete(testCases).where(eq(testCases.problemId, row.id));
		await db.delete(languageTemplates).where(eq(languageTemplates.problemId, row.id));

		await db.insert(testCases).values(
			p.cases.map((c, i) => ({
				problemId: row.id,
				ordinal: i,
				stdin: c.stdin,
				expectedOutput: c.expected,
				isSample: c.sample ?? false
			}))
		);

		if (p.templates) {
			await db.insert(languageTemplates).values(
				Object.entries(p.templates).map(([language, t]) => ({
					problemId: row.id,
					language,
					starter: t.starter,
					harness: t.harness
				}))
			);
		}
		const extra = p.templates ? `, ${Object.keys(p.templates).length} templates` : '';
		console.log(`  ✓ ${p.slug} (${p.cases.length} casos${extra}) [Modo: ${modeVal}]`);
	}
	await client.end();
	console.log('Listo.');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

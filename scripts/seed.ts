/**
 * Seeds Probator with a few sample problems so you can test the full flow
 * end to end. Run with: pnpm db:seed
 *
 * Standalone script (runs outside SvelteKit) — reads DATABASE_URL from .env.
 */
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { problems, testCases } from '../src/lib/server/db/schema';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

interface SeedCase {
	stdin: string;
	expected: string;
	sample?: boolean;
}
interface SeedProblem {
	slug: string;
	title: string;
	difficulty: string;
	statement: string;
	cases: SeedCase[];
}

const data: SeedProblem[] = [
	{
		slug: 'suma-dos-numeros',
		title: 'Suma de dos números',
		difficulty: 'easy',
		statement:
			'Lee dos enteros A y B en una sola línea separados por un espacio.\n' +
			'Imprime su suma.\n\nRestricciones: -10^9 ≤ A, B ≤ 10^9',
		cases: [
			{ stdin: '2 3\n', expected: '5\n', sample: true },
			{ stdin: '-4 10\n', expected: '6\n', sample: true },
			{ stdin: '1000000000 1000000000\n', expected: '2000000000\n' },
			{ stdin: '0 0\n', expected: '0\n' }
		]
	},
	{
		slug: 'maximo-de-lista',
		title: 'Máximo de una lista',
		difficulty: 'easy',
		statement:
			'La primera línea contiene N (1 ≤ N ≤ 1000).\n' +
			'La segunda línea contiene N enteros separados por espacios.\n' +
			'Imprime el valor máximo.',
		cases: [
			{ stdin: '5\n3 1 4 1 5\n', expected: '5\n', sample: true },
			{ stdin: '1\n-7\n', expected: '-7\n', sample: true },
			{ stdin: '4\n-10 -20 -3 -5\n', expected: '-3\n' },
			{ stdin: '6\n100 99 100 1 2 3\n', expected: '100\n' }
		]
	},
	{
		slug: 'es-primo',
		title: '¿Es primo?',
		difficulty: 'medium',
		statement:
			'Lee un entero N (1 ≤ N ≤ 10^9).\n' +
			'Imprime "YES" si N es primo, o "NO" en caso contrario.',
		cases: [
			{ stdin: '7\n', expected: 'YES\n', sample: true },
			{ stdin: '1\n', expected: 'NO\n', sample: true },
			{ stdin: '2\n', expected: 'YES\n' },
			{ stdin: '1000000007\n', expected: 'YES\n' },
			{ stdin: '1000000\n', expected: 'NO\n' }
		]
	}
];

async function main() {
	console.log('Seeding Probator…');
	for (const p of data) {
		const [row] = await db
			.insert(problems)
			.values({
				slug: p.slug,
				title: p.title,
				difficulty: p.difficulty,
				statement: p.statement
			})
			.onConflictDoNothing({ target: problems.slug })
			.returning({ id: problems.id });

		if (!row) {
			console.log(`  · ${p.slug} ya existe, saltando`);
			continue;
		}

		await db.insert(testCases).values(
			p.cases.map((c, i) => ({
				problemId: row.id,
				ordinal: i,
				stdin: c.stdin,
				expectedOutput: c.expected,
				isSample: c.sample ?? false
			}))
		);
		console.log(`  ✓ ${p.slug} (${p.cases.length} casos)`);
	}
	await client.end();
	console.log('Listo.');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

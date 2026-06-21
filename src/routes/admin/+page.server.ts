import { db } from '$lib/server/db';
import { problems, testCases, submissions } from '$lib/server/db/schema';
import { asc, eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const list = await db
		.select({
			slug: problems.slug,
			title: problems.title,
			difficulty: problems.difficulty,
			mode: problems.mode,
			cases: sql<number>`(select count(*) from ${testCases} where ${testCases.problemId} = ${problems.id})`,
			submissions: sql<number>`(select count(*) from ${submissions} where ${submissions.problemId} = ${problems.id})`
		})
		.from(problems)
		.orderBy(asc(problems.id));
	return { problems: list };
};

import { db } from '$lib/server/db';
import { problems } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const list = await db
		.select({
			slug: problems.slug,
			title: problems.title,
			difficulty: problems.difficulty
		})
		.from(problems)
		.orderBy(asc(problems.id));
	return { problems: list };
};

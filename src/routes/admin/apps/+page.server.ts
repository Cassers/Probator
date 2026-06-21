import { db } from '$lib/server/db';
import { apps } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const list = await db
		.select({ id: apps.id, name: apps.name, createdAt: apps.createdAt })
		.from(apps)
		.orderBy(asc(apps.id));
	return { apps: list };
};

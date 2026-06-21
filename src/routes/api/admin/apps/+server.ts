import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { apps } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import { generateKey, hashKey } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const rows = await db
		.select({ id: apps.id, name: apps.name, createdAt: apps.createdAt })
		.from(apps)
		.orderBy(asc(apps.id));
	return json({ apps: rows });
};

/** Create an app and return its key ONCE (only the hash is stored). */
export const POST: RequestHandler = async ({ request }) => {
	const b = (await request.json().catch(() => null)) as { name?: string } | null;
	const name = (b?.name ?? '').trim();
	if (!name) throw error(400, 'Falta el nombre de la app');
	const key = generateKey();
	const [row] = await db
		.insert(apps)
		.values({ name, keyHash: hashKey(key) })
		.returning({ id: apps.id, name: apps.name });
	return json({ app: row, key });
};

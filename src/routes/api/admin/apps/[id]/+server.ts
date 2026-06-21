import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { apps } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

/** Revoke an app key. Its problems become system-owned (ownerAppId → null). */
export const DELETE: RequestHandler = async ({ params }) => {
	await db.delete(apps).where(eq(apps.id, Number(params.id)));
	return json({ ok: true });
};

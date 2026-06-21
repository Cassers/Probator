import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { problems, submissions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

/** Delete a problem (and its submissions; cases/templates cascade). */
export const DELETE: RequestHandler = async ({ params }) => {
	const [row] = await db.select({ id: problems.id }).from(problems).where(eq(problems.slug, params.slug)).limit(1);
	if (!row) throw error(404, 'Problema no encontrado');
	// submissions has no ON DELETE CASCADE — remove them first.
	await db.delete(submissions).where(eq(submissions.problemId, row.id));
	await db.delete(problems).where(eq(problems.id, row.id));
	return json({ ok: true });
};

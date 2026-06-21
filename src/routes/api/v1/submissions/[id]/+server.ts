import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { submissions, problems, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

/** GET /api/v1/submissions/:id — one submission, including its source code. */
export const GET: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(400, 'id inválido');

	const [row] = await db
		.select({
			id: submissions.id,
			problem: problems.slug,
			title: problems.title,
			language: submissions.language,
			sourceCode: submissions.sourceCode,
			verdict: submissions.verdict,
			passedCount: submissions.passedCount,
			totalCount: submissions.totalCount,
			runtimeMs: submissions.runtimeMs,
			createdAt: submissions.createdAt,
			discordId: users.discordId,
			username: users.username
		})
		.from(submissions)
		.leftJoin(problems, eq(problems.id, submissions.problemId))
		.leftJoin(users, eq(users.id, submissions.userId))
		.where(eq(submissions.id, id))
		.limit(1);

	if (!row) throw error(404, 'Envío no encontrado');
	return json(row);
};

import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { submissions, problems, users } from '$lib/server/db/schema';
import { eq, and, desc, gte, type SQL } from 'drizzle-orm';
import type { RequestHandler } from './$types';

/**
 * GET /api/v1/submissions — submissions newest-first.
 * Query: problem=<slug>, discordId=<id>, since=<ISO>, limit=<n≤200>, includeCode=true
 */
export const GET: RequestHandler = async ({ url }) => {
	const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 200);
	const slug = url.searchParams.get('problem');
	const discordId = url.searchParams.get('discordId');
	const since = url.searchParams.get('since');
	const includeCode = url.searchParams.get('includeCode') === 'true';

	const cols = {
		id: submissions.id,
		problem: problems.slug,
		title: problems.title,
		language: submissions.language,
		verdict: submissions.verdict,
		passedCount: submissions.passedCount,
		totalCount: submissions.totalCount,
		runtimeMs: submissions.runtimeMs,
		createdAt: submissions.createdAt,
		discordId: users.discordId,
		username: users.username,
		...(includeCode ? { sourceCode: submissions.sourceCode } : {})
	};

	const conds: SQL[] = [];
	if (slug) conds.push(eq(problems.slug, slug));
	if (discordId) conds.push(eq(users.discordId, discordId));
	if (since) {
		const d = new Date(since);
		if (!isNaN(d.getTime())) conds.push(gte(submissions.createdAt, d));
	}

	const rows = await db
		.select(cols)
		.from(submissions)
		.leftJoin(problems, eq(problems.id, submissions.problemId))
		.leftJoin(users, eq(users.id, submissions.userId))
		.where(conds.length ? and(...conds) : undefined)
		.orderBy(desc(submissions.createdAt))
		.limit(limit);

	return json({ submissions: rows });
};

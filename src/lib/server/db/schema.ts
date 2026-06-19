import {
	pgTable,
	serial,
	text,
	integer,
	boolean,
	timestamp,
	index
} from 'drizzle-orm/pg-core';

/**
 * A problem the student must solve. The statement is markdown.
 * Limits are passed through to Judge0 per submission.
 */
export const problems = pgTable('problems', {
	id: serial('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	title: text('title').notNull(),
	statement: text('statement').notNull(),
	difficulty: text('difficulty').notNull().default('easy'), // easy | medium | hard
	timeLimitMs: integer('time_limit_ms').notNull().default(2000),
	memoryLimitKb: integer('memory_limit_kb').notNull().default(128000),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * One input/output pair. `isSample` cases are shown to the student;
 * the rest are hidden and only their pass/fail is revealed.
 */
export const testCases = pgTable(
	'test_cases',
	{
		id: serial('id').primaryKey(),
		problemId: integer('problem_id')
			.notNull()
			.references(() => problems.id, { onDelete: 'cascade' }),
		ordinal: integer('ordinal').notNull().default(0),
		stdin: text('stdin').notNull().default(''),
		expectedOutput: text('expected_output').notNull().default(''),
		isSample: boolean('is_sample').notNull().default(false)
	},
	(t) => [index('test_cases_problem_idx').on(t.problemId)]
);

/**
 * A single graded attempt. verdict is the overall result;
 * passedCount/totalCount summarize the per-test outcome.
 */
export const submissions = pgTable(
	'submissions',
	{
		id: serial('id').primaryKey(),
		problemId: integer('problem_id')
			.notNull()
			.references(() => problems.id, { onDelete: 'cascade' }),
		language: text('language').notNull(), // key into lib/judge/languages.ts
		sourceCode: text('source_code').notNull(),
		verdict: text('verdict').notNull(), // Accepted | Wrong Answer | Time Limit Exceeded | ...
		passedCount: integer('passed_count').notNull().default(0),
		totalCount: integer('total_count').notNull().default(0),
		runtimeMs: integer('runtime_ms'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('submissions_problem_idx').on(t.problemId)]
);

export type Problem = typeof problems.$inferSelect;
export type TestCase = typeof testCases.$inferSelect;
export type Submission = typeof submissions.$inferSelect;

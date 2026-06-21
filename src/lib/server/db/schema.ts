import {
	pgTable,
	serial,
	text,
	integer,
	boolean,
	timestamp,
	jsonb,
	index
} from 'drizzle-orm/pg-core';
import type { Signature } from '$lib/judge/codegen';

/**
 * A problem the student must solve. The statement is markdown.
 * Limits are passed through to the engine per submission.
 *
 * mode:
 *  - 'stdio'    — student writes a full program that reads stdin / writes stdout.
 *  - 'function' — LeetCode-style: student implements a function; a per-language
 *    harness (see languageTemplates) wraps it to read input and print the result.
 */
export const problems = pgTable('problems', {
	id: serial('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	title: text('title').notNull(),
	statement: text('statement').notNull(),
	difficulty: text('difficulty').notNull().default('easy'), // easy | medium | hard
	mode: text('mode').notNull().default('stdio'), // stdio | function
	// Function signature (name + typed params + return type) used to generate
	// per-language starter/harness. Null for stdio problems.
	signature: jsonb('signature').$type<Signature>(),
	timeLimitMs: integer('time_limit_ms').notNull().default(2000),
	memoryLimitKb: integer('memory_limit_kb').notNull().default(128000),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * Per-language editing template for a problem. Only used in `function` mode.
 *  - starter: the function stub shown in the editor (what the student edits).
 *  - harness: trusted wrapper with a `{{USER_CODE}}` marker; the student's code
 *    is injected there server-side to form the full program sent to the engine.
 */
export const languageTemplates = pgTable(
	'language_templates',
	{
		id: serial('id').primaryKey(),
		problemId: integer('problem_id')
			.notNull()
			.references(() => problems.id, { onDelete: 'cascade' }),
		language: text('language').notNull(), // key into lib/judge/languages.ts
		starter: text('starter').notNull(),
		harness: text('harness').notNull()
	},
	(t) => [index('language_templates_problem_idx').on(t.problemId)]
);

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
		memoryKb: integer('memory_kb'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('submissions_problem_idx').on(t.problemId)]
);

export type Problem = typeof problems.$inferSelect;
export type TestCase = typeof testCases.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type LanguageTemplate = typeof languageTemplates.$inferSelect;

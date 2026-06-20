/**
 * In `function` mode the student only writes a function; the problem provides a
 * trusted per-language harness that reads input, calls that function and prints
 * the result. We inject the student's code where the harness marks it.
 */
export const USER_CODE_MARKER = '{{USER_CODE}}';

export function wrapSource(harness: string, userCode: string): string {
	if (harness.includes(USER_CODE_MARKER)) {
		return harness.split(USER_CODE_MARKER).join(userCode);
	}
	// No marker: put the student's code first, harness (with its main) after.
	return `${userCode}\n\n${harness}`;
}

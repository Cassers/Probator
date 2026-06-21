/**
 * Theme management with three states: light, dark, auto (follow the OS).
 * Default is 'auto'. Applied by toggling the `dark` class on <html>.
 */
export type Theme = 'light' | 'dark' | 'auto';
const KEY = 'theme';

export function getTheme(): Theme {
	if (typeof localStorage === 'undefined') return 'auto';
	const t = localStorage.getItem(KEY);
	return t === 'light' || t === 'dark' ? t : 'auto';
}

export function systemPrefersDark(): boolean {
	return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
}

export function isDark(theme: Theme = getTheme()): boolean {
	return theme === 'dark' || (theme === 'auto' && systemPrefersDark());
}

export function applyTheme(theme: Theme = getTheme()): void {
	if (typeof document !== 'undefined') {
		document.documentElement.classList.toggle('dark', isDark(theme));
	}
}

export function setTheme(theme: Theme): void {
	if (typeof localStorage !== 'undefined') {
		if (theme === 'auto') localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, theme);
	}
	applyTheme(theme);
}

/** Re-apply on OS theme change while in 'auto'. Returns a cleanup fn. */
export function watchSystem(): () => void {
	if (typeof matchMedia === 'undefined') return () => {};
	const mq = matchMedia('(prefers-color-scheme: dark)');
	const handler = () => {
		if (getTheme() === 'auto') applyTheme('auto');
	};
	mq.addEventListener('change', handler);
	return () => mq.removeEventListener('change', handler);
}

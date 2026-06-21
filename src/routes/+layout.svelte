<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const avatarUrl = $derived(
		data.user?.avatar
			? `https://cdn.discordapp.com/avatars/${data.user.discordId}/${data.user.avatar}.png?size=32`
			: null
	);

	let dark = $state(true);
	onMount(() => {
		dark = document.documentElement.classList.contains('dark');
	});
	function toggleTheme() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		try {
			localStorage.setItem('theme', dark ? 'dark' : 'light');
		} catch (e) {
			void e;
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen">
	<header class="border-b border-zinc-200 dark:border-zinc-800">
		<div class="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
			<a href="/" class="text-lg font-semibold tracking-tight">
				Probator<span class="text-emerald-500">.</span>
			</a>
			<span class="text-xs text-zinc-500">juez de algoritmia</span>

			<div class="ml-auto flex items-center gap-3">
				<button
					onclick={toggleTheme}
					title="Cambiar tema"
					aria-label="Cambiar tema"
					class="rounded border border-zinc-300 p-1.5 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
				>
					{#if dark}
						<!-- sun -->
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
					{:else}
						<!-- moon -->
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>
					{/if}
				</button>

				{#if data.user}
					<div class="flex items-center gap-2 text-sm">
						{#if avatarUrl}
							<img src={avatarUrl} alt="" class="h-6 w-6 rounded-full" />
						{/if}
						<span class="text-zinc-700 dark:text-zinc-300">{data.user.displayName || data.user.username}</span>
					</div>
					<form method="POST" action="/auth/logout">
						<button class="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
							Salir
						</button>
					</form>
				{:else if data.discordEnabled}
					<a
						href="/auth/discord"
						class="flex items-center gap-2 rounded bg-[#5865F2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4752c4]"
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
							<path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3c-.2.36-.43.84-.59 1.23a18.27 18.27 0 0 0-3.937 0A12.6 12.6 0 0 0 11.44 3a19.7 19.7 0 0 0-3.76 1.37C3.92 8.06 3.06 11.64 3.3 15.17a19.9 19.9 0 0 0 6.07 3.08c.49-.67.93-1.38 1.3-2.13-.71-.27-1.39-.6-2.03-.99.17-.13.34-.26.5-.4a14.2 14.2 0 0 0 12.12 0c.16.14.33.27.5.4-.64.39-1.32.72-2.03.99.37.75.81 1.46 1.3 2.13a19.9 19.9 0 0 0 6.07-3.08c.28-4.09-.74-7.64-3.08-10.8ZM9.55 13.6c-.97 0-1.77-.9-1.77-2s.78-2 1.77-2 1.78.9 1.77 2c0 1.1-.79 2-1.77 2Zm4.9 0c-.97 0-1.77-.9-1.77-2s.78-2 1.77-2 1.78.9 1.77 2c0 1.1-.78 2-1.77 2Z" />
						</svg>
						Entrar con Discord
					</a>
				{/if}
			</div>
		</div>
	</header>
	<main class="mx-auto max-w-5xl px-4 py-6">
		{@render children()}
	</main>
</div>

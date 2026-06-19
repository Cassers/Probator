<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen">
	<header class="border-b border-zinc-800">
		<div class="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
			<a href="/" class="text-lg font-semibold tracking-tight">
				Probator<span class="text-emerald-400">.</span>
			</a>
			<span class="text-xs text-zinc-500">juez de algoritmia</span>
		</div>
	</header>
	<main class="mx-auto max-w-5xl px-4 py-6">
		{@render children()}
	</main>
</div>

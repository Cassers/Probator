<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let query = $state('');
	const filtered = $derived(
		data.problems.filter((p) => {
			const q = query.trim().toLowerCase();
			return !q || p.title.toLowerCase().includes(q) || p.difficulty.toLowerCase().includes(q);
		})
	);

	const diffColor: Record<string, string> = {
		easy: 'text-emerald-500',
		medium: 'text-amber-500',
		hard: 'text-rose-500'
	};
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
	<h1 class="text-xl font-semibold">Problemas</h1>
	{#if data.problems.length > 0}
		<input
			type="search"
			bind:value={query}
			placeholder="Buscar problema…"
			class="w-full max-w-xs rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
		/>
	{/if}
</div>

{#if data.problems.length === 0}
	<p class="text-zinc-500">
		No hay problemas todavía. Corre <code class="text-zinc-600 dark:text-zinc-300">pnpm db:seed</code> para
		cargar los de ejemplo.
	</p>
{:else}
	<ul class="divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
		{#each filtered as p (p.slug)}
			<li>
				<a
					href="/problems/{p.slug}"
					class="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
				>
					<span>{p.title}</span>
					<span class="text-xs uppercase {diffColor[p.difficulty] ?? 'text-zinc-400'}">
						{p.difficulty}
					</span>
				</a>
			</li>
		{:else}
			<li class="px-4 py-6 text-center text-sm text-zinc-500">Sin resultados para “{query}”.</li>
		{/each}
	</ul>
{/if}

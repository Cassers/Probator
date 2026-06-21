<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let query = $state('');
	let sortBy = $state<'id' | 'difficulty'>('id');
	let asc = $state(true);

	const diffRank: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

	const visible = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const list = data.problems.filter(
			(p) => !q || p.title.toLowerCase().includes(q) || p.difficulty.toLowerCase().includes(q)
		);
		const sorted = [...list].sort((a, b) => {
			const cmp =
				sortBy === 'difficulty'
					? (diffRank[a.difficulty] ?? 9) - (diffRank[b.difficulty] ?? 9) || a.id - b.id
					: a.id - b.id;
			return asc ? cmp : -cmp;
		});
		return sorted;
	});

	function toggleSort(key: 'id' | 'difficulty') {
		if (sortBy === key) asc = !asc;
		else {
			sortBy = key;
			asc = true;
		}
	}

	const diffColor: Record<string, string> = {
		easy: 'text-emerald-500',
		medium: 'text-amber-500',
		hard: 'text-rose-500'
	};
	const arrow = (key: 'id' | 'difficulty') => (sortBy === key ? (asc ? ' ↑' : ' ↓') : '');
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
	<div class="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
		<!-- Sort header -->
		<div class="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
			<button onclick={() => toggleSort('id')} class="w-12 text-left hover:text-zinc-700 dark:hover:text-zinc-300">
				#{arrow('id')}
			</button>
			<button onclick={() => toggleSort('id')} class="flex-1 text-left hover:text-zinc-700 dark:hover:text-zinc-300">
				Problema
			</button>
			<button onclick={() => toggleSort('difficulty')} class="hover:text-zinc-700 dark:hover:text-zinc-300">
				Dificultad{arrow('difficulty')}
			</button>
		</div>

		<ul class="divide-y divide-zinc-200 dark:divide-zinc-800">
			{#each visible as p (p.slug)}
				<li>
					<a
						href="/problems/{p.slug}"
						class="flex items-center gap-2 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
					>
						<span class="w-12 font-mono text-sm text-zinc-400">#{p.id}</span>
						<span class="flex-1">{p.title}</span>
						<span class="text-xs uppercase {diffColor[p.difficulty] ?? 'text-zinc-400'}">
							{p.difficulty}
						</span>
					</a>
				</li>
			{:else}
				<li class="px-4 py-6 text-center text-sm text-zinc-500">Sin resultados para “{query}”.</li>
			{/each}
		</ul>
	</div>
{/if}

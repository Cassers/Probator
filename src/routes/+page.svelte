<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const diffColor: Record<string, string> = {
		easy: 'text-emerald-400',
		medium: 'text-amber-400',
		hard: 'text-rose-400'
	};
</script>

<h1 class="mb-4 text-xl font-semibold">Problemas</h1>

{#if data.problems.length === 0}
	<p class="text-zinc-500">
		No hay problemas todavía. Corre <code class="text-zinc-300">pnpm db:seed</code> para cargar los de
		ejemplo.
	</p>
{:else}
	<ul class="divide-y divide-zinc-800 overflow-hidden rounded-md border border-zinc-800">
		{#each data.problems as p (p.slug)}
			<li>
				<a
					href="/problems/{p.slug}"
					class="flex items-center justify-between px-4 py-3 hover:bg-zinc-900"
				>
					<span>{p.title}</span>
					<span class="text-xs uppercase {diffColor[p.difficulty] ?? 'text-zinc-400'}">
						{p.difficulty}
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}

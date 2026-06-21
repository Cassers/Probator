<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="flex items-center justify-between">
	<h1 class="text-xl font-semibold">Administración · Problemas</h1>
	<div class="flex items-center gap-2">
		<a
			href="/admin/problems/new"
			class="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
		>
			+ Nuevo problema
		</a>
		<form method="POST" action="/admin/logout">
			<button class="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800">
				Salir
			</button>
		</form>
	</div>
</div>

<div class="mt-5 overflow-hidden rounded-md border border-zinc-800">
	<table class="w-full text-left text-sm">
		<thead class="bg-zinc-900 text-xs text-zinc-400">
			<tr>
				<th class="p-3 font-medium">Título</th>
				<th class="p-3 font-medium">Modo</th>
				<th class="p-3 font-medium">Dificultad</th>
				<th class="p-3 font-medium">Casos</th>
				<th class="p-3 font-medium">Envíos</th>
				<th class="p-3"></th>
			</tr>
		</thead>
		<tbody class="divide-y divide-zinc-800">
			{#each data.problems as p (p.slug)}
				<tr class="hover:bg-zinc-900/50">
					<td class="p-3">
						<a href="/admin/problems/{p.slug}" class="font-medium hover:text-emerald-400">{p.title}</a>
						<div class="text-xs text-zinc-500">{p.slug}</div>
					</td>
					<td class="p-3 text-zinc-400">{p.mode}</td>
					<td class="p-3 text-zinc-400">{p.difficulty}</td>
					<td class="p-3 text-zinc-400">{p.cases}</td>
					<td class="p-3 text-zinc-400">{p.submissions}</td>
					<td class="p-3 text-right">
						<a href="/admin/problems/{p.slug}" class="text-xs text-emerald-400 hover:text-emerald-300">editar</a>
						<a href="/problems/{p.slug}" target="_blank" class="ml-3 text-xs text-zinc-500 hover:text-zinc-300">ver ↗</a>
					</td>
				</tr>
			{:else}
				<tr><td colspan="6" class="p-6 text-center text-zinc-500">No hay problemas. Crea el primero.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

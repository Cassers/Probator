<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let name = $state('');
	let creating = $state(false);
	let newKey = $state<string | null>(null);
	let errorMsg = $state<string | null>(null);

	async function create() {
		creating = true;
		errorMsg = null;
		newKey = null;
		try {
			const res = await fetch('/api/admin/apps', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});
			if (!res.ok) {
				errorMsg = (await res.json().catch(() => ({}))).message ?? `Error ${res.status}`;
				return;
			}
			const d = await res.json();
			newKey = d.key; // shown once
			name = '';
			await invalidateAll();
		} catch {
			errorMsg = 'No se pudo crear';
		} finally {
			creating = false;
		}
	}

	async function revoke(id: number, appName: string) {
		if (!confirm(`¿Revocar la app "${appName}"? Su key dejará de funcionar.`)) return;
		const res = await fetch(`/api/admin/apps/${id}`, { method: 'DELETE' });
		if (res.ok) await invalidateAll();
	}
</script>

<div class="flex items-center justify-between">
	<h1 class="text-xl font-semibold">Apps / API keys</h1>
	<a href="/admin" class="text-xs text-zinc-500 hover:text-zinc-300">← admin</a>
</div>
<p class="mt-1 mb-5 text-sm text-zinc-500">
	Cada app tiene una key para consumir la API REST (<code>/api/v1</code>). Solo puede editar los
	ejercicios que ella misma crea.
</p>

<div class="mb-6 flex items-end gap-2">
	<label class="text-sm">
		<span class="text-xs text-zinc-500">Nombre de la app</span>
		<input bind:value={name} placeholder="Discamus Academy" class="mt-1 block w-64 rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm" />
	</label>
	<button onclick={create} disabled={creating || !name.trim()} class="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
		{creating ? 'Creando…' : 'Crear app'}
	</button>
</div>

{#if errorMsg}
	<div class="mb-4 rounded border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-300">{errorMsg}</div>
{/if}

{#if newKey}
	<div class="mb-5 rounded border border-emerald-800 bg-emerald-950/30 p-4">
		<p class="text-sm font-medium text-emerald-300">¡Key creada! Cópiala ahora — no se vuelve a mostrar.</p>
		<code class="mt-2 block break-all rounded bg-zinc-950 p-2 font-mono text-sm text-emerald-200">{newKey}</code>
		<p class="mt-2 text-xs text-zinc-500">Úsala como <code>Authorization: Bearer {newKey}</code></p>
	</div>
{/if}

<div class="overflow-hidden rounded-md border border-zinc-800">
	<table class="w-full text-left text-sm">
		<thead class="bg-zinc-900 text-xs text-zinc-400">
			<tr><th class="p-3">App</th><th class="p-3">Creada</th><th class="p-3"></th></tr>
		</thead>
		<tbody class="divide-y divide-zinc-800">
			{#each data.apps as a (a.id)}
				<tr>
					<td class="p-3 font-medium">{a.name}</td>
					<td class="p-3 text-zinc-500">{new Date(a.createdAt).toLocaleString()}</td>
					<td class="p-3 text-right">
						<button onclick={() => revoke(a.id, a.name)} class="text-xs text-rose-400 hover:text-rose-300">revocar</button>
					</td>
				</tr>
			{:else}
				<tr><td colspan="3" class="p-6 text-center text-zinc-500">No hay apps. Crea la primera.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="mx-auto max-w-sm pt-10">
	<h1 class="mb-1 text-xl font-semibold">Probator · Admin</h1>
	<p class="mb-6 text-sm text-zinc-500">Ingresa la contraseña de administración.</p>

	{#if !data.configured}
		<div class="mb-4 rounded border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-300">
			Falta definir <code>ADMIN_PASSWORD</code> en el servidor.
		</div>
	{/if}

	<form method="POST" use:enhance class="flex flex-col gap-3">
		<input
			type="password"
			name="password"
			placeholder="Contraseña"
			autocomplete="current-password"
			class="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
		/>
		{#if form?.message}
			<div class="text-sm text-rose-400">{form.message}</div>
		{/if}
		<button
			type="submit"
			class="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
		>
			Entrar
		</button>
	</form>
</div>

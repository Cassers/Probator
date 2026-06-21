<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { getTheme, setTheme, type Theme } from '$lib/theme';

	const user = $derived(page.data.user);
	const avatarUrl = $derived(
		user?.avatar
			? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=80`
			: null
	);

	let theme = $state<Theme>('auto');
	onMount(() => {
		theme = getTheme();
	});
	function choose(t: Theme) {
		theme = t;
		setTheme(t);
	}

	const options: { value: Theme; label: string; icon: string }[] = [
		{ value: 'light', label: 'Claro', icon: '☀️' },
		{ value: 'dark', label: 'Oscuro', icon: '🌙' },
		{ value: 'auto', label: 'Automático', icon: '🖥️' }
	];
</script>

<a href="/" class="text-xs text-zinc-500 hover:text-zinc-400">← problemas</a>
<h1 class="mt-1 mb-6 text-xl font-semibold">Perfil</h1>

<div class="grid gap-6 md:grid-cols-2">
	<section class="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
		<h2 class="mb-3 text-sm font-semibold text-zinc-500">Cuenta</h2>
		{#if user}
			<div class="flex items-center gap-3">
				{#if avatarUrl}
					<img src={avatarUrl} alt="" class="h-12 w-12 rounded-full" />
				{/if}
				<div>
					<div class="font-medium">{user.displayName || user.username}</div>
					<div class="text-xs text-zinc-500">@{user.username} · {user.role}</div>
				</div>
			</div>
			<form method="POST" action="/auth/logout" class="mt-4">
				<button class="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
					Cerrar sesión
				</button>
			</form>
		{:else if page.data.discordEnabled}
			<p class="mb-3 text-sm text-zinc-500">No has iniciado sesión.</p>
			<a
				href="/auth/discord?next=%2Fperfil"
				class="inline-flex items-center gap-2 rounded bg-[#5865F2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4752c4]"
			>
				Entrar con Discord
			</a>
		{:else}
			<p class="text-sm text-zinc-500">El login no está configurado en esta instancia.</p>
		{/if}
	</section>

	<section class="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
		<h2 class="mb-1 text-sm font-semibold text-zinc-500">Apariencia</h2>
		<p class="mb-3 text-xs text-zinc-500">Tema de la interfaz.</p>
		<div class="flex gap-2">
			{#each options as o (o.value)}
				<button
					onclick={() => choose(o.value)}
					class="flex-1 rounded-md border px-3 py-3 text-sm transition {theme === o.value
						? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
						: 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800'}"
				>
					<div class="text-lg">{o.icon}</div>
					<div class="mt-1">{o.label}</div>
				</button>
			{/each}
		</div>
		<p class="mt-3 text-xs text-zinc-500">
			«Automático» sigue el tema de tu sistema/navegador.
		</p>
	</section>
</div>

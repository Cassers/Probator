<script lang="ts">
	import CodeEditor from '$lib/components/CodeEditor.svelte';
	import { LANGUAGES, getLanguage } from '$lib/judge/languages';
	import type { GradeResult } from '$lib/server/judge/grade';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// In function mode use the problem's per-language stub; else the generic starter.
	function starterFor(key: string): string {
		return data.starters?.[key] ?? getLanguage(key)!.starter;
	}

	let langKey = $state('python');
	let source = $state(starterFor('python'));
	let running = $state(false);
	let result = $state<GradeResult | null>(null);
	let errorMsg = $state<string | null>(null);

	const currentLang = $derived(getLanguage(langKey)!);

	function changeLanguage(key: string) {
		// Only overwrite the editor if the user hasn't diverged from the starter.
		if (source.trim() === starterFor(langKey).trim() || source.trim() === '') {
			source = starterFor(key);
		}
		langKey = key;
	}

	async function submit() {
		running = true;
		result = null;
		errorMsg = null;
		try {
			const res = await fetch('/api/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ slug: data.problem.slug, language: langKey, source })
			});
			if (!res.ok) {
				errorMsg = (await res.json().catch(() => ({}))).message ?? `Error ${res.status}`;
				return;
			}
			result = await res.json();
		} catch {
			errorMsg = 'No se pudo contactar al servidor';
		} finally {
			running = false;
		}
	}

	const accepted = $derived(result?.verdict === 'Accepted');
</script>

<div class="grid gap-6 lg:grid-cols-2">
	<!-- Statement -->
	<section>
		<a href="/" class="text-xs text-zinc-500 hover:text-zinc-300">← problemas</a>
		<h1 class="mt-1 mb-3 text-xl font-semibold">{data.problem.title}</h1>
		<div class="prose-invert whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
			{data.problem.statement}
		</div>

		{#if data.samples.length}
			<h2 class="mt-6 mb-2 text-sm font-semibold text-zinc-200">Ejemplos</h2>
			<div class="space-y-3">
				{#each data.samples as s (s.ordinal)}
					<div class="grid grid-cols-2 gap-2 text-xs">
						<div>
							<div class="mb-1 text-zinc-500">Entrada</div>
							<pre class="rounded bg-zinc-900 p-2 whitespace-pre-wrap">{s.stdin}</pre>
						</div>
						<div>
							<div class="mb-1 text-zinc-500">Salida</div>
							<pre class="rounded bg-zinc-900 p-2 whitespace-pre-wrap">{s.expectedOutput}</pre>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Editor + submit -->
	<section class="flex flex-col gap-3">
		<div class="flex items-center gap-2">
			<select
				class="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
				value={langKey}
				onchange={(e) => changeLanguage((e.target as HTMLSelectElement).value)}
			>
				{#each LANGUAGES as l (l.key)}
					<option value={l.key}>{l.label}</option>
				{/each}
			</select>
			<button
				onclick={submit}
				disabled={running}
				class="ml-auto rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
			>
				{running ? 'Ejecutando…' : 'Enviar'}
			</button>
		</div>

		<div class="h-[420px]">
			<CodeEditor bind:value={source} lang={currentLang.cm} />
		</div>

		{#if errorMsg}
			<div class="rounded border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-300">
				{errorMsg}
			</div>
		{/if}

		{#if result}
			<div
				class="rounded border p-3 text-sm {accepted
					? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
					: 'border-amber-800 bg-amber-950/40 text-amber-300'}"
			>
				<div class="flex items-center justify-between font-semibold">
					<span>{result.verdict}</span>
					<span class="text-xs font-normal">
						{result.passedCount}/{result.totalCount} casos
						{#if result.runtimeMs != null}· {result.runtimeMs} ms{/if}
					</span>
				</div>

				{#if result.compileOutput}
					<pre
						class="mt-2 overflow-auto rounded bg-zinc-900 p-2 text-xs whitespace-pre-wrap text-zinc-300">{result.compileOutput}</pre>
				{/if}

				{#if result.cases.some((c) => c.isSample)}
					<div class="mt-3 space-y-2">
						{#each result.cases.filter((c) => c.isSample) as c (c.ordinal)}
							<div class="rounded bg-zinc-900 p-2 text-xs">
								<div class="mb-1 {c.passed ? 'text-emerald-400' : 'text-rose-400'}">
									Ejemplo {c.ordinal + 1}: {c.status}
								</div>
								{#if !c.passed}
									<div class="grid grid-cols-2 gap-2 text-zinc-400">
										<div>
											<div class="text-zinc-500">Esperado</div>
											<pre class="whitespace-pre-wrap">{c.expectedOutput}</pre>
										</div>
										<div>
											<div class="text-zinc-500">Tu salida</div>
											<pre class="whitespace-pre-wrap">{c.stdout}</pre>
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</section>
</div>

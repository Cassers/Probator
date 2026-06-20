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

	let activeTab = $state<'description' | 'submissions'>('description');
	let selectedSubmission = $state<PageData['submissions'][0] | null>(null);

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
	<!-- Left Pane: Tabs (Description / Submissions) -->
	<section class="flex flex-col gap-4">
		<a href="/" class="text-xs text-zinc-500 hover:text-zinc-300">← problemas</a>
		
		<div class="flex gap-4 border-b border-zinc-800">
			<button 
				class="pb-2 text-sm font-medium {activeTab === 'description' ? 'border-b-2 border-emerald-500 text-white' : 'text-zinc-400 hover:text-zinc-300'}"
				onclick={() => activeTab = 'description'}
			>
				Descripción
			</button>
			<button 
				class="pb-2 text-sm font-medium {activeTab === 'submissions' ? 'border-b-2 border-emerald-500 text-white' : 'text-zinc-400 hover:text-zinc-300'}"
				onclick={() => {
					activeTab = 'submissions';
					selectedSubmission = null;
				}}
			>
				Envíos ({data.submissions.length})
			</button>
		</div>

		{#if activeTab === 'description'}
			<div>
				<h1 class="mb-3 text-xl font-semibold">{data.problem.title}</h1>
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
			</div>
		{:else}
			<div>
				{#if selectedSubmission}
					<div class="mb-4 flex items-center justify-between">
						<button 
							class="text-xs font-medium text-emerald-400 hover:text-emerald-300"
							onclick={() => selectedSubmission = null}
						>
							← Volver a todos los envíos
						</button>
						<div class="text-xs text-zinc-500">
							{new Date(selectedSubmission.createdAt).toLocaleString()}
						</div>
					</div>
					
					<div class="mb-4 flex items-center gap-4 rounded border border-zinc-800 bg-zinc-900/50 p-3">
						<div class="text-lg font-bold {selectedSubmission.verdict === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'}">
							{selectedSubmission.verdict}
						</div>
						<div class="flex gap-4 text-sm text-zinc-400">
							<div>Runtime: <span class="text-white">{selectedSubmission.runtimeMs ?? 0} ms</span></div>
							<div>Casos: <span class="text-white">{selectedSubmission.passedCount} / {selectedSubmission.totalCount}</span></div>
							<div>Lenguaje: <span class="text-white">{selectedSubmission.language}</span></div>
						</div>
					</div>

					<div class="h-[400px] rounded border border-zinc-800 bg-[#282c34]">
						<CodeEditor value={selectedSubmission.sourceCode} lang={getLanguage(selectedSubmission.language)?.cm} readonly={true} />
					</div>
				{:else}
					{#if data.submissions.length === 0}
						<div class="py-8 text-center text-sm text-zinc-500">No hay envíos aún para este problema.</div>
					{:else}
						<div class="overflow-hidden rounded border border-zinc-800">
							<table class="w-full text-left text-sm">
								<thead class="bg-zinc-900 text-xs text-zinc-400">
									<tr>
										<th class="p-3 font-medium">Estado</th>
										<th class="p-3 font-medium">Lenguaje</th>
										<th class="p-3 font-medium">Runtime</th>
										<th class="p-3 font-medium">Fecha</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-zinc-800">
									{#each data.submissions as sub (sub.id)}
										<tr 
											class="cursor-pointer hover:bg-zinc-800/50"
											onclick={() => selectedSubmission = sub}
										>
											<td class="p-3 font-medium {sub.verdict === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'}">
												{sub.verdict}
											</td>
											<td class="p-3 text-zinc-300">
												<span class="rounded bg-zinc-800 px-2 py-0.5 text-xs">{sub.language}</span>
											</td>
											<td class="p-3 text-zinc-400">{sub.runtimeMs ?? 0} ms</td>
											<td class="p-3 text-xs text-zinc-500">{new Date(sub.createdAt).toLocaleString()}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				{/if}
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

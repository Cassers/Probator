<script lang="ts">
	import { goto } from '$app/navigation';
	import { LANGUAGES } from '$lib/judge/languages';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Editable state seeded from the loader.
	let slug = $state(data.problem.slug);
	let title = $state(data.problem.title);
	let statement = $state(data.problem.statement);
	let difficulty = $state(data.problem.difficulty);
	let mode = $state<'stdio' | 'function'>(data.problem.mode);
	let timeLimitMs = $state(data.problem.timeLimitMs);
	let memoryLimitKb = $state(data.problem.memoryLimitKb);
	let cases = $state(data.cases.map((c) => ({ ...c })));
	// templates[lang] present => that language is supported.
	let templates = $state<Record<string, { starter: string; harness: string }>>(
		structuredClone(data.templates)
	);

	let saving = $state(false);
	let errorMsg = $state<string | null>(null);
	const originalSlug = data.creating ? undefined : data.problem.slug;

	// --- Auto-generate cases from a reference solution ---
	let genOpen = $state(false);
	let refLang = $state('python');
	let refSource = $state('');
	let genInputMode = $state<'generator' | 'manual'>('generator');
	let genLang = $state('python');
	let genSource = $state(
		'# Recibe un índice por stdin (0,1,2…) y debe IMPRIMIR una entrada de prueba.\n' +
			'import sys, random\nrandom.seed(int(sys.stdin.read().strip() or 0))\na = random.randint(-1000, 1000)\nb = random.randint(-1000, 1000)\nprint(a, b)\n'
	);
	let genCount = $state(8);
	let genSample = $state(2);
	let manualInputs = $state('');
	let generating = $state(false);
	let genError = $state<string | null>(null);

	async function generateCases() {
		generating = true;
		genError = null;
		try {
			const body: Record<string, unknown> = {
				mode,
				language: refLang,
				referenceSource: refSource,
				harness: mode === 'function' ? templates[refLang]?.harness : undefined,
				timeLimitMs: Number(timeLimitMs),
				memoryLimitKb: Number(memoryLimitKb),
				sampleCount: Number(genSample)
			};
			if (genInputMode === 'generator') {
				body.generatorSource = genSource;
				body.generatorLanguage = genLang;
				body.count = Number(genCount);
			} else {
				body.inputs = manualInputs
					.split(/^---$/m)
					.map((s) => s.replace(/^\n+|\n+$/g, ''))
					.filter((s) => s !== '');
			}
			const res = await fetch('/api/admin/generate-cases', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				genError = (await res.json().catch(() => ({}))).message ?? `Error ${res.status}`;
				return;
			}
			const d = await res.json();
			if (!d.cases?.length) {
				genError = 'No se generaron casos';
				return;
			}
			cases = d.cases;
			genOpen = false;
		} catch {
			genError = 'No se pudo contactar al servidor';
		} finally {
			generating = false;
		}
	}

	function slugify(s: string) {
		return s
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}
	// Auto-fill slug from title only while creating and untouched.
	let slugTouched = $state(!data.creating);
	$effect(() => {
		if (data.creating && !slugTouched) slug = slugify(title);
	});

	function addCase() {
		cases = [...cases, { stdin: '', expectedOutput: '', isSample: false }];
	}
	function removeCase(i: number) {
		cases = cases.filter((_, idx) => idx !== i);
	}

	function defaultHarness(langKey: string) {
		// Minimal skeleton reminding the {{USER_CODE}} marker + how I/O flows.
		if (langKey === 'python') return '{{USER_CODE}}\n\nimport sys\n# data = sys.stdin.read().split()\n# print(funcion(...))\n';
		return '// Lee stdin, llama a la función del estudiante, imprime el resultado.\n{{USER_CODE}}\n';
	}
	function toggleLang(langKey: string, on: boolean) {
		const next = { ...templates };
		if (on) next[langKey] = templates[langKey] ?? { starter: '', harness: defaultHarness(langKey) };
		else delete next[langKey];
		templates = next;
	}

	async function save() {
		saving = true;
		errorMsg = null;
		try {
			const res = await fetch('/api/admin/problems', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					originalSlug,
					slug,
					title,
					statement,
					difficulty,
					mode,
					timeLimitMs: Number(timeLimitMs),
					memoryLimitKb: Number(memoryLimitKb),
					cases,
					templates: mode === 'function' ? templates : {}
				})
			});
			if (!res.ok) {
				errorMsg = (await res.json().catch(() => ({}))).message ?? `Error ${res.status}`;
				return;
			}
			await goto('/admin');
		} catch {
			errorMsg = 'No se pudo contactar al servidor';
		} finally {
			saving = false;
		}
	}

	async function del() {
		if (!confirm(`¿Borrar "${title}" y todos sus envíos? Esto no se puede deshacer.`)) return;
		const res = await fetch(`/api/admin/problems/${originalSlug}`, { method: 'DELETE' });
		if (res.ok) await goto('/admin');
		else errorMsg = 'No se pudo borrar';
	}
</script>

<div class="flex items-center justify-between">
	<a href="/admin" class="text-xs text-zinc-500 hover:text-zinc-300">← problemas</a>
	<div class="flex gap-2">
		{#if !data.creating}
			<button onclick={del} class="rounded border border-rose-800 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-950/40">
				Borrar
			</button>
		{/if}
		<button
			onclick={save}
			disabled={saving}
			class="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
		>
			{saving ? 'Guardando…' : 'Guardar'}
		</button>
	</div>
</div>

<h1 class="mt-3 mb-5 text-xl font-semibold">{data.creating ? 'Nuevo problema' : title}</h1>

{#if errorMsg}
	<div class="mb-4 rounded border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-300">{errorMsg}</div>
{/if}

<div class="grid gap-5 lg:grid-cols-2">
	<!-- Metadata -->
	<section class="flex flex-col gap-3">
		<label class="text-sm">
			<span class="text-zinc-400">Título</span>
			<input bind:value={title} class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
		</label>
		<label class="text-sm">
			<span class="text-zinc-400">Slug (URL)</span>
			<input
				bind:value={slug}
				oninput={() => (slugTouched = true)}
				class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm"
			/>
		</label>
		<div class="grid grid-cols-2 gap-3">
			<label class="text-sm">
				<span class="text-zinc-400">Dificultad</span>
				<select bind:value={difficulty} class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm">
					<option value="easy">easy</option>
					<option value="medium">medium</option>
					<option value="hard">hard</option>
				</select>
			</label>
			<label class="text-sm">
				<span class="text-zinc-400">Modo</span>
				<select bind:value={mode} class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm">
					<option value="stdio">stdio (programa completo)</option>
					<option value="function">function (LeetCode)</option>
				</select>
			</label>
		</div>
		<div class="grid grid-cols-2 gap-3">
			<label class="text-sm">
				<span class="text-zinc-400">Tiempo límite (ms)</span>
				<input type="number" bind:value={timeLimitMs} class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
			</label>
			<label class="text-sm">
				<span class="text-zinc-400">Memoria límite (KB)</span>
				<input type="number" bind:value={memoryLimitKb} class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
			</label>
		</div>
		<label class="text-sm">
			<span class="text-zinc-400">Enunciado (texto / markdown)</span>
			<textarea bind:value={statement} rows="10" class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm"></textarea>
		</label>
	</section>

	<!-- Test cases -->
	<section class="flex flex-col gap-3">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-semibold text-zinc-200">Casos de prueba</h2>
			<div class="flex gap-2">
				<button onclick={() => (genOpen = !genOpen)} class="rounded border border-emerald-800 bg-emerald-950/30 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-950/60">✨ generar</button>
				<button onclick={addCase} class="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800">+ caso</button>
			</div>
		</div>

		{#if genOpen}
			<div class="rounded border border-emerald-900/60 bg-emerald-950/20 p-3">
				<p class="mb-3 text-xs text-zinc-400">
					Genera casos automáticamente: el sistema corre tu <b>solución de referencia</b> (correcta)
					sobre las entradas y guarda sus salidas como esperadas.
					{#if mode === 'function'}<br />En modo función, la referencia es la <b>implementación correcta de la función</b> (usa el harness del lenguaje elegido).{/if}
				</p>

				<div class="mb-2 flex items-center gap-2 text-xs">
					<span class="text-zinc-500">Lenguaje de referencia</span>
					<select bind:value={refLang} class="rounded border border-zinc-700 bg-zinc-900 px-2 py-1">
						{#each LANGUAGES as l (l.key)}<option value={l.key}>{l.label}</option>{/each}
					</select>
				</div>
				<textarea bind:value={refSource} rows="6" placeholder="Solución de referencia (correcta)…" class="mb-3 w-full rounded bg-zinc-950 border border-zinc-800 p-2 font-mono text-xs"></textarea>

				<div class="mb-2 flex gap-3 text-xs">
					<label class="flex items-center gap-1"><input type="radio" value="generator" bind:group={genInputMode} /> Generador de entradas</label>
					<label class="flex items-center gap-1"><input type="radio" value="manual" bind:group={genInputMode} /> Entradas manuales</label>
				</div>

				{#if genInputMode === 'generator'}
					<div class="mb-2 flex flex-wrap items-center gap-2 text-xs">
						<span class="text-zinc-500">Generador en</span>
						<select bind:value={genLang} class="rounded border border-zinc-700 bg-zinc-900 px-2 py-1">
							{#each LANGUAGES as l (l.key)}<option value={l.key}>{l.label}</option>{/each}
						</select>
						<span class="text-zinc-500">· nº casos</span>
						<input type="number" bind:value={genCount} min="1" max="60" class="w-16 rounded border border-zinc-700 bg-zinc-900 px-2 py-1" />
						<span class="text-zinc-500">· visibles</span>
						<input type="number" bind:value={genSample} min="0" class="w-16 rounded border border-zinc-700 bg-zinc-900 px-2 py-1" />
					</div>
					<textarea bind:value={genSource} rows="6" class="w-full rounded bg-zinc-950 border border-zinc-800 p-2 font-mono text-xs"></textarea>
				{:else}
					<p class="mb-1 text-xs text-zinc-500">Una entrada por bloque, separadas por una línea con <code>---</code>.</p>
					<textarea bind:value={manualInputs} rows="6" placeholder={'2 3\n---\n-4 10\n---\n0 0'} class="w-full rounded bg-zinc-950 border border-zinc-800 p-2 font-mono text-xs"></textarea>
				{/if}

				{#if genError}<div class="mt-2 text-xs text-rose-400">{genError}</div>{/if}
				<div class="mt-3 flex items-center gap-2">
					<button onclick={generateCases} disabled={generating} class="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
						{generating ? 'Generando…' : 'Generar casos'}
					</button>
					<span class="text-xs text-zinc-500">reemplaza los casos actuales</span>
				</div>
			</div>
		{/if}
		{#each cases as c, i (i)}
			<div class="rounded border border-zinc-800 p-3">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-xs text-zinc-500">Caso {i + 1}</span>
					<div class="flex items-center gap-3">
						<label class="flex items-center gap-1 text-xs text-zinc-400">
							<input type="checkbox" bind:checked={c.isSample} /> visible (ejemplo)
						</label>
						<button onclick={() => removeCase(i)} class="text-xs text-rose-400 hover:text-rose-300">quitar</button>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-2">
					<div>
						<div class="mb-1 text-xs text-zinc-500">Entrada (stdin)</div>
						<textarea bind:value={c.stdin} rows="3" class="w-full rounded bg-zinc-950 border border-zinc-800 p-2 font-mono text-xs"></textarea>
					</div>
					<div>
						<div class="mb-1 text-xs text-zinc-500">Salida esperada</div>
						<textarea bind:value={c.expectedOutput} rows="3" class="w-full rounded bg-zinc-950 border border-zinc-800 p-2 font-mono text-xs"></textarea>
					</div>
				</div>
			</div>
		{/each}
	</section>
</div>

<!-- Function-mode templates -->
{#if mode === 'function'}
	<section class="mt-6">
		<h2 class="mb-1 text-sm font-semibold text-zinc-200">Plantillas por lenguaje (modo función)</h2>
		<p class="mb-3 text-xs text-zinc-500">
			Activa cada lenguaje que quieras ofrecer. El <b>starter</b> es lo que ve el estudiante; el
			<b>harness</b> lo envuelve y debe incluir <code class="text-zinc-300">{'{{USER_CODE}}'}</code>,
			leer la entrada, llamar a su función e imprimir el resultado.
		</p>
		<div class="space-y-3">
			{#each LANGUAGES as l (l.key)}
				{@const on = !!templates[l.key]}
				<div class="rounded border border-zinc-800 p-3">
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" checked={on} onchange={(e) => toggleLang(l.key, (e.target as HTMLInputElement).checked)} />
						<span class="font-medium">{l.label}</span>
					</label>
					{#if on}
						<div class="mt-2 grid gap-2 md:grid-cols-2">
							<div>
								<div class="mb-1 text-xs text-zinc-500">Starter (visible)</div>
								<textarea bind:value={templates[l.key].starter} rows="5" class="w-full rounded bg-zinc-950 border border-zinc-800 p-2 font-mono text-xs"></textarea>
							</div>
							<div>
								<div class="mb-1 text-xs text-zinc-500">Harness (oculto · requiere {'{{USER_CODE}}'})</div>
								<textarea bind:value={templates[l.key].harness} rows="5" class="w-full rounded bg-zinc-950 border border-zinc-800 p-2 font-mono text-xs"></textarea>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</section>
{/if}

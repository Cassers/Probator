<script lang="ts">
	import { onMount } from 'svelte';
	import { EditorView, keymap } from '@codemirror/view';
	import { EditorState, Compartment } from '@codemirror/state';
	import { defaultKeymap, indentWithTab } from '@codemirror/commands';
	import { basicSetup } from 'codemirror';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { python } from '@codemirror/lang-python';
	import { cpp } from '@codemirror/lang-cpp';
	import { java } from '@codemirror/lang-java';

	let {
		value = $bindable(''),
		lang = 'python'
	}: { value: string; lang: 'python' | 'cpp' | 'java' } = $props();

	let host: HTMLDivElement;
	let view: EditorView;
	const langCompartment = new Compartment();

	function langExtension(l: string) {
		if (l === 'cpp') return cpp();
		if (l === 'java') return java();
		return python();
	}

	onMount(() => {
		view = new EditorView({
			parent: host,
			state: EditorState.create({
				doc: value,
				extensions: [
					basicSetup,
					keymap.of([...defaultKeymap, indentWithTab]),
					oneDark,
					langCompartment.of(langExtension(lang)),
					EditorView.updateListener.of((u) => {
						if (u.docChanged) value = u.state.doc.toString();
					})
				]
			})
		});
		return () => view?.destroy();
	});

	// Swap language highlighting without losing the document.
	$effect(() => {
		if (view) view.dispatch({ effects: langCompartment.reconfigure(langExtension(lang)) });
	});

	// Reflect external value changes (e.g. switching starter code).
	$effect(() => {
		if (view && value !== view.state.doc.toString()) {
			view.dispatch({
				changes: { from: 0, to: view.state.doc.length, insert: value }
			});
		}
	});
</script>

<div bind:this={host} class="h-full overflow-auto rounded-md border border-zinc-800 text-sm"></div>

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
	import { javascript } from '@codemirror/lang-javascript';
	import { rust } from '@codemirror/lang-rust';
	import { go } from '@codemirror/lang-go';
	import { StreamLanguage } from '@codemirror/language';
	import { csharp } from '@codemirror/legacy-modes/mode/clike';
	import { ruby } from '@codemirror/legacy-modes/mode/ruby';

	let {
		value = $bindable(''),
		lang = 'python',
		readonly = false
	}: { value: string; lang?: string; readonly?: boolean } = $props();

	let host: HTMLDivElement;
	let view: EditorView;
	const langCompartment = new Compartment();

	function langExtension(l: string) {
		switch (l) {
			case 'cpp':
				return cpp();
			case 'java':
				return java();
			case 'javascript':
				return javascript();
			case 'typescript':
				return javascript({ typescript: true });
			case 'go':
				return go();
			case 'rust':
				return rust();
			case 'csharp':
				return StreamLanguage.define(csharp);
			case 'ruby':
				return StreamLanguage.define(ruby);
			default:
				return python();
		}
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
					EditorView.editable.of(!readonly),
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

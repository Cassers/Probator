<script lang="ts">
	let { runtimeMs, allRuntimes = [] }: { runtimeMs: number, allRuntimes?: number[] } = $props();

	let validRuntimes = $derived(allRuntimes.filter((r) => r != null && !isNaN(r)));
	let total = $derived(validRuntimes.length);
	// Calculate beats
	// We beat anyone who is strictly slower than us (higher runtimeMs)
	let slowerCount = $derived(validRuntimes.filter((r) => r > runtimeMs).length);
	
	// If total > 1, we divide by total - 1 (since we don't count ourselves to beat ourselves)
	// If total === 1, we are the only one, so we beat 100% of others (which is 0 people, but conceptually we are the best)
	let beatsPct = $derived(total > 1 ? ((slowerCount / (total - 1)) * 100).toFixed(2) : '100.00');

	// Chart calculations
	let minR = $derived(Math.min(...validRuntimes, runtimeMs));
	let maxR = $derived(Math.max(...validRuntimes, runtimeMs));
	let range = $derived(maxR - minR);
	
	// Add some padding to max so the rightmost bar isn't exactly at the edge
	let paddedMax = $derived(maxR + (range === 0 ? 10 : range * 0.1));
	let paddedRange = $derived(paddedMax - minR);
	
	const BIN_COUNT = 40;
	let binWidth = $derived(paddedRange / BIN_COUNT);

	let bins = $derived.by(() => {
		let tempBins = Array.from({ length: BIN_COUNT }, () => 0);
		for (const r of validRuntimes) {
			let idx = Math.floor((r - minR) / binWidth);
			if (idx >= BIN_COUNT) idx = BIN_COUNT - 1;
			if (idx < 0) idx = 0;
			tempBins[idx]++;
		}
		return tempBins;
	});

	let maxCount = $derived(Math.max(...bins, 1));
	
	let myBinIdx = $derived(Math.floor((runtimeMs - minR) / binWidth));
	let myBinIdxClamped = $derived(Math.min(Math.max(myBinIdx, 0), BIN_COUNT - 1));
</script>

<div class="mt-6 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
	<div class="flex items-center mb-4">
		<div class="flex items-baseline gap-2">
			<span class="text-zinc-600 dark:text-zinc-300 font-medium flex items-center gap-1">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
				</svg>
				Runtime
			</span>
			<span class="text-2xl font-bold text-zinc-900 dark:text-white ml-2">{runtimeMs} <span class="text-sm font-normal text-zinc-500">ms</span></span>
		</div>
		{#if total > 0}
			<div class="ml-auto flex items-center gap-1 text-sm">
				<span class="text-zinc-500">Beats</span>
				<span class="font-bold text-emerald-500 text-lg">{beatsPct}%</span>
			</div>
		{/if}
	</div>

	<!-- CSS Histogram -->
	<div class="h-32 flex items-end gap-[1px] pt-4 relative group w-full">
		{#each bins as count, i}
			{@const heightPct = (count / maxCount) * 100}
			{@const isMine = i === myBinIdxClamped}
			<div 
				class="flex-1 rounded-t-[2px] transition-all duration-300 {isMine ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] z-10 hover:bg-emerald-400' : 'bg-emerald-500/30 dark:bg-emerald-500/20 hover:bg-emerald-500/50 dark:hover:bg-emerald-500/40'}"
				style="height: {Math.max(heightPct, 2)}%"
				title="{count} envíos en ~{Math.floor(minR + i * binWidth)}ms"
			></div>
		{/each}
	</div>
	
	<!-- X axis labels -->
	<div class="flex justify-between text-xs text-zinc-500 mt-2 px-1 border-t border-zinc-200 dark:border-zinc-800 pt-2">
		<span>{Math.floor(minR)}ms</span>
		<span>{Math.floor(minR + paddedRange / 2)}ms</span>
		<span>{Math.floor(paddedMax)}ms</span>
	</div>
</div>

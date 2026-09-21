<script lang="ts">
    /**
     * A single-series smooth area chart with a hover crosshair and tooltip —
     * the home dashboard's "spending this month" chart.
     *
     * Plain SVG rather than a charting library: one series, one axis, and a
     * tooltip is all the design asks for, and it keeps ~300 kB of Carbon out
     * of the bundle. Marks follow the dataviz rules: a 2px line, recessive
     * grid, one y-axis, the tooltip in text ink rather than the series colour.
     */
    interface Point {
        /** Axis label, e.g. "Sep 3". */
        label: string
        /** Full label for the tooltip, e.g. "3 September 2026". */
        title: string
        value: number
    }

    let {
        points,
        height = 220,
        color = '#2a78d6',
        format = (value: number) => value.toLocaleString('en-US'),
        label = '',
    }: {
        points: Point[]
        height?: number
        color?: string
        format?: (value: number) => string
        /** Accessible name for the chart. */
        label?: string
    } = $props();

    let width = $state(600);
    let hover = $state<number | null>(null);

    const PAD = {top: 12, right: 12, bottom: 26, left: 44};
    const gradientId = `area-${Math.random().toString(36).slice(2, 8)}`;

    const max = $derived(Math.max(1, ...points.map((point) => point.value)));
    /** A "nice" top of scale, so the ticks are round numbers. */
    const top = $derived.by(() => {
        const magnitude = 10 ** Math.floor(Math.log10(max));
        const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= max / 4) ?? 10;
        return Math.ceil(max / (step * magnitude)) * step * magnitude;
    });
    const ticks = $derived([0, 1, 2, 3, 4].map((index) => (top / 4) * index));

    const innerW = $derived(Math.max(10, width - PAD.left - PAD.right));
    const innerH = $derived(height - PAD.top - PAD.bottom);
    const x = (index: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
    const y = (value: number) => PAD.top + innerH - (value / top) * innerH;

    /** Catmull-Rom through the points, as cubic Béziers: smooth without overshooting much. */
    const line = $derived.by(() => {
        if (points.length === 0) return '';
        const xy = points.map((point, index) => [x(index), y(point.value)]);
        let d = `M${xy[0][0]},${xy[0][1]}`;
        for (let i = 0; i < xy.length - 1; i++) {
            const [x0, y0] = xy[i - 1] ?? xy[i];
            const [x1, y1] = xy[i];
            const [x2, y2] = xy[i + 1];
            const [x3, y3] = xy[i + 2] ?? xy[i + 1];
            const c1x = x1 + (x2 - x0) / 6;
            const c1y = Math.min(PAD.top + innerH, y1 + (y2 - y0) / 6);
            const c2x = x2 - (x3 - x1) / 6;
            const c2y = Math.min(PAD.top + innerH, y2 - (y3 - y1) / 6);
            d += ` C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`;
        }
        return d;
    });
    const area = $derived(
        points.length ? `${line} L${x(points.length - 1)},${PAD.top + innerH} L${x(0)},${PAD.top + innerH} Z` : '',
    );

    /** Roughly six evenly spaced axis labels, whatever the point count. */
    const labelEvery = $derived(Math.max(1, Math.ceil(points.length / 6)));

    function onMove(event: PointerEvent) {
        const svg = event.currentTarget as SVGSVGElement;
        const box = svg.getBoundingClientRect();
        const px = ((event.clientX - box.left) / box.width) * width;
        if (points.length === 0) return;
        const ratio = (px - PAD.left) / innerW;
        hover = Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1))));
    }

    function compact(value: number): string {
        if (value >= 1e9) return `${+(value / 1e9).toFixed(1)}B`;
        if (value >= 1e6) return `${+(value / 1e6).toFixed(1)}M`;
        if (value >= 1e3) return `${+(value / 1e3).toFixed(1)}k`;
        return `${value}`;
    }
</script>

<div class="relative w-full" bind:clientWidth={width}>
    <svg {width} {height} role="img" aria-label={label} class="block touch-none"
         onpointermove={onMove} onpointerleave={() => (hover = null)}>
        <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color={color} stop-opacity="0.22"/>
                <stop offset="100%" stop-color={color} stop-opacity="0"/>
            </linearGradient>
        </defs>

        {#each ticks as tick (tick)}
            <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke="#eceef1" stroke-width="1"/>
            <text x={PAD.left - 8} y={y(tick)} dy="0.32em" text-anchor="end" class="fill-onebank-muted text-[11px]">{compact(tick)}</text>
        {/each}

        {#each points as point, index (index)}
            {#if index % labelEvery === 0}
                <text x={x(index)} y={height - 6} text-anchor="middle" class="fill-onebank-muted text-[11px]">{point.label}</text>
            {/if}
        {/each}

        {#if points.length > 0}
            <path d={area} fill="url(#{gradientId})"/>
            <path d={line} fill="none" stroke={color} stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        {/if}

        {#if hover !== null && points[hover]}
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="#9d9fa3" stroke-dasharray="3 3"/>
            <circle cx={x(hover)} cy={y(points[hover].value)} r="5" fill="white" stroke={color} stroke-width="2"/>
        {/if}
    </svg>

    {#if hover !== null && points[hover]}
        {@const left = Math.min(Math.max(x(hover), 70), width - 70)}
        <div class="pointer-events-none absolute -translate-x-1/2 rounded-ob-sm bg-[#1f2533] px-3 py-1.5 text-center text-white shadow-lg"
             style="left: {left}px; top: {Math.max(0, y(points[hover].value) - 58)}px">
            <div class="text-[11px] text-white/70">{points[hover].title}</div>
            <div class="text-sm font-semibold">{format(points[hover].value)}</div>
        </div>
    {/if}
</div>

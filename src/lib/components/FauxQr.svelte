<script lang="ts">
    /**
     * Something that looks like a QR code, drawn from `value`.
     *
     * It encodes nothing. Used only by the unmapped E-Cheque screen's preview;
     * swap in `QrCode` (a real encoder) when that screen is wired.
     */
    let {value, size = 224, label = 'QR code'}: {value: string; size?: number; label?: string} = $props();

    const CELLS = 25;

    function finder(x: number, y: number): boolean | null {
        for (const [ox, oy] of [[0, 0], [CELLS - 7, 0], [0, CELLS - 7]]) {
            const dx = x - ox;
            const dy = y - oy;
            if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) {
                if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return false;
                return Math.min(dx, dy, 6 - dx, 6 - dy) !== 1;
            }
        }
        return null;
    }

    const filled = $derived.by(() => {
        let seed = [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
        const out: Array<[number, number]> = [];
        for (let y = 0; y < CELLS; y++) {
            for (let x = 0; x < CELLS; x++) {
                const inFinder = finder(x, y);
                seed = (seed * 1103515245 + 12345) >>> 0;
                if (inFinder === true || (inFinder === null && seed % 100 < 47)) out.push([x, y]);
            }
        }
        return out;
    });
</script>

<svg viewBox="-2 -2 {CELLS + 4} {CELLS + 4}" width={size} height={size} class="rounded-ob-lg bg-white" role="img" aria-label={label}>
    {#each filled as [x, y] (`${x}-${y}`)}
        <rect {x} {y} width="1.02" height="1.02" fill="#111827"/>
    {/each}
</svg>

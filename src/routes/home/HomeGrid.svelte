<script lang="ts">
    /**
     * The home dashboard: six widgets the user can drag, resize and keep.
     *
     * Ported from onebank-ui `pages/HOME/components/desktop/DesktopHome.svelte`.
     * Positions, persistence and collision resolution live in `gridLayout.ts`;
     * this file is the grid, its chrome, and the pointer arithmetic that turns
     * a gesture into a cell coordinate.
     *
     * This used to be the app's one deliberately-Svelte-4 component, because
     * `svelte-grid` handed its drag and resize handles over as `let:` slot
     * props and runes mode forbids those. The library is gone — it was last
     * published in August 2023 — and its behaviour now lives in `gridLayout.ts`
     * where it is unit-testable without a layout engine.
     */
    import Icon from '@iconify/svelte';
    import AccountBalanceWidget from './AccountBalanceWidget.svelte';
    import UsageChartWidget from './UsageChartWidget.svelte';
    import TransactionCalendar from './TransactionCalendar.svelte';
    import Shortcuts from './Shortcuts.svelte';
    import Functions from './Functions.svelte';
    import FetchingError from './FetchingError.svelte';
    import {beginPointerDrag} from '../../lib/utils/pointerDrag';
    import {
        GAP,
        ROW_HEIGHT,
        applyEditMode,
        columnsFor,
        defaultLayout,
        loadLayout,
        moveItem,
        resizeItem,
        rowCount,
        saveLayout,
        type LayoutItem,
        type WidgetId,
    } from './gridLayout';
    import {t} from '../../lib/utils/helper';
    // Imported here rather than in app.css so the stylesheet lands with the
    // only components that need it.
    import '@carbon/charts-svelte/styles.css';

    interface Props {
        /** Opens the quick-access customiser; the route owns that modal. */
        onCustomizeMenus?: () => void;
    }

    let {onCustomizeMenus = () => {}}: Props = $props();

    let editMode = $state(false);
    let items = $state<LayoutItem[]>(loadLayout());

    /** Measured by the ResizeObserver below; 0 until the first callback. */
    let width = $state(0);

    const cols = $derived(columnsFor(width));
    /** Width of one column, gaps removed. Never negative before measurement. */
    const cellWidth = $derived(Math.max(0, (width - GAP * (cols - 1)) / cols));
    const rows = $derived(rowCount(items, cols));

    /**
     * Write-through persistence.
     *
     * `items` is a deep `$state` proxy, so serialising it here subscribes to
     * every field: a drag, a resize and the edit-mode toggle all land without
     * needing an explicit commit. It also fires on mount, which is what makes a
     * first visit remembered.
     */
    $effect(() => {
        saveLayout(items);
    });

    /**
     * Measures the container so the column count can follow it.
     *
     * An attachment rather than `bind:clientWidth`, because the grid has to
     * react to its *container* growing — a sidebar collapsing, say — not just
     * to a window resize.
     */
    function measure(node: HTMLElement): () => void {
        const observer = new ResizeObserver((entries) => {
            width = entries[0]?.contentRect.width ?? node.clientWidth;
        });
        observer.observe(node);
        return () => observer.disconnect();
    }

    function toggleEditMode(): void {
        editMode = !editMode;
        // Directly in the handler rather than in an effect: this is a response
        // to a click, not a reaction to state. The legacy version needed a
        // careful `$: arm(editMode)` dance to avoid re-arming mid-drag; there
        // is nothing to avoid here.
        items = applyEditMode(items, editMode);
    }

    function reset(): void {
        items = applyEditMode(defaultLayout(), editMode);
    }

    /** Cells moved for a pixel offset, rounded to the nearest whole cell. */
    function toCells(dx: number, dy: number): {x: number; y: number} {
        return {
            x: Math.round(dx / (cellWidth + GAP)),
            y: Math.round(dy / (ROW_HEIGHT + GAP)),
        };
    }

    /**
     * Both gestures capture their origin when the pointer goes down, not when
     * the handle renders — the handle re-renders on every move, since moving is
     * what rewrites `items`.
     */
    function startMove(event: PointerEvent, item: LayoutItem): void {
        const id = item.id;
        const from = {x: item[cols].x, y: item[cols].y};
        beginPointerDrag(event, {
            onMove: ({dx, dy}) => {
                const step = toCells(dx, dy);
                items = moveItem(items, id, cols, from.x + step.x, from.y + step.y);
            },
        });
    }

    function startResize(event: PointerEvent, item: LayoutItem): void {
        const id = item.id;
        const from = {w: item[cols].w, h: item[cols].h};
        beginPointerDrag(event, {
            onMove: ({dx, dy}) => {
                const step = toCells(dx, dy);
                items = resizeItem(items, id, cols, from.w + step.x, from.h + step.y);
            },
        });
    }

    const widgetMeta: Record<WidgetId, {label: [string, string]; icon: string}> = {
        barchart: {label: ['Cashflow Chart', 'ຕາຕະລາງກະແສເງິນ'], icon: 'mdi:chart-bar'},
        piechart: {label: ['Usage Share', 'ສັດສ່ວນການໃຊ້ຈ່າຍ'], icon: 'mdi:chart-donut'},
        balance: {label: ['Account Balances', 'ຍອດເງິນບັນຊີ'], icon: 'mdi:bank-outline'},
        shortcuts: {label: ['Shortcuts', 'ເມນູລັດ'], icon: 'mdi:lightning-bolt'},
        functions: {label: ['Functions', 'ຟັງຊັ່ນ'], icon: 'mdi:apps'},
        calendar: {label: ['Transaction Calendar', 'ປະຕິທິນທຸລະກຳ'], icon: 'mdi:calendar-month'},
    };

    function labelFor(id: WidgetId): string {
        const meta = widgetMeta[id];
        return meta ? t(meta.label[0], meta.label[1]) : id;
    }

    function iconFor(id: WidgetId): string {
        return widgetMeta[id]?.icon ?? 'mdi:widgets';
    }
</script>

<div class="flex w-full flex-col gap-2 px-3 pb-6 tablet:px-6 desktop:px-8">
    <!-- `grid-toolbar` is a hook, not a style: it is how a test finds these
         two buttons among the ones the widgets themselves render. -->
    <div class="grid-toolbar flex items-center justify-end gap-2 px-1">
        {#if editMode}
            <span class="select-none text-xs text-gray-400">
                <Icon icon="mdi:drag" class="inline h-3.5 w-3.5"/>
                {t('Drag the handle to move', 'ລາກຫົວຂໍ້ເພື່ອຍ້າຍ')} &nbsp;·&nbsp;
                <Icon icon="mdi:resize-bottom-right" class="inline h-3.5 w-3.5"/>
                {t('Corner to resize', 'ມຸມເພື່ອປັບຂະໜາດ')}
            </span>
            <button
                    type="button"
                    onclick={reset}
                    class="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition hover:bg-gray-50 active:bg-gray-100"
            >
                <Icon icon="mdi:restore" class="h-3.5 w-3.5"/>
                {t('Reset', 'ຕັ້ງຄືນ')}
            </button>
        {/if}
        <button
                type="button"
                onclick={toggleEditMode}
                class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all {editMode
                    ? 'bg-onebank-red text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}"
        >
            <Icon icon={editMode ? 'mdi:check-circle' : 'mdi:view-grid-plus-outline'} class="h-3.5 w-3.5"/>
            {editMode ? t('Done', 'ແລ້ວ') : t('Customize', 'ປັບແຕ່ງ')}
        </button>
    </div>

    <div class="onebank-grid relative w-full" style:height="{rows * ROW_HEIGHT + Math.max(0, rows - 1) * GAP}px" {@attach measure}>
        {#if width > 0}
            {#each items as item (item.id)}
                {@const cell = item[cols]}
                <div
                        class="onebank-grid-item absolute select-none overflow-hidden rounded-xl transition-all duration-200 {editMode
                            ? 'shadow-lg ring-2 ring-onebank-red/30 ring-offset-1'
                            : ''}"
                        style:left="{cell.x * (cellWidth + GAP)}px"
                        style:top="{cell.y * (ROW_HEIGHT + GAP)}px"
                        style:width="{cell.w * cellWidth + (cell.w - 1) * GAP}px"
                        style:height="{cell.h * ROW_HEIGHT + (cell.h - 1) * GAP}px"
                >
                    {#if editMode}
                        <div
                                class="flex h-7 w-full cursor-grab touch-none items-center justify-between rounded-t-xl bg-gradient-to-r from-onebank-red/15 to-transparent px-2.5 active:cursor-grabbing"
                                role="button"
                                tabindex="-1"
                                aria-label={t('Move', 'ຍ້າຍ') + ' ' + labelFor(item.id)}
                                onpointerdown={(event) => startMove(event, item)}
                        >
                            <div class="pointer-events-none flex items-center gap-1.5">
                                <Icon icon={iconFor(item.id)} class="h-3.5 w-3.5 text-onebank-red/80"/>
                                <span class="text-[11px] font-semibold tracking-wide text-onebank-red/80">{labelFor(item.id)}</span>
                            </div>
                            <Icon icon="mdi:drag-horizontal-variant" class="pointer-events-none h-4 w-4 text-onebank-red/50"/>
                        </div>
                    {/if}

                    <!-- One widget failing its `loadwidget` call used to take the
                         whole dashboard down with it. A boundary per cell keeps
                         the failure in the cell that caused it. -->
                    <div class="widget-content" class:with-handle={editMode}>
                        <svelte:boundary>
                            {#if item.id === 'barchart'}
                                <UsageChartWidget kind="USAGEDAILY" title={['Expenses', 'ລາຍຈ່າຍ']}/>
                            {:else if item.id === 'piechart'}
                                <UsageChartWidget kind="USAGESHARE" title={['Spending share', 'ສັດສ່ວນການໃຊ້ຈ່າຍ']}/>
                            {:else if item.id === 'balance'}
                                <AccountBalanceWidget/>
                            {:else if item.id === 'shortcuts'}
                                <Shortcuts onAdd={onCustomizeMenus}/>
                            {:else if item.id === 'functions'}
                                <Functions/>
                            {:else if item.id === 'calendar'}
                                <TransactionCalendar/>
                            {/if}

                            {#snippet failed(_error, reset)}
                                <FetchingError onRetry={reset}/>
                            {/snippet}
                        </svelte:boundary>
                    </div>

                    {#if editMode}
                        <div
                                class="resize-handle absolute bottom-1 right-1 flex h-5 w-5 cursor-se-resize touch-none items-end justify-end rounded-br-lg pb-0.5 pr-0.5"
                                role="button"
                                tabindex="-1"
                                aria-label={t('Resize', 'ປັບຂະໜາດ') + ' ' + labelFor(item.id)}
                                onpointerdown={(event) => startResize(event, item)}
                        >
                            <Icon icon="mdi:resize-bottom-right" class="h-3.5 w-3.5 text-onebank-red/60"/>
                        </div>
                    {/if}
                </div>
            {/each}
        {/if}
    </div>
</div>

<style lang="scss">
  .onebank-grid-item {
    // Every cell is absolutely positioned from the layout maths, so the browser
    // must not try to select or scroll them during a drag.
    user-select: none;
    touch-action: none;
  }

  .widget-content {
    height: 100%;
    // The balance list, the menu grids and the calendar all scroll inside
    // their cell rather than growing it.
    overflow-y: auto;
    overflow-x: hidden;

    &.with-handle {
      // Less the 28px drag handle.
      height: calc(100% - 28px);
    }
  }

  .resize-handle {
    z-index: 10;
  }
</style>

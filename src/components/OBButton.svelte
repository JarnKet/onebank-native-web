<script lang="ts">
  /**
   * The shared OneBank button.
   *
   * Ported from the `dev` branch, converted to runes: `export let` became
   * `$props`, `createEventDispatcher` became an `onaction` callback prop, and
   * `<svelte:component this={...}>` became a plain branch, since the choice is
   * between two known components rather than a dynamic one.
   *
   * `title` is the label, not the HTML `title` attribute — dev's name is kept so
   * call sites ported from that branch need no rewriting.
   */
  import Icon from '@iconify/svelte'
  import PrimaryLoadingSpinner from './PrimaryLoadingSpinner.svelte'
  import SecondaryLoadingSpinner from './SecondaryLoadingSpinner.svelte'
  import { t } from '../lib/utils/helper'

  interface Props {
    /** Filled brand button when true, outlined when false. */
    primary?: boolean
    /** Swaps the icon for a spinner and blocks the click. */
    loading?: boolean
    disabled?: boolean
    /** The button's visible label. */
    title?: string
    /** Extra classes, appended to the variant's own. */
    className?: string
    /** Iconify name, e.g. `mdi:check`. Omitted means no icon. */
    iconName?: string
    onaction?: () => void
  }

  let {
    primary = true,
    loading = false,
    disabled = false,
    title = t('Confirm', 'ຍືນຍັນ'),
    className = '',
    iconName = '',
    onaction,
  }: Props = $props()
</script>

<button
  type="button"
  class:onebank-primary-btn={primary}
  class:onebank-secondary-btn={!primary}
  class:gap-2={iconName || loading}
  class={className}
  disabled={disabled || loading}
  onclick={() => onaction?.()}
>
  {#if loading}
    {#if primary}
      <PrimaryLoadingSpinner />
    {:else}
      <SecondaryLoadingSpinner />
    {/if}
  {:else if iconName}
    <Icon icon={iconName} class="h-5 w-5" />
  {/if}
  {title}
</button>

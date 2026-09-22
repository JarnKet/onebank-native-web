<script lang="ts">
  /**
   * The mobile bottom navigation for the unauthenticated screens.
   *
   * Ported from the `dev` branch and converted to runes. `activeTab` was an
   * `export let` the component wrote back to, which is `$bindable` here — the
   * parent can follow the selection with `bind:activeTab` or ignore it, exactly
   * as before.
   *
   * Hidden from `tablet` up: the desktop layout has the sidebar instead.
   */
  import Icon from '@iconify/svelte'
  import { t } from '../lib/utils/helper'

  export type BottomNavTab = 'register' | 'login' | 'services'

  interface Props {
    activeTab?: BottomNavTab
    /** Fires on every selection, including when the tab is unchanged. */
    onselect?: (tab: BottomNavTab) => void
  }

  let { activeTab = $bindable('login'), onselect }: Props = $props()

  const tabs: { id: BottomNavTab; icon: string; label: { en: string; lo: string } }[] = [
    { id: 'register', icon: 'mdi:pencil', label: { en: 'Register', lo: 'ລົງທະບຽນ' } },
    { id: 'login', icon: 'mdi:login', label: { en: 'Login', lo: 'ເຂົ້າສູ່ລະບົບ' } },
    { id: 'services', icon: 'mdi:dots-vertical', label: { en: 'Services', lo: 'ບໍລິການອື່ນໆ' } },
  ]

  function select(tab: BottomNavTab): void {
    activeTab = tab
    onselect?.(tab)
  }
</script>

<nav class="pb-safe fixed bottom-0 z-10 w-full rounded-t-2xl border-t border-gray-200 bg-white pt-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.12),0_-2px_4px_-2px_rgba(0,0,0,0.1)] tablet:hidden">
  <div class="grid grid-cols-3 gap-1 px-3">
    {#each tabs as tab (tab.id)}
      <button
        type="button"
        class="group flex flex-col items-center gap-1.5 rounded-ob-md py-1 transition-all"
        class:active={activeTab === tab.id}
        aria-current={activeTab === tab.id ? 'page' : undefined}
        onclick={() => select(tab.id)}
      >
        <div
          class="flex size-9 items-center justify-center rounded-full transition-all {activeTab === tab.id
            ? 'bg-onebank-red shadow-md'
            : 'bg-gray-100 group-hover:bg-gray-200'}"
        >
          <Icon
            icon={tab.icon}
            class="h-5 w-5 {activeTab === tab.id ? 'text-white' : 'text-gray-600 group-hover:text-gray-700'}"
          />
        </div>
        <span
          class="text-xs font-medium leading-none {activeTab === tab.id
            ? 'text-onebank-red'
            : 'text-gray-600 group-hover:text-gray-700'}"
        >
          {t(tab.label.en, tab.label.lo)}
        </span>
      </button>
    {/each}
  </div>
</nav>

<style>
  .active {
    transform: translateY(-2px);
  }
</style>

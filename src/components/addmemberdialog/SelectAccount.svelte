<script lang="ts">
  /**
   * Step 2 of adding a member: which accounts they get.
   *
   * The `dev` branch's redesign, converted to runes. The substantive change is
   * that this reads the group's real accounts from `loadhome` — the version it
   * replaces rendered two hardcoded cards with a fixed account number and a
   * `console.log` for a handler.
   */
  import type { Account } from '../../definition'
  import { currentGroup, onebankGroups } from '../../stores/onebankGroups'

  let selectedAccountIds = $state<string[]>([])

  const accounts = $derived(($onebankGroups[$currentGroup]?.loadHomeResult?.accounts ?? []) as Account[])

  const ccyBadgeClass: Record<string, string> = {
    LAK: 'bg-teal-500 text-white',
    USD: 'bg-green-500 text-white',
    THB: 'bg-purple-500 text-white',
    CNY: 'bg-yellow-500 text-black',
  }

  const accountTypeLabel: Record<string, string> = {
    SAVING: 'ບັນຊີໂຕ',
    CURRENT: 'ບັນຊີກະແສ',
    VIRTUAL: 'ບັດສາຍ',
    SHADOW: 'ບັນຊີເງົາ',
    STANDARD: 'ບັນຊີຫຼັກ',
  }

  function toggleAccount(id: string): void {
    selectedAccountIds = selectedAccountIds.includes(id)
      ? selectedAccountIds.filter((accountId) => accountId !== id)
      : [...selectedAccountIds, id]
  }
</script>

<div class="space-y-3">
  <div class="grid max-h-72 grid-cols-2 gap-3 overflow-y-auto pr-1">
    {#each accounts as account (account.accountid)}
      {@const isSelected = selectedAccountIds.includes(account.accountid)}
      <button
        type="button"
        class="rounded-ob-lg border-2 p-4 text-left shadow-sm transition-all hover:bg-gray-50"
        class:border-onebank-red={isSelected}
        class:ring-1={isSelected}
        class:ring-onebank-red={isSelected}
        class:border-gray-200={!isSelected}
        aria-pressed={isSelected}
        onclick={() => toggleAccount(account.accountid)}
      >
        <div class="relative flex w-full gap-3">
          <div class="absolute right-0 top-0 flex h-5 w-5 flex-shrink-0 items-center justify-center">
            <div class="h-5 w-5 rounded border-2 transition-colors" class:border-onebank-red={isSelected} class:border-gray-300={!isSelected}></div>
            {#if isSelected}
              <div class="absolute flex h-5 w-5 items-center justify-center rounded bg-onebank-red">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
            {/if}
          </div>

          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-500">
            {account.ccy?.[0] ?? '?'}
          </div>

          <div class="min-w-0 flex-1 pr-6">
            <div class="truncate text-sm font-semibold text-gray-900">{account.maskedAccount || account.account}</div>
            <div class="truncate text-xs text-gray-600">{account.name}</div>
            <div class="mt-1.5 flex flex-wrap gap-1.5">
              <span class="rounded-full px-2.5 py-0.5 text-xs font-medium {ccyBadgeClass[account.ccy] ?? 'bg-gray-200 text-black'}">
                {account.ccy}
              </span>
              <span class="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                {accountTypeLabel[account.type] ?? account.type}
              </span>
            </div>
          </div>
        </div>
      </button>
    {/each}
  </div>

  <button
    type="button"
    class="flex w-full items-center justify-center gap-2 rounded-ob-lg bg-gray-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
  >
    <span class="text-lg leading-none">+</span>
    ເພີ່ມບັນຊີ
  </button>
</div>

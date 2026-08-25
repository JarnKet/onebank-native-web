<script lang="ts">
  /**
   * Adding a member, in three steps.
   *
   * The `dev` branch's redesign, converted to runes. Two things changed beyond
   * the styling: the steps now start with *finding* the person rather than
   * picking permissions for nobody in particular, and the wizard resets when the
   * dialog closes instead of reopening wherever it was abandoned.
   */
  import SelectPermission from './SelectPermission.svelte'
  import SelectAccount from './SelectAccount.svelte'
  import FindMember from './FindMember.svelte'
  import { closeAddMemberDialog, showAddMemberDialog } from '../../stores/ui'
  import { showPopup } from '../../lib/utils/helper'
  import { currentGroup, onebankGroups } from '../../stores/onebankGroups'

  type AddMemberStep = 'FIND_MEMBER' | 'SELECT_PERMISSION' | 'SELECT_ACCOUNT'

  const stepTitles: Record<AddMemberStep, string> = {
    FIND_MEMBER: 'ເພີ່ມສະມາຊິກ',
    SELECT_PERMISSION: 'ເລືອກປະເພດສິດຂອງສະມາຊິກ',
    SELECT_ACCOUNT: 'ເລືອກບັນຊີທີ່ຈະໃຊ້ເບິ່ງ ຫຼື ເຄື່ອນໄຫວ',
  }

  let step = $state<AddMemberStep>('FIND_MEMBER')
  const title = $derived(stepTitles[step])

  function gotoNextStep(): void {
    if (step === 'FIND_MEMBER') {
      step = 'SELECT_PERMISSION'
    } else if (step === 'SELECT_PERMISSION') {
      step = 'SELECT_ACCOUNT'
    } else {
      closeAddMemberDialog()
      showPopup('MEMBER.html', {
        onebankid: $onebankGroups[$currentGroup]?.loadHomeResult?.detail?.onebankid ?? '',
      })
    }
  }

  function gobackPreviousStep(): void {
    if (step === 'SELECT_PERMISSION') {
      step = 'FIND_MEMBER'
    } else if (step === 'SELECT_ACCOUNT') {
      step = 'SELECT_PERMISSION'
    } else {
      closeAddMemberDialog()
    }
  }

  // Closing is the reset. Both exit paths above just close, so the wizard cannot
  // reopen halfway through whatever the user abandoned.
  $effect(() => {
    if (!$showAddMemberDialog) step = 'FIND_MEMBER'
  })
</script>

<button
  type="button"
  aria-label="Close dialog"
  class="fixed inset-0 z-40 bg-black/30"
  class:hidden={!$showAddMemberDialog}
  onclick={() => closeAddMemberDialog()}
></button>

{#if $showAddMemberDialog}
  <div class="fixed left-1/2 top-1/2 z-50 w-11/12 max-w-2xl -translate-x-1/2 -translate-y-1/2 transform">
    <div class="flex flex-col gap-4 rounded-ob-lg bg-white p-6 shadow-2xl">
      <h2 class="text-lg font-bold text-gray-900">{title}</h2>

      <div>
        {#if step === 'FIND_MEMBER'}
          <FindMember />
        {:else if step === 'SELECT_PERMISSION'}
          <SelectPermission />
        {:else}
          <SelectAccount />
        {/if}
      </div>

      <div class="flex justify-end gap-3 pt-2">
        <button
          type="button"
          class="w-1/3 rounded-3xl border border-gray-400/60 bg-white py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
          onclick={gobackPreviousStep}
        >
          {step === 'FIND_MEMBER' ? 'ຍົກເລີກ' : 'ກັບຄືນ'}
        </button>
        <button
          type="button"
          class="w-1/3 rounded-3xl bg-onebank-red py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
          onclick={gotoNextStep}
        >
          ຕໍ່ໄປ
        </button>
      </div>
    </div>
  </div>
{/if}

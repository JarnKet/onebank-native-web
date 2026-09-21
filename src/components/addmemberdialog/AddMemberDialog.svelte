<script lang="ts">
  /**
   * Adding a member, in the design's three steps: find the person by the code
   * their app shows, choose what they may do (view or transact), then which
   * accounts — and, for a member who can transact, the functions, limits and
   * approvals of their role, using the same editor as "Manage permissions".
   *
   * Finishing adds them and saves a role that holds exactly them.
   */
  import Icon from '@iconify/svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import SelectableAccount from '../../lib/components/SelectableAccount.svelte'
  import PermissionEditor from '../../lib/components/PermissionEditor.svelte'
  import { addMember, addMemberEnquiry, savePermission } from '../../lib/api/commands'
  import type { Permission } from '../../lib/api/types'
  import type { User } from '../../definition'
  import { initials, t } from '../../lib/utils/helper'
  import { menus } from '../../lib/menus'
  import { navigateToPath } from '../../lib/utils/navigation'
  import { closeAddMemberDialog } from '../../stores/ui'
  import { loadHomeResult } from '../../stores/onebankGroups'
  import { reloadHome } from '../../stores/home'

  type Step = 'FIND' | 'TYPE' | 'SCOPE'

  let step = $state<Step>('FIND')
  let code = $state('')
  let found = $state<User | null>(null)
  let searching = $state(false)
  let saving = $state(false)
  let error = $state('')
  let permission = $state<Permission>({ name: '', accountids: [], userids: [], viewonly: true, allowedfunctions: '*', approverlevels: [] })

  const accounts = $derived($loadHomeResult?.accounts ?? [])
  const members = $derived($loadHomeResult?.users ?? [])
  const functions = $derived(($loadHomeResult?.allmenus ?? []).filter((key) => menus[key]))

  const TITLES: Record<Step, [string, string]> = {
    FIND: ['Add member', 'ເພີ່ມສະມາຊິກ'],
    TYPE: ["Choose the member's permission type", 'ເລືອກປະເພດສິດຂອງສະມາຊິກ'],
    SCOPE: ['Choose the accounts to view or transact on', 'ເລືອກບັນຊີທີ່ຈະໃຊ້ເບິ່ງ ຫຼື ເຄື່ອນໄຫວ'],
  }

  async function find() {
    if (!code.trim()) return
    searching = true
    error = ''
    const response = await addMemberEnquiry(code.trim())
    searching = false
    if (response.result === 0 && response.user) {
      found = response.user
      if (members.some((member) => member.userid === response.user!.userid)) {
        error = t('This person is already a member of the group', 'ຄົນນີ້ເປັນສະມາຊິກຂອງກຸ່ມແລ້ວ')
      }
    } else {
      found = null
      error = response.message || t('No one has that member code', 'ບໍ່ພົບລະຫັດສະມາຊິກນີ້')
    }
  }

  const canContinue = $derived(
    step === 'FIND' ? found !== null && !error : step === 'TYPE' ? true : permission.accountids.length > 0,
  )

  async function next() {
    error = ''
    if (step === 'FIND') {
      step = 'TYPE'
      return
    }
    if (step === 'TYPE') {
      permission.name = `${permission.viewonly ? t('Viewer', 'ເບິ່ງໄດ້') : t('Transactor', 'ເຄື່ອນໄຫວໄດ້')} · ${found?.name ?? ''}`
      step = 'SCOPE'
      return
    }
    if (!found) return
    saving = true
    const added = await addMember(code.trim())
    if (added.result !== 0) {
      saving = false
      error = added.message || t('Could not add the member', 'ເພີ່ມສະມາຊິກບໍ່ໄດ້')
      return
    }
    const role = await savePermission({ ...($state.snapshot(permission) as Permission), userids: [found.userid] })
    saving = false
    if (role.result !== 0) {
      error = role.message || t('Added, but the role could not be saved', 'ເພີ່ມແລ້ວ ແຕ່ບັນທຶກສິດບໍ່ໄດ້')
      return
    }
    await reloadHome()
    closeAddMemberDialog()
    navigateToPath('/member')
  }

  function back() {
    error = ''
    if (step === 'FIND') closeAddMemberDialog()
    else step = step === 'SCOPE' ? 'TYPE' : 'FIND'
  }

  function toggle(accountid: string) {
    permission.accountids = permission.accountids.includes(accountid)
      ? permission.accountids.filter((id) => id !== accountid)
      : [...permission.accountids, accountid]
  }
</script>

<Modal title={t(TITLES[step][0], TITLES[step][1])} size={step === 'SCOPE' && !permission.viewonly ? 'xl' : 'lg'} onClose={closeAddMemberDialog}>
  {#if step === 'FIND'}
    <form class="space-y-4" onsubmit={(event) => { event.preventDefault(); void find() }}>
      <label class="relative block">
        <span class="sr-only">{t('Member code', 'ລະຫັດສະມາຊິກ')}</span>
        <Icon icon="mdi:magnify" class="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2"/>
        <input bind:value={code} inputmode="numeric" autocomplete="off" placeholder={t('Enter the member code', 'ປ້ອນລະຫັດສະມາຊິກ')}
               class="h-12 w-full rounded-ob-xl border border-onebank-ink pl-12 pr-28 text-base focus:border-onebank-red focus:ring-onebank-red"/>
        <button type="submit" class="absolute right-1.5 top-1.5 h-9 rounded-ob-lg bg-onebank-red px-5 text-sm font-bold text-white disabled:opacity-50" disabled={searching || !code.trim()}>
          {searching ? t('Finding…', 'ກຳລັງຄົ້ນຫາ…') : t('Find', 'ຄົ້ນຫາ')}
        </button>
      </label>
      <p class="text-center text-xs text-onebank-subtle">
        {t('The person finds their code under "Join a group" in their app. Demo codes: 2045, 3312, 7788.', 'ລະຫັດຢູ່ໃນເມນູ "ເຂົ້າຮ່ວມກຸ່ມ" ຂອງຜູ້ນັ້ນ. ລະຫັດທົດລອງ: 2045, 3312, 7788.')}
      </p>
      {#if found}
        <div class="flex items-center gap-4 rounded-ob-xl border-2 border-onebank-red bg-onebank-pink/40 p-4">
          <span class="flex h-12 w-12 items-center justify-center rounded-full bg-onebank-light-grey-4 font-semibold text-white">{initials(found.name)}</span>
          <span class="flex-1 font-semibold">{found.name}</span>
          <button type="button" aria-label={t('Clear', 'ລ້າງ')} onclick={() => { found = null; error = '' }}>
            <Icon icon="mdi:close-circle-outline" class="h-6 w-6"/>
          </button>
        </div>
      {/if}
    </form>
  {:else if step === 'TYPE'}
    <div class="grid gap-3 tablet:grid-cols-2" role="radiogroup">
      {#each [
        { viewonly: true, en: 'View only', lo: 'ເບິ່ງໄດ້ຢ່າງດຽວ', den: 'Sees balances and movements, cannot move money.', dlo: 'ສາມາດກວດເບິ່ງການເຄື່ອນໄຫວຂອງບັນຊີໄດ້ ແຕ່ບໍ່ສາມາດເຄື່ອນໄຫວ.', icon: 'mdi:eye-outline' },
        { viewonly: false, en: 'Full access', lo: 'ເຄື່ອນໄຫວໄດ້', den: 'Can transact. You set the functions, limits and who approves.', dlo: 'ສາມາດເຄື່ອນໄຫວບັນຊີໄດ້. ທ່ານກຳນົດຟັງຊັ່ນ, ວົງເງິນ ແລະ ຜູ້ອະນຸມັດ.', icon: 'mdi:security-account' },
      ] as option (option.en)}
        <label class="flex cursor-pointer flex-col gap-2 rounded-ob-xl border-2 bg-white p-5 shadow-ob-card transition-colors
                      {permission.viewonly === option.viewonly ? 'border-onebank-red' : 'border-transparent'}">
          <span class="flex items-center gap-3">
            <input type="radio" name="memberType" class="text-onebank-red focus:ring-onebank-red"
                   checked={permission.viewonly === option.viewonly} onchange={() => (permission.viewonly = option.viewonly)}/>
            <Icon icon={option.icon} class="h-6 w-6"/>
            <span class="text-lg font-semibold">{t(option.en, option.lo)}</span>
          </span>
          <span class="pl-7 text-sm text-onebank-subtle">{t(option.den, option.dlo)}</span>
        </label>
      {/each}
    </div>
  {:else if permission.viewonly}
    <div class="grid gap-3 tablet:grid-cols-2">
      {#each accounts as account (account.accountid)}
        <SelectableAccount {account} selected={permission.accountids.includes(account.accountid)} onToggle={() => toggle(account.accountid)}/>
      {/each}
    </div>
  {:else}
    <PermissionEditor bind:permission {accounts} {members} {functions} showMembers={false}/>
  {/if}

  {#if error}<p class="mt-4 text-center text-sm text-red-600" role="alert">{error}</p>{/if}

  {#snippet footer()}
    <button type="button" class="h-12 min-w-40 rounded-ob-xl border-2 border-onebank-blue bg-white text-onebank-blue hover:bg-onebank-blue-soft px-6 text-base font-bold" onclick={back} disabled={saving}>
      {step === 'FIND' ? t('Cancel', 'ຍົກເລີກ') : t('Back', 'ກັບຄືນ')}
    </button>
    <button type="button" class="h-12 min-w-40 rounded-ob-xl bg-onebank-red px-6 text-base font-bold text-white disabled:opacity-50"
            onclick={next} disabled={!canContinue || saving}>
      {step === 'SCOPE' ? (saving ? t('Adding…', 'ກຳລັງເພີ່ມ…') : t('Add member', 'ເພີ່ມສະມາຊິກ')) : t('Next', 'ຕໍ່ໄປ')}
    </button>
  {/snippet}
</Modal>

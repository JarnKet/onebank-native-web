<script lang="ts">
  /**
   * Adding a member: find the person by the code their app shows
   * (`addmemberenquiry`), confirm who it is, add them (`addmember`).
   *
   * Giving them a role is the next step, and it still belongs to the legacy
   * permissions page — saving a permission is not in the core contract yet.
   * So finishing opens `ROLE.html?page=addpermission&newuserid=<id>`, which is
   * the contract that page has always had.
   */
  import Icon from '@iconify/svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import { addMember, addMemberEnquiry } from '../../lib/api/commands'
  import type { User } from '../../definition'
  import { getProfileImageUrl, initials, t } from '../../lib/utils/helper'
  import { navigateToPath } from '../../lib/utils/navigation'
  import { closeAddMemberDialog } from '../../stores/ui'
  import { loadHomeResult } from '../../stores/onebankGroups'
  import { reloadHome } from '../../stores/home'

  let code = $state('')
  let found = $state<User | null>(null)
  let searching = $state(false)
  let saving = $state(false)
  let error = $state('')
  let imageFailed = $state(false)

  const members = $derived($loadHomeResult?.users ?? [])
  const alreadyMember = $derived(found !== null && members.some((member) => member.userid === found!.userid))

  async function find() {
    if (!code.trim()) return
    searching = true
    error = ''
    found = null
    imageFailed = false
    try {
      const response = await addMemberEnquiry(code.trim())
      if (response?.result === 0 && response.user) found = response.user
      else error = response?.message || t('No one has that member code', 'ບໍ່ພົບລະຫັດສະມາຊິກນີ້')
    } catch (e) {
      error = (e as Error)?.message || t('Could not look up that code', 'ຄົ້ນຫາບໍ່ໄດ້')
    } finally {
      searching = false
    }
  }

  async function add() {
    if (!found || alreadyMember) return
    saving = true
    error = ''
    try {
      const response = await addMember(code.trim())
      if (response?.result !== 0) {
        error = response?.message || t('Could not add the member', 'ເພີ່ມສະມາຊິກບໍ່ໄດ້')
        return
      }
      const userid = found.userid
      await reloadHome()
      closeAddMemberDialog()
      navigateToPath('/role', { page: 'addpermission', newuserid: userid })
    } catch (e) {
      error = (e as Error)?.message || t('Could not add the member', 'ເພີ່ມສະມາຊິກບໍ່ໄດ້')
    } finally {
      saving = false
    }
  }
</script>

<Modal title={t('Add member', 'ເພີ່ມສະມາຊິກ')} size="md" onClose={closeAddMemberDialog}>
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
      {t('The person finds their code under "Join a group" in their app.', 'ລະຫັດຢູ່ໃນເມນູ "ເຂົ້າຮ່ວມກຸ່ມ" ຂອງຜູ້ນັ້ນ.')}
    </p>
    {#if found}
      <div class="flex items-center gap-4 rounded-ob-xl border-2 border-onebank-red bg-onebank-pink/40 p-4">
        {#if !imageFailed}
          <img src={getProfileImageUrl(found.profiletype, found.profileid, found.faceid + '.jpg', 't.')} alt=""
               class="h-12 w-12 rounded-full object-cover" onerror={() => (imageFailed = true)}/>
        {:else}
          <span class="flex h-12 w-12 items-center justify-center rounded-full bg-onebank-light-grey-4 font-semibold text-white">{initials(found.name)}</span>
        {/if}
        <span class="flex-1 font-semibold">{found.name}</span>
        <button type="button" aria-label={t('Clear', 'ລ້າງ')} onclick={() => { found = null; error = '' }}>
          <Icon icon="mdi:close-circle-outline" class="h-6 w-6"/>
        </button>
      </div>
      {#if alreadyMember}<p class="text-center text-sm text-onebank-subtle">{t('This person is already a member of the group.', 'ຄົນນີ້ເປັນສະມາຊິກຂອງກຸ່ມແລ້ວ.')}</p>{/if}
    {/if}
  </form>

  {#if error}<p class="mt-4 text-center text-sm text-red-600" role="alert">{error}</p>{/if}

  {#snippet footer()}
    <button type="button" class="onebank-secondary-btn tablet:min-w-40" onclick={closeAddMemberDialog} disabled={saving}>{t('Cancel', 'ຍົກເລີກ')}</button>
    <button type="button" class="onebank-primary-btn tablet:min-w-40" onclick={add} disabled={!found || alreadyMember || saving}>
      {saving ? t('Adding…', 'ກຳລັງເພີ່ມ…') : t('Add and set permissions', 'ເພີ່ມ ແລະ ກຳນົດສິດ')}
    </button>
  {/snippet}
</Modal>

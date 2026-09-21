<script lang="ts">
  /**
   * The group's members as an overlapping avatar stack, owners first, with a
   * "+N" for the rest — the row under the group name in the sidebar card.
   */
  import type { User } from '../definition'
  import { initials } from '../lib/utils/helper'
  import { loadHomeResult } from '../stores/onebankGroups'

  let { max = 5 }: { max?: number } = $props()

  // Copy before sorting: the array belongs to the cached loadhome payload, and
  // sorting in place reorders it for every other reader.
  function sortUsersByRole(users: User[]): User[] {
    const rank = (user: User) => (user.role === 'OWNER' ? 0 : user.role === 'ADMIN' ? 1 : 2)
    return [...users].sort((a, b) => rank(a) - rank(b))
  }

  const members = $derived(sortUsersByRole($loadHomeResult?.users ?? []))
  const shown = $derived(members.slice(0, max))

  const TINTS = ['#e5e7eb', '#fde2e2', '#dbeafe', '#dcfce7', '#fef3c7', '#ede9fe']
</script>

{#if members.length > 0}
  <div class="flex items-center -space-x-[7px]" aria-label="{members.length} members">
    {#each shown as member, index (member.userid)}
      <span
        class="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[10px] font-semibold text-gray-600 ring-2 ring-white"
        style="background-color: {TINTS[index % TINTS.length]}"
        title={member.name}>{initials(member.name)}</span>
    {/each}
    {#if members.length > max}
      <span class="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#e8e8f0] text-xs text-black ring-2 ring-white">
        +{members.length - max}
      </span>
    {/if}
  </div>
{/if}

<script lang="ts">
  import type { User } from '../definition'
  import { getProfileImageUrl } from '../lib/utils/helper'
  import { loadHomeResult } from '../stores/onebankGroups'

  // Copy before sorting: the array belongs to the cached loadhome payload, and
  // sorting in place reorders it for every other reader.
  function sortUsersByRole(users: User[]): User[] {
    return [...users].sort((a, b) => {
      if (a.role === 'OWNER' && b.role !== 'OWNER') {
        return -1
      } else if (a.role !== 'OWNER' && b.role === 'OWNER') {
        return 1
      } else {
        return 0
      }
    })
  }

  // `loadHomeResult` is null between a group being known and its home arriving.
  const members = $derived(sortUsersByRole($loadHomeResult?.users ?? []))
  const shown = $derived(members.slice(0, 5))
</script>

<div class="flex justify-between">
  {#if members.length > 0}
    <div class="flex -space-x-1 overflow-hidden py-1">
      {#each shown as member (member.userid)}
        <img
          class="inline-block h-7 w-7 self-end rounded-full ring-2 ring-white"
          src={getProfileImageUrl(member.profiletype, member.profileid, member.faceid + '.jpg', '')}
          alt={member.name}
        />
      {/each}
      {#if members.length > 5}
        <div
          class="flex h-7 w-7 items-center justify-center self-end rounded-full bg-gray-200 text-center text-xs font-medium text-gray-700 ring-2 ring-white"
        >
          +{members.length - 5}
        </div>
      {/if}
    </div>
  {/if}
</div>

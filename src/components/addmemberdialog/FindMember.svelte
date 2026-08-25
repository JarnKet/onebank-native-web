<script lang="ts">
  import Icon from '@iconify/svelte'
  import {t} from '../../lib/utils/helper'

  let searchTerm = $state('')
  let selectedItems = $state<string[]>([])

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && searchTerm.trim()) {
      const newItems = searchTerm
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== '')

      selectedItems = [...new Set([...selectedItems, ...newItems])]
      searchTerm = ''
      event.preventDefault()
    }
  }

  function removeItem(index: number): void {
    selectedItems = selectedItems.filter((_, i) => i !== index)
  }
</script>

<div>
  <div class="relative mx-4 flex-1">
    <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
      <Icon icon="mdi:magnify" width={20} height={20} />
    </div>

    <div class="flex min-h-[42px] w-full items-center rounded-xl border border-gray-300 py-1 pl-10 pr-2 focus-within:border-onebank-red focus-within:ring-1 focus-within:ring-onebank-red">
      <div class="flex w-full flex-wrap gap-1">
        {#each selectedItems as item, index (item)}
          <div class="flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-sm">
            <span>{item}</span>
            <button type="button" class="ml-1 rounded-full p-0.5 hover:bg-gray-300" onclick={() => removeItem(index)}>
              <Icon icon="mdi:close" width={14} height={14} />
            </button>
          </div>
        {/each}

        <input
          type="text"
          placeholder={selectedItems.length ? '' : t('Enter member code', 'ປ້ອນລະຫັດສະມາຊິກ')}
          bind:value={searchTerm}
          onkeydown={handleKeyDown}
          class="flex-grow border-none bg-transparent p-1 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0"
        />
      </div>
    </div>
  </div>

  <div class="p-4 px-8 text-center text-sm font-light">
    ທ່ານສາມາດເອົາເລກສະມາຊິກຂອງຫມູ່ທ່ານໄດ້ໃນ One Bank ສຳລັບມືຖືໂດຍແນະນຳໃຫ້ລາວກົດປຸ່ມຢູ່ເທິງຂວາຂອງຈໍແລ້ວກົດ "ເຂົ້າຮ່ວມກຸ່ມ"
    <br />
    <span class="mt-2 block text-xs text-gray-500">ສາມາດປ້ອນຫລາຍເລກສະມາຊິກໂດຍໃຊ້ເຄື່ອງຫມາຍຈຸດຄັ່ນ (,)</span>
  </div>
</div>

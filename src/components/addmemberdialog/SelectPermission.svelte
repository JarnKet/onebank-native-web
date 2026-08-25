<script lang="ts">
  /**
   * Step 1 of adding a member: what the new member is allowed to do.
   *
   * The layout is the `dev` branch's redesign, converted to runes. dev also
   * dropped the `handleAccessChange` console.log that the old version called on
   * every change, so the radio group is now the only state here.
   */
  let selectedAccess = $state<'view-only' | 'transact'>('view-only')
</script>

<div class="space-y-4">
  <div class="flex gap-4">
    <label class="w-1/2 cursor-pointer" for="view-only">
      <input bind:group={selectedAccess} class="peer sr-only" id="view-only" name="access-type" type="radio" value="view-only" />
      <div
        class="h-full rounded-ob-lg border p-4 shadow transition-all hover:bg-gray-50 peer-checked:border-onebank-red peer-checked:ring-1 peer-checked:ring-onebank-red"
      >
        <div class="flex gap-3">
          <div class="relative mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center">
            <div class="h-5 w-5 rounded-full border-2 border-gray-300" class:border-onebank-red={selectedAccess === 'view-only'}></div>
            <div
              class="absolute h-2.5 w-2.5 rounded-full bg-onebank-red transition-transform"
              class:scale-0={selectedAccess !== 'view-only'}
              class:scale-100={selectedAccess === 'view-only'}
            ></div>
          </div>
          <div>
            <div class="mb-1 font-semibold text-gray-900">ເບິ່ງບັນຊີໄດ້</div>
            <div class="text-sm leading-relaxed text-gray-600">
              ສາມາດເບິ່ງປະຫວັດການເຄື່ອນໄຫວ, ເບີ່ງຍອດເງີນ ແລະ ດາວໂຫລດໃບແຈ້ງຍອດໄດ້.
            </div>
          </div>
        </div>
      </div>
    </label>

    <label class="w-1/2 cursor-pointer" for="transact">
      <input bind:group={selectedAccess} class="peer sr-only" id="transact" name="access-type" type="radio" value="transact" />
      <div
        class="h-full rounded-ob-lg border p-4 shadow transition-all hover:bg-gray-50 peer-checked:border-onebank-red peer-checked:ring-1 peer-checked:ring-onebank-red"
      >
        <div class="flex gap-3">
          <div class="relative mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center">
            <div class="h-5 w-5 rounded-full border-2 border-gray-300" class:border-onebank-red={selectedAccess === 'transact'}></div>
            <div
              class="absolute h-2.5 w-2.5 rounded-full bg-onebank-red transition-transform"
              class:scale-0={selectedAccess !== 'transact'}
              class:scale-100={selectedAccess === 'transact'}
            ></div>
          </div>
          <div>
            <div class="mb-1 font-semibold text-gray-900">ເຄື່ອນໄຫວບັນຊີໄດ້</div>
            <div class="text-sm leading-relaxed text-gray-600">
              ສາມາດເຄື່ອນໄຫວບັນຊີ, ສ້າງການໂອນ, ການຈ່າຍເງິນ ແລະ ເລືອກໃຊ້ໄດ້ທຸກຟັງຊັ່ນ.
            </div>
          </div>
        </div>
      </div>
    </label>
  </div>

  <button
    type="button"
    class="flex w-full items-center justify-center gap-2 rounded-ob-lg bg-gray-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
  >
    <span class="text-lg leading-none">+</span>
    ສ້າງສິດໃໝ່
  </button>
</div>

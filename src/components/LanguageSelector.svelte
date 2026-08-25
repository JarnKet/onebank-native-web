<script lang="ts">
  import Icon from '@iconify/svelte'
  import { fade } from 'svelte/transition'
  import { language } from '../stores/config'
  import { t } from '../lib/utils/helper'
  import { clickOutside } from '../lib/attachments/clickOutside'

  interface Props {
    currentLang?: string
  }

  let { currentLang = '0' }: Props = $props()

  let isLanguagePopupOpen = $state(false)

  const languages = [
    { code: '1', name: 'Lao', local: 'ພາສາລາວ', img: 'img/flag_laos.svg' },
    { code: '0', name: 'English', local: 'English', img: 'img/flag_us.svg' },
    { code: '3', name: 'Chinese', local: '中文', img: 'img/flag_china.svg' },
    { code: '2', name: 'Vietnamese', local: 'Tiếng Việt', img: 'img/flag_vietnam.svg' },
  ]

  function handleLanguageSelect(langCode: string): void {
    $language = langCode
    isLanguagePopupOpen = false
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') isLanguagePopupOpen = false
  }
</script>

<button
  type="button"
  class="language-button group flex flex-col items-center"
  onclick={() => (isLanguagePopupOpen = true)}
>
  <div class="flex h-10 w-10 items-center justify-center rounded-full bg-onebank-red/5 transition-colors group-hover:bg-onebank-red/10 tablet:h-12 tablet:w-12">
    <Icon icon="mdi:translate" class="h-5 w-5 text-onebank-red tablet:h-6 tablet:w-6" />
  </div>
  <span class="mt-1 text-xs font-medium text-gray-600 tablet:text-sm">
    {$language === '1' ?  'ພາສາ': 'Language'}
  </span>
</button>

{#if isLanguagePopupOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4" transition:fade={{ duration: 200 }}>
    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" transition:fade={{ duration: 150 }}></div>
    <div
      class="language-popup relative w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl"
      {@attach clickOutside(() => (isLanguagePopupOpen = false))}
    >
      <div class="border-b border-gray-100 bg-gray-50/80 p-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              {t('Select Language', 'ເລືອກພາສາ')}
            </h3>
            <p class="mt-1 text-sm text-gray-500">
              {t('Choose your preferred language', 'ເລືອກພາສາທີ່ທ່ານຕ້ອງການ')}
            </p>
          </div>
          <button
            type="button"
            aria-label={t('Close', 'ປິດ')}
            class="rounded-full p-1.5 text-gray-400 hover:bg-white hover:text-gray-600"
            onclick={() => (isLanguagePopupOpen = false)}
          >
            <Icon icon="mdi:close" class="h-5 w-5" />
          </button>
        </div>
      </div>
      <div class="p-2">
        {#each languages as lang (lang.code)}
          <button
            type="button"
            class="group flex w-full items-center gap-4 rounded-lg p-3 text-left transition-all
                   hover:bg-gray-50 active:bg-gray-100
                   {currentLang === lang.code ? 'bg-onebank-red/5 hover:bg-onebank-red/10' : ''}"
            onclick={() => handleLanguageSelect(lang.code)}
          >
            <div class="flex-shrink-0">
              <img src={lang.img} alt={`${lang.name} flag`} class="h-8 w-8 rounded-full object-cover ring-1 ring-gray-200" />
            </div>
            <div class="flex flex-1 flex-col">
              <span class="text-base font-medium text-gray-900">
                {lang.local}
              </span>
              <span class="text-sm text-gray-500">
                {lang.name}
              </span>
            </div>
            <div class="flex-shrink-0">
              {#if currentLang === lang.code}
                <div class="flex h-6 w-6 items-center justify-center rounded-full bg-onebank-red text-white">
                  <Icon icon="mdi:check" class="h-4 w-4" />
                </div>
              {:else}
                <div class="h-6 w-6 rounded-full border-2 border-gray-200 group-hover:border-gray-300"></div>
              {/if}
            </div>
          </button>
        {/each}
      </div>
      <div class="border-t border-gray-100 bg-gray-50/80 p-4"></div>
    </div>
  </div>
{/if}

<svelte:window onkeydown={handleKeyDown} />

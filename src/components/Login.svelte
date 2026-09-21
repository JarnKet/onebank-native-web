<script lang="ts">
    import type {Snippet} from 'svelte';
    import Icon from '@iconify/svelte';
    import LanguageSelector from './LanguageSelector.svelte';
    import {language} from "../stores/config";

    interface Props {
        /** The login body — QR or form — chosen by the parent. */
        children?: Snippet;
        /** Asks the parent to swap between the QR and form login. */
        onLoginTypeChange?: () => void;
    }

    let {children, onLoginTypeChange}: Props = $props();

    const UILanguage = $derived(parseInt($language));

    /**
     * Translates against the `language` *store*, so switching language re-renders.
     *
     * Deliberately not `t` from `lib/utils/helper.ts`: that one reads the `lang`
     * URL parameter captured once at module load, so it is frozen for the life of
     * the page. The two are different sources of truth, not duplicates — see
     * CLAUDE.md.
     */
    function t(en: string, la: string | null = null, cn: string | null = null, vn: string | null = null): string {
        if (UILanguage === 0) return en
        else if (UILanguage === 1 && la) return la
        else if (UILanguage === 3 && cn) return cn
        else if (UILanguage === 2 && vn) return vn
        else return en
    }
</script>

<div class="flex h-full w-full flex-col bg-gradient-to-tr from-[#ffdedc] via-[#fff2e3] to-[#c8f2fe] items-center justify-center">
    <div class="p-8 bg-white rounded-xl mx-auto flex flex-col max-w-screen-laptop w-full">
        <div class="flex border-b border-gray-200 gap-8 pb-4">
            <div class="w-1/2 ">
                <div class="flex flex-col gap-2">
                    <div class="flex justify-between items-center">
                        <a
                                class="group flex flex-col items-center transition-all hover:scale-105"
                                aria-label="Customer Support"
                                href="tel:1555"
                        >
                            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-onebank-red/5 transition-colors group-hover:bg-onebank-red/10 disabled:group-hover:bg-onebank-red/5 tablet:h-12 tablet:w-12">
                                <Icon icon="mdi:headphones-settings"
                                      class="h-5 w-5 text-onebank-red tablet:h-6 tablet:w-6 group-disabled:text-onebank-red/50"/>
                            </div>
                            <div class="mt-1 text-center text-xs font-medium text-gray-600 group-disabled:text-gray-400 tablet:text-sm">
        <span class="hidden tablet:inline">
            {t('Customer Support', 'ຕິດຕໍ່ພະນັກງານ')}
        </span>
                                <div class="flex w-16 flex-col tablet:hidden">
                                    <span>{t('Customer', 'ຕິດຕໍ່')}</span>
                                    <span>{t('Support', 'ພະນັກງານ')}</span>
                                </div>
                            </div>
                        </a>
                        <LanguageSelector currentLang={$language}/>
                    </div>
                    <div class="mx-auto">
                        <img src="/img/ic_onebank.svg" alt="OneBank">
                        <img src="/img/onebank-title.svg" class="mt-4" alt="OneBank">
                    </div>
                    <h2 class="text-center text-2xl tracking-normal ">
                            <span class="inline-block  font-semibold text-gray-800">
                            {t('Welcome to', 'ຍິນດີຕ້ອນຮັບເຂົ້າສູ່ລະບົບ')}
                            </span>
                        <div class="font-bold text-gray-900">ONEBANK</div>
                    </h2>
                </div>
            </div>
            <div class="w-1/2 relative">
                <button
                        type="button"
                        class="absolute top-2 right-2 rounded p-1 hover:bg-black/5 active:bg-black/10"
                        aria-label={t('Switch login method', 'ປ່ຽນວິທີເຂົ້າສູ່ລະບົບ')}
                        onclick={() => onLoginTypeChange?.()}
                >
                    <Icon class="h-6 w-6" icon="mdi:refresh"/>
                </button>
                <div class="p-4 rounded-xl bg-onebank-base-200/40 h-full flex flex-col">
                    {@render children?.()}
                </div>
            </div>
        </div>
    </div>
    <div class="mt-4 text-center">
        <div>&copy; 2023 ທະນາຄານການຄ້າຕ່າງປະເທດລາວມະຫາຊົນ</div>
        <div>ໂທ: 1555, (856-21) 213200, 22495, (856-21) 213202, 223012 | <a href="/" class="text-blue-500">ຄຳຖາມ &
            ຄຳຕອບ</a> | <a href="/" class="text-blue-500">ເງື່ອນໄຂການນຳໃຊ້</a></div>
    </div>
</div>

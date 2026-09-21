<script lang="ts">
    /**
     * Salary and file transfers: pick the paying account, drop a CSV, check the
     * preview, confirm with an OTP. Rows that cannot be paid are flagged in the
     * preview and must be fixed (or the file re-uploaded) before sending.
     */
    import Icon from '@iconify/svelte';
    import SourceAccount from './money/SourceAccount.svelte';
    import {parseSalaryCsv, SALARY_TEMPLATE, type SalaryRow} from './money/salary';
    import {submitTransfer} from '../lib/api/commands';
    import {maskAccount, money, t} from '../lib/utils/helper';
    import {goHome, navigateToPath} from '../lib/utils/navigation';
    import {loadHomeResult} from '../stores/onebankGroups';
    import {reloadHome} from '../stores/home';
    import {refreshBadges} from '../stores/badges';

    let step = $state<'UPLOAD' | 'REVIEW' | 'DONE'>('UPLOAD');
    let fromId = $state('');
    let fileName = $state('');
    let rows = $state<SalaryRow[]>([]);
    let otp = $state('');
    let dragging = $state(false);
    let busy = $state(false);
    let error = $state('');
    let resultStatus = $state('');
    let fileInput = $state<HTMLInputElement | null>(null);

    const accounts = $derived($loadHomeResult?.accounts ?? []);
    const from = $derived(accounts.find((account) => account.accountid === fromId));
    const ccy = $derived(from?.ccy ?? 'LAK');
    const total = $derived(rows.reduce((sum, row) => sum + row.amount, 0));
    const problems = $derived(rows.filter((row) => row.problem));
    const overBalance = $derived(from ? total > (from.availablebalance ?? 0) : false);

    async function read(file: File | undefined | null) {
        if (!file) return;
        error = '';
        if (!/\.(csv|txt)$/i.test(file.name)) {
            error = t('Upload the payroll as a .csv file (save it from Excel as CSV).', 'ກະລຸນາອັບໂຫຼດເປັນໄຟລ໌ .csv (ບັນທຶກຈາກ Excel ເປັນ CSV).');
            return;
        }
        fileName = file.name;
        rows = parseSalaryCsv(await file.text());
        if (rows.length === 0) {
            error = t('That file has no rows to pay.', 'ໄຟລ໌ນີ້ບໍ່ມີລາຍການ.');
            return;
        }
        step = 'REVIEW';
    }

    function downloadTemplate() {
        const url = URL.createObjectURL(new Blob([SALARY_TEMPLATE], {type: 'text/csv'}));
        Object.assign(document.createElement('a'), {href: url, download: 'onebank-salary-template.csv'}).click();
        URL.revokeObjectURL(url);
    }

    async function confirm() {
        if (!/^\d{6}$/.test(otp)) {
            error = t('Enter the 6-digit OTP', 'ກະລຸນາປ້ອນ OTP 6 ຕົວເລກ');
            return;
        }
        busy = true;
        error = '';
        const response = await submitTransfer({
            kind: 'SALARY',
            fromaccountid: fromId,
            items: rows.map((row) => ({toaccount: row.account, toname: row.name, amount: row.amount, ccy, note: row.note || t('Salary', 'ເງິນເດືອນ')})),
        });
        busy = false;
        if (response.result !== 0) {
            error = response.message || t('The payroll could not be sent', 'ສົ່ງເງິນເດືອນບໍ່ສຳເລັດ');
            return;
        }
        resultStatus = response.item?.status ?? 'SUCCESS';
        await Promise.all([reloadHome(), refreshBadges()]);
        step = 'DONE';
    }

    async function share() {
        const text = `${t('Salary transfer', 'ໂອນເງິນເດືອນ')}: ${rows.length} × · ${money(total, ccy)}`;
        try {
            if (navigator.share) await navigator.share({title: 'OneBank', text});
            else await navigator.clipboard.writeText(text);
        } catch {
            // Dismissed.
        }
    }
</script>

{#if step === 'UPLOAD'}
    <section class="space-y-4">
        <div class="ob-card p-5 tablet:p-6">
            <h1 class="mb-5 text-lg font-semibold text-onebank-blue">{t('Salary & file transfer', 'ໂອນເງິນເດືອນ ແລະ ໂອນຈາກໄຟລ໌')}</h1>
            <SourceAccount {accounts} bind:value={fromId}>
                <div>
                    <div class="mb-2 flex items-center gap-3">
                        <p class="mr-auto text-sm">{t('Upload the file', 'ອັບໂຫຼດໄຟລ໌')}</p>
                        <button type="button" class="flex h-8 items-center gap-2 rounded-ob-sm bg-onebank-light-grey-2 px-3 text-xs text-black" onclick={downloadTemplate}>
                            <Icon icon="mdi:file-download-outline" class="h-4 w-4"/>{t('Download the salary template', 'ດາວໂຫຼດຮ່າງໄຟລ໌ເງິນເດືອນ')}
                        </button>
                    </div>
                    <button type="button"
                            class="flex h-56 w-full flex-col items-center justify-center gap-3 rounded-ob-md border-2 border-dashed bg-white text-black transition-colors
                                   {dragging ? 'border-onebank-red bg-onebank-pink' : 'border-onebank-light-grey-4'}"
                            ondragover={(event) => { event.preventDefault(); dragging = true; }}
                            ondragleave={() => (dragging = false)}
                            ondrop={(event) => { event.preventDefault(); dragging = false; void read(event.dataTransfer?.files?.[0]); }}
                            onclick={() => fileInput?.click()}>
                        <Icon icon="mdi:file-upload-outline" class="h-10 w-10"/>
                        <span class="font-semibold">{t('Upload a file', 'ອັບໂຫຼດໄຟລ໌')}</span>
                        <span class="text-xs text-onebank-subtle">{t('CSV: account, name, amount, description — or drop it here', 'CSV: ເລກບັນຊີ, ຊື່, ຈຳນວນ, ຄຳອະທິບາຍ — ຫຼື ລາກມາວາງ')}</span>
                    </button>
                    <input type="file" accept=".csv,.txt,text/csv" class="hidden" bind:this={fileInput} onchange={(event) => read(event.currentTarget.files?.[0])}/>
                </div>
            </SourceAccount>
        </div>
        {#if error}<div class="rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}
    </section>
{:else if step === 'REVIEW'}
    <section class="ob-card space-y-5 p-5 tablet:p-8">
        <header class="flex items-center gap-3">
            <button type="button" class="rounded-full p-1 hover:bg-onebank-page" aria-label={t('Back', 'ກັບຄືນ')} onclick={() => (step = 'UPLOAD')}>
                <Icon icon="mdi:arrow-left" class="h-6 w-6"/>
            </button>
            <h1 class="mr-auto text-lg font-semibold text-onebank-red">{t('Transfer salary', 'ໂອນເງິນເດືອນ')}</h1>
            <span class="text-sm text-onebank-subtle">{fileName}</span>
        </header>

        <dl class="grid gap-3 rounded-ob-md bg-onebank-page p-4 text-sm tablet:grid-cols-4">
            <div><dt class="text-onebank-subtle">{t('From', 'ຈາກບັນຊີ')}</dt><dd class="font-semibold">{from ? maskAccount(from.account) : ''}</dd></div>
            <div><dt class="text-onebank-subtle">{t('Recipients', 'ຈຳນວນຜູ້ຮັບ')}</dt><dd class="font-semibold">{rows.length}</dd></div>
            <div><dt class="text-onebank-subtle">{t('Total', 'ລວມ')}</dt><dd class="font-semibold text-onebank-red">{money(total, ccy)}</dd></div>
            <div><dt class="text-onebank-subtle">{t('Available', 'ຍອດທີ່ໃຊ້ໄດ້')}</dt><dd class="font-semibold">{money(from?.availablebalance, ccy)}</dd></div>
        </dl>

        <div class="max-h-96 overflow-auto rounded-ob-md border border-onebank-row">
            <table class="w-full min-w-[640px] text-left text-sm">
                <thead class="sticky top-0 bg-onebank-light-grey-2 text-xs">
                    <tr><th class="px-3 py-2">#</th><th class="px-3 py-2">{t('Account', 'ເລກບັນຊີ')}</th><th class="px-3 py-2">{t('Name', 'ຊື່')}</th><th class="px-3 py-2 text-right">{t('Amount', 'ຈຳນວນ')}</th><th class="px-3 py-2">{t('Description', 'ຄຳອະທິບາຍ')}</th></tr>
                </thead>
                <tbody>
                    {#each rows as row (row.line)}
                        <tr class="border-t border-onebank-row {row.problem ? 'bg-red-50' : ''}">
                            <td class="px-3 py-2 text-onebank-subtle">{row.line}</td>
                            <td class="px-3 py-2 tabular-nums">{row.account}</td>
                            <td class="px-3 py-2">{row.name}{#if row.problem}<span class="block text-xs text-red-600">{row.problem}</span>{/if}</td>
                            <td class="px-3 py-2 text-right tabular-nums">{money(row.amount, ccy)}</td>
                            <td class="px-3 py-2">{row.note}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

        {#if problems.length || overBalance}
            <div class="flex gap-3 rounded-ob-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                <Icon icon="mdi:alert" class="h-5 w-5 shrink-0"/>
                <p>
                    {#if problems.length}{t(`${problems.length} row(s) cannot be paid. Fix the file and upload it again.`, `${problems.length} ແຖວບໍ່ສາມາດໂອນໄດ້. ກະລຸນາແກ້ໄຂໄຟລ໌ແລ້ວອັບໂຫຼດໃໝ່.`)}{/if}
                    {#if overBalance}{t('The total is more than the available balance.', 'ຍອດລວມເກີນຍອດເງິນທີ່ໃຊ້ໄດ້.')}{/if}
                </p>
            </div>
        {:else}
            <label class="block">
                <span class="ob-label">{t('Enter the OTP sent to your phone', 'ປ້ອນ OTP ທີ່ສົ່ງໄປຫາໂທລະສັບ')} <span class="text-xs text-onebank-subtle">({t('demo: any 6 digits', 'ທົດລອງ: 6 ຕົວເລກໃດກໍໄດ້')})</span></span>
                <input class="ob-input text-center tracking-[0.5em]" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••" bind:value={otp}/>
            </label>
        {/if}

        {#if error}<div class="rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}

        <div class="flex justify-between gap-3">
            <button type="button" class="onebank-secondary-btn" onclick={() => (step = 'UPLOAD')}>{t('Cancel', 'ຍົກເລີກ')}</button>
            <button type="button" class="onebank-primary-btn" disabled={busy || problems.length > 0 || overBalance || otp.length !== 6} onclick={confirm}>
                {busy ? t('Sending…', 'ກຳລັງສົ່ງ…') : t('Confirm', 'ຢືນຢັນ')}
            </button>
        </div>
    </section>
{:else}
    <section class="ob-card mx-auto flex max-w-2xl flex-col items-center gap-5 p-10 text-center">
        <span class="flex h-16 w-16 items-center justify-center rounded-full bg-green-100"><Icon icon="mdi:check-bold" class="h-9 w-9 text-onebank-income"/></span>
        <p class="rounded-full bg-green-50 px-5 py-2 text-sm text-green-700">
            {resultStatus === 'PENDING'
                ? t(`Salary for ${rows.length} people is waiting for approval.`, `ເງິນເດືອນ ${rows.length} ຄົນ ກຳລັງລໍຖ້າອະນຸມັດ.`)
                : t(`You paid ${rows.length} people ${money(total, ccy)}.`, `ທ່ານໂອນເງິນເດືອນ ${rows.length} ຄົນ ລວມ ${money(total, ccy)} ສຳເລັດ.`)}
        </p>
        <dl class="w-full divide-y divide-onebank-row rounded-ob-md border border-onebank-row text-left text-sm">
            <div class="flex justify-between p-3"><dt class="text-onebank-subtle">{t('From', 'ຈາກບັນຊີ')}</dt><dd>{from ? maskAccount(from.account) : ''}</dd></div>
            <div class="flex justify-between p-3"><dt class="text-onebank-subtle">{t('Recipients', 'ຈຳນວນຜູ້ຮັບ')}</dt><dd>{rows.length}</dd></div>
            <div class="flex justify-between p-3"><dt class="text-onebank-subtle">{t('Total', 'ລວມ')}</dt><dd class="font-semibold text-onebank-red">{money(total, ccy)}</dd></div>
        </dl>
        <div class="flex gap-3">
            <button type="button" class="onebank-primary-btn" onclick={() => (resultStatus === 'PENDING' ? navigateToPath('/authorization') : goHome())}>
                {resultStatus === 'PENDING' ? t('Pending authorization', 'ລາຍການລໍຖ້າອະນຸມັດ') : t('Back to home', 'ກັບໜ້າຫຼັກ')}
            </button>
            <button type="button" class="h-12.5 rounded-ob-xl bg-onebank-light-grey-2 px-6 font-semibold" onclick={share}>{t('Share', 'ແບ່ງປັນ')}</button>
        </div>
    </section>
{/if}

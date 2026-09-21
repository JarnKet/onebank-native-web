import {buildUrlParam, loadUrlParams} from './url';
export {buildUrlParam, loadUrlParams};

/**
 * The app's language: 0 English, 1 Lao, 2 Vietnamese, 3 Chinese.
 *
 * Resolved once, at module load, and fixed for the life of the page — menu
 * labels in `lib/menus.ts` are translated at import time, so a live switch
 * would leave half the screen in the old language. The top bar's language pill
 * changes it by storing the choice and reloading (`setLanguage`). A `?lang=`
 * URL parameter still wins, so a link can pin one. Lao is the default, as in
 * the design.
 */
function resolveLang(): number {
    const fromUrl = loadUrlParams()['lang'];
    let stored: string | null = null;
    try {
        stored = typeof localStorage === 'undefined' ? null : localStorage.getItem('lang');
    } catch {
        stored = null;
    }
    const value = parseInt((fromUrl as string) ?? stored ?? '1', 10);
    return Number.isFinite(value) ? value : 1;
}

export const lang = resolveLang();

/** Stores a new language and reloads, which is how the language changes. */
export function setLanguage(value: number): void {
    try {
        localStorage.setItem('lang', String(value));
    } catch {
        // Storage disabled: the reload below falls back to the default.
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('lang');
    window.location.replace(url.toString());
}


export function t(en: string, la: string | null = null, cn: string | null = null, vn: string | null = null): string {
    if (lang === 0) return en;
    else if (lang === 1 && la) return la;
    else if (lang === 3 && cn) return cn;
    else if (lang === 2 && vn) return vn;
    else return en;
}

/**
 * Formats an account number for display, hiding the middle digits.
 *
 * Harvested from onebank-ui's `libs/utils/helper.ts`. Every page that opens
 * another page passes its accounts through this, so the masked form is what the
 * receiving page renders — keep it byte-identical to mobile.
 */
export function maskAccount(account?: string): string {
    if (!account) return 'xxxxx-xxxxx-xxxxx';
    if (account.indexOf('SHA') === 0) {
        return account.replace(/^SHA.*?(..)(...)$/, 'SHA-xx$1-$2');
    }
    if (account.length === 18) {
        return account.substring(0, 3) + '-' + account.substring(3, 5) + '-' + account.substring(5, 7) +
            'xxxxx-' + account.substring(12, 15) + '-' + account.substring(15, 18);
    }
    if (account.length === 13) {
        return account.substring(0, 3) + '-' + account.substring(3, 5) + 'xxxxx-' + account.substring(10, 13);
    }
    return account;
}

/**
 * A member's avatar. The mock users have no uploaded pictures, so this is the
 * placeholder unless a profile id is a data URL someone picked in the app.
 */
export function getProfileImageUrl(_profileType: number | undefined, profileId: string, _faceId?: string, _prefix?: string): string {
    return profileId && profileId.startsWith('data:') ? profileId : 'img/ic_no_face.svg';
}

/** Up to two initials for an avatar placeholder. */
export function initials(name: string | undefined): string {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
    return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || '?';
}

/**
 * Money as the design writes it: grouping commas, two decimals, no currency
 * symbol (the currency code is set beside it).
 */
export function formatMoney(value: number | string | undefined | null, decimals = 2): string {
    const number = Number(value ?? 0);
    return (Number.isFinite(number) ? number : 0).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/** A currency as the design writes it after an amount: "ກີບ" for kip in Lao, the code otherwise. */
export function ccyLabel(ccy: string | undefined): string {
    if (!ccy) return '';
    if (ccy === 'LAK') return t('LAK', 'ກີບ');
    if (ccy === 'THB') return t('THB', 'ບາດ');
    if (ccy === 'USD') return t('USD', 'ໂດລາ');
    return ccy;
}

/** "99,999,999.99 ກີບ". Pass `signed` to prefix a + on credits. */
export function money(value: number | string | undefined | null, ccy?: string, signed = false): string {
    const number = Number(value ?? 0);
    const sign = signed && number > 0 ? '+' : '';
    return `${sign}${formatMoney(number)} ${ccyLabel(ccy)}`.trim();
}

/** `YYYY-MM-DD` in local time. */
export function isoDay(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** "14/07/2025" and "09:51:31" from a core timestamp, as the design prints them. */
export function splitTime(txtime: string | undefined): {date: string; time: string} {
    const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})(:\d{2})?/.exec(txtime ?? '');
    if (!match) return {date: txtime ?? '', time: ''};
    return {date: `${match[3]}/${match[2]}/${match[1]}`, time: `${match[4]}${match[5] ?? ''}`};
}

/**
 * The full menu catalogue, grouped for the "See all" and "Edit" panels.
 *
 * Harvested from onebank-ui `pages/HOME/definition.ts`. The grouping is static
 * and client-side; the server only says which menu *keys* a group may use
 * (`allmenus`), so this table decides how they are presented.
 *
 * A group name appearing in `allmenus` means the whole category is available;
 * otherwise the category is filtered down to the keys that appear individually.
 * That asymmetry is the core's convention, reproduced in
 * `availableMenuGroups` below.
 */

import { t } from '../../lib/utils/helper'

export interface MenuGroup {
  [groupName: string]: string[]
}

export const menuGroups: MenuGroup[] = [
  {
    Information: ['STATEMENT', 'TRANSACTION', 'AUTHORIZATION', 'HISTORY', 'CHAT', 'MYQR'],
  },
  {
    'Payment and Utilities': [
      'TRANSFER',
      'ONEPAY',
      'PHONE',
      'ELECTRICITY',
      'WATER',
      'INTERNET',
      'ECHEQUE',
      'CREDITPAYMENT',
      'BCOME',
      'FASTTRACK',
      'ONEHEART',
      'LDTV',
      'ONECASH',
      'ONEPROOF',
      'SWIFTGPI',
      'AUTODEBIT',
      'LOAN',
      'ONEPAYSUBSCRIPTION',
      'ONEX',
      'QUEUE',
      'SWIFTTRANSFER',
    ],
  },
  {
    'Group Management': ['GROUP', 'ACCOUNT', 'ROLE', 'MEMBER', 'ADDACCOUNT'],
  },
  {
    'Government Payment': ['CUSTOMS', 'GOVASSET', 'SMARTTAX', 'LANDTAX', 'ROADTAX', 'FINLINK', 'SMARTFEE', 'SMARTVAT', 'SINGLEWINDOW'],
  },
  {
    'Bill Payment': ['ONECAMPUS', 'IFS', 'SMB'],
  },
  {
    Leasing: [
      'LEASING_KRS',
      'LEASING_AEN',
      'LEASING_THA',
      'LEASING_DGB',
      'LEASING_KBK',
      'LEASING_BSP',
      'LEASING_MHT',
      'LEASING_CPL',
      'LEASING_SKM',
      'LEASING_WLL',
      'LEASING_NCC',
      'LEASING_SPL',
      'LEASING_KOL',
      'LEASING_LXL',
      'LEASING_GLL',
      'LEASING_EMI',
      'LEASING_SMI',
      'LEASING_SJI',
      'LEASING_CMI',
      'LEASING_BCL',
      'LEASING_LAL',
      'LEASING_RPL',
      'LEASING_BIC',
      'LEASING_ODM',
      'LEASING_PCM',
      'LEASING_APP',
    ],
  },
  {
    Insurance: ['INSURANCE_LVI', 'INSURANCE_AGL', 'INSURANCE_PRU', 'INSURANCE_STM', 'INSURANCE_SXL', 'INSURANCE_ACC', 'INSURANCE_VTI'],
  },
  // { 'Card Topup': ['CARD_TOPUP_MCMYWAY', 'CARD_TOPUP_MCPREPAID', 'CARD_TOPUP_BCOME', 'CARD_TOPUP_SMARTVAT', 'CARD_TOPUP_LDTV', 'CARD_TOPUP_VANNASENG', 'CARD_TOPUP_LAOSAT'] },
  // { 'Topup Wallet': ['WALLET_TOPUP_UMONEY', 'WALLET_TOPUP_MMONEY', 'WALLET_TOPUP_NEWPAY', 'WALLET_TOPUP_INSEEHUB'] },
  // { Securities: ['0002', '0003'] },
]

export function translateMenuGroupTitle(groupTitle: string): string {
  switch (groupTitle) {
    case 'Information':
      return t('Information', 'ຂໍ້ມູນ')
    case 'Payment and Utilities':
      return t('Payment and Utilities', 'ການຊຳລະແລະບໍລິການທົ່ວໄປ')
    case 'Group Management':
      return t('Group Management', 'ການຈັດການກຸ່ມ')
    case 'Government Payment':
      return t('Government Payment', 'ການຊຳລະຄ່າບໍລິການລັດ')
    case 'Bill Payment':
      return t('Bill Payment', 'ການຊຳລະຄ່າໃບບິນ')
    case 'Leasing':
      return t('Leasing', 'ສິນເຊຶ່ອ')
    case 'Insurance':
      return t('Insurance', 'ປະກັນໄພ')
    case 'Card Topup':
      return t('Card Topup', 'ໂອນເງິນເຂົ້າບັດ')
    case 'Topup Wallet':
      return t('Topup Wallet', 'ເຕີມເງິນເຂົ້າກະເປົາ')
    case 'Securities':
      return t('Securities', 'ບັນຊີຫລັກຊັບ')
    default:
      return groupTitle
  }
}

/**
 * The catalogue filtered to what this group may actually use.
 *
 * Harvested from onebank-ui `pages/HOME/helper.ts`. `ONEPAY` is excluded from
 * the per-key path there, and that exclusion is kept: it is reachable from its
 * own tile, not from the catalogue.
 */
export function availableMenuGroups(allmenus: string[] | undefined): MenuGroup[] {
  const available = new Set(allmenus ?? [])
  return menuGroups
    .map((group) => {
      const [groupName, keys] = Object.entries(group)[0]
      const whole = available.has(groupName.replaceAll(' ', '').toUpperCase())
      return {
        [translateMenuGroupTitle(groupName)]: whole ? keys : keys.filter((key) => available.has(key) && key !== 'ONEPAY'),
      }
    })
    .filter((group) => Object.values(group)[0].length > 0)
}

/**
 * Words and groupings for transactions, shared by the statement, the
 * authorization page and the inbox so the three never disagree on what a
 * "TRANSFER" is called or which filter chip catches it.
 */

import type { TransactionInfo } from './api/types'
import { t } from './utils/helper'

export const SERVICE_LABEL: Record<string, [string, string]> = {
  TRANSFER: ['Transfer', 'ໂອນເງິນ'],
  RECEIVE: ['Received', 'ຮັບເງິນ'],
  PAYMENT: ['OnePay payment', 'ຊຳລະ OnePay'],
  SALARY: ['Salary', 'ໂອນເງິນເດືອນ'],
  INTERBANK: ['Interbank transfer', 'ການໂອນເງິນຂ້າມທະນາຄານ'],
  ELECTRICITY: ['Electricity', 'ຄ່າໄຟຟ້າ'],
  WATER: ['Water', 'ຄ່ານ້ຳປະປາ'],
  TOPUP: ['Phone top-up', 'ຕື່ມມູນຄ່າໂທ'],
  CHEQUE: ['E-Cheque', 'E-Cheque'],
}

export function serviceLabel(service: string | undefined): string {
  const label = SERVICE_LABEL[service ?? '']
  return label ? t(label[0], label[1]) : (service ?? '')
}

export const STATUS_LABEL: Record<string, [string, string]> = {
  SUCCESS: ['Success', 'ສຳເລັດ'],
  PENDING: ['Pending', 'ລໍຖ້າອະນຸມັດ'],
  CANCELLED: ['Cancelled', 'ຍົກເລີກ'],
  REJECTED: ['Rejected', 'ຖືກປະຕິເສດ'],
  EXPIRED: ['Expired', 'ໝົດອາຍຸ'],
}

export function statusLabel(status: string | undefined): string {
  const label = STATUS_LABEL[status ?? '']
  return label ? t(label[0], label[1]) : (status ?? '')
}

/** Tailwind classes for a status chip. */
export function statusTone(status: string | undefined): string {
  switch (status) {
    case 'SUCCESS':
      return 'bg-green-50 text-green-700'
    case 'PENDING':
      return 'bg-violet-50 text-onebank-pending'
    case 'REJECTED':
    case 'EXPIRED':
      return 'bg-red-50 text-onebank-red'
    default:
      return 'bg-onebank-row text-onebank-subtle'
  }
}

/** The statement's filter chips, as the design groups them. */
export interface Category {
  id: string
  en: string
  lo: string
  matches: (tx: TransactionInfo) => boolean
}

export const CATEGORY_GROUPS: Array<{ en: string; lo: string; categories: Category[] }> = [
  {
    en: 'Transfers',
    lo: 'ການໂອນເງິນ',
    categories: [
      { id: 'IN', en: 'Money in', lo: 'ເງິນເຂົ້າ', matches: (tx) => Number(tx.amount) > 0 },
      { id: 'OUT', en: 'Money out', lo: 'ເງິນອອກ', matches: (tx) => Number(tx.amount) < 0 },
      { id: 'ONEPAY', en: 'OnePay', lo: 'ຊຳລະ OnePay', matches: (tx) => tx.service === 'PAYMENT' },
      { id: 'BCEL', en: 'Within BCEL', lo: 'ການໂອນເງິນພາຍໃນບັນຊີ ທຄຕລ', matches: (tx) => tx.service === 'TRANSFER' },
      { id: 'SALARY', en: 'Salary', lo: 'ໂອນເງິນເດືອນ', matches: (tx) => tx.service === 'SALARY' },
      { id: 'INTERBANK', en: 'Interbank', lo: 'ການໂອນເງິນຂ້າມທະນາຄານ', matches: (tx) => tx.service === 'INTERBANK' },
    ],
  },
  {
    en: 'Bill payments',
    lo: 'ຈ່າຍຄ່າໃບບິນ',
    categories: [
      { id: 'ELECTRICITY', en: 'Electricity', lo: 'ໄຟຟ້າ', matches: (tx) => tx.service === 'ELECTRICITY' },
      { id: 'WATER', en: 'Water', lo: 'ນ້ຳປະປາ', matches: (tx) => tx.service === 'WATER' },
      { id: 'TOPUP', en: 'Phone top-up', lo: 'ຕື່ມມູນຄ່າໂທ', matches: (tx) => tx.service === 'TOPUP' },
    ],
  },
]

export const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap((group) => group.categories)

/** Who the money went to (or came from), as the cards phrase it. */
export function counterpart(tx: TransactionInfo): string {
  const name = String(tx.detail?.TOACCOUNTNAME ?? '')
  const number = String(tx.detail?.TOACCOUNTNO ?? '')
  return `${name} ${number}`.trim()
}

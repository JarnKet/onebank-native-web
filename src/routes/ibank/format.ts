import { formatMoney } from '../../lib/utils/helper'

/** A rate as the bank publishes it: up to four decimals, a dash where there is none. */
export function rateText(value: number | null | undefined, decimals = 4): string {
  if (value === null || value === undefined) return '–'
  return formatMoney(value, decimals)
}

/** An interest rate in percent. */
export function percent(value: number | null | undefined): string {
  return value === null || value === undefined ? '–' : `${formatMoney(value, 2)}%`
}

/** `YYYY-MM-DD` → `DD/MM/YYYY`, the way every other screen writes a date. */
export function dayText(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : iso
}

/**
 * Grouping transactions onto a month grid.
 *
 * onebank-ui's `DesktopTransactionCalendar` invents its rows —
 * `generateRandomTransactions()` fills the month with a 70% per-day chance of
 * fabricated amounts against the literal account `000012ONEBANK`. That is fine
 * for a design mock and unacceptable in a running banking UI, so the layout is
 * harvested and the data comes from `ONEBANKTRANSACTION/viewtransactions`.
 *
 * A day with no transactions renders empty. Nothing here fabricates a row.
 */

import type { TransactionInfo } from '../../lib/api/types'

export interface CalendarDay {
  /** Day of month, or 0 for the leading blanks before the 1st. */
  day: number
  date: Date | null
  isToday: boolean
  isEmpty: boolean
  hasTransactions: boolean
}

/** `YYYY-MM-DD` in local time — the key both the grid and the index use. */
export function dayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function sameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b)
}

/**
 * Parses `txtime`, returning null when it is missing or unparseable.
 *
 * Returning null rather than an epoch date matters: an unparseable timestamp
 * must drop the row from the calendar, not pile every such row onto 1970.
 */
export function parseTxTime(txtime: unknown): Date | null {
  if (typeof txtime !== 'string' || txtime === '') return null
  // Space-separated `YYYY-MM-DD HH:mm:ss` is not ISO; Safari rejects it.
  const normalised = /^\d{4}-\d{2}-\d{2} \d{2}:/.test(txtime) ? txtime.replace(' ', 'T') : txtime
  const parsed = new Date(normalised)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Indexes transactions by local day, newest first within each day. */
export function indexByDay(items: TransactionInfo[] | undefined | null): Map<string, TransactionInfo[]> {
  const index = new Map<string, TransactionInfo[]>()
  for (const item of items ?? []) {
    const when = parseTxTime(item?.txtime)
    if (!when) continue
    const key = dayKey(when)
    const bucket = index.get(key)
    if (bucket) bucket.push(item)
    else index.set(key, [item])
  }
  for (const bucket of index.values()) {
    bucket.sort((a, b) => (parseTxTime(b.txtime)?.getTime() ?? 0) - (parseTxTime(a.txtime)?.getTime() ?? 0))
  }
  return index
}

/**
 * The cells for `month`, padded with blanks so the 1st lands on its weekday.
 *
 * `today` is injected rather than read from the clock so the grid is testable.
 */
export function buildMonth(month: Date, index: Map<string, TransactionInfo[]>, today: Date): CalendarDay[] {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const first = new Date(year, monthIndex, 1)
  const dayCount = new Date(year, monthIndex + 1, 0).getDate()

  const cells: CalendarDay[] = []
  for (let blank = 0; blank < first.getDay(); blank++) {
    cells.push({ day: 0, date: null, isToday: false, isEmpty: true, hasTransactions: false })
  }
  for (let day = 1; day <= dayCount; day++) {
    const date = new Date(year, monthIndex, day)
    cells.push({
      day,
      date,
      isToday: sameDay(date, today),
      isEmpty: false,
      hasTransactions: (index.get(dayKey(date))?.length ?? 0) > 0,
    })
  }
  return cells
}

/** The week containing today, or the first week, for the compact strip. */
export function currentWeek(days: CalendarDay[]): CalendarDay[] {
  const todayAt = days.findIndex((cell) => cell.isToday)
  const start = todayAt >= 0 ? Math.floor(todayAt / 7) * 7 : 0
  return days.slice(start, start + 7)
}

/** Signed amount for display: credits positive, debits negative. */
export function signedAmount(item: TransactionInfo): number {
  const amount = Number(item?.amount ?? item?.detail?.AMOUNT ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

/**
 * Reference data for the iBanking screens while the core has no command for
 * them. Harvested once from the onebank-ui IBANK* pages' `mock.ts` (which were
 * all the data those pages ever had), reshaped to this app's types. Rates carry
 * the date they were published with, so nobody mistakes them for today's.
 *
 * Nothing here is the user's: it is never persisted, and every screen that
 * shows it also shows the offline-data notice.
 */

import type { ExchangeRate, InterestRateTable, Loan, LoanInstalment, NotificationSetting, ProductTransaction, TermDeposit } from '../types'

export const RATES_UPDATED = '2018-04-09 09:09:16'

const rate = (
  ccy: string,
  nameEn: string,
  nameLo: string,
  flag: string,
  buy: number | null,
  sell: number | null,
  buyTransfer: number,
  sellTransfer: number,
): ExchangeRate => ({
  ccy,
  nameEn,
  nameLo,
  flag: `emojione:flag-for-${flag}`,
  buy,
  sell,
  buyTransfer,
  sellTransfer,
})

export const EXCHANGE_RATES: ExchangeRate[] = [
  rate('USD 50-100', 'US Dollar (50-100)', 'ໂດລາສະຫະລັດ (50-100)', 'united-states', 8082, 8093, 8082, 8118),
  rate('USD 20-100', 'US Dollar (20-100)', 'ໂດລາສະຫະລັດ (20-100)', 'united-states', 8086, 8089, 8089, 8118),
  rate('THB', 'Thai Baht', 'ບາດໄທ', 'thailand', 250.088, 260.088, 256.586, 263.54),
  rate('EUR 50-100', 'Euro (50-100)', 'ເອີໂຣ (50-100)', 'european-union', 9167, 9180, 9499, 9542),
  rate('EUR 20-50', 'Euro (20-50)', 'ເອີໂຣ (20-50)', 'european-union', 9197, 9197, 9499, 9542),
  rate('AUD', 'Australian Dollar', 'ໂດລາອົດສະຕາລີ', 'australia', 6198, 6198, 6190, 6291),
  rate('CAD', 'Canadian Dollar', 'ໂດລາການາດາ', 'canada', 6250, 6250, 6232, 6384),
  rate('CNY', 'Chinese Yuan', 'ຢວນ', 'china', 1284, 1284, 1268, 1310),
  rate('JPY', 'Japanese Yen', 'ເຢນ', 'japan', 66.875, 66.875, 66.875, 68.18),
  rate('SGD', 'Singapore Dollar', 'ໂດລາສິງກະໂປ', 'singapore', null, null, 6048, 6099),
  rate('SEK', 'Swedish Krona', 'ໂຄຣນາສະເວເດັນ', 'sweden', null, null, 976, 1009),
  rate('NOK', 'Norwegian Krone', 'ໂຄຣນານໍເວ', 'norway', null, null, 1066, 1107),
  rate('HKD', 'Hong Kong Dollar', 'ໂດລາຮົງກົງ', 'hong-kong-sar-china', null, null, 1065, 1086),
  rate('GBP', 'Pound Sterling', 'ປອນ', 'united-kingdom', 10239, 10239, 10244, 10485),
  rate('DKK', 'Danish Krone', 'ໂຄຣນາເດນມາກ', 'denmark', null, null, 1273, 1309),
  rate('CHF', 'Swiss Franc', 'ຟຣັງສະວິສ', 'switzerland', 8389, 8389, 8391, 8506),
  rate('VND', 'Vietnamese Dong', 'ດົງຫວຽດນາມ', 'vietnam', null, null, 0.3614, 0.3691),
]

const row = (periodEn: string, periodLo: string, lak: number | null, usd: number | null, thb: number | null) => ({
  periodEn,
  periodLo,
  lak,
  usd,
  thb,
})

export const INTEREST_RATES: InterestRateTable[] = [
  {
    id: 'SAVINGS',
    nameEn: 'Regular savings',
    nameLo: 'ເງິນຝາກປົກກະຕິທົ່ວໄປ',
    rates: [row('Current account', 'ບັນຊີກະແສລາຍວັນ', 0.5, 0.25, 0.25), row('Savings account', 'ບັນຊີເງິນຝາກປະຢັດ', 1.5, 0.5, 0.5)],
  },
  {
    id: 'FIXED_DEPOSIT',
    nameEn: 'Fixed deposit',
    nameLo: 'ເງິນຝາກປະຈຳ',
    rates: [
      row('1 month', '1 ເດືອນ', 2.5, 1, 1),
      row('3 months', '3 ເດືອນ', 3, 1.25, 1.25),
      row('6 months', '6 ເດືອນ', 3.5, 1.5, 1.5),
      row('12 months', '12 ເດືອນ', 4, 2, 2),
      row('18 months', '18 ເດືອນ', 4.5, 2.25, 2.25),
      row('24 months', '24 ເດືອນ', 5, 2.5, 2.5),
      row('36 months', '36 ເດືອນ', 5.5, 3, 3),
    ],
  },
  {
    id: 'PREMIUM',
    nameEn: 'Premium savings',
    nameLo: 'ເງິນຝາກພິເສດ',
    rates: [
      row('1 month', '1 ເດືອນ', 3, 1.5, null),
      row('3 months', '3 ເດືອນ', 3.5, 1.75, null),
      row('6 months', '6 ເດືອນ', 4, 2, null),
      row('12 months', '12 ເດືອນ', 4.5, 2.5, null),
    ],
  },
  {
    id: 'JUNIOR',
    nameEn: 'Junior savings',
    nameLo: 'ເງິນຝາກເດັກ',
    rates: [
      row('Junior savings', 'ບັນຊີເງິນຝາກເດັກ', 2, 1, 1),
      row('6 months', '6 ເດືອນ', 4, 2, 2),
      row('12 months', '12 ເດືອນ', 4.5, 2.5, 2.5),
    ],
  },
]

export const TERM_DEPOSITS: TermDeposit[] = [
  {
    id: 'TD1',
    account: '0101100000123456',
    holder: 'OneBank group',
    product: 'Fixed deposit 12 months',
    ccy: 'LAK',
    principal: 100_000_000,
    interest: 4_000_000,
    maturityAmount: 104_000_000,
    rate: 4,
    start: '2026-01-15',
    end: '2027-01-15',
    term: 12,
  },
  {
    id: 'TD2',
    account: '0101100000654321',
    holder: 'OneBank group',
    product: 'Fixed deposit 6 months',
    ccy: 'USD',
    principal: 20_000,
    interest: 150,
    maturityAmount: 20_150,
    rate: 1.5,
    start: '2026-06-01',
    end: '2026-12-01',
    term: 6,
  },
]

export const TERM_DEPOSIT_TRANSACTIONS: Record<string, ProductTransaction[]> = {
  TD1: [
    {
      id: 'TD1-1',
      date: '2026-01-15',
      descriptionEn: 'Deposit placed',
      descriptionLo: 'ຝາກເງິນ',
      debit: 0,
      credit: 100_000_000,
      balance: 100_000_000,
    },
    {
      id: 'TD1-2',
      date: '2026-04-15',
      descriptionEn: 'Interest accrued',
      descriptionLo: 'ດອກເບ້ຍສະສົມ',
      debit: 0,
      credit: 1_000_000,
      balance: 101_000_000,
    },
    {
      id: 'TD1-3',
      date: '2026-07-15',
      descriptionEn: 'Interest accrued',
      descriptionLo: 'ດອກເບ້ຍສະສົມ',
      debit: 0,
      credit: 1_000_000,
      balance: 102_000_000,
    },
  ],
  TD2: [
    {
      id: 'TD2-1',
      date: '2026-06-01',
      descriptionEn: 'Deposit placed',
      descriptionLo: 'ຝາກເງິນ',
      debit: 0,
      credit: 20_000,
      balance: 20_000,
    },
  ],
}

/** Instalments settled so far on each seed loan. */
const PAID_INSTALMENTS = 6

/**
 * A loan's figures all come from its schedule, so the card, the repayments
 * and the schedule tab cannot disagree: the instalment is the annuity, what is
 * outstanding is the closing balance after the paid instalments.
 */
function seedLoan(terms: Omit<Loan, 'monthlyPayment' | 'outstanding'>): Loan {
  const schedule = loanSchedule({ ...terms, monthlyPayment: 0, outstanding: terms.amount }, PAID_INSTALMENTS)
  const first = schedule[0]
  return {
    ...terms,
    monthlyPayment: first ? first.principal + first.interest : 0,
    outstanding: schedule[PAID_INSTALMENTS - 1]?.closing ?? terms.amount,
  }
}

export const LOANS: Loan[] = [
  seedLoan({
    id: 'LN1',
    account: '0102200000111222',
    borrower: 'OneBank group',
    product: 'Business working capital',
    typeEn: 'Business loan',
    typeLo: 'ເງິນກູ້ທຸລະກິດ',
    ccy: 'LAK',
    amount: 240_000_000,
    rate: 8,
    start: '2026-01-10',
    end: '2028-01-10',
    term: 24,
    branch: 'Head office',
  }),
]

/** The disbursement, then one repayment per settled instalment. */
export function loanTransactions(loan: Loan): ProductTransaction[] {
  const paid = loanSchedule(loan, PAID_INSTALMENTS).filter((instalment) => instalment.paid)
  return [
    {
      id: `${loan.id}-0`,
      date: loan.start,
      descriptionEn: 'Loan disbursed',
      descriptionLo: 'ປ່ອຍເງິນກູ້',
      debit: loan.amount,
      credit: 0,
      balance: loan.amount,
    },
    ...paid.map((instalment, index) => ({
      id: `${loan.id}-${index + 1}`,
      date: instalment.date,
      descriptionEn: 'Instalment repaid',
      descriptionLo: 'ຊຳລະງວດ',
      debit: 0,
      credit: instalment.principal + instalment.interest,
      balance: instalment.closing,
    })),
  ]
}

/**
 * The repayment plan: level instalments over the loan's term at its rate
 * (a standard annuity), the first `paid` of them already settled.
 */
export function loanSchedule(loan: Loan, paid = PAID_INSTALMENTS): LoanInstalment[] {
  const monthly = loan.rate / 100 / 12
  const instalment = monthly === 0 ? loan.amount / loan.term : (loan.amount * monthly) / (1 - (1 + monthly) ** -loan.term)
  const start = new Date(`${loan.start}T00:00:00`)
  const schedule: LoanInstalment[] = []
  let opening = loan.amount
  for (let index = 0; index < loan.term; index++) {
    const interest = opening * monthly
    const principal = Math.min(instalment - interest, opening)
    const closing = Math.max(opening - principal, 0)
    const due = new Date(start)
    due.setMonth(start.getMonth() + index + 1)
    schedule.push({
      date: `${due.getFullYear()}-${`${due.getMonth() + 1}`.padStart(2, '0')}-${`${due.getDate()}`.padStart(2, '0')}`,
      opening: Math.round(opening),
      principal: Math.round(principal),
      interest: Math.round(interest),
      closing: Math.round(closing),
      paid: index < paid,
    })
    opening = closing
  }
  return schedule
}

const alert = (
  id: string,
  titleEn: string,
  titleLo: string,
  descriptionEn: string,
  descriptionLo: string,
  enabled = false,
): NotificationSetting => ({
  id,
  titleEn,
  titleLo,
  descriptionEn,
  descriptionLo,
  enabled,
})

/** The alert types and their defaults, before the group changes any. */
export const NOTIFICATION_SETTINGS: NotificationSetting[] = [
  alert(
    'alert_all_transaction',
    'Every transaction',
    'ທຸລະກຳທັງໝົດ',
    'Any money in or out of the group’s accounts',
    'ທຸກການເຄື່ອນໄຫວເງິນເຂົ້າ-ອອກ',
  ),
  alert('fund_transfer_alert', 'Transfers', 'ການໂອນເງິນ', 'When a transfer is sent or received', 'ເມື່ອມີການໂອນ ຫຼື ຮັບເງິນ'),
  alert('account_activity_alert', 'Account activity', 'ກິດຈະກຳບັນຊີ', 'An account added, locked or removed', 'ເພີ່ມ, ລັອກ ຫຼື ລຶບບັນຊີ'),
  alert(
    'limit_utilization_alert',
    'Limit use at 70%',
    'ໃຊ້ວົງເງິນຮອດ 70%',
    'A role has used 70% of its daily limit',
    'ບົດບາດໃຊ້ວົງເງິນປະຈຳວັນຮອດ 70%',
    true,
  ),
  alert(
    'bill_payment_alert',
    'Bill payments',
    'ການຊຳລະບິນ',
    'Electricity, water and top-up payments',
    'ຄ່າໄຟຟ້າ, ນ້ຳປະປາ ແລະ ເຕີມເງິນ',
    true,
  ),
  alert(
    'login_logout_alert',
    'Log in / log out',
    'ເຂົ້າ / ອອກລະບົບ',
    'Each time someone signs in to the group',
    'ທຸກຄັ້ງທີ່ມີຄົນເຂົ້າລະບົບ',
  ),
  alert(
    'change_password_alert',
    'ID or password changed',
    'ປ່ຽນ ID ຫຼື ລະຫັດຜ່ານ',
    'A member changes their sign-in details',
    'ສະມາຊິກປ່ຽນຂໍ້ມູນເຂົ້າລະບົບ',
  ),
  alert('payroll_alert', 'Payroll', 'ເງິນເດືອນ', 'When a salary run is submitted or paid', 'ເມື່ອສົ່ງ ຫຼື ຈ່າຍເງິນເດືອນ'),
]

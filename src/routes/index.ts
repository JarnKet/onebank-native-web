/**
 * Route map for svelte-spa-router.
 *
 * A route with `native: true` mounts its own component; the rest wrap
 * `IframeRoute` with their legacy page name. Flipping a route means adding its
 * component to `nativeComponents` and setting its flag in `src/lib/routes.ts`
 * — the path stays, so deep links and the sidebar do not move.
 */

import wrap from 'svelte-spa-router/wrap'
import Home from './Home.svelte'
import Account from './Account.svelte'
import Group from './Group.svelte'
import JoinGroup from './JoinGroup.svelte'
import LeaveGroup from './LeaveGroup.svelte'
import RegisterOneBank from './RegisterOneBank.svelte'
import Members from './Members.svelte'
import Messages from './Messages.svelte'
import MessageDetail from './MessageDetail.svelte'
import Role from './Role.svelte'
import Authorization from './Authorization.svelte'
import AuthorizationHistory from './AuthorizationHistory.svelte'
import Statement from './Statement.svelte'
import Salary from './Salary.svelte'
import ECheque from './ECheque.svelte'
import BillPayment from './BillPayment.svelte'
import TopUp from './TopUp.svelte'
import TransferForm from './money/TransferForm.svelte'
import AccountDetail from './ibank/AccountDetail.svelte'
import Beneficiaries from './ibank/Beneficiaries.svelte'
import ExchangeRates from './ibank/ExchangeRates.svelte'
import InterestRates from './ibank/InterestRates.svelte'
import Loans from './ibank/Loans.svelte'
import NotificationSettings from './ibank/NotificationSettings.svelte'
import Slips from './ibank/Slips.svelte'
import TermDeposits from './ibank/TermDeposits.svelte'
import IframeRoute from './IframeRoute.svelte'
import { HOME_PATH, routeDefinitions } from '../lib/routes'

/** The native component for each native route, keyed by path. */
const nativeComponents: Record<string, any> = {
  [HOME_PATH]: Home,
  '/messages': Messages,
  '/messages/:id': MessageDetail,
  '/account': Account,
  '/member': Members,
  '/group': Group,
  '/register': RegisterOneBank,
  '/group/join': JoinGroup,
  '/group/leave': LeaveGroup,
  '/authorization': Authorization,
  '/authorization/history': AuthorizationHistory,
  '/role': Role,
  '/statement': Statement,
  '/salary': Salary,
  '/echeque': ECheque,
  '/bill/electricity': wrap({ component: BillPayment as any, props: { kind: 'ELECTRICITY' } }),
  '/bill/water': wrap({ component: BillPayment as any, props: { kind: 'WATER' } }),
  '/topup': TopUp,
  '/transfer': wrap({ component: TransferForm as any, props: { kind: 'BCEL' } }),
  '/transfer/interbank': wrap({ component: TransferForm as any, props: { kind: 'INTERBANK' } }),
  '/transfer/idcard': wrap({ component: TransferForm as any, props: { kind: 'IDCARD' } }),
  '/accounts/detail': AccountDetail,
  '/rates/exchange': ExchangeRates,
  '/rates/interest': InterestRates,
  '/slips': Slips,
  '/beneficiaries': Beneficiaries,
  '/term-deposits': TermDeposits,
  '/loans': Loans,
  '/settings/notifications': NotificationSettings,
}

const routes: Record<string, any> = {}

for (const definition of routeDefinitions) {
  const native = definition.native ? nativeComponents[definition.path] : undefined
  if (definition.native && !native) {
    // A route flagged native with no component would render a blank page, which
    // looks like a routing bug rather than a missing import.
    throw new Error(`Route ${definition.path} is marked native but has no component`)
  }
  routes[definition.path] = native ?? wrap({ component: IframeRoute as any, props: { page: definition.page } })
}

// Anything unrecognised falls back to home rather than a blank screen.
routes['*'] = Home

export default routes

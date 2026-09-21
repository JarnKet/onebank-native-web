/**
 * Route map for svelte-spa-router: every path in `src/lib/routes.ts`, mounted.
 *
 * A path with no component yet renders the coming-soon page, so a route can
 * exist in the table (and be linked to) before its screen is built.
 */

import type { Component } from 'svelte'
import wrap from 'svelte-spa-router/wrap'
import TransferForm from './money/TransferForm.svelte'
import Home from './Home.svelte'
import Account from './Account.svelte'
import Group from './Group.svelte'
import ComingSoon from './ComingSoon.svelte'
import JoinGroup from './JoinGroup.svelte'
import LeaveGroup from './LeaveGroup.svelte'
import RegisterOneBank from './RegisterOneBank.svelte'
import Members from './Members.svelte'
import Role from './Role.svelte'
import Messages from './Messages.svelte'
import MessageDetail from './MessageDetail.svelte'
import Authorization from './Authorization.svelte'
import AuthorizationHistory from './AuthorizationHistory.svelte'
import Statement from './Statement.svelte'
import Salary from './Salary.svelte'
import ECheque from './ECheque.svelte'
import BillPayment from './BillPayment.svelte'
import TopUp from './TopUp.svelte'
import { COMING_SOON_PATH, HOME_PATH, routeDefinitions } from '../lib/routes'

const components: Record<string, Component<any> | ReturnType<typeof wrap>> = {
  [HOME_PATH]: Home,
  '/account': Account,
  '/group': Group,
  '/group/join': JoinGroup,
  '/group/leave': LeaveGroup,
  '/register': RegisterOneBank,
  '/member': Members,
  '/role': Role,
  '/messages': Messages,
  '/messages/:id': MessageDetail,
  '/authorization': Authorization,
  '/authorization/history': AuthorizationHistory,
  '/statement': Statement,
  '/salary': Salary,
  '/echeque': ECheque,
  '/bill/electricity': wrap({ component: BillPayment as any, props: { kind: 'ELECTRICITY' } }),
  '/bill/water': wrap({ component: BillPayment as any, props: { kind: 'WATER' } }),
  '/topup': TopUp,
  '/transfer': wrap({ component: TransferForm as any, props: { kind: 'BCEL' } }),
  '/transfer/interbank': wrap({ component: TransferForm as any, props: { kind: 'INTERBANK' } }),
  '/transfer/idcard': wrap({ component: TransferForm as any, props: { kind: 'IDCARD' } }),
  [COMING_SOON_PATH]: ComingSoon,
}

const routes: Record<string, Component<any> | ReturnType<typeof wrap>> = {}
for (const definition of routeDefinitions) {
  routes[definition.path] = components[definition.path] ?? ComingSoon
}

// Anything unrecognised falls back to home rather than a blank screen.
routes['*'] = Home

export default routes

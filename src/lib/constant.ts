import type {SidebarMenu} from "../definition";

export const BCELONE_PAGES = [
	'STATEMENT.html',
	'CARDINFO.html',
	'FEEDBACK.html',
	'LOCKCARD.html',
	'ECOMMERCE.html',
	'TRANSFER.html',
	'PHONE.html',
	'ELECTRICITY.html',
	'WATER.html',
	'INTERNET.html',
	'PETROTRADE.html',
	'LDTV.html',
	'TK.html',
	'HISTORY.html',
	'BCOME.html',
	'SMARTTAX.html',
	'CUSTOMS.html',
	'PAYME.html',
	'CREDITPAYMENT.html',
	'SMARTVAT.html',
	'ROADTAX.html',
	'ONEPAY.html',
	'ONEHEART.html',
	'CARDTOPUP.html',
	'LANDTAX.html',
	// The rewritten pages `PAGE_RENAMES` points at. Neither exists in
	// onebank-ui, so without these the rename sends them to the wrong origin and
	// the overlay loads nothing.
	'LANDTAXNEW.html',
	'ELECTRICITYNEW.html',
	'SMARTFEE.html',
	'LEASING.html',
	'INSURANCE.html',
	'SINGLEWINDOW.html',
	'GOVASSET.html',
	'BILLPAYMENT.html',
	'OVERSEA.html',
	'STUDY.html',
	'WITHDRAW.html',
	'ONECASH.html',
	'FASTTRACK.html',
	'BCELONECONTEST.html',
	'VC.html',
	'SECURITIES.html',
	'ONECAMPUS.html',
	'TOPUPWALLET.html',
	'ONEPROOF.html',
	'SWIFTGPI.html',
	'KYC.html',
	'SETTINGCARD.html',
	'SWIFTTRANSFER.html',
	'AUTODEBIT.html',
	'LOAN.html',
	'ONEPAYSUBSCRIPTION.html',
	'FINLINK.html',
	'ONEX.html',
	'QUEUE.html',
	'ONEPOINT.html',
	'TRANSACTIONCONFIRMATION.html',
	'REFERAL.html',
	'POPUP.html',
	'ONECARE.html',
]

export const sidebarMenuItems: SidebarMenu[] = [
	{id: 'HOME', label: 'Home', icon: 'mdi:home', notifications: 0, popupName: ''},
	{id: 'TRANSACTION', label: 'Transaction', icon: 'mdi:email', notifications: 2, popupName: 'TRANSACTION'},
	{id: 'AUTHORIZATION', label: 'Authorization', icon: 'mdi:circle', notifications: 2, popupName: 'AUTHORIZATION'},
	{id: 'ROLE', label: 'Role', icon: 'mdi:shield-account', notifications: 0, popupName: 'ROLE'},
	{id: 'ACCOUNT', label: 'Account', icon: 'mdi:bank', notifications: 0, popupName: 'ACCOUNT'},
	{id: 'MEMBER', label: 'Member', icon: 'mdi:account-group', notifications: 0, popupName: 'MEMBER'},
	{id: 'GROUP', label: 'Group', icon: 'mdi:pencil', notifications: 0, popupName: 'GROUP'},
	{id: 'LOGOUT', label: 'Logout', icon: 'mdi:logout', notifications: 0, popupName: ''},
]
/**
 * Month and weekday labels for the home calendar.
 *
 * Inlined from onebank-ui's `libs/constant.ts` rather than harvesting that
 * whole file — these two tables are all the calendar needs from it.
 */
export const FULL_MONTHS = [
	{en: 'January', lo: 'ມັງກອນ'},
	{en: 'February', lo: 'ກຸມພາ'},
	{en: 'March', lo: 'ມີນາ'},
	{en: 'April', lo: 'ເມສາ'},
	{en: 'May', lo: 'ພຶດສະພາ'},
	{en: 'June', lo: 'ມິຖຸນາ'},
	{en: 'July', lo: 'ກໍລະກົດ'},
	{en: 'August', lo: 'ສິງຫາ'},
	{en: 'September', lo: 'ກັນຍາ'},
	{en: 'October', lo: 'ຕຸລາ'},
	{en: 'November', lo: 'ພະຈິກ'},
	{en: 'December', lo: 'ທັນວາ'},
]

export const daysOfWeek = [
	{en: 'Sun', lo: 'ອາທິດ'},
	{en: 'Mon', lo: 'ຈັນ'},
	{en: 'Tue', lo: 'ອັງຄານ'},
	{en: 'Wed', lo: 'ພຸດ'},
	{en: 'Thu', lo: 'ພະຫັດ'},
	{en: 'Fri', lo: 'ສຸກ'},
	{en: 'Sat', lo: 'ເສົາ'},
]

/** Buddhist Era is 543 years ahead of the Gregorian year. */
export const BUDDHIST_YEAR_OFFSET = 543

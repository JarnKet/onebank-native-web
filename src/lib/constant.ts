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

/**
 * The sidebar, in the order the design lists it. LOGOUT is an action, not a
 * route; leaving a group lives in the top bar's create / join menu. Labels are translated where
 * they are rendered; badge counts come from live data, not from here.
 * Icons are the Iconify ids the Figma file itself names its icon layers with.
 */
export const sidebarMenuItems: SidebarMenu[] = [
	{id: 'HOME', en: 'Home', lo: 'ໜ້າຫຼັກ', icon: 'mdi:home'},
	{id: 'MESSAGE', en: 'Messages', lo: 'ຂໍ້ຄວາມ', icon: 'mdi:email'},
	{id: 'AUTHORIZATION', en: 'Pending authorization', lo: 'ລາຍການລໍຖ້າອະນຸມັດ', icon: 'mdi:clipboard-clock'},
	{id: 'ROLE', en: 'Manage permissions', lo: 'ຈັດການສິດທິ', icon: 'mdi:security-account'},
	{id: 'ACCOUNT', en: 'Accounts', lo: 'ບັນຊີ', icon: 'mdi:account'},
	{id: 'MEMBER', en: 'Manage members', lo: 'ຈັດການສະມາຊິກ', icon: 'mdi:account-group'},
	{id: 'GROUP', en: 'Edit group', lo: 'ແກ້ໄຂກຸ່ມ', icon: 'mdi:pencil'},
	{id: 'LOGOUT', en: 'Log out', lo: 'ອອກຈາກລະບົບ', icon: 'mdi:logout'},
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

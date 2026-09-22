/**
 * The menu registry: page key -> icon, label, and how to open it.
 *
 * Harvested verbatim from onebank-ui `src/libs/models/menus.ts`, minus its
 * separate `obKidMenus` export. The handful of `ONEBANKKID*` keys inside
 * `menus` stay: this is a lookup table, and a key the server never sends costs
 * nothing, whereas a missing one renders a blank tile.
 *
 * This is what turns the server's menu keys
 * (`loadhome`'s `homemenus` / `usablemenus` / `allmenus`) into something
 * renderable, so it has to stay in step with the core's key list.
 *
 * `popupname` overrides the page opened when it differs from the key — that is
 * how the Leasing and Insurance providers all collapse onto one page and carry
 * a `providercode` in `params`.
 *
 * Labels are resolved through `t()` at module load, exactly as in onebank-ui:
 * the language comes from the URL and does not change without a reload.
 *
 * The registry must stay a superset of what the core can send: `Services.svelte`
 * filters `allmenus` through it, so a key missing from here is silently dropped
 * from the grid rather than rendered as an unknown tile. Eighteen entries — the
 * eleven `IBANK*`, the OneBank utilities and three OneBank Kid actions — were
 * absent from the first harvest for exactly that reason and are restored.
 */

import { t } from './utils/helper'

export interface MenuIcon {
  /** Page to open, when it differs from the registry key. */
  popupname?: string
  /** File under `public/img/`. */
  filename: string
  name: string
  /** Extra querystring appended when opening, e.g. `providercode=0002`. */
  params?: string
  /** Open for a result and refresh the group afterwards. */
  reload?: boolean
}

export const menus: Record<string, MenuIcon> = {
  STATEMENT: { filename: 'ob/sc-statement.svg', name: t('Statement', 'ການເຄື່ອນໄຫວ', '银行对账单', 'Sao kê tài khoản') },
  ONEBANKSTATEMENT: { filename: 'ob-mn-statement.svg', name: t('Onebank Statement', 'ການເຄື່ອນໄຫວ Onebank', null, null) },
  ONEBANKKIDHOME: { filename: 'ob-kid-logo.svg', name: t('Onebank kid', 'Onebank kid', null, null) },
  ONEBANKKIDCREATEKID: { filename: 'ob-mn-account-group.svg', name: t('Onebank kid create kid', 'Onebank kid create kid', null, null) },
  ONEBANKKIDTOPUP: { filename: 'ob-kid-ic-top-up.svg', name: t('Topup', 'ຕື່ມເງິນ', null, null) },
  ONEBANKIDADJUSTPAYMENT: { filename: 'ob-kid-ic-adjust-payment.svg', name: t('Adjust Payment', 'ປັບວົງເງິນ', null, null) },
  ONEBANKKIDFUNCTION: { filename: 'ob-kid-ic-select-feature.svg', name: t('Select Feature', 'ເລືອກຟັງຊັ້ນ', null, null) },
  ONEBANKKIDCREATEDEPOSITACCOUNT: {
    filename: 'ob-mn-account-group.svg',
    name: t('Onebank kid create deposit account', 'Onebank kid create deposit account', null, null),
  },
  ONEBANKKIDISSUECARD: { filename: 'ob-kid-ic-issue-card.svg', name: t('Issue Card', 'ອອກບັດ ATM', null, null) },
  ONEBANKKIDDEPOSITFEATURE: { filename: 'ob-kid-ic-piggy-bank.svg', name: t('Piggy Bank', 'ກະປຸກອອມສິນ', null, null) },
  ONEBANKKIDMANAGECARDS: { filename: 'ob-kid-ic-card.svg', name: t('Card', 'ຈັດການບັດ', null, null) },
  ONEBANKKIDWITHDRAW: { filename: 'ob-kid-ic-withdraw.svg', name: t('Withdraw', 'ຖອນເງິນ', null, null) },
  ONEBANKTRANSFER: { filename: 'ob-mn-transfer.svg', name: t('Onebank Transfer', 'ໂອນເງິນ Onebank', null, null) },
  ONEBANKUTILITIES: {
    filename: 'ob-mn-phone.svg',
    name: t('Onebank Utilities', 'ສາທາລະນຸປະໂພກ Onebank', '交电话费', 'Thanh toán tiền điện thoại'),
  },
  ONEBANKPHONE: {
    filename: 'ob-mn-phone.svg',
    name: t('Onebank Phone', 'ຈ່າຍຄ່າໂທລະສັບ Onebank', '交电话费', 'Thanh toán tiền điện thoại'),
  },
  ONEBANKWATER: { filename: 'ob-mn-water.svg', name: t('Onebank Water', 'ຈ່າຍຄ່ານໍ້າ Onebank', '交水费', 'Thanh toán tiền nước') },
  ONEBANKELECTRICITY: { filename: 'ob-mn-electricity.svg', name: t('Onebank Electricity', 'ຈ່າຍຄ່າໄຟຟ້າ Onebank', '交电费', 'Điện') },
  ONEBANKKIDREACTIVATION: { filename: 'ob-kid-ic-reactivate.svg', name: t('Reactivate', 'ເປິດນຳໃຊ້ແອັບ', null, null) },
  ONEBANKKIDRECURRINGTOPUP: { filename: 'ob-kid-ic-auto-topup.svg', name: t('Recurring Topup', 'ຕື່ມເງີນອັດຕະໂນມັດ', null, null) },
  ONEBANKKIDRESETPIN: { filename: 'ob-kid-ic-reset-pin.svg', name: t('Reset Pin', 'ຕັ້ງ PIN ໃຫມ່', null, null) },

  TRANSACTION: { filename: 'ob-mn-message.svg', name: t('Transactions', 'ຂໍ້ຄວາມ', null, null) },
  AUTHORIZATION: { filename: 'ob-mn-onebank-authorization.svg', name: t('Pending', 'ລໍຖ້າອະນຸມັດ', null, null) },
  TRANSFER: { filename: 'ob/sc-transfer.svg', name: t('Transfer', 'ໂອນເງິນ', '转账', 'Chuyển khoản') },
  ONEPAY: { filename: 'ob-mn-onepay.png', name: t('OnePay', null, null, null) },
  PHONE: { filename: 'ob/sv-phone.svg', name: t('Phone ', 'ຈ່າຍຄ່າໂທລະສັບ', '交电话费', 'Thanh toán tiền điện thoại') },
  ELECTRICITY: { filename: 'ob/sv-electricity.svg', name: t('Electricity ', 'ຈ່າຍຄ່າໄຟຟ້າ', '交电费', 'Điện') },
  WATER: { filename: 'ob/sv-water.svg', name: t('Water ', 'ຈ່າຍຄ່ານໍ້າ', '交水费', 'Thanh toán tiền nước') },
  HOME: { filename: 'ob-mn-home.svg', name: t('Home', 'ໜ້າຫຼັກ', null, null) },
  ADDACCOUNT: { filename: 'ob-mn-add-ac.svg', name: t('New Account', 'ເປີດບັນຊີ', null, null) },
  MODIFYOBPROFILE: { filename: 'ob-mn-add-ac.svg', name: t('Modify OneBank Profile', 'ແກ້ໄຂບັນຊີ', null, null) },
  // SALARY: { filename: 'ob-mn-salary.svg', name: t('Salary', 'ລົງເງິນເດືອນ', null, null) },
  ECHEQUE: { filename: 'ob/sc-echeque.svg', name: t('E-Cheque', null, null, null) },
  MYQR: { filename: 'qa_qr.svg', name: t('MYQR', null, null, null) },
  // MULTIPLETRANSFER: { filename: 'ob-mn-multiple-transfer.svg', name: t('Multiple Transfer', 'ໂອນເງິນຫຼາຍບັນຊີ', null, null) },
  VOUCHER: { filename: 'ob-mn-verify-transfer.svg', name: t('Voucher', 'ໃບຢັ້ງຢືນການໂອນ', null, null) },
  BCOME: { filename: 'ob-mn-bcome.svg', name: t('BCOME', 'ໂອນລອຍ', null, null) },
  BILLPAYMENT: { filename: 'ob-mn-billpayment.svg', name: t('Bill ', 'ຈ່າຍຄ່າໃບບິນຕ່າງໆ', null, null) },
  CONTACTLESS: { filename: 'ob-mn-contactless.svg', name: t('Contactless', 'ເປີດ/ປິດ Contactless', null, null) },
  CREDITPAYMENT: { filename: 'ob-mn-creditpayment.svg', name: t('Credit ', 'ຈ່າຍຄ່າບັດເຄຼດິດ', '信用卡偿还', 'Thanh toán thẻ tín dụng') },
  CREDITSTATEMENT: {
    filename: 'ob-mn-creditstatement.svg',
    name: t('Credit Statement', 'ໃບແຈ້ງໜີ້', '信用卡对帐单', 'Sao kê thẻ tín dụng'),
  },
  // CUSTOMS: { filename: 'mn-customs.png', name: t('Customs', null, null, null) },
  FASTTRACK: { filename: 'ob-mn-fasttrack.svg', name: t('FastTrack', null, null, null) },
  // FINLINK: { filename: 'mn-finlink.png', name: t('FinLink', 'ຊໍາລະພາສີ-ອາກອນ', null, null) },
  // GOVASSET: { filename: 'mn-realestate.png', name: t('Government Asset ', 'ມອບພັນທະຊັບສິນຂອງລັດ', null, null) },
  HISTORY: { filename: 'ob/sv-history.svg', name: t('Billing History', 'ປະຫວັດການຈ່າຍ', '支付记录', 'Lịch sử thanh toán') },
  INSURANCE: { filename: 'ob-mn-insurance.svg', name: t('Insurance', 'ປະກັນໄພ', null, null) },
  INTERNET: { filename: 'ob-mn-adsl.svg', name: t('Leased Line', 'ສາຍເຊົ່າ', '交租用费', 'Đường dây cáp quang') },
  LANDTAX: { filename: 'ob-mn-landtax.svg', name: t('LandTax', 'ຄ່າພາສີທີ່ດິນ', null, null) },
  LEASING: { filename: 'ob/sv-leasing.svg', name: t('Leasing ', 'ຈ່າຍຄ່າສິນເຊື່ອຕ່າງໆ', null, null) },
  ONEHEART: { filename: 'ob-mn-oneheart.png', name: t('OneHeart', null, null, null) },
  ONEX: { filename: 'ob-mn-onex.svg', name: t('OneX', null, null, null) },
  OPENNEWACCOUNT: { filename: 'ob-mn-passbook.svg', name: t('Open New Account', 'ເປີດບັນຊີໃໝ່', null, null) },
  PAYME: { filename: 'ob-mn-payme.svg', name: t('PayMe', null, null, null) },
  QUEUE: { filename: 'ob-mn-queue.svg', name: t('Queue', null, null, null) },
  ROADTAX: { filename: 'ob-mn-road.svg', name: t('RoadTax', 'ຄ່າທຳນຽມທາງ', null, null) },
  SECURITIES: { filename: 'ob-mn-securities.svg', name: t('Securities', 'ບັນຊີ ຫຼັກຊັບ', null, null) },
  SECURITY: { filename: 'ob-mn-security.svg', name: t('Card Security', 'ຄວາມປອດໄພ', '卡安全', 'Sự an toàn của thẻ') },
  // SETTINGPINPASSWORD: { filename: 'ic_changepin.svg', name: t('PIN Setting', 'ຕັ້ງຄ່າລະຫັດ PIN', null, null) },
  SINGLEWINDOW: { filename: 'ob-mn-lnsw.png', name: t('LNSW', 'ປະຕູດຽວ', null, null) },
  // SMARTFEE: { filename: 'ob-mn-smartfee.png', name: t('SmartVAT 2', null, null, null) },
  SMARTTAX: { filename: 'ob-mn-smarttax.png', name: t('Smart Tax', null, null, null) },
  // SMARTVAT: { filename: 'mn-smartvat.png', name: t('SmartVAT', null, null, null) },
  SMARTVATCARD: { filename: 'ob-mn-smartvat.png', name: t('SmartVAT Card', 'ບັດ SmartVAT', null, null) },
  // STUDY: { filename: 'ob-mn-bi.svg', name: t('Banking Institute', 'ສະຖາບັນ ການທະນາຄານ', null, null) },
  SWIFTTRANSFER: { filename: 'ob-mn-internationtransfer.svg', name: t('International Transfer', 'ໂອນເງິນຕ່າງປະເທດ', null, null) },
  TOPUPWALLET: { filename: 'ob-mn-wallet.svg', name: t('Top-up wallet', 'ເຕີມເງິນເຂົ້າກະເປົາ', null, null) },
  ACCOUNT: { filename: 'ob-mn-account-group.svg', name: t('Account', 'ບັນຊີ', null, null) },
  // VC: { filename: 'ob-mn-vtc.svg', name: t('Vientiane College', 'ວິທະຍາໄລ ວຽງຈັນ', null, null) },
  MYACCOUNTTRANSFER: { filename: 'ob-mn-add-ac.svg', name: t('My Account Transfer', 'ໂອນບັນຊີໂຕເອງ', null, null) },
  SCHEDULTEDPAYMENTMA: { filename: 'ob-mn-add-ac.svg', name: t('Scheduled Payment Maintenance', 'ຈັດການຕັ້ງເວລາໂອນ', null, null) },
  REGISTERONEBANK: { filename: 'ob-mn-add-ac.svg', name: t('Register OneBank', 'ລົງທະບຽນ OneBank', null, null) },
  MANAGEINCORRECTTXN: {
    filename: 'ob-mn-add-ac.svg',
    name: t('Incorrect Transaction Management', 'ອັບເດດຂໍ້ມູນລາຍການໂອນເງິນ', null, null),
  },
  TEMPLATEMAINTENANCE: { filename: 'ob-mn-add-ac.svg', name: t('Template Maintenance', 'ຈັດການຮ່າງການໂອນ', null, null) },
  // PAYCARD: { filename: 'ob-mn-add-ac.svg', name: t('PayCard Top Up', 'ເຕີມເງີນເຂົ້າບັດ PayCard', null, null) },
  BENEFICIARYMAINTENANCE: { filename: 'ob-mn-add-ac.svg', name: t('Beneficiary Maintenance', 'ຈັດການຂໍ້ມູນຜູ້ຮັບ', null, null) },
  TRANSFERLIMIT: { filename: 'ob-mn-add-ac.svg', name: t('Transfer Limit', 'ຈັດການວົງເງິນເຮັດທຸລະກຳ', null, null) },
  GROUP: { filename: 'ob-mn-group.svg', name: t('Group', 'ກຸ່ມ', null, null), reload: true },
  // GROUPNEWUI: { filename: 'ob-mn-add-ac.svg', name: t('GROUPNEWUI', 'ສະມາຊິກ', null, null) },
  DASHBOARD: { filename: 'ob-mn-add-ac.svg', name: t('Dashboard', 'ລາຍງານ', null, null) },
  ROLE: { filename: 'ob-mn-role.svg', name: t('Permissions', 'ສິດທິ', null, null), reload: true },
  GROUPMANAGEMENT: { filename: 'group_mn.svg', name: t('GROUPMANAGEMENT', 'ຈັດການກຸ່ມ', null, null), reload: true },
  MESSAGE: { filename: 'ob-mn-message.svg', name: t('Message', 'ຂໍ້ຄວາມ', null, null), reload: true },
  MEMBER: { filename: 'ob-mn-member.svg', name: t('Members', 'ສະມາຊິກກຸ່ມ', null, null), reload: true },
  // CHAT: { filename: 'ob-mn-add-ac.svg', name: t('Chat', 'ສົນທະນາ', null, null), reload: true },

  //leasing
  LEASING_KRS: { popupname: 'LEASING', filename: 'krs.png', name: t('Krungsri', ''), params: 'providercode=KRS' },
  LEASING_AEN: { popupname: 'LEASING', filename: 'aen.png', name: t('AEON Leasing', ''), params: 'providercode=AEN' },
  LEASING_THA: { popupname: 'LEASING', filename: 'tha.png', name: t('Thai ACE', ''), params: 'providercode=THA' },
  LEASING_DGB: { popupname: 'LEASING', filename: 'dgb.png', name: t('DGB', ''), params: 'providercode=DGB' },
  LEASING_KBK: { popupname: 'LEASING', filename: 'kbk.png', name: t('KB Kolao Leasing', ''), params: 'providercode=KBK' },
  LEASING_BSP: { popupname: 'LEASING', filename: 'bsp.png', name: t('BSP', ''), params: 'providercode=BSP' },
  LEASING_MHT: { popupname: 'LEASING', filename: 'mht.png', name: t('Mahathuen', ''), params: 'providercode=MHT' },
  LEASING_CPL: { popupname: 'LEASING', filename: 'cpl.png', name: t('Champa Lao', ''), params: 'providercode=CPL' },
  LEASING_SKM: { popupname: 'LEASING', filename: 'skm.png', name: t('Sekong', ''), params: 'providercode=SKM' },
  LEASING_WLL: { popupname: 'LEASING', filename: 'wll.png', name: t('Welcome', ''), params: 'providercode=WLL' },
  LEASING_NCC: { popupname: 'LEASING', filename: 'ncc.png', name: t('New Concept', ''), params: 'providercode=NCC' },
  LEASING_SPL: { popupname: 'LEASING', filename: 'spl.png', name: t('Sisombath', ''), params: 'providercode=SPL' },
  LEASING_KOL: { popupname: 'LEASING', filename: 'kol.png', name: t('KOLAO Developing', ''), params: 'providercode=KOL' },
  LEASING_LXL: { popupname: 'LEASING', filename: 'lxl.png', name: t('Lanexang', ''), params: 'providercode=LXL' },
  LEASING_GLL: { popupname: 'LEASING', filename: 'gll.png', name: t('GL Leasing', ''), params: 'providercode=GLL' },
  LEASING_EMI: { popupname: 'LEASING', filename: 'emi.png', name: t('Ekphatthana', ''), params: 'providercode=EMI' },
  LEASING_SMI: { popupname: 'LEASING', filename: 'smi.png', name: t('Sokxay', ''), params: 'providercode=SMI' },
  LEASING_SJI: { popupname: 'LEASING', filename: 'sji.png', name: t('Supthavy', ''), params: 'providercode=SJI' },
  LEASING_CMI: { popupname: 'LEASING', filename: 'cmi.png', name: t('Champasak', ''), params: 'providercode=CMI' },
  LEASING_BCL: { popupname: 'LEASING', filename: 'bcl.png', name: t('BNK Capital Lao', ''), params: 'providercode=BCL' },
  LEASING_LAL: { popupname: 'LEASING', filename: 'lal.png', name: t('Lao ASEAN', ''), params: 'providercode=LAL' },
  LEASING_RPL: { popupname: 'LEASING', filename: 'rpl.png', name: t('ຮ່ວມພັດທະນາ', ''), params: 'providercode=RPL' },
  LEASING_BIC: { popupname: 'LEASING', filename: 'bic.png', name: t('BIC', ''), params: 'providercode=BIC' },
  LEASING_ODM: { popupname: 'LEASING', filename: 'odm.png', name: t('Oudomxay Development', ''), params: 'providercode=ODM' },
  LEASING_PCM: { popupname: 'LEASING', filename: 'pcm.png', name: t('ພຸດພະຈັນ', ''), params: 'providercode=PCM' },
  LEASING_APP: { popupname: 'LEASING', filename: 'app.png', name: t("Active People's Leasing AP", ''), params: 'providercode=APP' },
  //insurance
  INSURANCE_LVI: { popupname: 'INSURANCE', filename: 'lvi.png', name: t('Lao-Viet Insurance', ''), params: 'providercode=LVI' },
  INSURANCE_AGL: { popupname: 'INSURANCE', filename: 'agl.png', name: t('Allianz Insurance Laos', ''), params: 'providercode=AGL' },
  INSURANCE_PRU: { popupname: 'INSURANCE', filename: 'pru.png', name: t('Prudential', ''), params: 'providercode=PRU' },
  INSURANCE_STM: { popupname: 'INSURANCE', filename: 'stm.png', name: t('ST-Muang Thai', ''), params: 'providercode=STM' },
  INSURANCE_SXL: { popupname: 'INSURANCE', filename: 'sxl.png', name: t('Sokxay', ''), params: 'providercode=SXL' },
  INSURANCE_ACC: { popupname: 'INSURANCE', filename: 'acc.png', name: t('ASEAN Contact Center', ''), params: 'providercode=ACC' },
  INSURANCE_VTI: { popupname: 'INSURANCE', filename: 'vti.png', name: t('Vientiane Insurance', ''), params: 'providercode=VTI' },
  //bill payment, waste payment
  IFS: { popupname: 'BILLPAYMENT', filename: 'ifs.png', name: t('Wastepay by Infrasol', ''), params: 'providercode=IFS' },
  SMB: { popupname: 'BILLPAYMENT', filename: 'smb.png', name: t('Wastepay by Small-b', ''), params: 'providercode=SMB' },
  //card topup
  CARD_TOPUP_MCMYWAY: { popupname: 'CARDTOPUP', filename: 'cc_myway.png', name: t('MasterCard MyWay', ''), params: 'providercode=MCMYWAY' },
  CARD_TOPUP_MCPREPAID: {
    popupname: 'CARDTOPUP',
    filename: 'cc_Mastercard-Prepaid.png',
    name: t('MasterCard Prepaid', ''),
    params: 'providercode=MCPREPAID',
  },
  CARD_TOPUP_BCOME: { popupname: 'CARDTOPUP', filename: 'bcome_card.png', name: t('BCOME', ''), params: 'providercode=BCOME' },
  CARD_TOPUP_SMARTVAT: { popupname: 'CARDTOPUP', filename: 'smartvatcard.png', name: t('SmartVAT', ''), params: 'providercode=SMARTVAT' },
  CARD_TOPUP_LDTV: { popupname: 'CARDTOPUP', filename: 'mn-ldtv.png', name: t('LDTV', ''), params: 'providercode=LDTV' },
  CARD_TOPUP_VANNASENG: {
    popupname: 'CARDTOPUP',
    filename: 'mn-vannaseng.png',
    name: t('VANNASENG', ''),
    params: 'providercode=VANNASENG',
  },
  CARD_TOPUP_LAOSAT: { popupname: 'CARDTOPUP', filename: 'mn-laosat.png', name: t('LAOSAT', ''), params: 'providercode=LAOSAT' },
  //wallet topup
  WALLET_TOPUP_UMONEY: { popupname: 'TOPUPWALLET', filename: 'wallet-umoney.png', name: t('U-Money', ''), params: 'providercode=UMONEY' },
  WALLET_TOPUP_MMONEY: { popupname: 'TOPUPWALLET', filename: 'wallet-mmoney.png', name: t('M-Money', ''), params: 'providercode=MMONEY' },
  WALLET_TOPUP_NEWPAY: { popupname: 'TOPUPWALLET', filename: 'wallet-newpay.png', name: t('New Pay', ''), params: 'providercode=NEWPAY' },
  WALLET_TOPUP_INSEEHUB: {
    popupname: 'TOPUPWALLET',
    filename: 'wallet-inseehub.png',
    name: t('INSEE HUB', ''),
    params: 'providercode=INSEEHUB',
  },
  //securities
  '0002': { popupname: 'SECURITIES', filename: 'bcel-kt.jpg', name: t('ທຄຕລ-ກທ', 'BCEL-KT'), params: 'providercode=0002' },
  '0003': { popupname: 'SECURITIES', filename: 'lao-lsc.jpg', name: t('ລາວ-ຈີນ', 'Lao-China'), params: 'providercode=0003' },
  // REPLACECARD: { filename: 'ob-mn-add-ac.svg', name: t('REPLACECARD', 'REPLACECARD', null, null) },

  // The iBanking family. onebank-ui gives all eleven the same `ib-logo.png`;
  // here each has its own icon in the design's navy-and-red style, since every
  // one of them opens a native screen (src/lib/routes.ts).
  IBANKACCOUNTDETAIL: { filename: 'ob/sv-account-detail.svg', name: t('Account Detail', 'ລາຍລະອຽດບັນຊີ', null, null) },
  IBANKDESTINATIONACCOUNT: { filename: 'ob/sv-beneficiary.svg', name: t('Destination Account', 'ບັນຊີປາຍທາງ', null, null) },
  IBANKEXCHANGERATES: { filename: 'ob/sv-exchange.svg', name: t('Exchange Rates', 'ອັດຕາແລກປ່ຽນ', null, null) },
  IBANKINTERESTRATES: { filename: 'ob/sv-interest.svg', name: t('Interest Rates', 'ອັດຕາດອກເບ້ຍ', null, null) },
  IBANKINTERNATIONALTRANSFER: { filename: 'ob/sv-international.svg', name: t('International Transfer', 'ໂອນເງິນຕ່າງປະເທດ', null, null) },
  IBANKLOANACCOUNT: { filename: 'ob/sv-loan.svg', name: t('Loan Account', 'ບັນຊີເງິນກູ້', null, null) },
  IBANKNOTIFICATIONSETTING: { filename: 'ob/sv-notification.svg', name: t('Notification Setting', 'ຈັດການການແຈ້ງເຕືອນ', null, null) },
  IBANKSALARY: { filename: 'ob/sc-salary.svg', name: t('Salary', 'ໂອນເງິນເດືອນ', null, null) },
  IBANKSLIP: { filename: 'ob/sv-slip.svg', name: t('Slip Report', 'ລາຍງານໃບຢັ້ງຢືນການໂອນ', null, null) },
  IBANKTERMDEPOSITACCOUNT: { filename: 'ob/sv-term-deposit.svg', name: t('Term Deposit Account', 'ບັນຊີຝາກມີກຳນົດ', null, null) },
  IBANKTRANFERIDCARD: { filename: 'ob/sv-transfer-id.svg', name: t('Transfer to ID', 'ໂອນລອຍ', null, null) },
}

export function getOnlyMenus(pageNames: string[]): Record<string, MenuIcon> {
  const onlyMenus: Record<string, MenuIcon> = {}
  for (const key in menus) {
    if (pageNames.includes(key)) onlyMenus[key] = menus[key]
  }
  return onlyMenus
}

export function getExceptedMenus(pageNames: string[]): Record<string, MenuIcon> {
  const excludedMenus: Record<string, MenuIcon> = {}
  for (const key in menus) {
    if (!pageNames.includes(key)) excludedMenus[key] = menus[key]
  }
  return excludedMenus
}

export function getSearchMenu(search: string, onlyPageNames: string[] | undefined = undefined): Record<string, MenuIcon> {
  let filteredMenus: Record<string, MenuIcon> = { ...menus }

  if (onlyPageNames !== undefined) {
    for (const key in filteredMenus) {
      if (key.toLowerCase().includes(search.trim().toLowerCase())) {
        if (!onlyPageNames.includes(key)) {
          delete filteredMenus[key]
        }
      }
    }
  }

  if (search === '') {
    return filteredMenus
  } else {
    let searchMenus = {}
    for (const key in filteredMenus) {
      if (key.toLowerCase().includes(search.trim().toLowerCase())) {
        // @ts-ignore
        searchMenus[key] = filteredMenus[key]
      }
    }
    return searchMenus
  }
}

/**
 * Menus offered whatever `allmenus` says, matching onebank-ui's Functions
 * widget: the core does not enumerate the iBanking family or the OneBank
 * utilities, but their pages exist and are reachable. `usablemenus` still
 * decides whether each one is live or greyed out.
 */
export const ALWAYS_OFFERED = [
  'ONEBANKSTATEMENT',
  'ONEBANKTRANSFER',
  'ONEBANKUTILITIES',
  'IBANKSALARY',
  'IBANKACCOUNTDETAIL',
  'IBANKNOTIFICATIONSETTING',
  'IBANKEXCHANGERATES',
  'IBANKINTERESTRATES',
  'IBANKSLIP',
  'IBANKDESTINATIONACCOUNT',
  'IBANKTERMDEPOSITACCOUNT',
  'IBANKLOANACCOUNT',
  'IBANKINTERNATIONALTRANSFER',
  'IBANKTRANFERIDCARD',
]

/**
 * Every menu the group can be offered: the core's `allmenus` plus
 * `ALWAYS_OFFERED`, de-duplicated (the core does send some of these for some
 * groups), keeping only keys the registry can render.
 */
export function offeredMenus(allmenus: string[] | undefined): string[] {
  return [...new Set([...(allmenus ?? []), ...ALWAYS_OFFERED])].filter((key) => menus[key])
}

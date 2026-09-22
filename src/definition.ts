export interface Popup {
	popupid: number
	name: string
	bannerimageurleng: string
	bannerimageurllao: string
	popupimageurleng: string
	popupimageurllao: string
	yestext?: string
	yespagename?: string
	yesurl?: string
}

export interface LoginData {
	codehashes: Record<string, string>
	codeurl: string
	codeversion: number
	data: object
	imgurl: string
	imgversion: number
	loginurl: string
	loginversion: number
	name: string
	passbook: number
	result: number
	message?: string
	savedUserhash: string
	savedUsername: string
	unreadcount: number
	authToken: string
}

export interface PopupMetadata{
	/** Absent when the opener does not want a result back. */
	callbackid? : string
	id : string
	isVisible : boolean
	src : string
	isBcelOne : boolean
}

export interface Account {
	accountid: string
	account: string
	ccy: 'LAK' | 'USD' | 'THB' | 'CNY'
	name: string
	alias: string
	type: 'SAVING' | 'CURRENT' | 'VIRTUAL' | 'SHADOW' | 'STANDARD'
	viewonly: number
	maskedAccount: string
	status?: string
	availablebalance?: number
	currentbalance?: number

}

export interface User {
	userid: string
	name: string
	profileid: string
	faceid: string
	profiletype: number
	role: string
}

export interface GroupDetail {
	onebankid: string
	name: string
	detail: string
	color: string
	logoname: string
}

export interface Menu {
	name: string
	groupName?: string
	rank?: number
	count: number
}

export interface LoadHomeResult {
	result: number
	message?: string
	accounts: Account[]
	users: User[]
	me: User
	widgets: string[]
	shortcutmenus: string[]
	usablemenus: string[]
	homemenus: Menu[]
	allmenus: string[]
	detail: GroupDetail
}

export type SidebarMenuTitle = 'HOME' | 'MESSAGE' | 'AUTHORIZATION' | 'ROLE' | 'ACCOUNT' | 'MEMBER' | 'GROUP' | 'LOGOUT';


export     interface SidebarMenu {
	id: SidebarMenuTitle
	en: string
	lo: string
	icon: string
}

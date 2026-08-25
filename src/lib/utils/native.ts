
function isFeatureSupport(androidCode: number, iOSCode: number, unknownCode: number): boolean {
	// TODO: window.urlParams['versioncode'] not work on login page, native not send data to webview (iOS 3.24 b388 onward is support)
	const versionCode = window.urlParams && window.urlParams['versioncode'] !== undefined ? parseInt(window.urlParams['versioncode']) : 0

	switch (getOs()) {
		case 'android':
			return versionCode >= androidCode
		case 'ios':
			return versionCode >= iOSCode
		case 'unknown':
			return versionCode >= unknownCode
		default:
			return false
	}
}

export function getOs() {
	// `window.opera` may be absent, so the fallback has to bottom out somewhere.
	const userAgent = navigator.userAgent || navigator.vendor || window.opera || ''
	if (userAgent.match(/iPad/i) || userAgent.match(/iPhone/i) || userAgent.match(/iPod/i)) return 'ios'
	else if (userAgent.match(/Android/i)) return 'android'
	else return 'unknown'
}


export const isSupportNativeSetting = isFeatureSupport(361, 350, 361)


export function setSetting(key: string, value: string): Promise<void> {
	value = value ? value.toString() : ''

	return new Promise((resolve) => {
		if (isSupportNativeSetting && getOs() === 'ios') {
			// Backward compatible
			// localStorage can be cleared by webview anytime, so save to both localStorage and native storage
			localStorage.setItem(key, value)

			window.NativeBridge.call('setSetting', { key, value, secure: false }, () => {})
			resolve()
		} else {
			localStorage.setItem(key, value)
			resolve()
		}
	})
}

export async function getSetting(key: string): Promise<string> {
	return new Promise((resolve) => {
		// Backward compatible
		// Native storage is slower than localStorage, so check localStorage first then native
		const localStorageValue = localStorage.getItem(key)
		if (localStorageValue !== null) {
			console.debug('get localStorage value', key, localStorageValue)
			resolve(localStorageValue ?? '')
			return
		}

		if (isSupportNativeSetting && getOs() === 'ios') {
			window.NativeBridge.call('getSetting', { key, secure: false }, (res: any) => {
				setTimeout(() => {
					console.debug('get native storage value', key, res)
					resolve(res)
				}, 1)
			})
		} else {
			resolve(localStorage.getItem(key) ?? '')
		}
	})
}

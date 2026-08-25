<script lang="ts">
	import { untrack } from 'svelte';
	import {
		language, onebankPath,
	} from '../stores/config'
	import Connector from "../lib/utils/connector";
	import {encryptPassword} from "../lib/utils/helper";
	import {completeLogin} from "../lib/session";
	import Icon from '@iconify/svelte';
	import PrimaryLoadingSpinner from './PrimaryLoadingSpinner.svelte';
	import { env } from '../lib/env';


	let username = $state('');
	let password = $state('');
	let savePassword = $state(true);
	let isPasswordSaved = $state(false);
	let coreip = $state('')
	let isUseProduction = $state(false);
	let onebankUI = $state('');
	let error = $state('');
	let showPassword = $state(false);
	let isSubmitting = $state(false);

	// Host-override fields are a dev affordance; see VITE_ENABLE_DEV_OVERRIDES.
	const devOverrides = env.enableDevOverrides;



	let conn: Connector

	const UILanguage = $derived(parseInt($language))

	// Restoring the saved login is a one-shot boot task, not a reaction.
	$effect(() => untrack(() => {
		conn = new Connector()
		username = localStorage.username || '';
		if (localStorage.password) {
			password = localStorage.password;
			isPasswordSaved = true;
		}
		if (devOverrides) {
			if (localStorage.coreip) coreip = localStorage.coreip
			if (localStorage.onebankui) onebankUI = localStorage.onebankui
			if (localStorage.useproduction) isUseProduction = localStorage.useproduction === 'true'
		}
	}));

	function handlePasswordFocus(): void {
		if (isPasswordSaved) {
			password = '';
			isPasswordSaved = false;
		}
	}

	/**
	 * `isSubmitting` is what takes the button out of its waiting state, and it
	 * is cleared in `finally` — a rejected `login()` used to leave "Please
	 * wait..." on screen forever, because the call was fired without an `await`
	 * or a `catch` and the failure went to the console as an unhandled
	 * rejection instead of to the user.
	 */
	async function handleSubmit(): Promise<void> {
		if (isSubmitting) return;

		localStorage.username = username;
		localStorage.lang = $language;
		if (devOverrides) {
			localStorage.coreip = coreip;
			localStorage.onebankui = onebankUI;
			localStorage.useproduction = isUseProduction;
			if (onebankUI) $onebankPath = onebankUI;
		}

		isSubmitting = true;
		error = t('Please wait...', 'ກະລຸນາລໍຖ້າ...');
		try {
			await login();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : t('Login failed. Please try again.', 'ເຂົ້າສູ່ລະບົບບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່.');
		} finally {
			isSubmitting = false;
		}
	}

	/** Reactive translation, as in Login.svelte — see the note there. */
	function t(en: string, la: string | null = null, cn: string | null = null, vn: string | null = null): string {
		if (UILanguage === 0) return en
		else if (UILanguage === 1 && la) return la
		else if (UILanguage === 3 && cn) return cn
		else if (UILanguage === 2 && vn) return vn
		else return en
	}


	async function login(): Promise<void> {
		// Captured before the request: the failure path needs to know whether the
		// hash it just sent came from storage or from what the user typed.
		const usedSavedPassword = isPasswordSaved;

		const loginPayload = {
			command: "login",
			email: username,
			password: usedSavedPassword
				? localStorage.password
				: encryptPassword(password),
			devicetype: "B"
		};

		if (!savePassword) localStorage.removeItem("password");

		const res = await conn.sendMessage('USER', loginPayload);

		if (res.result === 0) {
			// Only a login the core accepted is worth remembering. This used to
			// run on every attempt, so a single wrong password was persisted,
			// auto-filled on the next load, and replayed on every attempt after
			// that — the form kept reporting bad credentials with no way out
			// except focusing the field, which is the one thing that clears it.
			if (savePassword) localStorage.password = loginPayload.password;
			completeLogin(res.data);
			return;
		}

		// The stored hash is what the core just rejected. Drop it and ask for the
		// password again rather than replaying a value known to be wrong.
		if (usedSavedPassword) {
			localStorage.removeItem("password");
			isPasswordSaved = false;
			password = '';
		}

		error = res.message || t('Incorrect username or password.', 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
	}
</script>

<!-- Runes mode has no event modifiers, so `|preventDefault` is done by hand. -->
<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-5 p-6">
	<div class="space-y-1">
		<label for="username" class="block text-sm font-medium text-gray-700">
			{t('Username', 'ຊື່ຜູ້ໃຊ້')}
		</label>
		<div class="relative rounded-md shadow-sm">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				<Icon icon="mdi:account" class="h-5 w-5 text-gray-400" />
			</div>
			<input
					type="text"
					id="username"
					bind:value={username}
					class="block w-full rounded-md border-gray-300 pl-10 focus:border-onebank-red focus:ring-onebank-red text-sm"
					placeholder={t('Enter your username', 'ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້')}
					required
			/>
		</div>
	</div>
	<div class="space-y-1">
		<label for="password" class="block text-sm font-medium text-gray-700">
			{t('Password', 'ລະຫັດຜ່ານ')}
		</label>
		<div class="relative rounded-md shadow-sm">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				<Icon icon="mdi:lock" class="h-5 w-5 text-gray-400" />
			</div>
			<input
					type={showPassword ? "text" : "password"}
					id="password"
					bind:value={password}
					onfocus={handlePasswordFocus}
					class={`block w-full rounded-md border-gray-300 pl-10 pr-10 focus:border-onebank-red focus:ring-onebank-red text-sm ${isPasswordSaved ? 'bg-green-50' : ''}`}
					placeholder={t('Enter your password', 'ກະລຸນາປ້ອນລະຫັດຜ່ານ')}
					required
			/>
			<button
					type="button"
					aria-label={t('Toggle password visibility', 'ສະແດງ/ເຊື່ອງລະຫັດຜ່ານ')}
					class="absolute inset-y-0 right-0 flex items-center pr-3"
					onclick={() => showPassword = !showPassword}
			>
				<Icon icon={showPassword ? "mdi:eye-off" : "mdi:eye"} class="h-5 w-5 text-gray-400 hover:text-gray-500" />
			</button>
		</div>
		<div class="flex items-center">
			<input
					type="checkbox"
					id="savePassword"
					bind:checked={savePassword}
					class="h-4 w-4 rounded border-gray-300 text-onebank-red focus:ring-onebank-red"
			/>
			<label for="savePassword" class="ml-2 block text-sm text-gray-600">
				{t('Save password', 'ບັນທຶກລະຫັດຜ່ານ')}
			</label>
		</div>
	</div>
	{#if devOverrides}
		<div class="space-y-1">
			<label for="coreip" class="block text-sm font-medium text-gray-700">
				{t('Core IP', 'Core IP')}
			</label>
			<div class="relative rounded-md shadow-sm">
				<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
					<Icon icon="mdi:network" class="h-5 w-5 text-gray-400" />
				</div>
				<input
						type="text"
						id="coreip"
						bind:value={coreip}
						class={`block w-full rounded-md border-gray-300 pl-10 pr-10 focus:border-onebank-red focus:ring-onebank-red text-sm disabled:opacity-50 ${isUseProduction ? 'bg-gray-50' : ''}`}
						placeholder={t('Enter core ip', 'Enter core ip')}
						disabled={isUseProduction}
						required
				/>
			</div>
			<div class="flex items-center">
				<input
						type="checkbox"
						id="useproduction"
						bind:checked={isUseProduction}
						class="h-4 w-4 rounded border-gray-300 text-onebank-red focus:ring-onebank-red"
				/>
				<label for="useproduction" class="ml-2 block text-sm text-gray-600">
					{t('Use production', 'Use production')}
				</label>
			</div>
		</div>
		<div class="space-y-1">
			<label for="onebankui" class="block text-sm font-medium text-gray-700">
				{t('Onebank UI', 'Onebank UI')}
			</label>
			<div class="relative rounded-md shadow-sm">
				<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
					<Icon icon="mdi:design" class="h-5 w-5 text-gray-400" />
				</div>
				<input
						type="text"
						id="onebankui"
						bind:value={onebankUI}
						class="block w-full rounded-md border-gray-300 pl-10 pr-10 text-sm focus:border-onebank-red focus:ring-onebank-red"
						placeholder={t('Enter onebank ip', 'Enter onebank ip')}
						required
				/>
			</div>
		</div>
	{/if}
	{#if error}
		<div class="rounded-md bg-red-50 p-3 flex items-start">
			<Icon icon="mdi:alert-circle" class="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
			<p class="ml-3 text-sm text-red-700">
				{error}
			</p>
		</div>
	{/if}
	<div>
		<button
				type="submit"
				disabled={isSubmitting}
				class="flex w-full items-center justify-center rounded-md bg-onebank-red px-4 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-onebank-dark-red focus:outline-none focus:ring-2 focus:ring-onebank-red focus:ring-offset-2 active:scale-95 disabled:cursor-not-allowed disabled:bg-onebank-red/60 disabled:active:scale-100 mobile:text-base"
		>
			{#if isSubmitting}
				<PrimaryLoadingSpinner/>
				<span class="ml-2">{t('Signing in...', 'ກຳລັງເຂົ້າສູ່ລະບົບ...')}</span>
			{:else}
				{t('Login', 'ເຂົ້າສູ່ລະບົບ')}
				<Icon icon="mdi:login" class="ml-2 h-5 w-5" />
			{/if}
		</button>
	</div>
</form>


<style>


</style>
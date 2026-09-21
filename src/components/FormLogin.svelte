<script lang="ts">
	/**
	 * Username and password login, against the mock backend's `USER/login`.
	 *
	 * Any non-empty pair is accepted — there is no core to check it against.
	 * The username is remembered for next time; the password never is: with no
	 * server to verify it, storing it would only teach the next reader of this
	 * file that storing passwords is fine.
	 */
	import {untrack} from 'svelte';
	import Icon from '@iconify/svelte';
	import {language} from '../stores/config';
	import {login} from '../lib/api/commands';
	import {completeLogin} from '../lib/session';
	import PrimaryLoadingSpinner from './PrimaryLoadingSpinner.svelte';

	let username = $state('');
	let password = $state('');
	let error = $state('');
	let showPassword = $state(false);
	let isSubmitting = $state(false);

	const UILanguage = $derived(parseInt($language));

	/** Reactive translation, as in Login.svelte — see the note there. */
	function t(en: string, la: string | null = null, cn: string | null = null, vn: string | null = null): string {
		if (UILanguage === 0) return en;
		else if (UILanguage === 1 && la) return la;
		else if (UILanguage === 3 && cn) return cn;
		else if (UILanguage === 2 && vn) return vn;
		else return en;
	}

	// Restoring the remembered username is a one-shot boot task.
	$effect(() => untrack(() => {
		try {
			username = localStorage.getItem('username') ?? '';
		} catch {
			username = '';
		}
	}));

	/**
	 * `isSubmitting` is cleared in `finally`, so a failed request can never
	 * leave the button stuck on "Signing in...".
	 */
	async function handleSubmit(): Promise<void> {
		if (isSubmitting) return;
		isSubmitting = true;
		error = '';
		try {
			const response = await login(username.trim(), password);
			if (response.result === 0 && response.data) {
				try {
					localStorage.setItem('username', username.trim());
				} catch {
					// Not remembered; nothing else depends on it.
				}
				completeLogin(response.data as any);
				return;
			}
			error = response.message || t('Incorrect username or password.', 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : t('Login failed. Please try again.', 'ເຂົ້າສູ່ລະບົບບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່.');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<!-- Runes mode has no event modifiers, so `|preventDefault` is done by hand. -->
<form onsubmit={(e) => { e.preventDefault(); void handleSubmit(); }} class="space-y-5 p-6">
	<div class="space-y-1">
		<label for="username" class="block text-sm font-medium text-gray-700">
			{t('Username', 'ຊື່ຜູ້ໃຊ້')}
		</label>
		<div class="relative">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				<Icon icon="mdi:account" class="h-5 w-5 text-gray-400"/>
			</div>
			<input
					type="text"
					id="username"
					autocomplete="username"
					bind:value={username}
					class="block w-full rounded-ob-sm border-gray-300 pl-10 text-sm focus:border-onebank-red focus:ring-onebank-red"
					placeholder={t('Enter your username', 'ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້')}
					required
			/>
		</div>
	</div>
	<div class="space-y-1">
		<label for="password" class="block text-sm font-medium text-gray-700">
			{t('Password', 'ລະຫັດຜ່ານ')}
		</label>
		<div class="relative">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				<Icon icon="mdi:lock" class="h-5 w-5 text-gray-400"/>
			</div>
			<input
					type={showPassword ? 'text' : 'password'}
					id="password"
					autocomplete="current-password"
					bind:value={password}
					class="block w-full rounded-ob-sm border-gray-300 pl-10 pr-10 text-sm focus:border-onebank-red focus:ring-onebank-red"
					placeholder={t('Enter your password', 'ກະລຸນາປ້ອນລະຫັດຜ່ານ')}
					required
			/>
			<button
					type="button"
					aria-label={t('Toggle password visibility', 'ສະແດງ/ເຊື່ອງລະຫັດຜ່ານ')}
					class="absolute inset-y-0 right-0 flex items-center pr-3"
					onclick={() => (showPassword = !showPassword)}
			>
				<Icon icon={showPassword ? 'mdi:eye-off' : 'mdi:eye'} class="h-5 w-5 text-gray-400 hover:text-gray-500"/>
			</button>
		</div>
	</div>
	<p class="text-xs text-gray-500">
		{t('Demo mode: any username and password will sign you in.', 'ໂໝດທົດລອງ: ປ້ອນຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານໃດກໍໄດ້ເພື່ອເຂົ້າສູ່ລະບົບ.')}
	</p>
	{#if error}
		<div class="flex items-start rounded-ob-sm bg-red-50 p-3" role="alert">
			<Icon icon="mdi:alert-circle" class="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400"/>
			<p class="ml-3 text-sm text-red-700">{error}</p>
		</div>
	{/if}
	<button
			type="submit"
			disabled={isSubmitting}
			class="flex w-full items-center justify-center rounded-ob-sm bg-onebank-red px-4 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-onebank-dark-red focus:outline-none focus:ring-2 focus:ring-onebank-red focus:ring-offset-2 active:scale-95 disabled:cursor-not-allowed disabled:bg-onebank-red/60 disabled:active:scale-100"
	>
		{#if isSubmitting}
			<PrimaryLoadingSpinner/>
			<span class="ml-2">{t('Signing in...', 'ກຳລັງເຂົ້າສູ່ລະບົບ...')}</span>
		{:else}
			{t('Login', 'ເຂົ້າສູ່ລະບົບ')}
			<Icon icon="mdi:login" class="ml-2 h-5 w-5"/>
		{/if}
	</button>
</form>

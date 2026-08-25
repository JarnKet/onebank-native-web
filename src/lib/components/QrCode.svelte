<script lang="ts">
  // @ts-expect-error - svelte-qrcode ships no types
  import QrCode from 'svelte-qrcode'

  interface Props {
    value?: string
    errorCorrection?: 'L' | 'M' | 'Q' | 'H'
    size?: number
    className?: string
  }

  let { value = '', errorCorrection = 'H', size = 200, className = '' }: Props = $props()
</script>

<QrCode {value} {errorCorrection} {className} size={size.toString()} padding={0} />

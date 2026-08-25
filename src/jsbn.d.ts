/**
 * `jsbn` ships no types and has no `@types/jsbn` on npm.
 *
 * Only the arbitrary-precision integer is used, and only through the handful of
 * methods `rsakey.ts` calls, so this declares that surface rather than pulling
 * in a full BigInteger definition for a library that has not changed since 2013.
 */
declare module 'jsbn' {
  export class BigInteger {
    constructor(value: string | number | number[], radix?: number | unknown, unused?: unknown)

    toString(radix?: number): string
    bitLength(): number
    compareTo(other: BigInteger): number
    subtract(other: BigInteger): BigInteger
    multiply(other: BigInteger): BigInteger
    mod(other: BigInteger): BigInteger
    modPow(exponent: BigInteger, modulus: BigInteger): BigInteger
    modInverse(modulus: BigInteger): BigInteger
    gcd(other: BigInteger): BigInteger
    isProbablePrime(certainty: number): boolean
  }

  const jsbn: { BigInteger: typeof BigInteger }
  export default jsbn
}

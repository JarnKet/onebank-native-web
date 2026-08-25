// @ts-nocheck
// Vendored third-party code. Not maintained here and excluded from typechecking;
// see tsconfig.json / the migration plan.
import jsbn from 'jsbn'
const BigInteger = jsbn.BigInteger;
type BigIntegerType = InstanceType<typeof BigInteger>;
const SecureRandom = jsbn.SecureRandom;

export default class RSAKey {
    // Annotated even though the file is `@ts-nocheck`: the suppression stops
    // errors being *reported* here, but the inferred types still leak out to
    // every consumer, and `= null` alone infers the type `null`.
    public n: BigIntegerType | null = null;
    public e = 0;
    public d: BigIntegerType | null = null;
    public p: BigIntegerType | null = null;
    public q: BigIntegerType | null = null;
    public dmp1: BigIntegerType | null = null;
    public dmq1: BigIntegerType | null = null;
    public coeff: BigIntegerType | null = null;

    // Depends on jsbn.js and rng.js
    // Version 1.1: support utf-8 encoding in pkcs1pad2

    // convert a (hex) string to a bignum object
    public parseBigInt(str, r) {
        return new BigInteger(str, r);
    }

    // PKCS#1 (type 2, random) pad input string s to n bytes, and return a bigint
    public pkcs1pad2(s, n) {
        if (n < s.length + 11) { // TODO: fix for utf-8
            alert("Message too long for RSA");
            return null;
        }
        var ba = [];
        var i = s.length - 1;
        while (i >= 0 && n > 0) {
            var c = s.charCodeAt(i--);
            if (c < 128) { // encode using utf-8
                ba[--n] = c;
            } else if ((c > 127) && (c < 2048)) {
                ba[--n] = (c & 63) | 128;
                ba[--n] = (c >> 6) | 192;
            } else {
                ba[--n] = (c & 63) | 128;
                ba[--n] = ((c >> 6) & 63) | 128;
                ba[--n] = (c >> 12) | 224;
            }
        }
        ba[--n] = 0;
        var rng = new SecureRandom();
        var x = [];
        while (n > 2) { // random non-zero pad
            x[0] = 0;
            while (x[0] === 0) rng.nextBytes(x);
            ba[--n] = x[0];
        }
        ba[--n] = 2;
        ba[--n] = 0;
        return new BigInteger(ba);
    }

    public pkcs1pad2raw(bigint, n) {
        var b = bigint.toByteArray();
        if (n < b.length + 11) {
            alert("Message too long for RSA");
            return null;
        }
        var ba = [];
        var i = b.length - 1;
        while (i >= 0 && n > 0) {
            ba[--n] = b[i--];
        }
        ba[--n] = 0;
        var rng = new SecureRandom();
        var x = [];
        while (n > 2) { // random non-zero pad
            x[0] = 0;
            while (x[0] === 0) rng.nextBytes(x);
            ba[--n] = x[0];
        }
        ba[--n] = 2;
        ba[--n] = 0;
        return new BigInteger(ba);
    }

    // Set the public key fields N and e from hex strings
    public setPublic(N, E) {
        if (N != null && E != null && N.length > 0 && E.length > 0) {
            this.n = this.parseBigInt(N, 16);
            this.e = parseInt(E, 16);
        } else
            alert("Invalid RSA public key");
    }

    // Perform raw public operation on "x": return x^e (mod n)
    public doPublic(x) {
        return x.modPowInt(this.e, this.n);
    }

    // Return the PKCS#1 RSA encryption of "text" as an even-length hex string
    public encrypt(text) {
        var m = this.pkcs1pad2(text, (this.n.bitLength() + 7) >> 3);
        if (m == null) return null;
        var c = this.doPublic(m);
        if (c == null) return null;
        var h = c.toString(16);
        if ((h.length & 1) == 0) return h; else return "0" + h;
    }

    public encryptRaw(bigint) {
        var m = this.pkcs1pad2raw(bigint, (this.n.bitLength() + 7) >> 3);
        if (m == null) return null;
        var c = this.doPublic(m);
        if (c == null) return null;
        var h = c.toString(16);
        if ((h.length & 1) == 0) return h; else return "0" + h;
    }


    // Depends on rsa.ts and jsbn2.js
    // Version 1.1: support utf-8 decoding in pkcs1unpad2

    // Undo PKCS#1 (type 2, random) padding and, if valid, return the plaintext
    // todo: bug appending extra byte '00' sometimes
    public pkcs1unpad2(d, n) {
        var b = d.toByteArray();
        var i = 0;
        while (i < b.length && b[i] == 0) ++i;
        if (b.length - i != n - 1 || b[i] != 2)
            return null;
        ++i;
        while (b[i] != 0)
            if (++i >= b.length) return null;

        var ret = "";
        while (++i < b.length) {
            var c = b[i] & 255;

            if (c < 0x10) ret += "0";
            ret += c.toString(16);
        }

        console.log(ret);

        /* todo: proxy fix, cut the first 2 chars if they are '00'; the real fix it to prevent it from having first two as '00' */
        if (ret.substring(0, 2) === '00') {
            ret = ret.slice(2);
        }

        return ret;
    }

    // Set the private key fields N, e, and d from hex strings
    public setPrivate(N, E, D) {
        if (N != null && E != null && N.length > 0 && E.length > 0) {
            this.n = this.parseBigInt(N, 16);
            this.e = parseInt(E, 16);
            this.d = this.parseBigInt(D, 16);
        } else
            console.log("Invalid RSA private key");
    }

    // Set the private key fields N, e, d and CRT params from hex strings
    public setPrivateEx(N, E, D, P, Q, DP, DQ, C) {
        if (N != null && E != null && N.length > 0 && E.length > 0) {
            this.n = this.parseBigInt(N, 16);
            this.e = parseInt(E, 16);
            this.d = this.parseBigInt(D, 16);
            this.p = this.parseBigInt(P, 16);
            this.q = this.parseBigInt(Q, 16);
            this.dmp1 = this.parseBigInt(DP, 16);
            this.dmq1 = this.parseBigInt(DQ, 16);
            this.coeff = this.parseBigInt(C, 16);
        } else
            console.log("Invalid RSA private key");
    }

    // Generate a new random private key B bits long, using public expt E
    public generate(B, E) {
        var rng = new SecureRandom();
        var qs = B >> 1;
        this.e = parseInt(E, 16);
        var ee = new BigInteger(E, 16);
        for (; ;) {
            for (; ;) {
                this.p = new BigInteger(B - qs, 1, rng);
                if (this.p.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) == 0 && this.p.isProbablePrime(10)) break;
            }
            for (; ;) {
                this.q = new BigInteger(qs, 1, rng);
                if (this.q.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) == 0 && this.q.isProbablePrime(10)) break;
            }
            if (this.p.compareTo(this.q) <= 0) {
                var t = this.p;
                this.p = this.q;
                this.q = t;
            }
            var p1 = this.p.subtract(BigInteger.ONE);
            var q1 = this.q.subtract(BigInteger.ONE);
            var phi = p1.multiply(q1);
            if (phi.gcd(ee).compareTo(BigInteger.ONE) == 0) {
                this.n = this.p.multiply(this.q);
                this.d = ee.modInverse(phi);
                this.dmp1 = this.d.mod(p1);
                this.dmq1 = this.d.mod(q1);
                this.coeff = this.q.modInverse(this.p);
                break;
            }
        }
    }

    // Perform raw private operation on "x": return x^d (mod n)
    public doPrivate(x) {
        if (this.p == null || this.q == null)
            return x.modPow(this.d, this.n);

        // TODO: re-calculate any missing CRT params
        var xp = x.mod(this.p).modPow(this.dmp1, this.p);
        var xq = x.mod(this.q).modPow(this.dmq1, this.q);

        while (xp.compareTo(xq) < 0)
            xp = xp.add(this.p);
        return xp.subtract(xq).multiply(this.coeff).mod(this.p).multiply(this.q).add(xq);
    }

    // Return the PKCS#1 RSA decryption of "ctext".
    // "ctext" is an even-length hex string and the output is a plain string.
    public decrypt(ctext) {
        var c = this.parseBigInt(ctext, 16);
        var m = this.doPrivate(c);
        if (m == null) return null;
        return this.pkcs1unpad2(m, (this.n.bitLength() + 7) >> 3);
    }


}

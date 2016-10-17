---
layout: post
title:  "Crypto in .NET Core"
date:   2016-10-17 10:30:00 -0400
categories: Security
---

The .NET Framework "Core" has been out for a while now. I spent some time
getting my bearings in order and getting a handle on where some things moved
around.

This post is specifically covering the cross-platform .NET Core. If you're
still using the .NET Framework on Windows, then nothing has really changed for
you.

First I want to point out that support for cryptographic primitives is *pretty
good*, all things considered. It's much richer than I would have expected.


# Factory Methods

In the Desktop .NET Framework, you had potentially a few different
implementations of the same primitive function. Consider the SHA1 hash
algorithm. In the .NET Framework, you had `SHA1Managed`,
`SHA1CryptoServiceProvider`, and `SHA1Cng`. All of these do SHA1, they just
do it differently. `SHA1Managed` was a pure, managed code implementation of
SHA1. It's useful in some situations, such as Medium Trust, but is generally
slower. `SHA1CryptoServiceProvider` uses the now-legacy CAPI implementation in
Windows, and `SHA1Cng` uses CAPI's successor, CNG.

Crutially, each primitive shares a common base. The examples above all inherit
from the abstract class [`SHA1`][1]. These abstract classes provide a static
method called `Create` which act as factory method. `Create` on `SHA1` has a
return type of `SHA1`.

In the .NET Core, things are much different. These specific implementations,
such as `SHA1CryptoServiceProvider`, are now gone. Instead, using `SHA1.Create`
is the *only* way to create an object that does the SHA1 primitive. So your
previous code that might have looked like this:

```csharp
using (var sha1 = new SHA1Managed()) {
    //SHA1...
}
```

Should now look like this:

```csharp
using (var sha1 = SHA1.Create()) {
    //SHA1...
}
```

If you were already using the factory methods, then moving to .NET Core will
be even easier.

Under the covers, much of the cryptographic primitives in .NET Core are either
implemented with a combination of CAPI+CNG, and OpenSSL on *nix and macOS.
The factory methods should always be used, when possible. These will always do
the right thing for the right platform.

These factory methods exist for all hash primitives, such as SHA256, AES,
and HMAC functions. This is also true for ECDSA, and `RandomNumberGenerator`.

The last bears having its own example, since it tends to be one of the ones people
run in to the most. If you are using `RNGCryptoServiceProvider`, replace it with
`RandomNumberGenerator.Create()`:

```csharp
using (var rng = RandomNumberGenerator.Create()) {
    //Use like RNGCryptoServiceProvider
}
```

Not everything uses a factory method. Some classes like `Rfc2898DeriveBytes`
you should continue to use as you always have, and have been modified to work on
all platforms.


# ECC Keys

One of the things missing from .NET Core right now is an easy wait to work with
ECC keys. In the desktop .NET Framework, `CngKey` is available for loading a
persisted key from a KSP (like an HSM). .NET Core expected you to work with
ECC keys mostly in conjunction with an algorithm, like ECDSA. If the private key
belonging to the certificate happens to be on an HSM - it will work - but there
is no clean platform-agnostic API to load a key, either from an HSM or from
a PKCS8 file. You can load a private key from a PKCS12 file along with a
certificate.

If you really need to work with keys directly, you can continue to use `CngKey`.
Even though `CngKey` is Windows-specific, it appears in the netstandard
contracts. It does not appear that there is a OpenSSL equivalent of EVP keys.

# Missing things

Some things are missing, and many of them I would say "good riddance" to. Some
are also missing but will likely appear in a later update to .NET Core.

## DSA

The finite-field implementation of DSA (non-ECC), is gone. DSA should largely
only be used for interoping with existing legacy systems, but .NET Core does not
have it. This algorithm will make a come-back in a later verison of .NET Core,
it would seem.

## ECDH

EC Diffie-Hellman is missing. I would say very few people need to do a
key-exchange themselves, so not many should miss it. However again I have been
told this will return in a later update to .NET Core.

## Miscellaneous

A smattering of other algorithms that shouldn't be used are gone as well:

* RIPEMD160 is gone. 
* `RijndaelManaged` is not in the contract anymore. Use `Aes` instead. The
*only* time `RijndaelManaged` should be used is when you need to interop with
data that uses a non-standard AES block size, which is very unlikely.
* DES is gone. DES3 remains.
* MACTripleDES is gone.
* PBKDFv1 is gone, which came in the form `PasswordDeriveBytes`. PBKDFv2 remains
in the form of `Rfc2898DeriveBytes`. `PasswordDeriveBytes`
[may make a return][2].
* Some modes of block cipher encryption are gone. `ECB`, `CBC`, and `CTS` are
all that is supported. The others were more exotic and unlikely to be used.

# New things

Named elliptic curves are now supported, and work cross platform. This currently
is limited to named curves, such as brainpool. Even more interestingly, it looks
like support for other curves **might** be coming, such as Edwards and
Montgomery curves. This would enable x25519 (once ECDH returns) and EdDSA. These
are not supported yet, but clues of their arrival appear in the `ECCurveType`
enumeration.



[1]: https://msdn.microsoft.com/en-us/library/system.security.cryptography.sha1(v=vs.110).aspx 
[2]: https://github.com/dotnet/corefx/issues/11118
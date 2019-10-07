---
layout: post
title: "Import and Export RSA Key Formats in .NET Core 3"
date:   2019-10-07 16:24:00 -0400
categories: General
excerpt: >
  .NET Core 3 has new APIs for importing keys in different formats,
  let's look at the difference.
---

.NET Core 3.0 introduced over a dozen new APIs for importing and exporting RSA
keys in different formats. Many of them are variant of another with a slightly
different API, but they are extremely useful for working with private and public
keys from other systems that work with encoding keys.

RSA keys can be encoded in a variety of different ways, depending on if the key
is public or private or protected with a password. Different programs will
import or export RSA keys in a different format, etc.

Often times RSA keys can be described as "PEM" encoded, but that is already
ambiguous as to how the key is actually encoded. PEM takes the form of:

```
-----BEGIN LABEL-----
content
-----END LABEL-----
```

The content between the labels is base64 encoded. The one that is
probably the most often seen is BEGIN RSA PRIVATE KEY, which is frequently used
in web servers like nginx, apache, etc:

```
-----BEGIN RSA PRIVATE KEY-----
MII...
-----END RSA PRIVATE KEY-----
```

The base64-encoded text is an RSAPrivateKey from the [PKCS#1 spec][1], which is
just an ASN.1 SEQUENCE of integers that make up the RSA key. The corresponding
.NET Core 3 API for this is `ImportRSAPrivateKey`, or one of its overloads.
If your key is "PEM" encoded, you need to find the base64 text between the label
BEGIN and END headers, base64 decode it, and pass to `ImportRSAPrivateKey`.
There is currently an [API proposal][2] to make reading PEM files easier.
If your private key is DER encoded, then that just means you can read the
content directly as bytes in to `ImportRSAPrivateKey`.

Here is an example:

```csharp
var privateKey = "MII..."; //Get just the base64 content.
var privateKeyBytes = Convert.FromBase64String(privateKey);
using var rsa = RSA.Create();
rsa.ImportRSAPrivateKey(privateKeyBytes, out _);
```

When using openssl, the `openssl rsa` commands typically output RSAPrivateKey
PKCS#1 private keys, for example `openssl genrsa`.

A different format for a private key is PKCS#8. Unlike the RSAPrivateKey from
PKCS#1, a PKCS#8 encoded key can represent other kinds of keys than RSA. As
such, the PEM label for a PKCS#8 key is "BEGIN PRIVATE KEY" (note the lack of
"RSA" there). The key itself contains an AlgorithmIdentifer of what kind of key
it is.

PKCS#8 keys can also be encrypted protected, too. In that case, the PEM
label will be "BEGIN ENCRYPTED PRIVATE KEY".

.NET Core 3 has APIs for both of these. Unencrypted PKCS#8 keys can be imported
with `ImportPkcs8PrivateKey`, and encrypted PKCS#8 keys can be imported with
`ImportEncryptedPkcs8PrivateKey`. Their usage is similar to `ImportRSAPrivateKey`.

Public keys have similar behavior. A PEM encoded key that has the label
"BEGIN RSA PUBLIC KEY" should use `ImportRSAPublicKey`. Also like private keys,
the public key has a format that self-describes the algorithm of the key called
a Subject Public Key Info (SPKI) which is used heavily in X509 and many other
standards. The PEM header for this is "BEGIN PUBLIC KEY", and
`ImportSubjectPublicKeyInfo` is the correct way to import these.

All of these APIs have export versions of themselves as well, so if you are
trying to export a key from .NET Core 3 to a particular format, you'll need to
use the correct export API.

To summarize each PEM label and API pairing:

1. "BEGIN RSA PRIVATE KEY" => [`RSA.ImportRSAPrivateKey`][3]
2. "BEGIN PRIVATE KEY" => [`RSA.ImportPkcs8PrivateKey`][4]
3. "BEGIN ENCRYPTED PRIVATE KEY" => [`RSA.ImportEncryptedPkcs8PrivateKey`][7]
4. "BEGIN RSA PUBLIC KEY" => [`RSA.ImportRSAPublicKey`][5]
5. "BEGIN PUBLIC KEY" => [`RSA.ImportSubjectPublicKeyInfo`][6]


One gotcha with openssl is to pay attention to the output of the key format.
A common enough task from openssl is "Given this PEM-encoded RSA private key, give
me a PEM encoded public-key" and is often enough done like this:

```shell
openssl rsa -in key.pem -pubout
```

Even if key.pem is a PKCS#1 RSAPrivateKey ("BEGIN RSA PRIVATE KEY"), the `-pubout`
option will output a SPKI ("BEGIN PUBLIC KEY"), not an RSAPublicKey
("BEGIN RSA PUBLIC KEY"). For that, you would need to use `-RSAPublicKey_out`
instead of `-pubout`. The openssl `pkey` commands will also typically give you
PKCS#8 or SPKI formatted keys.

[1]: https://tools.ietf.org/html/rfc3447#appendix-A.1.2
[2]: https://github.com/dotnet/corefx/issues/37748
[3]: https://docs.microsoft.com/en-us/dotnet/api/system.security.cryptography.rsa.importrsaprivatekey?view=netcore-3.0
[4]: https://docs.microsoft.com/en-us/dotnet/api/system.security.cryptography.rsa.importpkcs8privatekey?view=netcore-3.0
[5]: https://docs.microsoft.com/en-us/dotnet/api/system.security.cryptography.rsa.importrsapublickey?view=netcore-3.0
[6]: https://docs.microsoft.com/en-us/dotnet/api/system.security.cryptography.rsa.importsubjectpublickeyinfo?view=netcore-3.0
[7]: https://docs.microsoft.com/en-us/dotnet/api/system.security.cryptography.rsa.importencryptedpkcs8privatekey?view=netcore-3.0
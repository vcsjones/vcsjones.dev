---
layout: post
title: "Sometimes valid RSA signatures in .NET"
date:   2019-07-18 13:27:00 -0400
categories: General
excerpt: >
  A curious case of RSA signatures that .NET and Windows may consider valid
  and other platforms do not.
---

One of the nice things about .NET Core being open source is following along with
some of the issues that people report. I tend to keep an eye on System.Security
tagged issues, since those tend to be at the intersection of things that
interest me and things I can maybe help with.

A user [filed an issue][1] where .NET Framework considered a CMS valid, and .NET
Core did not. This didn't entirely surprise me. In the .NET Framework, the
`SignedCms` class is heavily backed by Windows' handling of CMS/PKCS#7. In .NET
Core, the implementation is managed (sans the cryptography). The managed
implementation adheres somewhat strictly to the CMS specification. As other issues
have noticed, Windows', thus .NET Framework's, implementation was a little more
relaxed in some ways.

This turned out not to be one of those cases. The CMS part was actually working
just fine. What was failing was RSA itself. The core of the issue was that
different implementations of RSA disagreed on the RSA signature's validity.

That seems pretty strange!

When I talk about different implementations on Windows, I am usually referring
to CAPI vs CNG, or `RSACryptoServiceProvider` and `RSACng`, respectively. For
now, I'm keeping this post to the .NET Framework. We'll bring .NET Core in to
the discussion later.

There are two implementations because, well, Windows has two of them. CNG, or
"Cryptography API: Next Generation" is the newer of the two and is intended to
be future of cryptographic primitives on Windows. It shipped in Windows Vista,
and offers functionality that CAPI cannot do. An example of that is PSS RSA
signatures.

.NET Framework exposes these implementations as `RSACryptoServiceProvider` and
`RSACng`. They _should_ be interchangable, and CNG implementations should be
used going forward. However, there is one corner case where the old, CAPI
implementation considers a signature valid while the CNG one does not.

The issue can be demonstrated like so:

```csharp
byte[] n = new byte[] { ... };
byte[] e = new byte[] { ... };
byte[] signature = new byte[] { ... };
var digest = new byte[] {
    0x68, 0xB4, 0xF9, 0x26, 0x34, 0x31, 0x25, 0xDD,
    0x26, 0x50, 0x13, 0x68, 0xC1, 0x99, 0x26, 0x71,
    0x19, 0xA2, 0xDE, 0x81, 
};
using (var rsa = new RSACng())
{
    rsa.ImportParameters(new RSAParameters {
        Modulus = n,
        Exponent = e
    });
    var valid = rsa.VerifyHash(digest, signature, HashAlgorithmName.SHA1,
                               RSASignaturePadding.Pkcs1);
    Console.WriteLine(valid);
}
using (var rsa = new RSACryptoServiceProvider())
{
    rsa.ImportParameters(new RSAParameters {
        Modulus = n,
        Exponent = e
    });
    var valid = rsa.VerifyHash(digest, signature, HashAlgorithmName.SHA1,
                               RSASignaturePadding.Pkcs1);
    Console.WriteLine(valid);
}
```

<aside>
<p>Note: to avoid bloating this blog post with large signatures and RSA
keys, I omitted them. However the full example with public keys is available
<a href="https://gist.github.com/vcsjones/ab4c2327b53ed018eada76b75ef4fd99">
on GitHub here</a>.
</p>
</aside>

When used with one of the curious signatures that exhibits this behavior, such
as the one in the GitHub link, the first result will be false, and the second
will be true.

Nothing jumped out at me as being problematic. The signature padding is PKCS,
the public exponent is the very typical 67,537, and the RSA key is sensible in
size.

To make it stranger, this signature came off the timestamp of Firefox's own
signed installer. So why are the results different?

Jeremy Barton from Microsoft on .NET Core made the observation that the padding
in the RSA signature itself is incorrect, but in a way that CAPI tollerates and
CNG does not, at least by default. Let's look at the raw signature. To do that,
we need the public key and signature on disk, and we can poke at them with OpenSSL.

Using the command:

```shell
openssl rsautl -verify -in sig.bin -inkey key.der \
    -pubin -hexdump -raw -keyform der
```

We get the following output:

<pre>
0000 - 00 01 ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0010 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0020 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0030 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0040 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0050 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0060 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0070 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0080 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0090 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
00a0 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
00b0 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
00c0 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
00d0 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
00e0 - ff ff ff ff ff ff ff ff-ff ff ff 00 68 b4 f9 26
00f0 - 34 31 25 dd 26 50 13 68-c1 99 26 71 19 a2 de 81
</pre>

This is a PKCS#1 v1.5 padded signature, as indicated by by starting with 00 01.
The digest at the end can be seen, `68 b4 f9 26 ... 19 a2 de 81` which matches
the digest above, so we know that the signature is for the right digest.

What is not correct in this signature is how the digest is encoded. The signature
contains the bare digest. It _should_ be encoded as an ASN.1 sequence along
with the AlgorithmIdentifer of the digest:

```
DigestInfo ::= SEQUENCE {
	digestAlgorithm AlgorithmIdentifier,
	digest OCTET STRING
}
```

This goes back all the way to [a document][2] (warning: link is to an ftp:// site)
written in 1993 by RSA labratories explaining how PKCS#1 v1.5 works,and was
standardized in to [an RFC][3] in 1998.

The RSA signature we have only contains the raw digest. It is not part of a
`DigestInfo`. If the digest were properly encoded, it would look something like
this:

<pre>
0000 - 00 01 ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0010 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0020 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0030 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0040 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0050 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0060 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0070 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0080 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
0090 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
00a0 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
00b0 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
00c0 - ff ff ff ff ff ff ff ff-ff ff ff ff ff ff ff ff
00d0 - ff ff ff ff ff ff ff ff-ff ff ff ff 00 30 21 30
00e0 - 09 06 05 2b 0e 03 02 1a-05 00 04 14 68 b4 f9 26
00f0 - 34 31 25 dd 26 50 13 68-c1 99 26 71 19 a2 de 81
</pre>

The signature now includes `DigestInfo` along with the OID 1.3.14.3.2.26 to
indicate that the digest is SHA1.

At this point we know what the difference is, and the original specification in
part 10.1.2 makes it fairly clear that the "data" should be a digest and should
be encoded as DigestInfo, not a bare digest.

<p>The source of this signature is from Verisign's timestamp authority at
http://timestamp.verisign.com/&#x200B;scripts/&#x200B;timstamp.dll. After checking with
someone at DigiCert (now running this TSA), it was launched in May 1995.</p>

I suspect that the TSA is old enough that the implementation was made before the
specification was complete or simply got the specification wrong and no one
noticed. Bringing this back to CNG and CAPI, CNG can validate this signatures, but you
must explicitly tell CNG that the signature does not have an object identifier.
[`BCRYPT_PKCS1_PADDING_INFO`'s][4] documentation has the detail there, but gist
of it is

>If there is no OID in the signature, then verification fails unless this
>member is NULL.

This would be used with `{B,N}CryptVerifySignature`. To bring this back around
to the .NET Framework, how do we use `RSACng` and give `null` in for the
padding algorithm? The short answer is: you cannot. If you try, you will get
an explicit `ArgumentException` saying that the hash algorithm name cannot be
null.

For .NET Framework, this solution "keep using `RSACryptoServiceProvider`". If
you need to validate these signatures, chances are you do not need to use CNG's
newer capabilities like PSS since these malformed signatures appear to be coming
from old systems. Higher level things like `SignedCms` and `SignedXml` use
`RSACryptoServiceProvider` by default, so they will continue to work.

To bring in .NET Core, the situation is a little more difficult. If you are
using `SignedCms` like so:

```csharp
var signedCms = new SignedCms();
signedCms.Decode(File.ReadAllBytes("cms-with-sig.bin"));
signedCms.CheckSignature(true);
```

This will start throwing when you migrate to .NET Core. .NET Core will use CNG
when run on Windows to validate RSA signatures for `SignedCms` and `SignedXml`.
This is currently not configurable, either. When used with `SignedCms`, it
ultimately calls the `X509Certificate2.GetRSAPublicKey()` extension method,
and that will [always][5] return an implementation based on CNG.

If you are using `SignedCms` on .NET Core and need to validate a CMS that is
signed with these problematic signatures, you are currently out of luck using
in-the-box components. As far as other platforms go, both macOS and Linux
environments for .NET Core will agree with CNG - that the signature is invalid.

The good news is, these signatures are not easy to come by. So far, only the
old Verisign timestamp authority is known to have produced signatures like this.


[1]: https://github.com/dotnet/corefx/issues/34202
[2]: ftp://ftp.rsasecurity.com/pub/pkcs/ascii/pkcs-1.asc
[3]: https://tools.ietf.org/html/rfc2313
[4]: https://docs.microsoft.com/en-us/windows/win32/api/bcrypt/ns-bcrypt-_bcrypt_pkcs1_padding_info
[5]: https://github.com/dotnet/corefx/blob/b26339b6f6c7537875c70b5f3c8af376d0bbded5/src/System.Security.Cryptography.X509Certificates/src/Internal/Cryptography/Pal.Windows/X509Pal.PublicKey.cs#L43

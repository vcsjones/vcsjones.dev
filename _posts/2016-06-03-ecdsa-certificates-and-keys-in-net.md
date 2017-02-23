---
layout: post
title:  "ECDSA Certificates and Keys in .NET"
date:   2016-06-03 12:30:00 -0400
categories: Security
---

It's not uncommon to need to sign something with the private key of a certificate.
If you're using RSA or DSA certificates, that's been a fairly straight forward
process with the .NET Framework. If your certificate was an ECDSA certificate,
this was not a straight forward process. You often had to fall back to p/invoke
using `CryptAquireCertificatePrivateKey` to obtain an NCrypt CNG key handle.

In the .NET Framework 4.6, this got a whole lot easier with the extension method
`GetECDsaPrivateKey`.

I did run in to a problem with it though. I was getting an exception:

>System.ArgumentException: Keys used with ECDsaCng algorithm must have an algorithm
group of ECDsa.

I did a lot of double checking of the certificate, yes the certificate had an ECC
key in it and the algorithm parameters explicitly defined the P256 curve for ECDSA.
What gives?

I decided to fall back to old tricks and use `CryptAquireCertificatePrivateKey`
to create an instance of `CngKey`, which then I would pass to `ECDsaCng` so I
could sign something.

This, also, failed when passing the `CngKey` to the constructor of `ECDsaCng`.

Upon examining the `CngKey` instance itself, CNG believed the key was ECDH, not
ECDSA. This was getting bizarre. Strangely enough, I had another certificate
where this worked perfectly fine and CNG was happy to announce that the algorithm
was ECDSA.

ECDH and ECDSA keys are interchangeable. You probably shouldn't use the same key
as a key agreement (ECDH) and signing (ECDSA), but ultimately they are just
points on a curve. Yet somehow, CNG was making a distinction.

We can throw out the certificate itself being the source of the problem. If I
opened the private key by name, it still believed the key was for ECDH. Clearly,
this was an issue with the private key itself, not the certificate.

The cause of all of this mess turned out to be how the CNG's key usage gets set.
Every CNG key has a "key usage" property. For an ECC key, if the key is capable
of doing key agreement, CNG decides that the key is ECDH, even though the key
is also perfectly valid for signing and verifying.

Now the question is, how do we set the key usage? Key usage needs to be set
before the key is finalized, which means during creation. It cannot be changed
once `NCryptFinalizeKey` has been called on the key.

My certificate and private key were imported as a PKCS#12 (.pfx) file through
the install wizard. It's during this process that the key's usage is getting
set.

After a bit of trial and error, I determined that setting the keyUsage extension
on the certificate does not matter. That is, if the keyUsage extension was marked
critical as set to signature (80), the CNG key would still get imported as
AllUsages.

Eventually, a lightbulb came on and I examined the PKCS#12 file itself. It turns
out that the PKCS#12 file was controlling how the private key's usage
was being set.

A PKCS#12 file contains a number of things, one of them is a "key attributes"
property. If you use OpenSSL to create a PKCS#12 file from a certificate and
private key, OpenSSL won't set the key attributes to anything by default. If you
create the PKCS#12 file with the `-keysig` option then the import wizard will
correctly set the key's usage. If you create the PKCS#12 file with Windows, then
Windows will preserve the key usage during export when creating a PKCS#12 file.

Let's sum up:

If you have an ECDSA certificate and private key and you create a PKCS#12 file
using OpenSSL, it will not set the key attributes unless you specify the `-keysig`
option. So to fix this problem, re-create the PKCS#12 file from OpenSSL with the
correct options.

Alternatively, you can wait for the .NET Framework 4.6.2. In this version of the
framework, the `ECDsaCng` class is happy to use a ECDH key if it can. This is
also the only option you have if you really do want to have a key's usage set
to 'AllUsages'. 
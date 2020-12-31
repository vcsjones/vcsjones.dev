---
layout: post
title:  "FiddlerCertGen, a certificate generator for Fiddler"
date:   2015-09-15 12:00:00 -0400
categories: General
---

Eric Lawrence wrote a [pretty interesting post][1] on how Fiddler intercepts
HTTPS traffic. Essentially, it generates a root x509 certificate and asks the
user to trust it, then generates end-entity certificates on-the-fly for each
domain visited with the root as the signer. One bit caught my interest especially:

>If you're so inclined, you can even write your own certificate generator
(say, by wrapping OpenSSL) and expose it to Fiddler using the
`ICertificateProvider3` interface.

In my ever [expanding interest][2] in writing extensions for Fiddler, I decided this
would be something fun to try, especially because I've written such code in the
past. It should have been easy to just take that code and fit it to the
interface.

The result of that is a GitHub project called [FiddlerCertGen][3]. It provides a
few advantages over the built in ones that Fiddler provides.

For Windows Vista (and Server 2008) and later, it uses Microsoft's CNG API
(Cryptographic Next Generation) instead of CAPI. CNG offers some benefits, such
as being able to use elliptic curve cryptography. In fact, for Vista+, the
project will use ECDSA 256-bit keys. The key generation here is slightly faster
than that of RSAs, so it may offer a slight bump in performance from Fiddler
having to generate RSA keys. For Windows XP and Windows Server 2003, it will
fall back to RSA 2048.

It's fairly easy to change this, if you want. The static constructor for for
the `FiddlerCertificate` class initializes the configuration:

```csharp
_algorithm = PlatformSupport.HasCngSupport ? Algorithm.ECDSA256 : Algorithm.RSA;
_keyProviderEngine = PlatformSupport.HasCngSupport ? KeyProviders.CNG : KeyProviders.CAPI;
_signatureAlgorithm = HashAlgorithm.SHA256;
```

You can use RSA keys with CNG – in fact if you are on Windows Vista or greater
I'd recommend using CNG no-matter-what. What you cannot do is use ECDSA with
CAPI. The signature algorithm is set to SHA256 by default, however if for
whatever reason you need to test something on Windows XP pre-service pack 2,
then you can set it to SHA1; or you can set it to SHA384.

The only compatibility thing to keep in mind is that some browsers do not
support end-entity certificates that are ECC 384 keys. Root / intermediates are
fine, but end-entities of this key length don't work. A particular one with that
behavior is Safari (both desktop and mobile).

The extension is broken down into two projects, a core .NET 2.0 project that
does the bulk of the certificate generation, and a .NET 4.0 one that implements
the Fiddler interface. If you are using Fiddler 2, you should be able to change
the Framework Target for the .NET 4.0 one to 2.0 and it will work fine. Just
remove the Fiddler reference and add the one for the .NET 2.0 Fiddler.

The GitHub repository's README contains installation instructions.

[1]: https://www.telerik.com/blogs/understanding-fiddler-certificate-generators
[2]: /a-certificate-inspector-for-fiddler/
[3]: https://github.com/vcsjones/FiddlerCertGen
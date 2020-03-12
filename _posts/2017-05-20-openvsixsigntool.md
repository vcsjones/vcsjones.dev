---
layout: post
title:  "OpenVsixSignTool"
date:   2017-05-20 20:00:00 -0400
categories: Security
---

I recently started a little tool called [OpenVsixSignTool][1], which is an open
source implementation of signing a VSIX package. If that sounds boring to you,
I agree! It has a niche audience, considering that Microsoft already makes a
tool for signing VSIX packages, which are extensions for Visual Studio.
Why an OSS version of it?

The idea came from [Claire Novotny][2], so kudos to her for wanting to make signing
VSIX packages better. Claire encountered some limitations of the existing sign
tool, and implementing a new one from scratch wasn't an entirely crazy idea.

The limitation came down to where the existing VsixSignTool was willing to look
for a certificate and private key to sign with. The Microsoft VsixSignTool
requires PFX file with the public and private key to sign, or a certificate in a
P7B file with the certificate and private key in the certificate store.

Ideally, it could do a few new things. The first is have the same behavior as
the Authenticode `signtool` where it takes a simple SHA1 thumbprint of the
certificate to sign with and finds it in the certificate store.
No more P7B file. The second is an entirely new idea, which is to use Azure Key
Vault. Azure Key Vault supports certificates and keeping the private key in an
HSM, which OpenVisxSignTool does support.

It's still being built, but the rough functionality is there. If signing VSIX
packages is something you want to do, give it a try and let me know how it can
be better.

[1]: https://github.com/vcsjones/OpenVsixSignTool
[2]: https://twitter.com/clairernovotny/
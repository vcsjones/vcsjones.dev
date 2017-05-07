---
layout: post
title:  "Custom Keys with Authenticode Signing"
date:   2017-05-07 10:00:00 -0400
categories: Security
---

The only official way to Authenticode sign a file on Windows is using the
very flexible "signtool" as part of the Windows SDK. Signtool is capable of
signing a variety of things, such as portable executables, MSIs, etc with a
variety of different digest algorithms, timestamps, and the like.

One area of signtool that has not been flexible is where it looks for the
private key to perform the signature. If the private key was not associated to
a certificate in the certificate store, signtool would be unable to use this.

This meant that the private key needed support from CAPI or CNG. If the private
key was not reachable through a CSP or CNG Store Provider, then sign tool would
not be able to use the key. For the most part, this was OK. Most SmartCard and
HSM vendors provide a CSP and/or CNG Provider, so signtool worked fine.

Sometimes though, a CNG or CSP provider is not available. A practical case for
this is Azure Key Vault. In this situation, using signtool was not possible,
until recently.

Starting in the Windows 10 SDK, two new command line switches are available,
`dg` and `di`. Recall that a signature is always performed on a *hash* on
Authenticode. The `dg` option changes signtool's behavior to output a digest
that you can sign using anything you'd like. Let's try this on a copy of
notepad.exe.

```shell
signtool sign /dg "C:\scratch\dir" /fd SHA256 /f public-cert.cer notepad.exe
```

This takes a file to a *public* certificate - there is no key in
public-cert.cer. You could also use the `/sha1` option to specify a certificate
in the certificate store that also has only a public key. This will output a few
files in the "C:\scratch\dir" directory. The digest is the one with the ".dig"
extension. This file will have the Base64 encoded digest to sign. Next, using
your custom tool, sign the digest with the private key for the certificate.

This file should be placed in the "C:\scratch\dir" directory with the same name
as the digest file, with the "signed" extension. For example,
"notepad.exe.dig.signed".

The next step is to ingest the signed digest along with the rest of the
Authenticode signature to complete the signing.

```shell
signtool sign /di "C:\scratch\dir" notepad.exe
```

This will complete the signing process, and we now have our own signed copy of
notepad.exe. Appending a signature is done just as before, except with the `/as`
flag.

This provides great flexibility for signers to use non CSP / CNG signing
options, or offloading the signing process. Signtool can now also sign just
a plain digest file using the `/ds` option. If you have a dedicated server for
performing Authenticode signing, you can now use the `/dg`, `/ds`, `/di` options
so that only a very small file needs to be moved to the signing server, instead
of the entirely binary if they are large in size.
---
layout: post
title:  "Authenticode and ECC"
date:   2016-10-13 9:30:00 -0400
categories: Security
---

While HTTPS / TLS have been making great strides in adopting new cryptographic
primitives, such as CHACHA, x25519, and ECC, another place has remained
relatively stagnant: binary signing.

While many platforms deal with binary signing, I deal the most with,
Authenticode which is part of the operating system. I thought it would be an
interesting experiment to sign a few things with an ECDSA certificate and
release them in to the wild.

First I needed to find a CA willing to give me an ECDSA Authenticode
certificate. DigiCert was happy to do so, and they offered it to me for no
charge as part of their Microsoft MVP program. They were very helpful by making
it very easy to get an ECDSA Code Signing certificate.

![ECDSA Signing Certificate][4]

# Safe Keeping

Normally I keep my signing certificate on a hardware token, a Yubikey 4. I've
had some [good success][1] with the Yubikey for this purpose. I would generate
a CSR from the Yubikey, it would keep the private key, and I would get a
certificate issued with the CSR. The Yubikey is also able to do all of this for
ECDSA / P-256 certificates. I was even able to load the ECDSA certificate that
was issued on to the Yubikey, and my Mac recognized it immediately, as did
OpenSC.

Windows however was a bit different. Normally when you insert a SmartCard on
Windows, it will read off the public certificate from the SmartCard,
automatically import it in to the Personal certificate store, and link-up the
private key to the SmartCard.

That did not work with an ECDSA certificate. The Windows service that is
responsible for this, "Certificate Propogation", doesn't handle ECDSA
certificates. Manually importing the ceritificate doesn't work either, because
the certificate is missing the "Key Container Name" link back to the SmartCard.
It's possible to repair this link, but it needs to be done every time the
SmartCard is re-inserted.

For purposes of this experiment, I decided to forgo the SmartCard and instead
import the private key in to the Windows Key Container store, and force it to 
prompt me for a pin every time it's used to sign.

![Signing Pin Prompt][3]

# Signing

Signing with the ECDSA certificate worked as expected. `signtool` had no
problems signing with ECDSA, and Windows was happy with the signature.

There was nothing different that needed to be done here. My 
[Authenticode Lint][2] tool was also happy with the ECDSA signatures. This was
a little exciting to see an ECDSA certificate "work" in Authenticode Lint. 
To-date all of the ECC capabilities of it have been done with self-signed
certificates.

# Distribution

Everything started to go wrong here. While Windows was happy with my signatures,
many other things had a problem with it.

The first were Antivirus systems. AV applications take in to account signatures
to determine the trustworthiness of the application. Of the few that I was able
to test, none of them recognized the binary as signed, and treated it as
unsigned. This tripped up Windows SmartScreen, which told me my own application
wasn't signed, and it seemed confused by the ECDSA signature.

Likewise "UTM" firewalls didn't like the binaries, either. These are firewalls
that do on-the-fly virus scanning as files are downloaded, and block it if it
considers it unsafe. Depending on how the UTM is configured, it didn't like the
ECC signatures, either.

This is easy enough to "fix" by mixed signing, which is a scarce-to-nonexistant
practice with Authenticode. Most applications are already dual signed, once with
a SHA1 file digest, and also with a SHA2 file digest. To make ECC work, you
would need a *third* signature. The ECC one can't take the place of the RSA+SHA2
one because then those poorly behaving applications will ignore the ECC+SHA2 one
and treat it as only RSA+SHA1 signed.

![Three Signature File][5]

Lastly, some Antivirus vendors think even the *presence* of an ECDSA signature
is enough to warrant flagging it, however most of these scanners seemed to be
small companies. The bigger-name scanners did not have a problem with the
presence of an ECDSA signature.

# Conclusions

I understand why ECC hasn't taken off with code signing. RSA has a lot of
inertia and there is little reason to move to something else if RSA
"just works".

If for whatever reason you want to use ECDSA to sign binaries, you will likely
need to continue to sign with RSA (and RSA being the "root" signature).

# Motivations

I mostly did this to solve my own curiosity. ECC does have a number of benefits,
though. It's generally considered stronger and more compact. Authenticode PKCS#7
also stores the whole certificate chain for the signature. If the chain were
entirely ECC (alas I was not able to get an ECDSA cert that was issued by an
an ECDSA intermediate) then it could shave a few kilobytes from the size of the
signature.

If you need stronger but can't afford the complexity of ECDSA, then RSA-4096
is the way to go.


[1]: https://textslashplain.com/2016/01/10/authenticode-in-2016/
[2]: http://github.com/vcsjones/AuthenticodeLint
[3]: /images/signing-ecdsa-pin-prompt.png
[4]: /images/signing-ecdsa-cert.png
[5]: /images/signing-triple-sign.png
---
layout: post
title:  "Public Key Pinning"
date:   2015-02-23 12:00:00 -0400
categories: General
---

I've added public key pinning, or HPKP for short, to my site. I initially wanted
to wait until my new blog launched, but I was rather anxious to play with it, so
I pulled the trigger anyway.

So what is public key pinning, anyway? In short, it's an HTTP header that
instructs user agents (browsers) the exact public keys it should be using with a
particular domain, and remembers those public keys which are specified for a
period of time. The purpose of this is that if an active attacker were to forge
an X509 certificate, even one that was issued by a legitimate certificate
authority, the forged one would be rejected since it was not previously pinned.

The HPKP header (Public-Key-Pins is the name of the HTTP header) looks like this
(line breaks added for readability):

```
'pin-sha256="7qVfhXJFRlcy/9VpKFxHBuFzvQZSqajgfRwvsdx1oG8=";
pin-sha256="/sMEqQowto9yX5BozHLPdnciJkhDiL5+Ug0uil3DkUM=";
max-age=5184000;'
```

There are a few things going on here. Each "pin-sha256" is simply a SHA256
digest of the public key, base64 encoded. The SHA256 digest can be calculated
from the full private key like so:

```shell
openssl rsa -in mykey.key -outform der -pubout |
openssl dgst -sha256 -binary |
base64
```

The digest for the current certificate on my site is
`/sMEqQowto9yX5BozHLPdnciJkhDiL5+Ug0uil3DkUM=`. There is also a specified
"max-age" value, which tells the browser how long it should retain the "memory"
of the pinned key, in seconds. Currently, for this site it is set to two months.
Browsers also support the SHA1 digest to pin a key, which would then mean you
specify it as "pin-sha1" if you are using a SHA1 digest.

HPKP is a "trust on first use" security feature, meaning that the browser has no
way to validate that what is set in the headers is actually correct the first
time it encounters the pinned keys. When the user agent sees the site for the
first time, it pins those keys. Every time the user agent connects to the server
again, it re-evaluates the HPKP header. This lets you add new public keys, or
remove expired / revoked ones. It also allows you to set the max-age to zero,
which means the user agent should remove the pinned keys. Note that a user agent
will only pin the keys if the HTTPS certificate is "valid". Like HSTS, if the
certificate is not trusted, the public key will not be pinned.

There is a potential issue though if you only pin one key: replacing a pinned key
can potentially lock someone out of the site for a very long time. Let's say that
the public key is pinned for 2 months, and someone visits the site, thus the user
agent records the pinned keys. One month later, you need to replace the
certificate because the certificate was lost or compromised, and you update the
Public-Key-Pins header accordingly. However, the site will not load for that
person. As soon as the TLS session is established, the browser notes that the new
certificate does not match what as pinned, and immediately aborts the connection.
It can't evaluate the new header because it treated the TLS session as invalid,
and never even made an HTTP request to the server. That person will not be able
to load the site for another month.

This is why HPKP requires a "backup" key, which is why I have two pinned keys.
A backup key is an offline key that is not used in production, so that if the
current one does need to be replaced; you can use the back up and create a new
certificate with that one. This will allow user agents to continue to load the
site, and update the HPKP values accordingly. You would then remove the revoked
certificate and add another backup to the header. A backup key is so important
that user agents mandate it. You cannot pin a "single" public key. There must be
a second that is assumed to be a backup. If the backup actually matches any
certificate in the TLS session's certificate chain, the user agent ignores it
and assumes it cannot possibly be a backup since it is in production.

I used OpenSSL to generate a new public / private key pair:

```shell
openssl genrsa -out backupkey.key 2048
openssl rsa -in backupkey.key -outform der -pubout | openssl dgst -sha256 -binary | base64
```

I can then use that backup key to create a new CSR should my current certificate
need to be replaced. Using Chrome's `chrome://net-internals#hsts` page, I can
verify that Chrome is indeed pinning my public keys.

<img src="/images/hpkp.png" class="retina" alt="HPKP in Chrome" />

Dynamic public key pinning is relatively new, only Chrome 38+ and Firefox 35+
supports it. It also presents much more risk that Strict-Transport-Security
since loss of operating keys makes the site unloadable. However I do expect that
this will become a good option for site operators that must strictly ensure
their sites operate safely.
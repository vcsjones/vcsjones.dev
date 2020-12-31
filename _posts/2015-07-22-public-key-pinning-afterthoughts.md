---
layout: post
title:  "Public Key Pinning Afterthoughts"
date:   2015-07-22 12:00:00 -0400
categories: Security
---

Not so long ago I decided to use HPKP (Public Key Pinning) on my website and see
how it goes. For those curious as to “why”, it’s because I often use my own
website to use and learn about new things in the ever evolving world of HTTPS,
such as HSTS, HPKP, ECC, etc. Experimenting with these things is not an
opportunity I can do at a job, however becoming familiar with them lets me make
recommendations to people, including my employer.

After using HPKP for almost half a year, I am happy using it and haven’t run
into any significant issues, and no visitors have complained about anything. A
visitor shouldn’t see anything different as long as HPKP is working correctly.
I do however, wish I had done a few things differently.

I wish I had made *more than one backup key*. HPKP requires you to have a pinned
hash that isn’t in the certificate chain such that the key that hash was created
from can be used if the currently deployed key is compromised. I talk about that
a bit more in a [different post][1]. I created another RSA 2048-bit key and safely
stored it elsewhere. In hindsight, I wish I had done more than that. If you are
going to deploy HPKP, chances are you are in it for the long haul. As time
passes, computers get faster, and people smarter than me think of better ways to
factor integers. We don’t know how long RSA 2048 will be around. It’s many, many
years out (barring any major discovery like proving N=NP). Using a key that
relies on elliptic curves, like ECDSA, has some benefits. Performance is one,
and better security is another. This leads me to wish I had also deployed an ECC
key.

I’ve since added an ECC backup key for an ECDSA certificate. The process is a
little different than I [wrote about previously][1] for RSA. To make a backup
ECC key, I used this process:

```shell
openssl pkey -pubout -outform der -in ecc.key |
openssl dgst -sha256 -binary |
base64
```

This approach works for RSA and ECC keys. If you have a build of openssl that
does not support the pkey command, you can use the ec command:

```shell
openssl ec -pubout -outform der -in ecc.key |
openssl dgst -sha256 -binary |
base64
```

This gives me a hash to pin, but before I can start using an ECC certificate,
I must wait the max-age the keys have been pinned for. Currently I had it set to
60 days. In 60 days I’ll be switching to an ECC certificate.

Even if you don’t plan on completely switching to ECC, pinning one as a backup
is still advisable if you ever plan on deploying multiple certificates. Apache
supports this today, and Nginx is working on it.

[1]: /public-key-pinning/
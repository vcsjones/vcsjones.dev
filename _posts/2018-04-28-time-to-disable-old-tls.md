---
layout: post
title:  "Time to disable old TLS"
date:   2018-04-28 11:28:00 -0400
categories: General
---

There has been discussion for a few years about the eventual deprecation of
TLS 1.0. The deprecation of TLS 1.0 is interesting, and perhaps a little
exciting to me, and will be quite different from when SSL 3 was widely disabled.

TLS 1.0 is old. 1999 old - it's been almost twenty years. That's rather
impressive for a security protocol. There have been additions to it over the
years, such as adding more modern cipher suites to it, such as AES.

TLS 1.0 has not been without problems though. There have been various breakages
of it over the past few years. While POODLE was widely known as an attack
against SSL 3, it did affect certain implementations of TLS 1.0. BEAST is
another such breakage. BEAST has been worked around by clients by using 1/n-1
record splitting, however it is unfixable at the protocol without breaking
compatibility. A naive client will continue to be vulnerable to such an issue.
TLS 1.0 also makes use of older algorithms that cannot be changed, such as
using MD5 and SHA1 in the PRF when computing the master secret.

As a result, there has been a call to deprecate TLS 1.0. That time is finally
here, not just for those that like being on the bleeding edge of security. This
has been a long time coming, and it won't be without difficulty for some users
and site owners.

TLS 1.2 is newer, and unfortunately had slow uptake. While TLS 1.2 was
specified in 2008, it didn't see wide deployment for a few years later. Android
is an example, which gained support in version 4.0 in late 2011. Only the latest
version of Internet Explorer, version 11, has it enabled by default. MacOS 10.9
was the first MacOS version to support TLS 1.2, released in October 2013
(curiously, iOS 5 for the iPhone got TLS 1.2 in 2011, much sooner than MacOS).
You can see a full list of common clients and their TLS 1.2 support from
[SSL Labs' Site][1].

Due to POODLE, SSL 3 was widely disabled, both from clients and servers
starting around 2014. TLS 1.0 had 14 years to work its way in to software and
in to consumer products. TLS 1.2 on the other hand, has had less time. The other
thing that's rather recent is the explosion of internet connected consumer
devices. Unlike desktop computers, these devices tend to have a much more
problematic software update schedule, if one exists at all.

Putting all of this together, turning TLS 1.0 off is likely to cause a much more
noticable impact on connectivity. However, this leads to better user safety.
Many big players have already announced their plans to disable TLS 1.0. The
most notable upcoming one is all organizations that need to be PCI compliant.
PCI 3.2 stipulates the eventual shut off of "early TLS", which is TLS 1.0 and SSL
in this case. The looming date is June 30th, 2018. This will impact every website
that takes a credit or debit card.

>After June 30,  2018, all entities must have stopped use of SSL/early TLS as a
>security control, and use only secure versions of the protocol (an  allowance
>for certain POS POI terminals is described in the last bullet below)

PCI originally wanted this done in June 2016, however it became quickly apparent
that many organizations would not be able to meet this goal when PCI 3.1 was
announced. Thus, 3.2 extended it by two years, however required companies to
put together a risk mitigation and migration plan up until June 2018.

Many are wondering what they should do about TLS 1.1. Some organizations are
simply turning off TLS 1.0, and leaving 1.1 and 1.2 enabled. Other are turning
off both 1.0 and 1.1, leaving 1.2 as the only option. In my experience, almost all
clients that support TLS 1.1 also support 1.2. There are few browsers that will
benefit from having TLS 1.1 enabled since they also support 1.2 in their default
configuration. However, the only way to know for certain is to measure based on
your needs. TLS 1.1 also shares several character flaws with TLS 1.0.

A final note would be to tighten down the available cipher suites. TLS 1.2
makes `TLS_RSA_WITH_AES_128_CBC_SHA` a mandatory cipher suite - there is little
reason to have 3DES enabled if your site is going to be TLS 1.2 only.
Also ensure that AEAD suites are prioritized first, such as AES-GCM or CHACHA.
My preferred suite order might be something like this:

1. ECDHE-ECDSA/RSA-AES128-GCM-SHA256
1. ECDHE-ECDSA/RSA-AES256-GCM-SHA384
1. ECDHE-ECDSA/RSA-WITH-CHACHA20-POLY1305
1. ECDHE-ECDSA/RSA-AES128-CBC-SHA
1. ECDHE-ECDSA/RSA-AES256-CBC-SHA 

You can of course move things around to better suit your needs or customers.
Some prefer putting AES-256 in front of AES-128 for better security over
performance. The exact ones I use on this site are my [Caddyfile][2].


[1]: https://www.ssllabs.com/ssltest/clients.html
[2]: https://github.com/vcsjones/vcsjones.dev/blob/main/_server/Caddyfile
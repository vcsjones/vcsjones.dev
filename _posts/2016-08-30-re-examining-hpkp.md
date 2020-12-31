---
layout: post
title:  "Re-examining HPKP"
date:   2016-08-30 10:30:00 -0400
categories: Security
---

Not too long ago [I wrote about][1] HTTP Public Key Pinning and adopting it on a website.
Now that I've had the opportunity to help a few websites deploy it, I thought it would be
worth re-visiting the subject and looking at what worked, and what didn't.

The first discussion that came up was deciding whether or not it is a good idea. It's easy
to say, "of course". HPKP is a security feature, we want security, therefore we want HPKP.
But HPKP comes with some costs. Many of those costs can be reduced by doing other things,
but it boils down to having excellent posture around key management, process, and documentation.
It's easy enough to turn HPKP on a blog, but doing so with several members of operations,
security, and developers, it is considerably more difficult. The penalties are unforgiving.
At the worst, you may end up with a completely unusable domain. So before you jump right in
and start hashing public keys, look at the long term viability of being able to do this,
and build tools and process around it to make it work.

Given that HPKP has considerably high risk of getting wrong, it's worth getting a solid
understanding of what it does, and does not, address.  You may come to the conclusion that
the risks outweigh the benefits, and time should be better spent on other ways to improve
security.

Deciding to move forward, there are a number of things that needed to be discussed. The
first thing that came up was what to pin. Some suggest pinning an intermediate certificate,
while others suggest pinning a leaf. My recommendation here is *pin only what you control*.
For most people, that means the leaf. For very large organizations, you may have your own
intermediate certificate. Some recommend pinning a CA's intermediate to reduce the risk
of losing keys. In this scenario, you would just need to re-key your certificate from
the same certificate authority. The downside to this is CA's deprecate intermediate
certificates, and there is no guarantee they'll use the same key in a new intermediate
certificate. If you do decide to pin an intermediate, I would recommend one of your backup
pins be for a leaf.

Then there was the matter of backup pins. User agents require that a backup pin is available
before it will enforce pins. I would recommend more than one backup pin, and providing some
diversity in the algorithm that is used as well as the key size. For example, if I intended
to pin an RSA-2048 key, my backup pins might be another RSA-2048, and an ECDSA-P256. The
different algorithm gives you an option to immediately move to a different algorithm in the
wake of a discovery, such as finding out that RSA is broken, or that the NIST curves in P256
have weaknesses. Even if nothing like that happens, which it probably won't, it also gives
a straight forward path to increasing key sizes, which is a natural thing to do over time.

Having a backup pin for the same algorithm allows recovery from the loss of a key, or exposure
of the private key without changing the algorithm used. Moving from one algorithm to another,
like RSA to ECDSA, will carry some compatibility risks with older clients.  Having a backup
pin of the same key length and algorithm at least ensures you can recover without the additional
burden of investigating compatibility.

Lastly there was the matter of testing backup pins. I strongly recommend using `Report-Only`
first when deploying HPKP, and testing a failover to each and every backup pin. While doing
this, I ran in to a situation where a backup pin wasn't working. It turned out that the
SHA256 digest of the SPKI was actually a digest of the string "File not found".  

[1]: /public-key-pinning/

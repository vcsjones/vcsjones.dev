---
layout: post
title:  "CloudFront and ECC"
date:   2015-08-06 12:00:00 -0400
categories: General, Meta
---
I for fun decided to switch to my ECC certificate for a bit at this risk of
breaking HPKP for visitors.

I did this one, to test and make sure that I didn't screw up pinning the new
certificate – I would have seen HPKP violations myself if I did. I also did it
to test something I hadn't considered at first: CDNs.

Originally this website was set up to serve static content via Amazon's
CloudFront where my own server (vcsjones.com) was an Origin for the
distribution. CloudFront does support communicating with origins over HTTPS, but
sadly they don't support ECDSA cipher suites. According to [their documentation][1],
they actually have a pretty limited cipher suite support and top out at TLS 1.0.
Their documentation also doesn't agree with the behavior that I see, they seem
to be missing the GCM suites that they claim to support when I actually examined
an Client Hello from the distribution.

For now I've turned off CDN on my site while I consider my options – the most 
ikely being, "The CDN is not absolutely necessary". I've [raised the issue with Amazon][2]
and we'll see if they do anything about it soon.

[1]: http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorCustomOrigin.html#RequestCustomEncryption
[2]: https://forums.aws.amazon.com/thread.jspa?messageID=664046
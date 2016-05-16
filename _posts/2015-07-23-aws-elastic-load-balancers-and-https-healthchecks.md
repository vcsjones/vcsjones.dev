---
layout: post
title:  "AWS Elastic Load Balancers and HTTPS Healthchecks"
date:   2015-07-23 12:00:00 -0400
categories: General
---

I ran into an interesting problem where some HTTPS changes on my servers broke
their elastic load balancer. More specifically, I tuned Nginx to not support
DHE cipher suites, leaving only ECDHE as the key exchange. The exact cipher
suite being used was now:

```
TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 (0xc030)
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256 (0xc02f)
TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256 (0xc027)
TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA    (0xc013)
```

As a quick refresher, Elliptic Curve Diffie-Hellman Ephemeral is what we are
supporting here, and removing the non elliptic curve algorithms. As I wrote a
bit in a [previous post][1], I didn't feel that supporting DHE was worth it anymore.

After a configuration reload, I pulled up the site by going to a server's IP
address (thus bypassing the ELB) and everything looked pretty good. However
within a few moments the actual site went down, and the ELB was convinced that
all of the servers were unhealthy and took them out of server.

After seeing that the sites were still coming up OK, I refreshed myself as to
what the health check in the ELB actually looked like.

![ELB Check][2]

Ah OK, so the ELB is checking HTTPS and it isn't happy about the HTTPS
configuration. I haven't found any specific documentation calling it up, but it
appears that the ELB does not support establishing an HTTPS handshake using the
limited cipher suites listed above.

After changing my ELB check to use TCP port-establishment as the health check,
the ELB was happy to bring the instances back online.

[1]: /2015/07/21/going-ecc/
[2]: /images/elbcheck.png
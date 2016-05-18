---
layout: post
title:  "Blocking requests with HAProxy behind a load balancer"
date:   2015-04-06 12:00:00 -0400
categories: Security
---

In our current infrastructure, we have three HAProxy instances behind a AWS ELB
load balancer. One of the things these HAProxy instances do is tarpit (block) a
list of bad IP addresses.

The configuration looked like this:

```
acl spamlist src -f /etc/haproxy/abusers.lst
http-request tarpit if spamlist
```

Turns out it didn’t work. We were still seeing a spammer get through in our
logs. The reason being, the connect to HAProxy is the IP address of the load
balancer – not the IP address of the client, so it would never get blocked.
It did work before an ELB was part of the infrastructure. Most proxies,
[including ELB][1], support the X-Forwarded-For HTTP header. What the ELB does in
this case is take the original client’s IP address and put it in that header.

We can’t just compare that header with the IP’s in the blocklist though. It is
possible in some corporate environment they have their own proxy. In this case,
the X-Forwarded-For becomes a comma separated list of IP addresses. So we need
to check every IP address in the X-Forwarded-For header against our list.

HAProxy makes that pretty easy. You can use `hdr_ip` to accomplish this:

```
acl spamlist hdr_ip(X-Forwarded-For) -f /etc/haproxy/abusers.lst
http-request tarpit if spamlist
```
`hdr_ip` takes in the name of the header you want to use, and automatically
handles it as a list of IP addresses.

[1]: https://docs.aws.amazon.com/ElasticLoadBalancing/latest/DeveloperGuide/TerminologyandKeyConcepts.html#x-forwarded-headers

---
layout: post
title:  "IIS and TLS"
date:   2016-01-05 12:00:00 -0400
categories: Security
---

I recently made the claim that you should not use IIS to terminate HTTPS and
instead recommend using a reverse proxy like HAProxy or NGINX (ARR does not
count since it uses IIS).

>If you are going to run your App on IIS for God’s sake don’t terminate SSL with
IIS itself. Use a reverse proxy. (Nginx, HAProxy). - [vcsjones][1]
    
I thought I should add a little more substance to that claim, and why I would
recommend decoupling HTTPS from IIS.

IIS itself does not terminate SSL or TLS. This happens somewhere else in
windows, notably http.sys and is handled by a component of Windows called
SChannel. IIS’s ability to terminate HTTPS is governed by what SChannel can,
and cannot, do.

The TLS landscape has been moving very quickly lately, and we’re finding more
and more problems with it. As these problems arise, we need to react to them
quickly. Our ability to react is limited by the options that we have, and what
TLS can do for us.

SChannel limits our ability to react in three major ways.

The first being that the best available cipher suites to us today are still not
good enough on Windows (as of Windows Server 2012 R2). The two big omissions are
`TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256` and `TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384`.
These two cipher suites are usually recommended as being one of the first cipher
suites that you offer. Oddly, there are some variants that are fairly close to
this cipher suite. The alternatives are `TLS_DHE_RSA_WITH_AES_128_GCM_SHA256` or
`TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256` (and their AES256 / SHA384 variants). Both
have their own issues. The former uses a slower, larger ephemeral key, and the
latter uses CBC instead of an AEAD cipher like GCM. Stranger, ECDHE and AES-GCM
can co-exist, but only if you use an ECDSA certificate, so the cipher suite
`TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256` does work.

This is a bit frustrating. Microsoft clearly has all of the pieces to make
`TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256` a real thing. It can do ECDHE,
it can do RSA, and it can do AES-GCM. Why they didn’t put those pieces together
to make a highly desirable cipher suite, I don’t know.

The second issue is even though that cipher suites may be lacking, I’m sure
people at Microsoft know about it, yet there hasn’t been an update to support
it despite the cipher suite being in wide adoption for quite some time now.
SChannel just doesn’t get regular updates for new things. Most things like new
versions of TLS have been limited to newer versions of Windows. Even when there
was an update in May 2015 to add new cipher suites, ECDHE+RSA+AESGCM wasn’t on
the list. The [KB for the update][2] contains the details.

The final issue is even if SChannel does have all of the components you want,
configuring it is annoying at best, and impossible at worst. SChannel handles
all TLS on Windows, and SChannel is what is configured. If say, you wanted to
disable TLS 1.0 in IIS, you would configure SChannel to do so. However by doing
that, you are also configuring any other component on Windows that relies on
SChannel, such as Remote Desktop, SQL Server, Exchange, etc. You cannot
configure IIS independently. You cannot turn off TLS 1.0 if you have SQL 2008
R2 running and you want to use TLS to SQL server for TCP connections. SQL Server
2012 and 2014 require updates to add TLS 1.2. Even then, I don’t consider it
desirable that IIS just cannot be configured by itself for what it supports in
regard to TLS.

Those are my arguments against terminating HTTPS with IIS. I would instead
recommend using NGINX, HAProxy, Squid, etc. to terminate HTTPS. All of these
receive updates to their TLS stack. Given that most of them are open source, you
can also readily re-compile them with new versions of OpenSSL to add new
features, such as CHACHA20+POLY1305.

[1]: https://twitter.com/vcsjones/status/684083572114862082
[2]: https://support.microsoft.com/en-us/kb/2929781
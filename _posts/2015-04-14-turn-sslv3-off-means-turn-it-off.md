---
layout: post
title:  "Turn SSLv3 off means turn it off"
date:   2015-04-14 12:00:00 -0400
categories: Security
---

A quick refresher: SSLv3 is no longer safe for use. The POODLE issue was the
final nail in the coffin, but it was already starting to show several cracks.

When the POODLE issue was discovered, the reaction was swift: turn SSLv3 off.
While the issue was potentially fixable (record splitting for example), getting
rid of it all together was the right thing to do – very few people need it these
days, and who knows what else we'll find in the future.

Since then, a few blog posts have popped up on how to "gracefully" handle SSLv3
connections, like showing an error page, "Sorry, SSLv3 is not supported, please
upgrade your browser."

**Don't do this.**

By doing that you are effectively supporting SSLv3. You have to accept the SSLv3
connection in order to show the error page. You might think, "Well I am not
sending any sensitive information, just an error page, so this should be OK".

Remember what POODLE does – an active attacker can force a browser to downgrade
their connection to a weaker version of SSL during the handshake. Many browsers
that that still use SSLv3 don't support TLS_FALLBACK_SCSV, so they are still
vulnerable to POODLE.

Let's pick on Internet Explorer 7. IE 7 supports TLS 1.0 and SSLv3, but not
`TLS_FALLBACK_SCSV`. This person uses your website that requires authentication.
Like most websites, you do authentication with a persistent or session cookie.
Cookies are sent via HTTP headers by the client to the server on most HTTP
requests: GET, POST, etc. That attacker then downgrades the connection to SSLv3,
where they promptly see the error page that they need to upgrade their browser.
But the browser sent your authentication cookie because they were already
authenticated. The attacker then – with enough persistence and requests – be
able to retrieve the authentication cookie.

This completely defeats the point of disabling SSLv3. Turning SSLv3 off means
turn it off. By not accepting the connection at all, then the client is not able
to even start an HTTP request.
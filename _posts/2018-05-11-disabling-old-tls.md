---
layout: post
title:  "Disabling old TLS"
date:   2018-05-11 11:28:00 -0400
categories: General
---

I [last wrote about][1] the incoming change of disabling old versions of TLS.
A detail I left off there was deciding when, and how, to do this.

At minimum, your site should at least _support_ the latest version of TLS. As
of writing, that's currently 1.2, with 1.3 hot on its heels.

## Who's Impacted?

When people or organizations start evaluating this, usually the first question
that arises is understanding the impact to the users of your site. Disabling
old versions of TLS has the unfortunate issue of a poor user experience. There
is no way to tell the user "Your version of TLS is not supported, please update"
for reason I [previously discussed][2].

Not everyone has the same set of users, either. Certain websites might have a
disproportionate amount of traffic that target tech-savvy people, which tend
to have more up-to-date operating systems and browsers. Other sites may have
most of their traffic coming from users that are less inclined to update their
software.

As such, the only way to get a clear picture of an impact to a site is to
measure how the site is currently performing. Most web servers or places of
terminating TLS (such as a load balancer) can log various aspects of the TLS
handshake. The two that are important are the negotiated TLS version, and the
negotiated cipher suite. It's also very beneficial to collect the User-Agent
header and IP address as well.

TLS tries to negotiate the highest version that both the client and the server
support. If a client negotiates TLSv1.0, then it is very unlikely that it
supports TLSv1.2. If 1% of all negotiated handshakes are TLSv1.0, then disabling
TLSv1.0 will result in 1% of handshakes failing.

That doesn't necessarily mean 1% of _users_ would be impacted. Almost all sites (even
this one) get crawled. Either legitimately by search indexers, or others simply
looking for common website exploits. Eliminating handshake statistics that
aren't from users will give a much clearer picture of the actual impact on
users. That doesn't mean you shouldn't care about crawlers! Having healthy SEO
is important to many web properties, and it's quite possible crawlers you are
targeting don't support modern versions of TLS. However, the traffic from them
can be disproportionate. Most reputable crawlers do support TLSv1.2 however.

Using the IP address and User-Agent header can aide in identifying the source
of the handshake. Good crawlers identify themselves with a User-Agent. Less
kind crawlers may choose to use an agent string that mimics a browser. For
those, you may be able to compare the IP addresses against a list of known spam
or bot IP addresses.

If your website performs any kind of user identification, such as signing in,
you may be able to even further know that those handshakes and TLS sessions are
from a more reputable source that should factor in statistics.

## Collecting Statistics

Various different web servers and load balancers support logging common
elements of an HTTP request.

Most web servers and load balancers have a common log format called "combined"
logging. Which looks like this:

```plaintext
127.0.0.1 - - [01/Jan/2018:23:59:59 -0400] "GET / HTTP/2.0" 200 9000 "-" "<User Agent String>"
```

This breaks down to:

```plaintext
<client ip> - <basic auth user> [<date time>] "<request>" <response code> <response size> "<referer>" "<user agent>"
```

The combined logging format doesn't include the TLS information, if any.
Fortunately, web servers are flexible about what they log and how they log it.
You will need something like a flat file parser to be able to query these logs.
Alternatively, logging to a central location with syslog or by other means in to
a data store that allows querying is very helpful. That way the log file on the
server itself can easily be rotated to keep disk usage to a minimum.


### Caddy

Caddy's [logging directive][3] is simple and can easily be extended.

```
log / /var/log/caddy/requests.log "{combined} {tls_protocol} {tls_cipher}"
```

Caddy has many different [placeholders][4] of what you can include in your logs.

Note that as of writing, Caddy's documentation for the TLS version placeholder
is [incorrect][5]. That documentation indicates the placeholder is `{tls_version}`
when it is actually `{tls_protocol}`.

### Nginx

Nginx has a similar story. Define a log format in the `http` block using the
`$ssl_protocol` and `$ssl_cipher` variables for the TLS version and cipher
suite, respectively.

```
log_format combined_tls '$remote_addr - $remote_user [$time_local] '
                        '"$request" $status $body_bytes_sent '
                        '"$http_referer" "$http_user_agent" $ssl_protocol $ssl_cipher';
```

Then use the log format in a `server` block.

```
access_log /var/log/nginx/nginx-access.log combined_tls;
```

### Apache

Declare a log format:

```
LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-agent}i\" %{version}c %{cipher}c" combined_tls
```

Then add `CustomLog` directive to a Server or virtual host block:

```
CustomLog /var/log/apache/apache-access.log combined_tls
```

With all that said and done, you'll have a Combined Log extended with your TLS
connection information.

You can also use custom log formats to log in a different format entirely, such
as JSON. Using a JSON log format and ingesting it elsewhere such as NoSQL DB or
any other query engine that is friendly to JSON.

## Trials

A good idea that some sites that have already disabled old TLS have done is a
"brown-out". [GitHub][6] disabled TLSv1.0 and 1.1 for just one hour. This helped
people identify their own browsers or software that was incompatible while only
temporarily breaking them. Presumably the idea was to break people temporarily
so they would know something is wrong and find documentation about TLS errors
they started getting. Things would get working again while those people or teams
worked to deploy new versions of software that supported TLSv1.2.

CloudFlare [is doing the same thing][7] for their APIs, except the duration is for
a whole day.

I like this idea, and would encourage people to do this for their web
applications. Keep support teams and social media aware of what is going on so
they can give the best response, and have plenty of documentation.

Unfortunately for the case of GitHub, I would say their one hour window was
probably a little too small to capture global traffic. A whole day might be too
long for others as well. Consider both of these options, or others such as
multiple one hour periods spaced out over a 24 or 48 hour period. Geography
tends to play an important role in what versions of browsers and software are
deployed. In China, for example, Qihoo 360 browser is very popular. You wouldn't
get representative sample of Qihoo's traffic during the day in the United States.

Since we mentioned logging, be sure to log failed handshakes because a protocol
or cipher suite couldn't be agreed upon during the brown out period.

## Beyond the Protocol

Many are focused on TLSv1.2, but making 1.2 the minimum supported TLS version
gives us other opportunities to improve.

You could consider using an ECDSA certificate. _Most_ browsers that support TLS
1.2 also support ECDSA certificates. The only broad exception I can think of is
Chrome on Windows XP. Chrome on XP supports TLSv1.2, but uses the operating
system to validate and build a certificate path. Windows XP does not support
ECDSA certificates.

Other browsers, like Internet Explorer, won't work on Windows XP anyway because
they don't support TLSv1.2 in the first place. Firefox uses NSS for everything,
so ECDSA works on Windows XP as well.

ECDSA has a few advantages. The first is smaller certificates. Combined with a
if ECDSA is used through the certificate chain as much as possible, this saves
hundreds of precious bytes in the TLS handshake. It's also for the most part
more secure than RSA. RSA still widely uses PKCS#1.5 padding for use in TLS.
ECDSA avoids this problem entirely.

Lastly, as mentioned previously, consider the cipher suites, both the key
agreement as well as the symmetric algorithm. FF-DHE shouldn't be used, and is
widely disabled in clients for now. Key generation is slow, and the parameter
configuration is sometimes wrong. Best to avoid DHE entirely and stick with
ECDHE. Also consider if static key exchange is needed at all. There are few
browsers out there that support TLSv1.2 but not ECDHE. That might not be true
of non-browser software. This again goes back to measuring with your traffic.

Remove every symmetric algorithm except AES-GCM, ChaCha, and AES-CBC. At minimum,
TLSv1.2 requires `TLS_RSA_WITH_AES_128_CBC_SHA`. That doesn't include ECDHE,
but it does mean that 3DES, RC4, CAMILLA, etc. shouldn't be bothered with anymore.
The order is generally important. AEAD suites should be placed first, while
AES-CBC should be placed last.

## Conclusions

Having done these experiments with a few small and medium sized sites, I'm
optimistic of disabling old versions of TLS. Particularly, I see little need to
support TLSv1.1. Almost everything that supports TLSv1.1 also supports 1.2 as
well, and leaving 1.1 enabled doesn't accomplish too much.

Since we are removing support from a lot of legacy browsers by supporting TLSv1.2
as a minimum, we can also consider other areas of improvement such as ECDSA for
smaller, more secure, certificates, and cleaning up the list of supported cipher
suites.


[1]: /time-to-disable-old-tls/
[2]: /turn-sslv3-off-means-turn-it-off/
[3]: https://caddyserver.com/docs/log
[4]: https://caddyserver.com/docs/placeholders
[5]: https://github.com/mholt/caddy/issues/2146
[6]: https://githubengineering.com/crypto-removal-notice/
[7]: https://blog.cloudflare.com/deprecating-old-tls-versions-on-cloudflare-dashboard-and-api/
[8]: https://textslashplain.com/2016/05/04/tls-fallbacks-are-dead/
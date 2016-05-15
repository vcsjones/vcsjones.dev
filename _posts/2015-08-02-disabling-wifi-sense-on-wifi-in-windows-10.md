---
layout: post
title:  "Disabling WiFi Sense on WiFi in Windows 10"
date:   2015-08-02 12:00:00 -0400
categories: General
---

There has been a [lot][1] [of][2] [hullabaloo][3] over Window 10's WiFi Sense capability.
If you aren't familiar with it, here is [ArsTechnica's definition][3] by Sebastian
Anthony:

>Windows 10 comes with a neat new feature called Wi-Fi Sense, which lets your
PC automatically connect to Wi-Fi networks that your friends and acquaintances
have previously connected to, even if you don't know the network password.
— *Sebastian Anthony, ArsTechnica*

I recommend you read Ars's write up, it's a fair and practical argument for why
it should be left alone, and that it isn't such a big deal. Indeed, many people
make good arguments to why its a reasonable thing and people shouldn't be
freaking out about it. People have also told me that devices on a network using
WiFi Sense can't access devices on the network, just the default gateway for
internet access.

There is only one suitable option for completely disabling it for an entire
network: suffix your SSID with "_optout":

>If you run a Wi-Fi network and you want to prevent Windows 10
(or Windows Phone) users from sharing the passkey via Wi-Fi Sense, you can add
_optout to the end of the network SSID. — *Sebastian Anthony, ArsTechnica*

Given all of the arguments as to why it's a good thing, that it's secure and
all, I am still going to add the _optout to my network.

This isn't any dig at Microsoft. Microsoft has some really, really smart people
there especially security conscience ones. If it were Apple or Google, I would
do the same (and I have for other services).

It's something I just don't need. Any practical security minded person would
tell you, "If you don't need something, turn it off". Windows Server has been
doing this for years with Roles and Features. One of the primary reasons Windows
Server doesn't come with everything enabled out of the box is so that only
features which are actually installed need to be patched. This is one of the
reasons I think Windows Nano is fantastic, and is summed up well in this tweet
about what Jeff Snover said during MSIgnite:

>@nanoserver One 10th the critical patches, dramatically increased security.
VHD size 410Mbytes, almost 20 times smaller @jsnover #MSIgnite - [@JeffreySchwartz][4]

My point is this: if you won't use it, turn it off. People can think of really
creative vulnerabilities. There are still many concerns that I do have.

Devices that are on a WiFi network via WiFi Sense don't get access to the whole
network, just the default gateway (router in most cases) for internet access,
and that is all. So even if WiFi Sense were misused, no one would get access to
devices on my network, right? I don't think so. Consumer router manufactures do
[a laughable job][5] at security. Who knows what else will turn up. Even if you keep
your router patched, there are probably dozens more left to be discovered.

Small businesses are in a bit of a tight spot, too. Most don't deploy WPA2
Enterprise, they just use their ISPs router with built-in WiFi, or maybe they
have a few APs they got from Best Buy, added a WPA2 PSK password, and moved on.
How does a small business stop employees from doing this? I'm sure Group Policy
can do it (which many small business also don't deploy), but since WiFi Sense is
on Windows Phone, and with BYOD on the rise (both with phones and laptops), it's
only a matter of time before someone uses the company's WiFi with WiFi Sense.

Even more concerning is this is becoming a convention. Google [famously collects][6]
information about WiFi SSIDs its streetcars sees. If you don't want them doing
it, you follow a similar approach: add "_nomap" to the end of your SSID. Are
these at odds with one another? Probably. I don't think I can have
"_optout_nomap" – one defeats the other, which is disappointing.

[1]: http://www.forbes.com/sites/ygrauer/2015/07/31/wifi-sense/
[2]: http://www.zdnet.com/article/no-windows-10s-wi-fi-sense-feature-is-not-a-security-risk/
[3]: https://arstechnica.com/gadgets/2015/07/wi-fi-sense-in-windows-10-yes-it-shares-your-passkeys-no-you-shouldnt-be-scared/
[4]: https://twitter.com/JeffreySchwartz/status/595629728821813249?ref_src=twsrc%5Etfw
[5]: https://arstechnica.com/security/2014/04/easter-egg-dsl-router-patch-merely-hides-backdoor-instead-of-closing-it/
[6]: http://www.zdnet.com/article/google-offers-street-view-opt-out-for-wi-fi-mapping-unethical-snooping-yet-we-must-opt-out/
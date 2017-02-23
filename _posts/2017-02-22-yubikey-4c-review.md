---
layout: post
title:  "Yubikey 4C Review"
date:   2017-02-22 21:00:00 -0500
categories: Security
---

Incase you weren't aware, Yubico launched a USB-C version of their popular
Yubikey device. On launch day, the 13th, I paid for 3 of them and eagerly
awaited their arrival.

I've recently just finished up a laptop refresh at the house, which means
"MacBook &lt;something&gt;". For light use and travel, I have a MacBook with
its singular USB-C port. For heavier things, I have a MacBook Pro with
Thunderbolt 3, which gives me 4 USB-C ports. I have no laptops with USB-A
connections anymore.

If you have all or mostly USB-C in your life, then the 4C is a great companion
and works just as well in its previous form.

## Comparing

The 4C can go on a key ring, just like the 4 could. Their sizes are noticeably
different though. The 4C is smaller in width and height, at the expense of it
being much thicker, by comparison.

![4C Top View][1]
![4C Side View][2]

The thickness isn't troublesome, but the smaller size is a welcome change since
it's permanently affixed to my key chain.

I find the thickness just slightly troublesome when it's attached to a key ring.
The previous one left *just* enough space for the key ring to jut out from. With
the additional thickness, I now have to prop my laptop up, put it on a stand, or
find a new solution for the key ring.

## Functionality

It's identical to the original 4. It's worth noting however that you can't
clone one Yubikey to another, so you may have to use both for a while during a
transition phase. This includes the actual Yubico OTP functionality, and any
additional configuration you have have loaded in to the second slot, PIV
certificates, etc. I opted to re-key my PIV certificate and replace it.

I did have a lot of trouble with the Yubikey Personalization Tool. On one Mac
it works fine, on another it does not. On Windows it always seems to work. This
wasn't unique to the Yubikey 4C, either.

## USB-C

If you are in a pure USB-C environment, or mostly so, then this is a great
upgrade. No little adapters to lose. If however you have a mix of USB-C and
USB-A, you might want to stick with USB-A for a while. There are plenty of
adapters that allow you go to from USB-A to USB-C, but the reverse doesn't
exist, and that's intentional. Since USB-C can do power delivery, plugging a
USB-C device in to a USB-A port might damage the USB-A port, so the USB-IF does
not allow such things to get certified.

![4 with Adapter][3]

[1]: /images/4c-top.jpg
[2]: /images/4c-side.jpg
[3]: /images/4-adapter.jpg
---
layout: post
title:  "Single Cable USB-C"
date:   2017-08-13 04:00:00 -0400
categories: General
---

I had a pretty simple dream. I have a 4K monitor, a touch pad, keyboard, and
a few computers between Lena and I. The dream was to have a *single* cable to
connect a computer to this set up.

I generally love the Mac keyboard and track pads. The second version of these
can also work with vanilla USB instead of bluetooth, which is great for a
docking setup. No need to do any re-pairing of the devices or shuffling things
around on my desk.

The single cable desire came from that fact that one of the computers is a
MacBook. Not a pro, the 12" MacBook with a single USB-C port. Single cable,
including charging, was a necessity.

I thought this would be easy. Turns out, not so much. I went through a few
different docks or "dongles" trying to find the one that made the right trade
offs.

# Why not Thunderbolt?

Two reasons. The first being that the MacBooks don't do Thunderbolt, only USB-C.
They use identical ports, and Thunderbolt 3 ports can also double as a USB-C
port, but not the reverse. Thunderbolt 3 docks, while expensive, can typically
do everything over a single cable, and they do it well. I've had experience with
that going back to the 2011 Thunderbolt Display that Apple introduced.

Generally now I am hesitant to adopt in to a Thunderbolt set up. While at the
time of purchasing the Thunderbolt display I had all-thunderbolt devices, that
isn't true today, and they didn't work with the Thunderbolt display.

Because of that, I don't want to invest heavily in a set up that might not work
for me in the future. Instead, I wanted a regular monitor that had a variety of
different inputs. DisplayPort, HDMI, mDP, etc and also a little USB hub.

# The monitor

I settled on the advice of many. The Dell P2715Q. It's a good 4K monitor for
a software developer. It looks great, has bezels but I don't really care about
that, and has all of the inputs I wanted. Not much of an issue there.

# Docks

This is where I started learning that despite some people's belief that USB-C
was going to obsolete Thunderbolt 3, they were not correct. USB-C and USB 3.1
Gen 2 seem to have a ways to go to catching up to Thunderbolt.

Here was my wish list from a hub or dock, in the order that I consider them.

1. Pass-through power
2. 4K Resolution for Display
3. 60 Hz refresh rate for Display
4. USB Hub
5. Ethernet

There is no device on the market at the time or writing that hits all of these.
Some, like the [Arc Hub][1], are really close, but misses one mark which I'll
talk about later.

### Pass Through Power

The first, pass through power, is a requirement for the 12" MacBook. It
literally has only one port, including the one for charging it. Pass through
power allows charging the device and using the port for USB at the same time.
It sounds simple, but it's not. There are a few problems here.

The first is how much power is can pass-through. It's not as simple as passing
power through. Some hubs or docks can deliver 30 watts or so, others can go up
to 60 watts, etc. Depending on the charging needs of your computer, it'll either
charge your computer very slowly, or not at all, depending on how much power it
can deliver.

The second that I've heard is that some hubs work fine when there is no pass
through power connected, but then certain things start acting strange depending
on the computer and power supply. Apple hardware doesn't vary much in that
regard, so I hoped this wouldn't be an issue with a Mac.

### The Display

I'm going to discuss the next two together because they go together, and can
often fight each other. 4K monitors can do a few different modes. They can do
4K@60Hz, 4K@30Hz, or 1080p@60Hz. The type of connector used and the settings
on the computer determine which is the best that you're going to get.

4K@60Hz requires a modern connector. HDMI 2.0 or DisplayPort 1.2. If your
computer's graphics can do 4K and you have an output port of one of those two
kinds, then you get do 4K@60Hz. If not, then you will have to choose between
2K@60Hz or 4K@30Hz.

The resolution of 4K is nice, but 60Hz refresh rate should be a bare minimum.
Having seen 30 Hz playing around with settings, it's quite choppy in its
appearance for things like dragging or animations.

Finding a single USB-C dock that could drive even one display at 4K@60Hz was
a challenge. To make this a little more complicated, I was slightly mislead by
USB-C a little bit.

Let me explain. I have a USB-C to HDMI 2.0 cable. It works great, plug one end in
to USB-C, plug the other in to the monitor, and instant 4K@60Hz. It shouldn't
be much of a stretch to add inline power and USB hub, right? That's where
I went astray. USB-C includes *alternate modes*, where the it has a physical
port of USB-C, but isn't actually USB-C. This cable was using USB-C's alternate
mode. It was not doing anything USB related, it was just acting like an HDMI 2.0
port with a USB-C interface.

After doing some reading on this matter, I believe I came to the conclusion that
a USB-C port cannot offer USB-C data and HDMI 2.0 at the same time - only HDMI
1.4b. So the 4K works, but with a 30 Hz refresh rate. To get the 4K@60Hz, I
needed to find a docking solution that had DisplayPort, where the USB-C spec
did use DisplayPort 1.2.

This was quite the treasure hunt.

### USB Hub

The monitor itself has a USB Hub, I just need somewhere to connect it to on the
hub. This is used for a keyboard and a track pad. That's really it. If I really
needed a USB port with raw speed, I would use one of the other ports on the
computer - it just wouldn't be part of the docking setup.

### Ethernet

This was a nice-to-have. WiFi 802.11ac Wave 2 is generally good enough for me,
I can still make use of my near-gigabit internet connection, and the minor
latency penalty isn't trouble. The APs are rock solid in my house. Though,
if a dock had an Ethernet port, I wouldn't pass up the opportunity to have it if
it came down to putting the money in.

# Shopping

I initially used the Apple HDMI dongle. It has power pass-through, 1 USB port,
and HDMI. Everything worked great except the 4K@60Hz, which I eventually
figured out I would never get working. Still, I like this little dongle for
travelling.

It would take me one more attempt at purchasing an HDMI hub and dongle before
I caught on that HDMI and USB-C just don't do the 4K with the right refresh
rates. This was complicated by the fact that some manufacturers don't label the
refresh rate. One reviewer of a product said the HDMI did 4K@60Hz, but I have
to believe that reviewer was mistaken. Lesson learned: only buy a hub where the
specs are completely spelled out, and reviewers aren't disputing them.

I was initially going to pull the trigger on the [Arc Hub][3], something that
[The Verge][2] gave very glowing remarks to. I came within moments of purchasing
one, except reading the Compatibility section carefully...

>It is also a known issue that 4K@60hz is not being supported via MDP using a
>MacBook Pro despite having the capability to do so. Our engineers are
>thoroughly looking into the issue and will update with any new info.

That's rather disappointing! I hope they fix the issue, and if they do, I will
certainly consider revisiting purchasing one of them. I am very pleased that
they were up-front about the compatibility issue in the first place, so I am not
going to discount them. Their technical specifications are impeccably
documented.

I then took a look at the ["HyperDrive USB-C Hub with Mini DisplayPort"][4].
This hit a few good points. It's specifically documented as supporting 4K@60Hz,
pass through power, and 2 USB 2.0 ports. USB 3.0 would be nice, but, I'll take
it.

The only other thing was it really isn't a single "cable" solution. It was just
a little dongle with no cable at all. This was less pleasant because three
thick cables were connected to it, and wrestling it in to place was annoying.
It also meant that I would have three cables across my desk. This problem ended
up being easy to fix with a USB-C extension cable.

{% imgretina caption: 'Cable setup', src: '/images/usbc-cable.jpg' %}

Overall, I'm a tad annoyed by the experience of this. USB-C is confusing and
difficult to find the right components, whereas Thunderbolt is in it's 3rd
iteration and it seems that many of its problems have been addressed since using
the Thunderbolt Display.


[1]: https://www.bourgedesign.com/arc-hub
[2]: https://www.theverge.com/circuitbreaker/2017/5/19/15657792/arc-hub-usb-c-hub-adapter-bourge-design
[3]: https://bourgedesign.com/product/arc-hub/
[4]: https://www.hypershop.com/collections/usb-type-c/products/hyperdrive-usb-type-c-hub-with-mini-displayport
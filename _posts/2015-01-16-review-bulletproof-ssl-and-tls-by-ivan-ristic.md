---
layout: post
title:  "Review: Bulletproof SSL and TLS by Ivan Ristic"
date:   2015-01-16 12:00:00 -0400
categories: General
---

I'm not one to write book reviews very often, in fact that you will see this is
my first one on my blog. However one book has caught my attention, and that is
"[Bulletproof SSL and TLS][1]" by Ivan Ristic. I bought this book with my own
money, and liked the book enough to write a review of it. After giving this book
a thorough read, and some rereading (I'll explain later) I am left with very
good impressions.

This book can be appealing or discouraging in some ways, depending on what you
want. I had a hard time figuring out who the right audience for this book is
because the assumed knowledge varies greatly from chapter to chapter. Part of
this book reads like a clear instruction manual on how to do SSL and TLS right.
The other part of this book is focused a bit more on the guts of TLS and its
history. The latter topic requires a bit of background in general security and
basic concepts in cryptography. While Ristic does a good job trying to explain
some cryptographic primitives, I could see certain parts of this book difficult
to understand for those not versed in those subjects. I think this is especially
noticeable in Chapter 7 on Protocol Attacks.

Other chapters, like 13-16 are clear, well written guides on how best to
configure a web server for TLS. These chapters are especially good because it
helps make informed decisions about what you are actually doing, and why you may
 or may not, want to do certain configurations. Too often I see articles written
 online that are blindly followed, and people aren't making decisions based on
 their needs. He does a good job explaining many of these things, such as what
 protocols you want to support (and why), what cipher suites you should support
 (and why), and other subjects. This is in contrast to websites with very ridged
 instructions on protocol and cipher suite selection that may not be optimal for
 the reader, which just end up getting copied and pasted by the reader. This is
 a much more refreshing take on these subjects.

However I would read the book cover-to-cover if you are interested in these
subjects. Some things might not be extremely clear, but it's enough to get a big
picture view of what is going on in the SSL / TLS landscape.

Another aspect of this book that I really enjoyed was how up-to-date it was. I
opted to get a digital PDF copy of the book during the POODLE promotion week.
It's very surprising to be reading about a vulnerably that occurred in October
2014 in October 2014. That's practically unheard of with most books and
publishers, and this book really stands out because of it. This is why I ended
up rereading parts of the book – it has very up-to-date material.

While I am reluctant to consider myself an expert in anything, I did my best to
configure my own server's TLS before reading this book (enough to be happy with
the protocols, cipher suites, and certificate chain), but by the time I finished
this book I had made a few changes to my own server's configuration, such as
fine-tuning session cache.

My criticisms are weak ones – this is a very good book. Any person that deals
with SSL and TLS on any level should probably read this, or even those that are
just curious.

[1]: http://www.amazon.com/Bulletproof-SSL-TLS-Understanding-Applications/dp/1907117040
---
layout: post
title:  "Writing a Managed Internet Explorer Extension: Part 6 – Regrets"
date:   2012-09-03 12:00:00 -0400
categories: General
---

If you've followed my blog to any degree, you've probably found that I've
written a few posts on Browser Helper Objects (BHOs) that actually got some
attention. A BHO is Internet Explorer's main mechanism way of extending the
browser. Unlike any other browser, writing these is not trivial. They are COM
objects, and either need to be written in native code, or managed code with 
lasses marked as COM Visible. A long time ago, I wrote a post titled, 
[Writing a Managed Internet Explorer Extension: Part 1 – Basics][1].
The first question I
posted to myself was "Managed vs. Native". Ultimately I decided that managed
was the way I wanted to go:

>The .NET Framework had another benefit to me, and that was WPF. My BHO requires
an user interface, and doing that natively isn't as easy or elegant as using
native libraries. Ultimately I decided to go with .NET Framework 4.0, and I can
only recommend the .NET Framework 4.

I sincerely regret my decision to go with managed code, and would encourage
those at this crossroad to go with native.

### Distribution

This BHO wasn't a hobby. Distributing these things isn't nearly as easy as any
other browser. All others, Chrome, Safari, and Firefox, have hosted extension
galleries. Even if you choose not to use a gallery, they all provide neat
extension packages making installation trivial. Internet Explorer does not, so
it was up to us to build an installer, handle all of the nuances between
versions of Windows, handle different bitnesses correctly, etc. Writing the BHO
in managed code introduced a dependency on the .NET Framework 4.0 Client Profile.
Windows 8 is just on the horizon, and it is the first version of Windows to
include a version of the CLR that can run the .NET Framework 4.0. By now, most
organizations have hopefully deployed the .NET Framework 4, but it was an issue
that never went away. "Why do I need a 50 megabyte framework for this?" I
initially dismissed this, but it seemed like our customers actually cared.

### Performance

By far though, the most troublesome part of it was the performance. The BHO
itself was super light and simple with no complex functionality. It was the CLR
itself that introduced problems. The load time, for example, could fluctuate
between "instant" and "crawling". Personally I never saw a load time take above
a tenth of a second, however on some environments it would take up to a quarter
(!) of a second. Internet Explorer will also use a process per-tab, so the
extension needed to be loaded once for every tab. This means each tab took a
quarter of a second to load in the worse cases. Internet Explorer will actually
flag the extension as poor performance and give the user the option to disable
it.

Just the example from the very beginning takes 0.03 seconds to load, on a good
time.

![IE Add On Time][2]

The memory footprint wasn't a good story either. Again, per-tab, the CLR can
carry a 10 MB virtual memory footprint.

All of these may not be real deal breakers depending on your target audience.
But for what? I wanted to use WPF to make a rich configuration option, but
anything I wanted to do in managed code I could have done natively, it just
wasn't my comfort zone. Being comfortable should not cost the user anything.

At the end of it, I ended up rewriting the BHO in native code, and came up with
a much cleaner, faster result. So please, for the users' sake, stop writing BHOs
in managed code.

As a side note, I find it interesting, and confusing, that the Internet Explorer
team will tell you not to write a BHO in managed code, almost exactly for the
reasons I decided not to (there is that "one CLR version per process problem",
but that is an old problem that has been fixed), yet MSDN is happy enough to
provide examples on how to do it. There's a big flag that there is a community
that wants to write extensions for Internet Explorer, but the extensibility of
Internet Explorer is so horrible that people are willing to use tools that are
not recommended simply because its easier.

### More of this series

1. [Writing a Managed Internet Explorer Extension: Part 1 – Basics][1]
1. [Writing a Managed Internet Explorer Extension: Part 2 – DOM Basics][3]
1. [Writing a Managed Internet Explorer Extension: Part 3][4]
1. [Writing a Managed Internet Explorer Extension: Part 4 – Debugging][5]
1. [Writing a Managed Internet Explorer Extension: Part 5 – Working with the DOM][6]
1. Writing a Managed Internet Explorer Extension: Part 6 – Regrets

[1]: /2009/11/18/writing-a-managed-internet-explorer-extension-part-1-basics/
[2]: /images/ieaddontime.png
[3]: /2010/05/31/writing-a-managed-internet-explorer-extension-part-2-dom-basics/
[4]: /2010/06/10/writing-a-managed-internet-explorer-extension-part-3/
[5]: /2010/11/28/writing-a-managed-internet-explorer-extension-part-4-debugging/
[6]: /2010/12/12/writing-a-managed-internet-explorer-extension-part-5-working-with-the-dom/
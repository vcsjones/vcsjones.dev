---
layout: post
title:  "Don't Install .NET 4.6 Just Yet"
date:   2015-07-27 12:00:00 -0400
categories: General
---

Nick Craver and team at Stack Exchange [just published a very interesting bug][1]
they uncovered in RyuJIT.

For those that aren't familiar with RyuJIT, it is a replacement just-in-time
compiler that is shipped as part of the .NET Framework 4.6.

I won't go into detail on the bug, Nick's blog post does a great job on that,
and he includes specific steps to take if you already jumped on the 4.6 train
which involves disabling RyuJIT. To summarize it, under the right circumstances,
a method may be called with parameter values that aren't actually correct. What
it will look like is happening is a method is being called with bogus
parameters. Nick pointed out the specifics on what is actually happening
[in the comments][2].

This has pretty strong consequences, which Nick is right to point out. While
it might be parameter that is more harmless, like `numberOfTimesToBeep`, it could
be a parameter that has very real-world consequences, like
`amountOfMoneyToTransfer`.

[1]: http://nickcraver.com/blog/2015/07/27/why-you-should-wait-on-dotnet-46/
[2]: http://nickcraver.com/blog/2015/07/27/why-you-should-wait-on-dotnet-46/#comment-2159296059
---
layout: post
title:  "Secure Random Integers in .NET Core 3"
date:   2018-10-23 18:35:00 -0400
categories: Security
excerpt: >
  .NET Core 3's secure random integer generation.
---

.NET Core 3.0 is tentatively [set to include][1] a new API for _securely_
generating a random integer bound to a specific range.

I won't be shy in admitting that it was something [I pushed for][2] and made the
initial attempt [at implementing][3], though it's unfair to say that I
implemented it by myself given all of the outstanding feedback I got on the
initial pull request (thanks Levi and Jeremy!)

It's been known for a while that `System.Random` shouldn't be used when
cryptographic randomness is required. Despite that, there wasn't anything built
in to .NET that made creating bounded random integers easy. You could either
use `System.Random` and hope for the best, or use a CSPRNG like
`RandomNumberGenerator` that gave back raw bytes, which requires some thought on
how to to properly convert it to a random integer without introducing any kind
of bias.

Starting in .NET Core 3.0, you'll be able to do:

```csharp
var min = 1;
var max = 1_000;
var randomNumber = RandomNumberGenerator.GetInt32(min, max);
```

If you need this before .NET Core 3, well, [the source][3] is right there. It
can be adapted with a bit of effort to work on the .NET Framework as well as other
environments that don't have `Span<T>`.

[1]: https://apisof.net/catalog/System.Security.Cryptography.RandomNumberGenerator.GetInt32(Int32,Int32)
[2]: https://github.com/dotnet/corefx/issues/30873
[3]: https://github.com/dotnet/corefx/pull/31243

---
layout: post
title:  "FixedTimeEquals in .NET Core"
date:   2018-10-04 18:35:00 -0400
categories: Security
excerpt: >
  Taking a thorough look at .NET Core's FixedTimeEquals and the problem in
  general.
---

.NET Core introduced [`FixedTimeEquals`][1] which I have personally found to be
very helpful. It's a small method, but given the kind of code I tend to write,
I was writing it a lot from project to project, and am happy to see it in the box.

This API is meant to prevent a timing side-channel when comparing two sequences
of bytes. The goal is, the comparison should take the same amount of time regardless
of the contents of the bytes, assuming they are the same length. This is often
required when doing comparisons of MACs or simple possession demonstrations for
APIs.

Consider you had a web API that required an API key and was implemented in such
a way that it just expected a magic string to act as a password to interact with
the API.

It required an HTTP header, like

```
X-Api-Key: SecretVooDooWord
```

and TLS was used to ensure it was kept confidential in transit. The API did
a naive implementation like this:

```csharp
[HttpGet]
public IActionResult SuperSensitiveApi() {
    var key = Request.Headers["X-Api-Key"].Single();
    if (key != "SecretVooDooWord") {
        return Unauthorized();
    }
    return new JsonResult(new { AllTheSecretData = "tada" });
}
```

<aside>
<p>
This is a very problematic design! A much better solution would be to use
something that is well defined and specified for API authentication like OIDC,
WS-*, however you want to accomplish it. At the very least, communicating raw
secrets is much less than ideal. Instead, a <em>proof of possession</em> or
challenge should be used. That still isn't enough to prevent replays and
a myriad of other things that are desirable in API authentication.
</p>
<p>
But lets focus on the timing side channel for now.
</p>
</aside>

The issue here is the `==` is not fixed-timed, and will return false as
soon as there is an immediate difference. In pseudo code, it might look something
like this:

```
compare(word1, word2) {
    if word1.length != word2.length
        return false
    i = 0
    while (i < word1.length)
        letter1 = word1[i]
        letter2 = word2[i]
        if letter1 != letter2
            return false
        else
            i = i + 1
    return true
}
```

This function will compare the letters one by one. As soon as it encounters a
difference, it returns false and doesn't bother checking the rest. Why should it?
The answer is going to be false every time.

To an attacker that is trying to figure out the contents of the string, carefully
measuring the time can leak the contents of the string. For argument's sake,
let's say that checking each letter takes 2ns and the attacker has a very way
of measuring time over a network and can account for jitter and network latency.

<pre>
GET /SuperSensitiveApi HTTP/1.1
X-Api-Key: Raaaaaaaaaaaaaaa
</pre>

Checking the API key will take 2ns because the first letters do not match. The
attacker moves on to the next letter.

<pre>
GET /SuperSensitiveApi HTTP/1.1
X-Api-Key: Saaaaaaaaaaaaaaa
</pre>

This time, checking the API key takes 4ns because the first letter matched (2ns)
and the second failed (another 2ns)

<pre>
GET /SuperSensitiveApi HTTP/1.1
X-Api-Key: Sbaaaaaaaaaaaaaa
</pre>

Fails again taking 4ns to check the API key. After a few more tries...

<pre>
GET /SuperSensitiveApi HTTP/1.1
X-Api-Key: Seaaaaaaaaaaaaaa
</pre>

This time it took 6ns to check the API key because the first and second letter
were checked, and the first failed.

The attacker can keep doing this by observing the amount of time each call
takes. The longer it takes, the attacker can assume they have guessed the next
letter. In practice, this is extremely difficult to do over a network and to get
accurate enough timing information, but it is believed that it might be possible
given enough persistence and an adversary that has the means to be in a network
position that is very stable.

These kinds of attacks do exist, an example timing side-channels is Lucky 13,
which affected many library's approach to handling CBC padding in TLS.

So `==` in C# is a bad was to check strings for equality where timing side
channels need to be mitigated. So you say, perhaps you'll do something like this:

```csharp
private static bool CheckStringsFixedTime(string str1, string str2)
{
    if (str1.Length != str2.Length)
    {
        return false;
    }
    var allTheSame = true;
    for (var i = 0; i < str1.Length; i++)
    {
        if (str1[i] != str2[i])
        {
            allTheSame = false;
        }
    }
    return allTheSame;
}
```

This _looks_ like it's constant time, but on modern CPUs and .NET, it's not.
Branch statements, like `if`, have timing implications. We can't take a branch.

OK, what about this?

```csharp
private static bool CheckStringsFixedTime(string str1, string str2)
{
    if (str1.Length != str2.Length)
    {
        return false;
    }
    var allTheSame = true;
    for (var i = 0; i < str1.Length; i++)
    {
        allTheSame &= str1[i] == str2[i];
    }
    return allTheSame;
}
```

This looks somewhat promising for C#. We know from the language specification
that `&=` does not short circuit, so `str1[i] == str2[i]` will always be
evaluated.

We still have a few problems though, and this is where the JIT and x86 can make
things more complicated for us.

The first issue is that `allTheSame` is a simple true/false flag. That still leaves
the .NET JIT and x86 instruction execution to make a few optimizations that
introduce timing attacks. Timing side channel mitigation should avoid all _decisions_
until the very end. `&` is a decision. However, we can improve that some:


```csharp
private static bool CheckStringsFixedTime(string str1, string str2)
{
    if (str1.Length != str2.Length)
    {
        return false;
    }
    var result = 0;
    for (var i = 0; i < str1.Length; i++)
    {
        result |= str1[i] ^ str2[i];
    }
    return result == 0;
}
```

This is fairly close to being time-fixed. We update an integer using `|` to
combine the bits from the result of an XOR. XOR anything with itself, and the
the result is zero. Anything else, and you get a non-zero value. We use a binary
OR to combine any bits. At the end, if we have a non-zero value, we know one of
the comparison checks failed.

There is some debate as to what arithmetic operators are better for fixed time
operations between `str1[x]` and `str2[x]`. Some implementations use XOR, like
above, other may use SUB for subtraction. Unfortunately, most CPU architectures
make no guarantees if any operations are constant-time.

We _still_ have a problem to address. The JIT could be making unintended
optimizations. The C# compiler itself makes very little optimizations. The JIT
on the other hand may do all sorts of things, like unroll a loop or make a variety
of optimizations so the code executes faster.

 We can tell the JIT to leave it alone, like so.

```csharp
[MethodImpl(MethodImplOptions.NoInlining | MethodImplOptions.NoOptimization)]
private static bool CheckStringsFixedTime(string str1, string str2)
{
    if (str1.Length != str2.Length)
    {
        return false;
    }
    var result = 0;
    for (var i = 0; i < str1.Length; i++)
    {
        result |= str1[i] ^ str2[i];
    }
    return result == 0;
}
```

So now the JIT will cease to optimize this method at all and it will be closer
to as-written.

This is close to time-independent as possible with the String type. We can improve
things a bit by making the parameters `ReadOnlySpan<char>` which will generate
very similar x86 as `string` parameters, however the null checks will be
eliminated since a ROS cannot be null.

This is what .NET Core 2.1's `FixedTimeEquals` does. It just does it over a
`ReadOnlySpan<byte>` instead of characters. The x86 produced by the current JIT
will be identical for `ReadOnlySpan<char>` and `ReadOnlySpan<byte>` with the
exception of the size of the `MOVZX`

It's handy that this is just in the box for .NET Core now.

[1]: https://docs.microsoft.com/en-us/dotnet/api/system.security.cryptography.cryptographicoperations.fixedtimeequals?view=netcore-2.1
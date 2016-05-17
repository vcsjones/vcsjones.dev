---
layout: post
title:  "Compiler warnings are your friend"
date:   2013-10-24 12:00:00 -0400
categories: General
---

I'm a big fan of tooling to speed of development. I'm also an advocate of
ensuring that your tools aren't a crutch – more of a performance enhancer.
Generally, tools such as IDEs, compilers, and code generation, are there to save
time and effort – as long as you understand what they are doing for you.

That's why I'm always surprised when people ignore the help their tool is trying
to give them. A particular one for me is compiler warnings, and people or teams
having hundreds or thousands of compiler warnings.

General responses I get when asked about it are, "Oh, that's just the compiler
complaining, it's safe to ignore them." Problem with that though, is it makes it
impossible to find genuinely helpful compiler warnings in the sea.

![C# Warnings][1]

There are lots of ways to solve the problem with compiler warnings.

One option is to just fix the issue the compiler is warning about. The compiler
warning is making a suggestion, and sometimes (or most of the time) it's right –
so fix the problem. If the compiler tells you a region of code is unused, then
you can remove it safely. These are always the most helpful warnings and why you
want a pristine warning list. Often enough, the compiler will catch something
that's easy to gloss over, such as a double free, precision loss when casting
numeric types, and the like.

Warnings can be ignored, too. Some warnings, you or your team might just not
find helpful, or produce more noise than help. Any good compiler comes with a
way to disable warnings, either with a code pragma for certain regions of code,
or a compiler flag to completely disable the warning. One that comes up for me
often enough is in some places compiler directives are used for DEBUG builds,
which can confuse Visual Studio about code that will never run.

```csharp
#pragma warning disable 0162
#if DEBUG
        return TimeSpan.MaxValue;
#endif
        return new TimeSpan(0,5,0);
#pragma warning restore 0162
```

Normally, Visual Studio would give a compiler warning that the second return
value is unreachable while in debug configuration.

I try to avoid this kind of code in the first place – but sometimes it cannot be
helped. Various other compilers support a similar notion, for example Clang:

```c
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunused-variable"

//Region

#pragma clang diagnostic pop
```

Sometimes compiler warnings are introduced with no clear plan on how to clean
the up, and they'll sit there for ages. A good example might be obsoleting a
method or function that is called in hundreds of places.

```csharp
[Obsolete("This is obsolete and should not be used.")]
public void ObsoleteMethod()
{
        //...
}
```

I'm generally not a fan of obsoleting methods, except in the rare case that
you're an API or SDK provider and you need to inform consumers of your library.
Otherwise, favoring refactoring and completely removing the method is a better
option.

In some circumstances some warnings might be useful as actual errors, too.
Security warnings are generally some that I've taken to escalating to a full
error, such as using strcpy or Objective-C's violation of `self = [super init]`
rule.

In all, I see compiler warnings often ignored when they provide tremendous value
to you or a team. It can be a bit tedious to keep compiler warnings "clean",
but it's well worth the effort.

[1]: /images/csharpwarnings.png
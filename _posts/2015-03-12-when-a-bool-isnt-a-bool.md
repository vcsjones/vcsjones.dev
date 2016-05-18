---
layout: post
title:  "When a bool isn't a bool"
date:   2015-03-12 12:00:00 -0400
categories: General
---

Jared Parsons and I got into an interesting discussion on Twitter, and uncovered
an interesting quirk in the C# compiler.

To begin, Jared already did the heavy lifting of the issue at hand with how a
CLI bool can be defined in his blog post [Not all "true" are created equal][1].
Jared's example is different than mine, here is an independent issue I created
that is the same problem.

```csharp
byte* data = stackalloc byte[2];
data[0] = 1;
data[1] = 2;
var boolData = (bool*)data;
bool a = boolData[0];
bool b = boolData[1];
Console.WriteLine(a); //True
Console.WriteLine(b); //True
Console.WriteLine(a == b); //False
```

Despited both a and b being "true" boolean values, they are not equal to one
another. JavaScript has a similar issue, which is why there is the [not not][2] or
coercion operator. You'd think a similar trick would work in C#:

```csharp
Console.WriteLine(a == !!b);
```

This actually, still, prints out false. Yet this prints out true:

```csharp
var c = !b;
var d = !c;
Console.WriteLine(a == d);
```

Seems like they are identical, no? Semantically they are, but functionally,
they are not. In the former case, the C# compiler is optimizing away the double
negation since it thinks it is pointless. Introducing the intermediate variables
tricks the C# compiler and the double negation is no longer optimized away, thus
the coercion is successful.

This seems to be a rare occurrence where the C# compiler is performing an
optimization that actually alters behavior. Granted, it seems to be an extremely
corner case, but I only found out about it because I actually ran into at one
point. In my option, the removal of the double negation at compile time is a bug.
This optimization does appear to be the C# compiler, not the JIT. The resulting
IL is:

```
IL_001a:  ldloc.2
IL_001b:  ldloc.3
IL_001c:  ceq
IL_001e:  call       void [mscorlib]System.Console::WriteLine(bool)
```

Notice that it just loads the two locals and immediately compares them, it makes
no attempt to invert the value of the third local (which is "b") in this case.

[1]: http://blog.paranoidcoding.com/2012/08/28/not-all-true-are-created-equal.html
[2]: https://stackoverflow.com/questions/784929/what-is-the-not-not-operator-in-javascript

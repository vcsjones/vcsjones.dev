---
layout: post
title: "C# ReadOnlySpan<byte> and static data"
date:   2019-02-01 9:20:00 -0500
categories: General
excerpt: >
  A useful C# feature for static binary data and avoiding copying.
---

Since C# 7 there have been a lot of point releases that contain all kinds of
goodies. Many of them are performance focused, such as safe stack allocations
using `Span<T>`, or interoperability with improvements to `fixed`.

One that I love, but is not documented well, is some special treatment
that `ReadOnlySpan<byte>` gets when its contents are known at compile time.

Here's an example of a lookup table I used to aide with hex encoding that uses
a `byte[]`:

```csharp
private static byte[] LookupTable => new byte[]
{
    (byte)'0', (byte)'1', (byte)'2', (byte)'3', (byte)'4',
    (byte)'5', (byte)'6', (byte)'7', (byte)'8', (byte)'9',
    (byte)'A', (byte)'B', (byte)'C', (byte)'D', (byte)'E',
    (byte)'F',
};
```

This binary data has to get stored _somewhere_ in our produced library. If we
use `dumpbin` we can see it in the .text section of the binary.

```
dumpbin /RAWDATA /SECTION:.text mylib.dll
```

Right at the bottom, we see:

```
00402A40: 30 31 32 33 34 35 36 37 38 39 41 42 43 44 45 46  0123456789ABCDEF
```

I won't go into the a lot of the details on how this data is compiled into the
`.text` section, but at this point we need to get that data into the array
somehow.

If we look at the jit assembly of `LookupTable`, we see:

```
sub rsp, 0x28
vzeroupper
mov rcx, 0x7ffc4638746a
mov edx, 0x10
call 0x7ffc49b52630
mov rdx, 0x1b51450099c
lea rcx, [rax+0x10]
vmovdqu xmm0, [rdx]
vmovdqu [rcx], xmm0
add rsp, 0x28
ret
```

Where `0x7ffc49b52630` is `InitializeArray`.

With an array, our property leans on `InitializeArray`, the source of which is
[in the CoreCLR][1]. For little-endian platforms, it boils down to a `memcpy`
from a runtime field handle.

Indeed, with a debugger we finally see:

```
00007ffd`b18b701a e831a40e00       call    coreclr!memcpy (00007ffd`b19a1450)
```

Dumping `@rdx L10` yields:

```
000001f0`4c552a90  30 31 32 33 34 35 36 37-38 39 41 42 43 44 45 46  0123456789ABCDEF
```

So that was a very long-winded way of saying that when using arrays, initializing
a field or variable with bytes results in `memcpy` from the image into the array,
which results in more data on the heap.

Now, starting in 7.3, we can avoid that `memcpy` when using `ReadOnlySpan<byte>`.


```csharp
private static ReadOnlySpan<byte> LookupTable => new byte[]
{
    (byte)'0', (byte)'1', (byte)'2', (byte)'3', (byte)'4',
    (byte)'5', (byte)'6', (byte)'7', (byte)'8', (byte)'9',
    (byte)'A', (byte)'B', (byte)'C', (byte)'D', (byte)'E',
    (byte)'F',
};
```

Looking at the jit assembly:

```
mov eax, 0x10
xor edx, edx
mov r8, 0x1b5144c0968
mov [rcx], rdx
mov [rcx+0x8], r8
mov [rcx+0x10], eax
mov rax, rcx
ret
```

We see that there is `mov r8, 0x1b5144c0968`. The contents of `0x1b5144c0968`
are:

```
000001b5`144c0968  30 31 32 33 34 35 36 37-38 39 41 42 43 44 45 46  0123456789ABCDEF
```

So we see that the method is now returning the data directly and
omitting the `memcpy` entirely, so our `ReadOnlySpan<byte>` is pointing directly
to the `.text` section.

This currently only works with `ReadOnlySpan<byte>` right now. Other types
will continue to use `InitializeArray` due to needing to handle different
platforms and how they handle endianness.

[1]: https://github.com/dotnet/coreclr/blob/a28b25aacdcd2adb0fdfa70bd869f53ba6565976/src/classlibnative/bcltype/arraynative.cpp#L1377

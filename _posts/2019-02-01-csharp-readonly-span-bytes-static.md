---
layout: post
title: "C# ReadOnlySpan<byte> and static data"
date:   2019-02-01 9:20:00 -0500
modified: 2020-12-31 11:36:00 -0500
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
private static byte[] LookupTable => new byte[] {
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
private static ReadOnlySpan<byte> LookupTable => new byte[] {
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

This works for property getters as shown above, but also as the return of a
method:

```csharp
ReadOnlySpan<byte> GetBytes() {
    return new byte[] { ... };
}
```

Which works similar to the getter of the property. In addition, this also works
for locals in a method body as well:


```csharp
void Write200Ok(Stream s) {
    ReadOnlySpan<byte> data = new byte[] {
        (byte)'H', (byte)'T', (byte)'T', (byte)'P',
        (byte)'/', (byte)'1', (byte)'.', (byte)'1',
        (byte)' ', (byte)'2', (byte)'0', (byte)'0',
        (byte)' ', (byte)'O', (byte)'K'
    };
    s.Write(data);
}
```

Which also produces a reasonable JIT disassembly:

```
sub     rsp, 0x38
xor     eax, eax
mov     qword ptr [rsp+0x28], rax
mov     qword ptr [rsp+0x30], rax
mov     rcx, 0x1e595b42ade
mov     eax, 0x0F
lea     r8, [rsp+0x28]
mov     qword ptr [r8], rcx
mov     dword ptr [r8+8], eax
mov     rcx, rdx
lea     rdx, [rsp+0x28]
cmp     dword ptr [rcx], ecx
call    0x7ff89ede10c8 (Stream.Write(System.ReadOnlySpan`1<Byte>), mdToken: 0000000006000001)
add     rsp, 0x38
ret
 ```

 Here we see  `mov rcx, 0x1e595b42ade` which moves the address of the static
 data directly in to the register with no additional work to create a byte array.

These optimizations currently only works with `ReadOnlySpan<byte>` right now.
Other types will continue to use `InitializeArray` due to needing to handle
different platforms and how they handle endianness.

[1]: https://github.com/dotnet/coreclr/blob/a28b25aacdcd2adb0fdfa70bd869f53ba6565976/src/classlibnative/bcltype/arraynative.cpp#L1377

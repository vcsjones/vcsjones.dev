---
layout: post
title: "Dos and Don'ts of stackalloc"
date:   2020-02-24 00:24:00 -0500
categories: General
excerpt: >
  Span made stackalloc safe-ish to use, but it still has sharp edges.
---

In .NET Core 2.1 a small but well-received feature was the ability to "safely"
allocate a segment of data on the stack, using `stackalloc`, when used with
`Span<T>`.

Before `Span<T>`, `stackalloc` required being in an `unsafe` context:

```csharp
unsafe {
    byte* data = stackalloc byte[256];
}
```

The use of `unsafe` was enough to deter a lot of people from using it that it
remained a relatively niche feature. The introduction of `Span<T>` now means
this can be done without being in an `unsafe` context now:

```csharp
Span<byte> data = stackalloc byte[256];
```

`stackalloc` is desirable in some performance sensitive areas. It can be used
in places where small arrays were used, with the advantage that it does not
allocate on the heap - and thus does not apply pressure to the garbage
collector. `stackalloc` is not a general purpose drop-in for arrays.
They are limited in a number of ways that [other posts][1] explain well enough,
and require the use of `Span<T>`.

Recently I vented a bit `stackalloc` on Twitter, as one does on Twitter, about
`stackalloc`, or more specifically the community's fast embrace of it, without
discussing or well-documenting some of `stackalloc`'s sharp edges. I'm going
to expand on that here, and make an argument for `stackalloc` still being unsafe
and requiring some thought about being used.

### DON'T: Use variable allocation lengths

A large risk with using `stackalloc` is running out of stack space. If you've
ever written a method that it recursive and went too deep, you'll eventually
receive a `StackOverflowException`. The `StackOverflowException` is a bit
special in that it is one of the exceptions that cannot be caught. When a
`StackOverflowException` occurs, the process immediately exits. Allocating too much
with `stackalloc` has the same effect - it causes a `StackOverflowException` and
causes the process to immediately terminate.

This is particularly worrisome when the allocation's length is determined by user
input:

```csharp
Span<char> buffer = stackalloc char[userInput.Length]; //DON'T
```

This allows users to take down your process, an effective denial-of-service.

### DO: Use a constant for allocation size

Instead, it's better to use a constant value for `stackalloc`, always. It
immediately resolves any ambiguities about how much is allocated on the stack.

```csharp
Span<char> buffer = stackalloc char[256]; //better
```

Once you have an allocated buffer, you can use Span's `Slice` funtionality to
adjust it to the correct size:

```csharp
Span<char> buffer = stackalloc char[256];
Span<char> input = buffer.Slice(0, userInput.Length);
```

Using a constant also guards against accidentially trying to stackalloc with a
negative number. For example:

```csharp
int userInput = -1; //DON'T
Span<byte> b = stackalloc byte[userInput];
```

This will also produce a stack overflow. It's important that the amount to be
allocated on the stack is not negative, and a sensible amount.


### DON'T: Use stackalloc in non-constant loops

Even if you allocate a fixed length amount of data on the stack, doing so in a
loop can be dangerous as well, especially if the number of the iterations the
loop makes is driven by user input:

```csharp
for (int i = 0; i < userInput; i++) { // DON'T
    Span<char> buffer = stackalloc char[256];
}
```

This also can cause a denial of service, since this allows someone to control
the number of stack allocations, though not the length of the allocation.

### DO: Allocate outside of loops

```csharp
Span<char> buffer = stackalloc char[256]; //better
for (int i = 0; i < userInput; i++) {
    //Do something with buffer
}
```

Allocating outside of the loop is the best solution. This is not only safer, but
also better for performance.

### DON'T: Allocate a lot on the stack

It's tempting to allocate as much as nearly possible on the stack:

```csharp
Span<byte> data = stackalloc byte[8000 * 1024]; // DON'T
```

You may find that this runs fine on Linux, but fails on Windows with a stack
overflow. Different operating systems, architectures, and environments, have
different stacks limits. Linux typically allows for a larger stack than Windows
by default, and other hosting scenarios such as in an IIS worker process come
with even lower limits. An embedded environment may have a stack of only a few
kilobytes.

### DO: Conservatively use the stack

The stack should be used for small allocations only. How much depends on the
size of each element being allocated. It's also desirable to not allocate many
large structs, either.

I won't prescribe anything specific, but anything larger than a kilobyte is a
point of concern. You can allocate on the heap depending on how much you need.
A typical pattern might be:

```csharp
const int MaxStackSize = 256;
Span<byte> buffer =
    userInput > MaxStackSize
      ? new byte[userInput]
      : stackalloc byte[MaxStackSize];

Span<byte> data = buffer.Slice(0, userInput);
```

This will allocate on the stack for small amounts, still in a constant amount,
or if too large, will use a heap-allocated array. This pattern may also make it
easier to use `ArrayPool`, if you choose, which also does not guarantee that the
returned array is exactly the requested size:

```csharp
const int MaxStackSize = 256;
byte[]? rentedFromPool = null;
Span<byte> buffer =
    userInput > MaxStackSize
    ? (rentedFromPool = ArrayPool<byte>.Shared.Rent(userInput))
    : stackalloc byte[MaxStackSize];

// Use data
Span<byte> data = buffer.Slice(0, userInput);

// Return from pool, if we rented
if (rentedFromPool is object) {
    // DO: if using ArrayPool, think carefully about clearing
    // or not clearing the array.
    ArrayPool<byte>.Shared.Return(rentedFromPool, clearArray: true);
}
```

### DON'T: Assume stack allocations are zero initialized

Most normal uses `stackalloc` result in zero-initialized data. This behavior is
however not guaranteed, and can change depending if the application is built
for Debug or Release, and other contents of the method. Therefore,
don't assume that any of the elements in a `stackalloc`ed `Span<T>` are
initialized to something by default. For example:

```csharp
Span<byte> buffer = stackalloc byte[sizeof(int)];
byte lo = 1;
byte hi = 1;
buffer[0] = lo;
buffer[1] = hi;
// DONT: depend on elements at 2 and 3 being zero-initialized
int result = BinaryPrimitives.ReadInt32LittleEndian(buffer);
```

In this case, we might expect the result to be 257, every time. However if
the `stackalloc` does not zero initialize the buffer, then the contents of the
upper-half of the integer will not be as expected.

This behavior will not always be observed. In Debug builds, it's likely that you
will see that `stackalloc` zero-initializes its contents every time, whereas in
Release builds, you may find that the contents of a `stackalloc` are
uninitialized.

Soon developers will be able to explicitly skip zero-initializing `stackalloc` contents
with the `SkipLocalsInit` feature. Currently, whether or not `stackalloc` is
default initialized is up to Roslyn. This feature will allow more explicit
control over skipping stack allocation initialization.


### DO: Initialize if required

Any item read from a `stackalloc`ed buffer should be explicitly assigned, or
use `Clear` to explicitly clear the entire `Span<T>` and initialize it to
defaults.

```csharp
Span<byte> buffer = stackalloc byte[sizeof(int)];
buffer.Clear(); //explicit zero initialize
byte lo = 1;
byte hi = 1;
buffer[0] = lo;
buffer[1] = hi;
int result = BinaryPrimitives.ReadInt32LittleEndian(buffer);
```

Though not explicitly covered in this post, the same advice applies to arrays
rented from the `ArrayPool`.

### Summary

In summary, `stackalloc` needs to be used with care. Failing to do so can result
in process termination, which is a denial-of-service: your program or web server
aren't running any more.


[1]: https://docs.microsoft.com/en-us/archive/msdn-magazine/2018/january/csharp-all-about-span-exploring-a-new-net-mainstay

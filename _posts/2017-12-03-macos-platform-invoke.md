---
layout: post
title:  "macOS Platform Invoke"
date:   2017-12-03 21:30:00 -0400
categories: General
---

I started foraying a bit in to macOS platform invocation with .NET Core and C#.
For the most part, it works exactly like it did with Windows. However, there are
some important differences between Windows' native APIs and macOS'.

The first is calling convention. Win32 APIs are typically going to be `stdcall`
on 32-bit or the AMD64 calling convention on 64-bit. That may not be true for 3rd
party libraries, but it is true for most (but not all) Win32 APIs.

MacOS' OS provided libraries are overwhelmingly `cdecl` and have a similar but
different calling convention for AMD64 (the same as the System V ABI).

For the most part, that doesn't affect platform invoke signatures that much.
However if you are getting in to debugging with LLDB, it's something to be aware
of.

It does mean that you need to set the `CallingConvention` appropriately on the
`DllImportAttribute`. For example:

```csharp
[DllImport("libcrypto.41",
    EntryPoint = "TS_REQ_set_version",
    CallingConvention = CallingConvention.Cdecl)
]
```

Another point is that MacOS uses the LP64 memory model, whereas Windows uses the
LLP64 for types.

A common Win32 platform invocation mistake is trying to marshal a native `long`
to a managed `long`. The native `long` in Win32 is 32bits, whereas in .NET it is
64-bit. Mismatching them will do strange things to the stack. In Win32 platform
invocation, a native `long` gets marshalled as an `int`. Win32 will use
`long long` or `int64_t` for 64-bit types.

MacOS is different. It's `long` type is platform dependent. That is, on 32-bit
systems the `long` type is 32-bit, and on 64-bit it is 64-bit. In that regard,
the `long` type is most accurately marshalled as an `IntPtr`. The alternative
is to provide two different platform invoke signatures and structs and use the
appropriate one depending on the platform.

Keep in mind with MacOS, MacOS is exclusively 64-bit now. It's still possible
that one day your code will run 32-bit on a Mac as it is still capable of
running 32-bit. At the time of writing even .NET Core itself doesn't support
running 32-bit on a Mac.

```csharp
[DllImport("libcrypto.41",
    EntryPoint = "TS_REQ_set_version",
    CallingConvention = CallingConvention.Cdecl)
]
public static extern int TS_REQ_set_version
(
    [param: In] TsReqSafeHandle a,
    [param: In, MarshalAs(UnmanagedType.SysInt)] IntPtr version
);
```

Using `IntPtr` for the `long` type is a bit of a pain since for, whatever
reason, C# doesn't really treat it like a numeric type. You cannot create
literals of `IntPtr` cleanly, instead having to do something like `(IntPtr)1`.

A final possibility is to make a native shim that coerces the data types to
something consistent, like `int32_t` and have a shim per architecture.

Overall, it's not too much different. Pay attention to the calling convention
and be aware of LP64 over LLP64.
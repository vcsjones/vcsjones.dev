---
layout: post
title:  "How to use SecureString in .NET"
date:   2016-09-23 10:30:00 -0400
categories: Security
hide: true
---

**Don't.** Probably.

Okay, maybe I should elaborate. The `SecureString` class in .NET has been a
source of a lot of questions on StackOverflow. It has the word "secure" in its
name, "secure" seems good, so we should use SecureString!

SecureString is a managed wrapper around the DPAPI APIs in Windows. The idea
of SecureString is that it is a string that is in memory, considered sensitive,
and you don't want it to be exposed in memory leaks or a memory dump, or in any
other scenario where a string in memory is undesirable.

There are a number of problems with this though.

# Construction

Constructing a SecureString in the first place is difficult. A common question
on StackOverflow is "How do I create a SecureString?" an invariably, an answer
like this comes up:

    //Don't do this!
    var secureString = new SecureString();
    var password = Console.ReadLine();
    foreach(var c in password) {
        secureString.AppendChar(c);
    }

This copies the string into a SecureString. Well, except for the problem that
the original string, `password`, is still in memory, clear as water. Since
strings in .NET are immutable, "zeroing" them results in trying to do
something ugly, like pin a managed string and zero it with unmanaged code by
writing over it. In the native world, that is a perfectly valid thing to do. In
.NET, that might not always be the case, such as if the string was interned. The
CLR expected to be in control of a string's memory, and stomping on it can do
unexpected things.

You can reasonably create a SecureString if you use `Console.ReadKey` in a loop,
or have low-level access to a Win32 password box. WPF even goes so far as doing
this out of the box for you by providing a `SecureString` property on
`PasswordBox`.

In web applications, it's downright infeasible to use SecureString on content
that came from a web browser. You couldn't have a `<input type=password>` on a
page and be able to put that in a SecureString, securely. The ASP.NET pipeline
has done so much buffering, copying, and shuffling around of the request's body
that there is no practical way to remove it from the request body.

So let's say you are able to construct a SecureString, securely. Now what?

# Consuming

There are very, very few APIs in the .NET Framework that know how to work with
a SecureString. [`NetworkCredential`][1] is the big one, which is accepted in a
few places, like `LdapConnection`, `WebRequest`, and a few others.

`NetworkCredential` is actually interesting because it prefers storing things in
SecureString, if the platform supports it.

Even the .NET Framework can't always use SecureString. It might just end up
calling `InternalGetPassword` on the `NetworkCredential`, which will just make
a managed copy of the string, anyway, left to be cleaned up by the garbage
collector.

SecureString does work well, relatively speaking, if you are working with an API
that wants a string as a pointer. In that case,
`Marshal.SecureStringToGlobalAllocUnicode` (substitute for the allocator of your
choice) may be useful, as long as you call `Marshal.ZeroFreeGlobalAllocUnicode`
when you're done. This will almost never be the case. In these situations, you
need to carefully put your SecureString back into managed memory, do something
useful with it without it getting copied out of control, then clean everything
up. This is what's involved with say, hashing a SecureString.

    var secureString = new SecureString(); //Assume has password
    var buffer = new byte[secureString.Length * 2];
    var ptr = Marshal.SecureStringToGlobalAllocUnicode(secureString);
    try
    {
        Marshal.Copy(ptr, buffer, 0, buffer.Length);
        using (var sha256 = SHA256.Create())
        {
            var hash = sha256.ComputeHash(buffer);
            //Do something useful with the hash
        } //Dispose on HashAlgorithm zeros internal state 
    }
    finally
    {
        Array.Clear(buffer, 0, buffer.Length);
        Marshal.ZeroFreeGlobalAllocUnicode(ptr);
    }  

Here we copy the SecureString into native memory, copy it in to managed a
managed byte array, hash it, then clear the managed array. Using `Array.Clear`
with overwrite the contents of the array. This however implies that we trust
what `ComputeHash` is doing with the contents of the array though. It could be
creating copies of the byte array without us knowing about it. That depends on
the implementation of SHA256. `SHA256Managed` does a reasonable job of not doing
this, and disposing of the object will clear some internal arrays, also using
`Array.Clear`.

In case it wasn't obvious, our secure string is naked during this process. It
might only be a few moments, but that is the fundamental truth of
`SecureString`. The only way to do anything useful with it is to copy it's clear
form in to memory for controlled, short periods of time. The practical use of
this is it means memory has to be examined at just the right moment for it to be
in cleartext.

So now we have to think about what we're protecting against. If we are trying to
protect against a rogue process being run by the user, remember that a process
cannot read another process's memory without the `PROCESS_VM_READ` permission,
which is usually reserved for elevated processes and debuggers.

If the process is an adminstrator, then it's already game over. SecureString is
the least of your worry. With Administrative permissions, someone could simply
just hook your process and inject code to call
`SecureStringToGlobalAllocUnicode` anyway.

None of this begins to even touch on other problems, like paging to disk. It is
ever-so-slightly possible that the SecureString's contents, while unprotected
for those brief moments, gets paged to disk. Or the system gets hibernated and
written to the hibernation file on disk. It's much more difficult to expunge
data from disks.

To summerize, the security benefit offered by `SecureString` is very small
in contrast to the level of effort to actually use it. There are probably much
more sensitible things to focus this effort on that will yield much better
protection for your users.

[1]: https://msdn.microsoft.com/en-us/library/dd783746(v=vs.110).aspx
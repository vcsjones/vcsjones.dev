---
layout: post
title:  "C# 8 using declarations"
date:   2019-01-30 18:20:00 -0500
categories: General
excerpt: >
  Impressions of the C# 8 preview's using declarations feature.
---

Visual Studio 2019 preview 2 was released a few days ago and I took the time
to install it. Visual Studio itself is actually rather uninteresting to me,
however the inclusion of the next C# 8 preview got my attention. I glanced at
the feature highlights and posted "looks nice" on Twitter.

Predictably, I got a few responses like "I'm not sure I like that", and there is
always a guarantee that if F# has a similar feature, an F# developer will appear
and tell you F# has had this feature for 600 years.

The one I like a lot is using declarations. This allows a local to automatically
be disposed at the end of the block. Essentially, it hides the `try`/`finally`
or the `using() {...}`. The .NET team's blog kind of gave a bad example of this,
so I'll use one from [Open OPC SignTool][1]. Here is the original snippet:

```csharp
private static X509Certificate2 GetCertificateFromCertificateStore(string sha1)
{
    using (var store = new X509Store(StoreName.My, StoreLocation.LocalMachine))
    {
        store.Open(OpenFlags.OpenExistingOnly | OpenFlags.ReadOnly);
        var certificates = store.Certificates.Find(X509FindType.FindByThumbprint, sha1, false);
        return certificates.Count > 0 ? certificates[0] : null;
    }
}
```

A `using var` can make this:

```csharp
private static X509Certificate2 GetCertificateFromCertificateStore(string sha1)
{
    using var store = new X509Store(StoreName.My, StoreLocation.LocalMachine);
    store.Open(OpenFlags.OpenExistingOnly | OpenFlags.ReadOnly);
    var certificates = store.Certificates.Find(X509FindType.FindByThumbprint, sha1, false);
    return certificates.Count > 0 ? certificates[0] : null;
}
```

This has the same effect of `store` having `Dispose` called on it at the end of
the method. The benefit here being that there is less indentation and braces.
This keeps me focused on the code that matters. I don't care when `store` is
disposed in the method, I can just observe that it has a `using` modifier on the
local and be assured that `Dispose` will be called.

This isn't the same as garbage collection or finalizers. Both of those are non-
deterministic, and can lead to unexpected program behavior. That's less so in
the case of `X509Store`, so let's look at another example:

```csharp
using Stream stream = entry.Open();
var xmlDocument = XDocument.Load(stream, LoadOptions.PreserveWhitespace);
return new OpcRelationships(location, xmlDocument, readOnlyMode);
```

Not disposing a stream that is backed by a file can cause access errors later in
software that might try to open that file again - it is already open, so not
only is it a bad idea it leave streams to the GC, it is just simply incorrect.

However again `using` on the local ensures it is deterministically closed.

_When_ it gets disposed I can see being slightly unclear to the developer. The
quick explanation is when the local is no longer reachable, not when it is last
used. The C# 8 above gets compiled roughly to:

```csharp
var stream = entry.Open();
try
{
    var xmlDocument = XDocument.Load(stream, LoadOptions.PreserveWhitespace);
    return new OpcRelationships(location, xmlDocument, readOnlyMode);
}
finally
{
    if (stream != null)
    {
        ((IDisposable)stream).Dispose();
    }
}
```

The disposal is done after the return, when the local is no longer reachable,
not after `XDocument` is created.

I find this very helpful to keep code readable. This doesn't work when you need
fine control over when `Dispose` is called. A place where this does not work
well is when the `Dispose` pattern is used for scopes, such as logging. The
AzureSignTool project has code similar to this in `SignCommand`:

```csharp
var logger = loggerFactory.CreateLogger<SignCommand>();
Parallel.ForEach(AllFiles, options, () => (succeeded: 0, failed: 0), (filePath, pls, state) =>
{
    using (var loopScope = logger.BeginScope("File: {Id}", filePath))
    {
        logger.LogInformation("Signing file.");
        //Sign the file. omit a bunch of other code.
        logger.LogInformation("Done signing the file.");
    }
    logger.LogDebug("Incrementing success count.");
    return (state.succeeded + 1, state.failed);
}
```


Here, we cannot change this to a `using var` because then the `LogDebug` would
be inside of that logging scope, which it wasn't before. This is a place where
we continue to want `Dispose` to be called at a different time from the when
`loopScope` would no longer be in scope.

My impression from C# developers is that they do not tend to call `Dispose` 
on resources as soon as it can be disposed, just at a reasonable point in the
same method. Most developers do not write this code:

```csharp
public bool MightBeExe(string filePath)
{
    var firstBytes = new byte[2];
    int bytesRead;
    using (var file = File.Open(filePath, FileMode.Open))
    {
        bytesRead = file.Read(firstBytes, 0, 2);
    }
    return bytesRead == 2 && firstBytes[0] == (byte)'M' && firstBytes[1] == (byte)'Z';
}
```

They will instead write something like:

```csharp
public bool MightBeExe(string filePath)
{
    using (var file = File.Open(filePath, FileMode.Open))
    {
        var firstBytes = new byte[2];
        var bytesRead = file.Read(firstBytes, 0, 2);
        return bytesRead == 2 && firstBytes[0] == (byte)'M' && firstBytes[1] == (byte)'Z';
    }
}
```

Which is a perfect candidate for `using var`:

```csharp
public bool MightBeExe(string filePath)
{
    using var file = File.Open(filePath, FileMode.Open);
    var firstBytes = new byte[2];
    var bytesRead = file.Read(firstBytes, 0, 2);
    return bytesRead == 2 && firstBytes[0] == (byte)'M' && firstBytes[1] == (byte)'Z';
}
```

There are of course some reasonable limitations to this feature. For example,
it cannot be combined with out-variables.

```csharp
if (Crypto32.CryptEncodeObjectEx(
    // other stuff
    out var handle,
    ref size)
)
{
    using (handle)
    {
        // Do stuff
    }
}
```

This does not work:

```csharp
if (Crypto32.CryptEncodeObjectEx(
    // other stuff
    out using var handle,
    ref size)
)
{
    // Do stuff
}
```

Jared Parsons said [on Twitter][2] that C# folks thought of this, and decided
that it had "Too much confusion about ownership." Thinking about it myself, I
agree, so it's nice that the feature is limited in that regard.

Another limitation is that the variable cannot be reassigned. For example:

```csharp
using var stream = entry.Open();
stream = entry2.Open();
```

This will produce error CS1656, "Cannot assign to 'stream' because it is a
'using variable'".

All in all, I very much like this small feature in C# 8. It has reasonable guard
rails on it from doing something too weird like re-assigning to it, while giving
the benefit of less blocks, braces, indentation.

[1]: https://github.com/vcsjones/FiddlerCert
[2]: https://twitter.com/jaredpar/status/1088832515861663744
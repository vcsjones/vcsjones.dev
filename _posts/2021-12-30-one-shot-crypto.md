---
layout: post
title: ".NET's Cryptographic One-Shots"
date:   2021-12-30 15:00:00 -0500
categories: General
excerpt: >
  .NET's cryptographic APIs have improved over the years. Here's a look at how.
---

Over the past few releases in .NET, formerly .NET Core, there has been progress
on making cryptographic primitives like AES, SHA, etc. better for developers to
use.

"Better" is an interesting point of conversation with cryptographic API design.
To a developer, better may mean more throughput, less allocations, or a simply
less cumbersome API. To a framework or library author, it means thinking about
how developers will use, or mis-use, an API.

Let's look at AES encryption as it was in the .NET Framework days:

```csharp
using System.Security.Cryptography;

byte[] data = default;

using (Aes aes = Aes.Create())
{
    byte[] key = default; // Get a key from somewhere
    byte[] iv = default; // Get a unique IV from somewhere

    using ICryptoTransform transform = aes.CreateEncryptor(key, iv);
    byte[] encrypted = transform.TransformFinalBlock(data, 0, data.Length);
}
```

This may only be a dozen or so lines of a code, but not all of it is straight
forward. What is a "transform"? What is a "block"? What does "final" mean?

The APIs expose quite a bit of functionality, and are confusingly
named. `TransformFinalBlock` for example, despite having "Block" in it's name,
is almost always going to be capable of encrypting more than one block. It also
means the data doesn't need to be block aligned, so it handles padding
appropriately. Since none of that may be understood, developers often times work
around perceived problems, like handling individual blocks. While this API design
offers the most flexibility for developers, it also offers the most complexity.

This complexity exists for a small group of people. Most developers have some
small amount of data they want to encrypt, and when they don't, they have a `Stream`.

Complex APIs that are prone to misuse are problematic in a security context.
A misused cryptographic API almost always harms intended goal of the cryptographic
API, whether that be secrecy, integrity, etc.

For .NET, this became a concern when AES GCM and CCM were exposed in .NET Core 3.1.
The `AesGcm` and `AesCcm` classes do not follow the design of AES prior. In addition
to not inheriting from `Aes` or `SymmetricAlgorithm`, they also do not expose any
block functionality. This was [discussed at length][1], and instead these types
offer simple `Encrypt` or `Decrypt` APIs that takes data and return data, or write
to an existing buffer.

This, while less flexible, resolves many concerns about misusing the AES GCM cipher
mode. Primarily among those concerns was releasing unauthenticated data.
Streaming decryption is, put simply, difficult to do safely.

"Streaming" decryption doesn't necessarily mean the use of `System.IO.Stream`.
Rather, it means processing a block of plaintext or ciphertext a block at a time
and doing something with it in the middle of encrypting or decrypting. This is
often perceived as desirable when handling large amounts of data. After all, if
I have a 12 gigabyte file, I can't just put that in a byte array and encrypt it.
Rather, processing it in chunks lets me handle it in memory.

In pseudo code, let's say I wanted to decrypt a file and send it over the network:

```ruby
# NOTE: This is an example of doing things improperly
encryptedFileStream = getFile()
stream = getStream()

loop {
    data = encryptedFileStream.read(128 / 8) # One AES block size

    if (data.length == 128 / 8) {
        stream.write(decrypt(data))
    }
    else {
        stream.write(decryptFinal(data))
        stream.close()
        break
    }
}
```

Recall though that AES GCM is _authenticated_. That is, AES GCM can tell if your
ciphertext has been modified while in storage or in transit. An important detail
of this though is that
**GCM cannot authenticate until it has processed the entire ciphertext** (when
`decryptFinal` is called.)

This is breaks down because as we are decrypting, we're sending (releasing) the
plaintext before AES GCM has been able to authenticate the entire cipher text.
If the person, tool, whatever on the other end of the network is processing that
decrypted data in real time, then they have processed unauthentic data and it's
too late to go back and tell them "Never mind, that data I send you a few seconds
ago might have been tampered with."

There are correct ways to do this, but are also still difficult to do
correctly. You could break the file up in to small chunks and treat them as individual
ciphertexts. However then you need to worry about many nonces, ensuring chunks are
processed in the right order, a chunk isn't missing, or replayed, etc.

Before long you've invented a cryptographic protocol. This is largely why many
folks will recommend using something that is well understood and robust rather
than trying to build it yourself. Though not a primitive cipher, this kind of
problem falls in the "roll your own cryptography" bucket.

It's rather easy to accidentally roll your own cryptography, especially so when
working with "streaming" data.

In .NET then, AES GCM and CCM do not support encrypting individual blocks.
This still does not solve the issue of ensuring chunks are handled appropriately
when handling large amounts of data. For that, higher level tools are still
recommended. However it removes the temptation for streaming AES GCM,
for which any attempt to use is almost always incorrect. Since it is very difficult
to use correctly with no practical use cases, it isn't offered.

### Toward Better APIs

Simple APIs are important to making them misuse resistent, and .NET has gotten
better at that over the past few releases.

Like `AesGcm`, the `SymmetricAlgorithm` and its derivatives like `Aes`,
`TripleDES`, etc. all offer similar one-shot APIs starting in .NET 6 in the form
of `EncryptCbc`, `EncryptEcb` or `DecryptCbc` and `DecryptEcb`.

```csharp
using System.Security.Cryptography;

byte[] data = default;

using (Aes aes = Aes.Create())
{
    byte[] key = default; // Get a key from somewhere
    byte[] iv = default; // Get a unique IV from somewhere

    aes.Key = key;

    // Encrypt all the data at once
    byte[] encrypted = aes.EncryptCbc(data, iv);
}
```

There is no `ICryptoTransform` that needs to be reasoned about or disposed, and
there is no need to worry about blocks, padding, etc. Where possible, one shots
have been added in most places, and made static where possible.

For hashing, prior to .NET 5 it would look something like this:

```csharp
// Prior to .NET 5
using System.Security.Cryptography;

byte[] data = default; // Some data

using (SHA256 hash = SHA256.Create())
{
    byte[] digest = hash.ComputeHash(data);
}
```

Rather than creating an instance of a hash algorithm, [`HashData`][hash] now exists:

```csharp
// Starting in .NET 5
using System.Security.Cryptography;

byte[] data = default; // Some data
byte[] digest = SHA256.HashData(data);
```

This is much easier to reason about. The method is static, there is no stateful
hash object that needs to be instantiated, no need to remember to dispose of it,
and no need to worry about thread safety. Not only are the one shots easier to
use, they almost always offer better performance, either in throughput or
reduced allocations. These one shots are not simple wrappers around
`HashAlgorithm.Create()` and then hashing something. They internally do not
allocate on the managed heap at all. Everyone benefits here: the APIs are
simpler, and developers get better performance.

For .NET 6, the one shot hashing APIs were brought to the [`HMAC`][hmac] classes as well,
offering the same improved APIs and better performance.

Also for .NET 6 PBKDF2 got the same treatment with [`Rfc2898DeriveBytes.Pbkdf2`][pbkdf2].

```csharp
using System.Security.Cryptography;

byte[] salt = RandomNumberGenerator.GetBytes(32);
byte[] prk = Rfc2898DeriveBytes.Pbkdf2(
    userPassword,
    salt,
    iterations: 200_000,
    HashAlgorithmName.SHA256,
    outputLength: 32);
```

All of these APIs also offer modern amenities, like working `ReadOnlySpan<byte>`
for input data and being able to write to a `Span<byte>` for output data.

I'm happy with .NETs move toward easier to use APIs for cryptographic primitives.
I still largely believe many developers should use higher level concepts rather
than these basic building blocks. However, for those that need the building blocks,
they are getting better.

[1]: https://github.com/dotnet/runtime/issues/27348
[pbkdf2]: https://docs.microsoft.com/en-us/dotnet/api/system.security.cryptography.rfc2898derivebytes.pbkdf2?view=net-6.0
[hmac]: https://docs.microsoft.com/en-us/dotnet/api/system.security.cryptography.hmacsha256.hashdata?view=net-6.0
[hash]: https://docs.microsoft.com/en-us/dotnet/api/system.security.cryptography.sha256.hashdata?view=net-6.0
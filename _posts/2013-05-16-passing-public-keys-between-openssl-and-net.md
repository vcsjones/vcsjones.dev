---
layout: post
title:  "Passing Public Keys Between Objective-C OpenSSL and .NET"
date:   2013-05-16 12:00:00 -0400
categories: General
---

I had a bit of a fun time working on a simple key exchange mechanism between C#
and Objective-C using OpenSSL. My goal was on the Objective-C side to generate a
public/private key pair, and pass the public key to C# in a way that I could use
it to encrypt small amounts of data (like a symmetric key).

This proved to be a little challenging to me, as I didn’t want to resort to using
a 3rd party solution in .NET like BouncyCastle or a managed OpenSSL wrapper.
Turns out, it’s not that hard, if just a little under-documented. Starting with
Objective-C, here’s how I am generating an RSA key pair.

Assuming you have an RSA* object from OpenSSL, you can export the public key
like so:

```objective_c
-(NSData*)publicKey {
    int size = i2d_RSAPublicKey(_rsa, NULL);
    unsigned char* temp = OPENSSL_malloc(size);
    //the use of a temporary variable is mandatory!
    unsigned char* copy = temp;
    int keySize = i2d_RSAPublicKey(_rsa, &copy);
    NSData* data = nil;
    if (keySize > 0) {
        data = [[NSData alloc] initWithBytes:temp length:keySize];
    }
    OPENSSL_free(temp);
    return data;
}
```
*For illustrative purposes: Don’t forget to do error checking!*

So now we have an NSData, but how is this public key actually stored? How can
I use this in .NET?

The first thing to understand is the format by what format `i2d_RSAPublicKey`
exports data. This exports the data in ASN.1 DER format, and getting that into
an `RSACryptoServiceProvider` is possible with no 3rd party support.

```csharp
private static readonly byte[] _nullAsnBytes = new byte[] {0, 5};

public RSACryptoServiceProvider GetCryptoServiceProvider(byte[] asnDerPublicKey)
{
    const string RSA_OID = "1.2.840.113549.1.1.1";
    var oid = new Oid(RSA_OID);
    var asnPublicKey = new AsnEncodedData(oid, asnDerPublicKey);
    var nullAsnValue = new AsnEncodedData(_nullAsnBytes);
    var publicKey = new PublicKey(oid, nullAsnValue, asnPublicKey);
    return publicKey.Key as RSACryptoServiceProvider;
}
```

The 1.2.840.113549.1.1.1 value is the [OID for RSA][1], or the actual header name
szOID_RSA_RSA. We use a ASN.1 value of null (`{0, 5}`) for the parameters, and 
hen we pass the AsnEncodedData to the PublicKey class, from which we can obtain
an RSACryptoServiceProvider from the public key.

Together, these two code snippets allow working with RSA public keys in
Objective-C (iOS or Mac) and in .NET.

[1]: https://msdn.microsoft.com/en-us/library/windows/desktop/aa381133(v=vs.85).aspx
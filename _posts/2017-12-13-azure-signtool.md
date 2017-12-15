---
layout: post
title:  "Azure SignTool"
date:   2017-12-13 20:20:00 -0500
categories: General
---

A while ago, Oren Novotny and I started exploring the feasibility of doing
Authenticode signing with Azure Key Vault. Azure Key Vault lets you do some
pretty interesting things, including which lets you treat it as a pseudo
network-attached HSM.

A problem with Azure Key Vault though is that it's an HTTP endpoint. Integrating
it in to existing standards like CNG or PKCS#11 hasn't been done yet, which
makes it difficult to use in some cases. Specifically, tools that wanted to use
a CSP or CNG provider, like Authenticode signing.

Our first attempt at getting this working was to see if we could use the
existing signtool. A while ago, I wrote about using some
new options in signtool that let you sign the digest with whatever you want in
my post [Custom Authenticode Signing][1].

This made it possible, if not a little unwieldy, to sign things with
Authenticode and use Azure Key Vault as the signing source. As I wrote,
the main problem with it was you needed to run signtool twice and also develop
your own application to sign a file with Azure Key Vault. The steps went
something like this.

1. Run signtool with `/dg` flag to produce a base64-encoded digest to sign.
1. Produce signature for that file using Azure Key Vault using custom tool.
1. Run signtool again with `/di` to ingest the signature.

This was, in a word, "slow". The dream was to be able to produce a
signing service that could sign files in bulk. While a millisecond or two may
not be the metric we care about, this was costing many seconds. It also let us
feeling like the solution was held together by shoestrings and bubblegum.

## /dlib

However, signtool mysteriously mentions a flag called `/dlib`. It says it combines
`/dg` and `/di` in to a single operation. The documentation, in its entirety,
is this:

>Specifies the DLL implementing the AuthenticodeDigestSign
>function to sign the digest with. This option is equivalent
>to using SignTool separately with the /dg, /ds, and /di switches,
>except this option invokes all three as one atomic operation.

This lacked a lot of detail, but it seems like it is exactly what we want.
We can surmise though that the value to this flag is a path to a library that
exports a function called `AuthenticodeDigestSign`. That is easy enough to do.
However, it fails to mention what is passed to this function, or what we
should return to it.

This is not impossible to figure out if we persist with `windbg`. To make a
long story short, the function looks something like this:

```c
HRESULT WINAPI AuthenticodeDigestSign(
    CERT_CONTEXT* certContext,
    void* unused,
    ALG_ID algId,
    BYTE* pDigestToSign,
    DWORD cDigestToSign,
    CRYPTOAPI_BLOB* signature
);
```

With this, it was indeed possible to make a library that `signtool` would call
this function for signing the digest. Oren put together a C# library that did
exactly that on GitHub under [KeyVaultSignToolWrapper][2]. I even made some
decent progress on a [rust implementation][3].

This was a big improvement. Instead of multiple invocations to signtool, we can
do this all at once. This still presented some problems though. The first
being that there was no way to pass any configuration to it with signtool.
The best we could come up with was to wrap the invocation of signtool and set
environment variables in the signtool process, and let this get its configuration
from environment variables, such as which vault to authenticate to, and how
to authenticate. A final caveat was that this still depended on signtool.
Signtool is part of the Windows SDK, which technically doesn't allow us to
distribute it in pieces. If we wanted to use signtool, we would need to install
parts of the entire Windows SDK.

## SignerSignEx3

Later, I [noticed][4] that Windows 10 includes a
new signing API, `SignerSignEx3`. I happened upon this when I was using windbg
in `AuthenticodeDigestSign` and saw that the caller of it was `SignerSignEx3`,
not signtool. I checked out the exports in `mssign32` and did see it as a new
export starting in Windows 10. The natural conclusion was that Windows 10 was
shipping a new API that is capable of using callbacks for signing the digest
and signtool wasn't doing anything special.

As you may have guessed, `SignerSignEx3` is not documented. It doesn't exist in
Microsoft Docs or in the Windows SDK headers. Fortunately, `SignerSignEx2` was
documented, so we weren't starting from scratch. If we figured out `SignerSignEx3`,
then we could skip signtool completely and develop our own tool that does this.

`SignerSignEx3` looks very similar to `SignerSignEx2`:


```c
// Not documented
typedef HRESULT (WINAPI *SignCallback)(
    CERT_CONTEXT* certContext,
    PVOID opaque,
    ALG_ID algId,
    BYTE* pDigestToSign,
    DWORD cDigestToSign,
    CRYPT_DATA_BLOB* signature
);

// Not documented
typedef struct _SIGN_CALLBACK_INFO {
    DWORD cbSize;
    SignCallback callback;
    PVOID opaque;
} SIGN_CALLBACK_INFO;

HRESULT WINAPI SignerSignEx3(
    DWORD                  dwFlags,
    SIGNER_SUBJECT_INFO    *pSubjectInfo,
    SIGNER_CERT            *pSignerCert,
    SIGNER_SIGNATURE_INFO  *pSignatureInfo,
    SIGNER_PROVIDER_INFO   *pProviderInfo,
    DWORD                  dwTimestampFlags,
    PCSTR                  pszTimestampAlgorithmOid,
    PCWSTR                 pwszHttpTimeStamp,
    PCRYPT_ATTRIBUTES      psRequest,
    PVOID                  pSipData,
    SIGNER_CONTEXT         **ppSignerContext,
    PCERT_STRONG_SIGN_PARA pCryptoPolicy,
    SIGN_CALLBACK_INFO     *signCallbackInfo,
    PVOID                  pReserved
);
```

_Reminder_: These APIs are undocumented. I made a best effort at reverse
engineering them, and to my knowledge, function. I do not express any guarantees
though.

There's a little more to it than this. First, in order for the callback
parameter to even be used, there's a new flag that needs to be passed in.
The value for this flag is `0x400`. If this is not specified, the
`signCallbackInfo` parameter is ignored.

The usage is about what you would expect. A simple invocation might work like
this:

```c
HRESULT WINAPI myCallback(
    CERT_CONTEXT* certContext,
    void* opaque,
    ALG_ID algId,
    BYTE* pDigestToSign,
    DWORD cDigestToSign,
    CRYPT_DATA_BLOB* signature)
{
    //Set the signature property
    return 0;
}

int main()
{
    SIGN_CALLBACK_INFO callbackInfo = { 0 };
    callbackInfo.cbSize = sizeof(SIGN_CALLBACK_INFO);
    callbackInfo.callback = myCallback;
    HRESULT blah = SignerSignEx3(0x400, /*omitted*/ callbackInfo, NULL);
    return blah;
}
```

When the callback is made, the `signature` parameter must be filled in with
the signature. It must be heap allocated, but it can be freed after the call
to `SignerSignEx3` completes.

## APPX

We're not quite done yet. The solution above works with EXEs, DLLs, etc - it
does not work with APPX packages. This is because signing an APPX requires some
additional work. Specifically, the APPX [Subject Interface Package][6] requires
some additional data be supplied in the `pSipData` parameter.

Once again we are fortunate that there is [some documentation][7] on how this works
with `SignerSignEx2`, however the details here are incorrect for `SignerSignEx3`.

<aside>
<p>Quick detour: if you're wondering why APPXs need special data passed to the SIP, it's
because the SIP itself also performs signature operations, such as signing a
catalog file that goes in the signed APPX. Under normal circumstances, the SIP
does not have enough information to do signing operations. It's geared toward
digesting the file and embedding the digest.</p>

<p>In order for the SIP to get the information needed to perform signing operations,
SignerSignEx2 is allowed to pass in an opaque pointer that gets passed along
to the SIP. The APPX SIP basically wants every parameter passed to
SignerSignEx2 passed in to it as a struct. This gives the SIP the parameters
it needs to make its own invocations of SignerSignEx2.</p>
</aside>

Unfortunately, the struct shape is not documented for `SignerSignEx3`.

To the best of my understanding, `SIGNER_SIGN_EX3_PARAMS` structure should look
like this:

```c
typedef _SIGNER_SIGN_EX3_PARAMS {
    DWORD                   dwFlags;
    SIGNER_SUBJECT_INFO     *pSubjectInfo;
    SIGNER_CERT             *pSigningCert;
    SIGNER_SIGNATURE_INFO   *pSignatureInfo;
    SIGNER_PROVIDER_INFO    *pProviderInfo;
    DWORD                   dwTimestampFlags;
    PCSTR                   pszTimestampAlgorithmOid;
    PCWSTR                  pwszTimestampURL;
    CRYPT_ATTRIBUTES        *psRequest;
    SIGN_CALLBACK_INFO      *signCallbackInfo;
    SIGNER_CONTEXT          **ppSignerContext;
    CERT_STRONG_SIGN_PARA   *pCryptoPolicy;
    PVOID                   pReserved;
} SIGNER_SIGN_EX3_PARAMS;
```

If you're curious about the methodology I use for figuring this out, I documented
the process in the [GitHub issue][8] for APPX support. I rarely take the time to
write down _how_ I learned something, but for once I managed to think of my
future self referring to it. Perhaps that is worthy of another post on another
day.

## Quirks

`SignerSignEx3` with a signing callback seems to have one quirk: it cannot
be combined with the `SIG_APPEND` flag, so it cannot be used to append
signatures. This seems to be a limitation of `SignerSignEx3`, as `signtool` has
the same problem when using `/dlib` with the `/as` option.

## Conclusion

It's a specific API need, I'll give you that. However, combining this with
Subject Interface Packages, Authenticode is extremely flexible. Not only what it
can sign, but now also how it signs.

AzureSignTool's [source][5] is on GitHub, MIT licensed, and has C# bindings.

[1]: https://vcsjones.com/2017/05/07/custom-authenticode-signing/
[2]: https://github.com/onovotny/KeyVaultSignToolWrapper
[3]: https://github.com/vcsjones/AzureKeyVaultSignTool/blob/master/src/lib.rs
[4]: https://twitter.com/vcsjones/status/861578775720583168
[5]: https://github.com/vcsjones/AzureSignTool/blob/d24b0443f57b1f8c2875c7e199bc4c822a5e7473/AzureSignTool/Interop/mssign32.cs#L9
[6]: https://vcsjones.com/2017/08/10/subject-interface-packages/
[7]: https://msdn.microsoft.com/en-us/library/windows/desktop/jj835834(v=vs.85).aspx
[8]: https://github.com/vcsjones/AzureSignTool/issues/2#issuecomment-327606234
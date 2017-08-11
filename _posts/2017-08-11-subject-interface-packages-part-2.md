---
layout: post
title:  "Subject Interface Packages - Part 2"
date:   2017-08-11 15:00:00 -0400
categories: Security
---

In [part 1 of Subject Interface Packages][1], we left off being able to sign
a custom file type, but not verify it. Here we are going to implement the two
functions to perform verification.

This is in some ways, the reverse of what we did in the previous part. Instead
of injecting the signature data in to the file, we need to extract it, and
instead of creating a digest, we need to create and compare the digest.

# Get Signed Data Message

The last part we did was "putting" the signature data, now we need to do the
reverse. Given a file handle, get the signed data message.

```c
BOOL WINAPI PngCryptSIPGetSignedDataMsg(
    SIP_SUBJECTINFO *pSubjectInfo,
    DWORD* pdwEncodingType,
    DWORD dwIndex,
	DWORD *pcbSignedDataMsg,
    BYTE *pbSignedDataMsg
)
```

The purpose of this function is that upon successful completion,
`pbSignedDataMsg` will point to the signed data message that we embedded in the
file with `CryptSIPPutSignedDataMsg`.

Other things that will need to be set is the `pcbSignedDataMsg` which is the
size of the signed data message, and `pdwEncodingType` which is the encoding
type.

We can knock out `pdwEncodingType` easily because we can set it to an either/or
as we see in many of the other CMS APIs:

```c
//TODO: validation
*pdwEncodingType = X509_ASN_ENCODING | PKCS_7_ASN_ENCODING;
```

The authenticode process will call this function twice. Once with
`pbSignedDataMsg` pointing to NULL, and it is expected that `pcbSignedDataMsg`
will be set with the size of the buffer that Win32 should allocate. The second
call to the function will have `pbSignedDataMsg` pointing to a buffer of
memory that is at least as big as the the indicated size from the first call.

A pseudo-code implementation would look something like this:

```c
BOOL WINAPI PngCryptSIPGetSignedDataMsg(
    SIP_SUBJECTINFO *pSubjectInfo,
    DWORD* pdwEncodingType,
    DWORD dwIndex,
	DWORD *pcbSignedDataMsg,
    BYTE *pbSignedDataMsg
) {
    //TODO: validation
    *pdwEncodingType = X509_ASN_ENCODING | PKCS_7_ASN_ENCODING;
    if (NULL == pbSignedDataMsg) {
        DWORD size;
        if (GetSignedDataMsgSize(pSubjectInfo->hFile, &size)) {
            *pcbSignedDataMsg = size;
            return TRUE;
        }
        return FALSE;
    }
    return GetSignedDataMsg(pSubjectInfo->hFile, pcbSignedDataMsg, pbSignedDataMsg));
}
```

Where `GetSignedDataMsg` will fill `pbSignedDataMsg` with the data message.

You don't have to do any verification with this. Internally, Win32 will use
`CryptVerifyMessageSignature` to verify the message and integrity of the
signature itself.

If you are having trouble at this step, it's worth pointing out that you can
call `CryptVerifyMessageSignature` yourself at this point to verify that you're
extracting the signature from the file. You should also be able to run this
through an ASN.1 decoder and see properly decoded output.

It should also be byte-for-byte identical to the "put" operation in part 1,
so you can compare a these two steps.

# Verify Indirect Data

The last step is to verify the hash that was signed.

```c
BOOL WINAPI PngCryptSIPVerifyIndirectData(
    SIP_SUBJECTINFO *pSubjectInfo,
    SIP_INDIRECT_DATA *pIndirectData)
```

The first parameter gives us information about the file being verified. In this
step you will need to re-hash the file, just the same way that was done in the
very beginning. You then need to compare this hash with
`pIndirectData->Digest.pbData`.

If the hashes match, you should return TRUE and use `SetLastError` to
`ERROR_SUCCESS` to indicate the hash is correct. If the hashes are *not* equal,
you should return FALSE and use `TRUST_E_SUBJECT_NOT_TRUSTED` with
`SetLastError` to indicate that there was no unexpected error, just that the
signatures do not match.

`pIndirectData->Digest` will contain the digest algorithm. Valid that it is
correct, and that the parameters are what you expect. In cases for digests used
for authenticode digests, the parameters will either be a literal NULL or more
likely, {0, 5} as an ASN.1 NULL.

# Final Thoughts

This is a rough beginning on writing a SIP. As mentioned in the first post, a
[GitHub project][2] for a PNG SIP exists and can perform these basic operations.
As a reminder, this code exists for demonstration purposes, and not for any
real-world use.

There is still plenty to do in later parts. As of now, we cannot:

* Remove a signature
* Timestamp
* Dual Sign
* Seal

I hope to get to these soon for this project. More curiously, a slightly-related
subject has me firmly in the came that this can be done in Rust. I don't think
it's a stretch either or an abuse. Rust seems well suited for the task without
going down to C or C++.

The last part, sealing, is a ways off, because the details of sealing signatures
is not public yet, and are known only due to some careful inspection.

[1]: /2017/08/10/subject-interface-packages/
[2]: https://github.com/vcsjones/PngSip
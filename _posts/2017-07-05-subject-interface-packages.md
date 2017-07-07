---
layout: post
title:  "Subject Interface Packages"
date:   2017-07-05 15:00:00 -0400
categories: Security
hide: true
---

I tend to monkey around with Authenticode a lot. While I have a few
[criticisms][1] of it, my outlook for it is positive and I think there are
thing coming that will make it [even better][2].

An often overlooked feature of Authenticode is its extensibility. Did you know,
for example, that you can extend Authenticode to allow it to sign and verify a
file format of your choosing? Or that the ability to do this goes all the way
back to Windows XP?

It's not an often needed feature. After all, Authenticode already covers the
big formats needed, such as EXE, MSI, etc. Extending Authenticode in such a way
has limited practicality, especially because it requires software to be
installed on the machine to make it work. Even then, the documentation for such
a thing is sparse, and examples don't seem to exist.

This is a long post that is going to attempt to explain how to do this, and it
all starts with Subject Interface Packages, or SIP for short. If you can develop
a SIP, then you can teach Authenticode new file formats, including giving
`signtool` the knowledge to sign a file, and Explorer the ability to show the
"Digital Signatures" tab on a file.

To help make this a bit more digestible, I included a fully-functioning SIP for
signing PNG files over [on GitHub][3].

# SIP Basics

Under the covers, Windows's signing operations uses `SignerSignEx*` to
Authenticode sign files. The most recent versions of Windows use `SignerSignEx3`,
while older ones use `SignerSignEx2`.

A typical signing operation, loosely, has a few key phases.

First, a digest of the file needs to be made. This isn't quick and simple as
"hash the whole file" as we'll see later, but something as close as possible to
that needs to be done.

Second, the digest needs to be signed. In Authenticode, this is done with CMS
style messages that result in a big chunk of PKCS#7 data.

Third, and finally, the CMS message needs to be embedded in the file, somehow.
The embedded signature should not affect the behavior of the file.

The first and third parts are where the format of the file, or *subject*, come
in. Authenticode doesn't know how to canonically hash every file it encounters,
and it doesn't know how to safely embed the signature in the file. The
verification process works similarly, except backwards. The signature is
extracted and validated. The file is re-hashed, and the hashes are compared.

A SIP allows you to extend the first and third steps, but not the second. A SIP
does not allow you to modify the entire Authenticode process, though there are
some ways (to be discussed another day) to allow modifying the actual signing
step. This means a SIP does not allow you to to do something other than
Authenticode or support any possible digital signing scheme, like XmlDSig.
It's still Authenticode-style CMS signature and SignerSignEx does step two for
you, including the certificate selection, private key locating, etc.

Developing a SIP has a few requirements of the file format itself, mainly that
the file format needs to support some way of embedding the signature without
breaking the file itself.

Using PNG as an example, I can't just put the signature at the end of the file.
An image viewer would see those bytes, and not know what to do with them, and
assume the file is corrupt. Fortunately for us, the designers of PNG thought
the format should provide some extensibility, so we can continue. However for
other formats that have no concept of metadata, embedding the
Authenticode signature may not be possible. You can still used detached
signatures at this point, but that's for another time.

# SIP Structure

A SIP is little more than a native DLL. There needs to be a way to register
and un-register it, and it needs to implement the bare minimum of SIP
functionality by exporting a few functions.

During registration phase, a SIP needs to declare what it can, and cannot do.
There are at least five things the SIP *must* do.
For our PNG SIP on GitHub, we implement the bare requirements, but
I'll continue to develop it and write new posts as I make more progress.

A SIP needs to perform these five things.

1. It needs to identify if it is capable of handling a particular file.
1. It needs to support digesting the file.
1. It needs to support embedding the signature.
1. It needs to support extracting the signature.
1. It needs to support verifying the signature.

Once we can do those five things, we can round trip a signature.

I decided to write mine in C, but as long as your abide by the Win32 ABI and
calling conventions, you can write a SIP in any language you would like. I am
keen to try doing this in Rust myself.

Optionally, the registration functionality may or may not be part of the library
itself. You could write an external program that knows how to register the SIP,
or the library could implement `Dll(Un)RegisterServer` and then use `regsvr32`
to do the registration.

It's also worth pointing out that you will want a 32-bit and a 64-bit version
of your SIP, and you will need to register it twice, once as 64-bit, and another
as 32-bit.

The final aspect of SIP will be a unique GUID for it. This GUID should be the
same for all platforms.

Before we can start writing code, we need to get a project in to a compilable
state. You'll need a variety of headers, but you'll also want to make sure you
link against the following libraries for our project:

* Crypt32.lib
* BCrypt.lib
* NCrypt.lib

The main feature headers are `Mssip.h` and `wincrypt.h`. Those two you may
want to consider including in your pre-compiled header for this project.

# Registering

A SIP is registered with the function [`CryptSIPAddProvider`][4], which takes
a single structure describing what your SIP can do, as well as its GUID.

For my PNG library, I decided the simplest approach is to hard-code the path
and register it with `DllRegisterServer` to easily use `regsvr32`.

Let's pick a GUID first:

```c
// {DA005D72-4E32-4D5E-94C5-41AECBA650FA}
DEFINE_GUID(GUID_PNG_SIP,
	0xda005d72, 0x4e32, 0x4d5e, 0x94, 0xc5,
	0x41, 0xae, 0xcb, 0xa6, 0x50, 0xfa);
```

You will want to generate a new GUID for your own project. You can use the
"guidgen" program in the Windows SDK, it even has a display format that is
friendly for `DEFINE_GUID`.

A very simple implementation of this might looks like this now:

```c
STDAPI DllRegisterServer()
{
	SIP_ADD_NEWPROVIDER provider;
	memset(&provider, 0, sizeof(SIP_ADD_NEWPROVIDER));
	GUID subjectGuid = GUID_PNG_SIP;
	provider.cbStruct = sizeof(SIP_ADD_NEWPROVIDER);
	provider.pgSubject = &subjectGuid;
#ifdef _WIN64
	provider.pwszDLLFileName = L"C:\\Windows\\System32\\pngsip.dll";
#else
	provider.pwszDLLFileName = L"C:\\Windows\\SysWOW64\\pngsip.dll";
#endif
	provider.pwszGetFuncName = L"PngCryptSIPGetSignedDataMsg";
	provider.pwszPutFuncName = L"PngCryptSIPPutSignedDataMsg";
	provider.pwszCreateFuncName = L"PngCryptSIPCreateIndirectData";
	provider.pwszVerifyFuncName = L"PngCryptSIPVerifyIndirectData";
	provider.pwszIsFunctionNameFmt2 = L"PngIsFileSupportedName";
	BOOL result = CryptSIPAddProvider(&provider);
	if (result)
	{
		return S_OK;
	}
	else
	{
		return HRESULT_FROM_WIN32(GetLastError());
	}
}
```

Lets go through this line by line of `DllRegisterServer`. The first two lines
create our struct and initializes it to zeros so everything is a clean "NULL".
There are a number of Win32 patterns here that should be familiar to Win32
developers. Particularly, setting the size of the struct as the first field.
We then set our GUID, but we copy it locally first so we can take a pointer to
it.

`pwszDLLFileName` accepts the full path to the library. Note that this path
must be how 64-bit Windows sees it. System32 is normally a directory that WOW64
does file system redirection. However, the path should be presented as if there
is no file system redirection being performed. This can be meddlesome if you
are trying to determine that current path of the library to dynamically
determine it when WOW64 is in play from whatever is performing the registration.

I instead just hard coded the path as I don't really expect the SIP to be
installed elsewhere.

The rest of the fields on the struct are names of exports for the functionality
of the SIP. Their names don't matter, but I would make them unique and not
collide with other function names in Win32.

The function definitions for these are loosely defined in
[`SIP_ADD_NEWPROVIDER`][5], but we can stub them out for now and just do
`return FALSE`. All together, our SIP should look something like this, so far:

```c
STDAPI DllRegisterServer()
{
	SIP_ADD_NEWPROVIDER provider;
	memset(&provider, 0, sizeof(SIP_ADD_NEWPROVIDER));
	GUID subjectGuid = GUID_PNG_SIP;
	provider.cbStruct = sizeof(SIP_ADD_NEWPROVIDER);
	provider.pgSubject = &subjectGuid;
#ifdef _WIN64
	provider.pwszDLLFileName = L"C:\\Windows\\System32\\pngsip.dll";
#else
	provider.pwszDLLFileName = L"C:\\Windows\\SysWOW64\\pngsip.dll";
#endif
	provider.pwszGetFuncName = L"PngCryptSIPGetSignedDataMsg";
	provider.pwszPutFuncName = L"PngCryptSIPPutSignedDataMsg";
	provider.pwszCreateFuncName = L"PngCryptSIPCreateIndirectData";
	provider.pwszVerifyFuncName = L"PngCryptSIPVerifyIndirectData";
	provider.pwszIsFunctionNameFmt2 = L"PngIsFileSupportedName";
	BOOL result = CryptSIPAddProvider(&provider);
	if (result)
	{
		return S_OK;
	}
	else
	{
		return HRESULT_FROM_WIN32(GetLastError());
	}
}


BOOL WINAPI PngIsFileSupportedName(WCHAR *pwszFileName, GUID *pgSubject)
{
	return FALSE;
}

BOOL WINAPI PngCryptSIPGetSignedDataMsg(SIP_SUBJECTINFO *pSubjectInfo,
	DWORD* pdwEncodingType, DWORD dwIndex, DWORD *pcbSignedDataMsg,
	BYTE *pbSignedDataMsg)
{
	return FALSE;
}

BOOL WINAPI PngCryptSIPPutSignedDataMsg(SIP_SUBJECTINFO *pSubjectInfo,
	DWORD dwEncodingType, DWORD *pdwIndex,
	DWORD cbSignedDataMsg, BYTE *pbSignedDataMsg)
{
	return FALSE;
}

BOOL WINAPI PngCryptSIPCreateIndirectData(SIP_SUBJECTINFO *pSubjectInfo,
	DWORD *pcbIndirectData, SIP_INDIRECT_DATA *pIndirectData)
{
	return FALSE;
}

BOOL WINAPI PngCryptSIPVerifyIndirectData(SIP_SUBJECTINFO *pSubjectInfo,
	SIP_INDIRECT_DATA *pIndirectData)
{
	return FALSE;
}
```

At this point we can verify we are making some progress. We should be able to
compile this, put it in System32, and register it with `regsvr32`. It's a small
step, but we should have a SIP registered that always fails. Now would be a good
time to examine what registration is actually doing.

At the heart of it, all the registration is doing is adding a few keys in the
registry under

```
HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography\OID\EncodingType 0
```

Under that key are subkeys for all of the possible things a SIP can do.
We aren't doing everything, and some of them remain entirely undocumented and
to an extent, unused. However, for the five cores parts of a SIP we are
supporting, we should see our SIP's GUID under those registry keys. Namely,

* CryptSIPDllCreateIndirectData
* CryptSIPDllIsMyFileType2
* CryptSIPDllPutSignedDataMsg
* CryptSIPDllVerifyIndirectData
* CryptSIPDllGetSignedDataMsg

If we see our GUID under those keys, have a successfully registered SIP.
You will see an identical pattern for 32-bit SIPs except under the `WOW6432Node`
registry key. You don't have to register both a 32-bit and a 64-bit SIP during
development. If you'd like, you can just as well develop a 64-bit only SIP.
However, 32-bit uses of your SIP will not work, so you need to make sure you
are testing with 64-bit tools, like `signtool`.

You'll also want to make sure your library is exporting all of these functions
correctly. Dependency Walker, ancient as it is, does this well. You'll want to
not only make sure they are exported, but also are unmangled.

![Dependency Walker][6]

[1]: /2016/04/15/authenticode-stuffing-tricks/
[2]: /2016/12/30/authenticode-sealing/
[3]: https://github.com/vcsjones/PngSip
[4]: https://msdn.microsoft.com/en-us/library/windows/desktop/aa380283(v=vs.85).aspx
[5]: https://msdn.microsoft.com/en-us/library/windows/desktop/aa387767(v=vs.85).aspx
[6]: /images/sipexports.png
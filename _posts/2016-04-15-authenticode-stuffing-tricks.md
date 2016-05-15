---
layout: post
title:  "Authenticode Stuffing Tricks"
date:   2016-04-15 13:23:30 -0400
categories: Security
---

I recently started a project called [Authenticode Lint][1]. The tool has two purposes.
The primary one being, "Am I digitally signing my binaries correctly?" and two
"Are other people signing their binaries correctly?"

To back up a bit, Authenticode is the scheme that Microsoft uses to digitally
sign DLLs, EXEs, etc. It's not a difficult thing to do, but it does offer enough
flexibility that it can be done in a suboptimal way. The linter is made up of a 
series of checks that either pass or fail.

When you sign a binary, the signature is embedded inside of it (usually, there
are exceptions). The goal of the signature is to ensure the binary hasn't been
tampered with, and that it comes from a trusted source. The former presents a
problem.

If I were to take a binary, and computer a signature on it to make sure it
hasn't changed, then embed the signature in the binary, I just changed the
contents of the binary and invalidated the signature I just computed by
embedding it.

To work around this problem, there are some places inside of EXEs that the
digital signature process ignores. The notable one being the place that
signatures go. So the section that signatures go is completely ignored, as is
the checksum of the file in the [optional header][2].

Now we have tamper-proof binaries that prevent changing the executable after
its been signed, right?

Ideally, yes, but unfortunately, no. There are some legitimate reasons to change
a binary after its been signed. Some applications might want to embed a per-user
configuration. Re-signing the executable on a per-user basis is to costly in
terms of time and security. Signing is relatively fast, but not fast enough to
scale reasonably. It would also mean that to perform the re-sign, the signing
keys would need to be available to an automated system. That's generally not a
good idea, as a signing key should either be on an HSM or SmartCard and always
done by one (or more if using m/n) person manually.

It turns out it is possible to slightly modify an executable after its been
signed. There are a few ways to do this, and I'll cover as many as I know.

<div id="more"></div>

## Padding

The first is some clever people noticed that you could abuse the location where
signatures are stored (and thus not part of the signature itself) in binaries to
store things other than signatures. Ultimately what ends up getting placed in
the signature location in a binary is a structure called WIN_CERTIFICATE. This
structure includes a field called "length" indicating the length of the
structure, and "bCertificates" which is an array of whatever data type is
specified. The structure name is poorly named. The structure can contain things
other than certificates, like signatures. In almost every case it will always
contain a signature.

The data that does end up going in [WIN_CERTIFICATE][3] is PKCS#7 data
(1.2.840.113549.1.7.1) that contains the signature. This is in a structured
format called ASN.1. ASN.1, ultimately has its own "length" for its data. The
length is actually a little tricky to calculate, but by following the data
structure you know where it begins and ends. Let's imagine this whole thing
like this:

<pre>
WIN_CERTIFICATE
    --> dwLength = 16
    --> WIN_CERTIFICATE
           --> PKCS#7
                  --> Length = 10
                  --> {0,1,2,3,4,5,6,7,8,9}
</pre>

The WIN_CERTIFICATE has a length of 16, but the signature data only has a length
of 10. What are the other 6 bytes? Under normal circumstances, those other 6
bytes are all zeros. However, it turns out that Windows doesn't care what those
bytes are. They can be anything. The whole WIN_CERTIFICATE structure is ignored
during the signing and verification process, so changing those extra bytes
doesn't impact it. It doesn't appear as garbage either as part of the signature
because Windows is using the PKCS#7 structure to determine its length. It stops
processing the signature once it reached the end of the signature.

For historic reasons, the place where the signatures in the file go must always
have a length that is a multiple of 8. That accounts for why there are two
lengths. This problem wouldn't exist if WIN_CERTIFICATE didn't have a length at
all and was always assumed to be the length of the PKCS#7 data.

Keep in mind that this extra data doesn't change the behavior of the program.
The code (.text section) isn't changing. It's vestigial data, but the program
can be written to read the data from itself and do something with it. Hopefully
none of those programs actually try to use this extra data as actual code.

Microsoft actually tried to fix by checking that the extra data is all zeros.
It was opt-in with the registry using a value called <code>EnableCertPaddingCheck</code>
with the intention of enabling it by default after a period of time to allow people
to fix it. Later on, they [backtracked][4] on those plans and have withdrawn their
plans to make it the default, but have left the registry as an option.

I can only guess as to why they withdrew their plans, but I would say it was for
two reasons. The first being is it broke software, probably more than they
expected. The second being that it was an incomplete fix. As we'll see there are
other ways we can embed data post-signing. Breaking software visibly but not
getting any benefit from it doesn't make sense.

As of April 15th 2016, Dropbox makes use of this technique.

![WIN_CERTIFICATE padding][5]

## Unauthenticated Attributes
You can sign a binary with a signature, but can also sign a signature. That's
called a counter signature, and the most common use of them in Authenticode is
timestamps. This also has the same problem that binaries do. There must be a
place in the signature to place other signatures without invalidating the
signature by signing it. So, like binaries, there are places inside of
signatures that aren't used when computing a signature. These are called
unauthenticated attributes.

These attributes are mutable post-signing without changing the signature.

I haven't run across any binaries that use this trick. According to [Eric Lawrence][6]
Dropbox was at one point using this, possibly to work around the WIN_CERTIFICATE
padding being disabled. They may have switched back to WIN_CERTIFICATE padding
when Microsoft changed their minds about enforcing no padding. This technique
doesn't offer any advantage over WIN_CERTIFICATE padding and it's a little bit
harder to pull off.

## Certificates
This one is interesting and is what prompted me to write this post in the first
place.

A digital signature is allowed to include additional certificates within itself
to help the signature verifier build a chain back to a trusted certificate (that
in itself is worth another post). Much like TLS, it can include as many
certificates as it wants, regardless if it participates in the chain or not.
Or possibly there is more than one chain that could be built if a certificate
is cross-signed.

So if your computer trusts a certificate called "Fabrikam Root", but your
certificate was issued by an intermediate certificate called "Fabrikam Reseller
Intermediate", without knowledge of the intermediate the verifier could not
follow the chain of certificates back to the trusted root.

The certificates that are part of the signature are also not verified like the
Unauthenticated Attributes. This allows someone to inject or replace a
certificate. This appears to be what Chrome's latest installer is doing.

Chrome's signature includes a certificate called "Dummy Certificate". This
certificate is a bit odd, as it has an extension that is a few kilobytes. Not
impossible or bad, but it stands out.  This extension has an OID of
"1.3.6.1.4.1.11129.2.1.9999". Looking at its contents, it appears to contain
additional information very similar to Dropbox's. Most of the content of the
attribute is nulls, presumably to leave plenty of space for more data if they
ever need it.

![Dummy Certificate][7]

This is a rather interesting technique, and I'm not sure what value it provides
over the Unauthenticated Attributes other than it's a bit harder to spot. It
does require creating a new certificate every time, since you cannot change an
existing one.

The similarity of the data to Dropbox's made me think that this is likely being
done by a tool. Indeed, after a bit of digging, it appears that Google's [Omaha][8]
project contains Go code for doing this. Dropbox is probably just using an older
version of the tool that uses WIN_CERTIFICATE padding as the README seems to
imply it once did.

## Is this Bad?
I'm not sure. Clearly many organization that are security conscientious are
doing it, so they are at least willing to accept that any risks are worth the
result. I would recommend not doing it, if it can be helped. While doable,
getting these things right can be hard.

You might also consider the privacy implications of this for installers. These
watermarked installers can tell a lot about you if you're using a unique
installer. They know how much time has passed between downloading and
installing, how many times the installer is run, and if you were signed in to an
account when you downloaded the installer, it's very likely that's tied to the
installer, too.

Authenticode Lint will attempt to flag all of these scenarios.

[1]: https://github.com/vcsjones/AuthenticodeLint
[2]: https://msdn.microsoft.com/en-us/library/windows/desktop/ms680339(v=vs.85).aspx
[3]: https://msdn.microsoft.com/en-us/library/windows/desktop/dn582059(v=vs.85).aspx
[4]: https://technet.microsoft.com/library/security/2915720#section1
[5]: /images/db-pad.png
[6]: https://blogs.msdn.microsoft.com/ieinternals/2014/09/04/caveats-for-authenticode-code-signing/
[7]: /images/dummy-cert.png
[8]: https://github.com/google/omaha/tree/master/common/certificate_tag
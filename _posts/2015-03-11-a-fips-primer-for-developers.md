---
layout: post
title:  "A FIPS primer for Developers"
date:   2015-03-11 12:00:00 -0400
categories: Security
---

FIPS is a curious thing. Most developers haven't heard of it, which to I say,
"Good". I'm going to touch very lightly on the unslayable dragon "140-1 and
140-2" part of FIPS.

Unfortunately, if you do any development for the Federal Government, a
contractor, or sell your product to the government (or try to get on the GSA
schedule, like 70) then you will probably come across it. Perhaps you maintain a
product or a library that .NET developers use, and one of them says they get an
error with you code like "This implementation is not part of the Windows Platform
FIPS validated cryptographic algorithms."

Let's start with "what is FIPS?" A Google search will tell you it stands for
"Federal Information Processing Standard", which is standard controlled by the
National Institute of Standards and Technology (NIST). That in itself isn't very
helpful, so let's discuss the two.

NIST is an agency that is part of the Department of Commerce. Their goal is to
standardize on certain procedures and references used within the United States.
While seemingly boring, they standardize important things. For example, how much
does a kilogram exactly weigh? This is an incredibly important value for commerce
since many goods are traded and sold by the kilogram. NIST, along with the
International Bureau of Weights and Measures, standardize this value within the
United States to enable commerce. NIST also standardizes many other things, from
how taximeters to the emerging hydrogen fuel refilling stations.

NIST also standardizes how government agencies store and protect data. This
ensures each agency has a consistent approach to secure data storage. This is
known as the Federal Information Processing Standard, or FIPS. While FIPS touches
on things that are not related to security and communication, such as FIPS 10-4
which standardizes Country Codes. However the one subject that eclipses all of
the others in FIPS is data protection. From encryption (both symmetric and
asymmetric) to hashing. FIPS attempts to standardize security procedures, data
storage and communication, and maintain a set of approved algorithms.

FIPS 140 encompasses requirements for cryptographic "modules". FIPS refers to
them as modules and not algorithms because a "module" may be an actual piece of
hardware, or a pure-software implementation.

There are two key things to distinguish in the context of FIPS 140: validated
and approved functions.

An approved function is a function, or algorithm, which FIPS 140-2 accepts, as
documented in annex A. This means that for certain applications, certain
algorithms must be used as applicable to FIPS 140-2. In the case of Symmetric
Encryption, approved algorithms are AES, 3DES, and Skipjack. Each of these
algorithms have their own NIST publication. AES's for example, is NIST Special
Publication 197 and 3DES is Special Publication 800-67.

<div id="more"></div>

Bringing this back into the context of .NET, [AesManaged][1] is a class that
implements the AES algorithm. However there is another implementation of AES the
.NET Framework, called the [AesCryptoServiceProvider][2]. They appear to be
completely identical in functionality, produce the same results, and are
indistinguishable from each other. There is one key difference between them:
the former is not validated, while the latter is.

Validation is where NIST actually tests the implementation of the algorithm for
correctness with the Cryptographic Algorithm Validation Program (CAVP). The
purpose of this program is to test vendor implementations of these algorithms
and different modes of operation for each algorithm (like CBC or CFB). The
AesManaged class, while implemented correctly, has not been verified by NIST.
This is a common theme among all cryptographic functions in .NET that end in
Managed. AesManaged, Sha1Managed, etc. are all not FIPS validated. From an
implementation perspective, the *Managed implementations are implemented in pure
managed code. The algorithms that end in CryptoServiceProvider all use platform
invocation to shell out the functionality to Windows. More specifically,
Windows's Cryptographic Service Provider (CSP) functionality or CNG.

Why bother having a \*Managed implementation though? Why not just use the
\*CryptoServiceProvider all of the time?

Recall that .NET, when originally launched, was very Code Access Security (CAS)
heavy (another post for another time). Before IIS supported Application Pools,
IIS's only means of separating .NET web applications from each other was to put
them in Medium Trust. If you recall back in the .NET 1.x days, many "shared" web
hosts ran websites in Medium Trust. Otherwise, my web application could access
content and resources from other sites on the same server.

Medium trust also meant no platform invoke, so the *CryptoServiceProvider classes
wouldn't work. To have no support for encryption in Medium Trust would be a
problem, so they algorithms were implemented in pure managed code. At the time,
Managed implementations were also likely faster. Platform invoke has a
performance penalty. Today, that performance difference is likely smaller. The
Managed implementations cannot take advantage of new processor features, like
AES-NI. The CryptoServiceProvider implementations, can, and do.

The last outstanding question might be, why not just put the Managed
implementations through the CAVP program? In a nutshell: cost and time. The
program takes a while to complete, costs a lot of many, and if anything changed
in those algorithms, they'd need to get re-validated. The number of people that
need a FIPS validated implementation is low and are unlikely to be running in
medium trust. For those people, using the CryptoServiceProvider implementation
makes the most sense.

There are some important things to note about FIPS. FIPS validated algorithms
then, are not in any way "stronger" or "better" than those that aren't. Rather,
it's a matter of policy that the algorithm has been reviewed for correctness.
This also brings up a matter that not all good algorithms are approved, either.
Some algorithms, like Twofish, are considered secure for use in production, yet
have no badge of approval from NIST. Other algorithms are left off of the
approved function list because they are weak, and shouldn't be used. The Data
Encryption Standard (DES – not to be confused with 3DES) and MD5 are two
algorithms that are used today, broadly, but contain enough issues to warrant
security concerns. These algorithms remain used today because of legacy
platforms. The RADIUS protocol remains one protocol that continues to use MD5
often. For those that need to interact with these old platforms using old
protocols, they don't have much of a choice. This puts people in a tough
situation where supporting these platforms can be outright impossible if FIPS
validation is required. This is matter of choice: you can either have your
feature and no FIPS, or and FIPS and no feature. You cannot have both.

The Windows operating system itself does not run fully FIPS out of the box.
BitLocker, SChannel, and some other components of Windows do not follow FIPS
validation unless configured to do so. That is done in the Local Security Policy.

![FIPS SecPol][3]

When enabled, the SChannel functionality of Windows which implements SSL and TLS
strips away non-FIPS validated algorithms, such as cipher suites using MD5.

This setting also interferes with the .NET Framework. Those classes, AesManaged,
Sha1Managed, even Md5CryptoServiceProvider, etc, will all throw an exception if
they are used and this policy setting is enabled. It's arguable if this is a good
thing to do. This follows the letter of the law, but can be a tricky issue for
some. For starters, hashing algorithms like MD5 and SHA1 can be used for
non-security applications, such as caching (a web server might use MD5 for E-Tags,
for example) or non-critical file integrity. Yet this policy setting is unable
to distinguish why a developer is using a particular algorithm, but it ceases to
function, anyway. The exception the algorithms throw is

>This implementation is not part of the Windows Platform FIPS validated
cryptographic algorithms.

This can be worked around with a setting in the .config file, but this setting,
like the one in Security Policy, is a big hammer. It completely disables the
check.

Some might work around this issue by copying and pasting some random
StackOverflow code that implements the MD5 algorithm, which does not check that
policy setting, and "works" even when that setting is checked. However this
grossly violates the spirit of FIPS. If an audit of the application's code where
to occur (which is much more likely for those that are being asked to follow
FIPS), it would fail the audit.

This brings me back to my original point: if no one is telling you to care about
FIPS, then don't care about it – it can be a headache.

[1]: https://msdn.microsoft.com/en-us/library/system.security.cryptography.aesmanaged.aspx
[2]: https://msdn.microsoft.com/en-us/library/system.security.cryptography.aescryptoserviceprovider.aspx
[3]: /images/fips-secpol.png
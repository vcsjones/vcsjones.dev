---
layout: post
title:  "The Pains of Deploying HTTPS Certificates"
date:   2017-02-17 22:00:00 -0500
categories: Security
---

There's been some discussion recently about how long an x509 certificate should
be valid for for Certificate Authorities that are members of the CA/B Forum.

Currently, the limit is 39 months, or three and a quarter years. This means that
operationally, a certificate from a CA must be changed at least every 39 months.
The discussion proposed shortening that length to 13 months.

### Why Shorten It?

While Let's Encrypt is lauded for being free, the most impressive aspect of it
is that it can be - and is easy - to fully automate. Let's Encrypt makes
CertBot, a peice of software you install on your server that sets up HTTPS for
various web servers, and handles renewals, domain validation, etc. Since this is
fully automated, the validity period of a certificate is inconsequential - the
certificate could be valid for a single day as long as it keeps getting renewed
and replaced correctly.

This has a lot of positives. A short lifespan of a certificate means revocation
is less of a concern. Revocation in PKI largely doesn't work in HTTPS simply
because that in most* cases, online revocation checking isn't performed. We have
tools coming soon that will help fix that like Must Staple, but those are still
a ways off from being widely deployed and adopted. If a certificate is only
valid for three months and is mis-issued - this limits the period of time that
a mis-issued certificate could be used.

Along with Must Staple and CT, this also helps address the issue of domain
squatters buying a domain, getting a long-length certificate for it, and then
selling the domain all the while having a valid certificate.

There's also plenty of good reasons aside from these to shorten a certificate's
length.

### Why Not Shorten It?

Shorter certificate lifetimes have several benefits, so what are the reasons *not*
to allow such a thing? We have a proven system to demonstrate that it's
automatable, and for more complex cases, it should be relatively painless to
automate, right?

That's where I have to disagree, and why I'm rather hesitant to support this
with the current state of certificate deployment.

I'd like to tell a short story about a certificate I had to manage. It was for
an HTTPS endpoint that a 3rd party used to upload data to us. The 3rd party
required our endpoint to support HTTPS, and strangely while doing this
integration they asked us to securely deliver the x509 certificate to them. When
asked why, they said they pin to the certificate that we send them. They
required pinning the leaf certificate. This means when we have to change our
certificate, we need to coordinate with the 3rd party.

Unfortunately, this 3rd party wasn't exactly fast to perform these changes.
We needed to coordinate days in advance with them, discuss the operations, and
they actually counted the hours of work against our support contract.

If this sounds rediculous - I agree. But, it was the requirement. The 3rd party
insisted on doing it - and talking with others they were frustrated by the same
requirements. The certificate still needed to be issued by a CA - that is they
would not pin against a self-signed certificate, etc. Also, this party had a
monopoly on the data we wanted, so we didn't have much choice there, either.

This is one example of *many* that I can recount in an environment where
renewing a certificate is not easy - or possible - to automate. Other situations
involved an overly-complex CCRB where changing the certicicate required a lot of
operational testing, sign off, approvals, etc. Process can be fixed, but it's
more stubborn than some might realize. Other challenges are technology, like
when an HSM is involved. Yes, it's automatable - but it will take a lot of time
for an organization to get there, and HSMs are unforgiving with mistakes.

It's also worth pointing out that I think a lot of people lose sight of
the fact that certificates are used (often!) outside of HTTPS. TLS is a general
purpose transport tunnel. You can encrypt all sorts of traffic with it - such as
Remote Desktop, SQL Server, VPN, CAPWAP, etc. Some of these circumstances do
require or use a certificate from a CA. While a web server might be easy to
automate, other things are not.

This would lead to a tripling of certificate replacement work.

### Quick Thoughts

I'm not happy with the status quo, either. Certificates *should* be automatable,
they *should* have a shorter lifespan - but we're not quite there yet. I would
argue that it would take some organizations months, or years of work to support
automating their entire infrastructure. Yes, I think it would be a big benefit
for organizations to have that anyway.

Going from 39 months to 13 months is over ambitious at this point. I would test
the waters of this with a change to 25 months to see how CA's customers are able
to cope with the change. That will also put the writing on the wall that they
need to start automation before the 13 month limit is imposed.

It's hard to balance good security with what works in the real world. I just
don't think the real world is ready at this point for this change. Organizations
are already scrambling to keep up with other changes. The TLS 1.2 requirement
for PCI vendors already have them working hard.

I do hope we get there one day though.

\* "Most" is used generally here - revocation checking behavior differs from
environment to environment and the type of certificate, such as EV certificates.
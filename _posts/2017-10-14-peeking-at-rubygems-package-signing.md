---
layout: post
title:  "Peeking at RubyGems Package Signing"
date:   2017-10-14 21:30:00 -0400
categories: Security
---

I last wrote about [NuGet][1] signing for packages. This has been a hot
topic for some folks in the approach that is being taken. However, signing
packages was something I didn't have a whole lot of data on. I didn't have a
good feel for how package communities adopt signing, and decided to get a
little more information.

I turned to the RubyGems community. Gems support signing, also with X509
certificates like the NuGet proposal. Support has been there for a while, so
the community there has been plenty of time for adoption. This is on top of a
[high profile][2] hack on RubyGems, giving plenty of motivation for developers
to consider signing their packages.

Problem is, there isn't a whole lot of information about it that I could
find, so I decided to create it. I decided to look at the top 200 gems and see
where they stood on signing.

## The Gems

The top 200 list is based off of RubyGems [own statistics][3]. One problem:
their list by popularity only gives up to 100 gems. Fortunately, RubyGems
doesn't do such a hot job on validating their query strings. If I change the
`page=10` URL query string, supposedly the last page, to `page=11`, it is
quite happy to give me gems 101-110. So first problem solved.

Many of these gems are supporting gems. That is, not gems that people typically
include in their projects directly, but rather included by as a dependency of
another gem.

Getting the latest version of each gem is easy enough with `gem fetch`. After
building our list of gems, we just cache them to disk for inspection later.

## Extracting Certificates

Certificates can be extracted from gems using `gem spec <gempath> cert_chain`.
This will dump the certificate chain as a YAML document. We can use a little
bit of ruby to get the certificates out of the YAML document and as files on
disk.


## The Results

I will be the first to admit that 200 gems is not a huge sample. However,
they represent the most popular gems and the ones I would typically expect to
be signed.

Of the 200 gems specified, **17** were signed. That's approximately 12% of gems.
Initially I didn't know what to think of that number. Is it good? Is it bad?
If you had asked me to guess, I would have thought only three or four of them
would have been signed. I don't think 17 is good, either. It's just not as bad
as I would have expected it to be.

The next matter is, what is the quality of the signatures? Are they valid? Are
they self signed? What digest algorithms and key sizes are used?

Of the 17 signed gems, two of them weren't really signed at all. They contained
placeholders for the certificate to go. Indeed, performing
`gem install badgem -P HighSecurity` resulted in Gem itself thinking the
signature was invalid. So we are down to **15** signed gems.

Some other interesting figures:

* 15/15 of them were self signed.
* 2/15 of them used SHA2 signature algorithms. The rest used SHA1.
* 4/15 were expired.
* 8/15 used RSA-2048; 1/15 used RSA-3072; 6/15 used RSA-4096.


# Data

I set up a GitHub repository for the scripts used to create this data. It is
available at [vcsjones/rubygem-signing-research][4]. Everything that you need to
extract the certificates from Gems is there.

The `gemlist.txt` contains the list of Gems examined. The `fetch.sh` script will
download all of the Gems in this file.

`extract_certs.sh` will extract all of the certificates to examine how you see
fit.

# Thoughts

It doesn't seem like signing has really taken off with RubyGems. Part of the
issue is that RubyGems simply doesn't validate the signature by default. This is
due to the default validation option in Gem being [`NoSecurity`][5] at the time
of writing. Every single Gem that is signed would fail to install with the
`MediumSecurity` trust policy:

```sh
gem install gemname -P MediumTrust
```

This will fail for one reason or another, usually because the certificate
doesn't chain back to a trusted root certificate.

I'm not sure if this is indicative of how adoption will go for NuGet. I'm
curious to see where NuGet is three years from now on signing.

[1]: /nuget-package-signing/
[2]: https://venturebeat.com/2013/01/30/rubygems-org-hacked-interrupting-heroku-services-and-putting-millions-of-sites-using-rails-at-risk/
[3]: https://rubygems.org/stats?page=1
[4]: https://github.com/vcsjones/rubygem-signing-research
[5]: https://github.com/rubygems/rubygems/blob/20612e7d30394689ea2f8f18f6c44a035c8b0d09/lib/rubygems/dependency_installer.rb#L27
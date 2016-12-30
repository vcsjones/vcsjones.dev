---
layout: post
title:  "Authenticode Sealing"
date:   2016-12-29 17:40:00 -0500
categories: Security
hide: true
---

A while ago I wrote about [Authenticode stuffing tricks][1] which in summary
allows someone to change small parts of a binary even after it has been
signed. These changes wouldn't allow changing how the program behaved, but it
did allow injecting tracking beacons into the file, even after it has been
signed. I'd suggest reading that first if you aren't familiar with it.

This has been a critcism of mine about Authenticode, and recently I stumbled on
a new feature in Authenticode that supposedly fixes two of the three ways that
Authenticode allows post-signature changes called sealing.

It looks like Authenticode sealing aims to make these stuffing tricks a lot
harder. Before we dive in, I want to disclaim that sealing has literally zero
documentation from Microsoft. Everything forward from here has been me "figuring
it out". I hope I'm right, but welcome corrections. I may be entirely wrong, so
please keep that in mind.

Recall that two ways of injecting data in to an Authenticode signature can be
done in the signatures themselves, because not all parts of the signature are
actually signed. This includes the certificate table as well as the
unauthenticated attributes section of the signature. Sealings no longer allows
those sections to be changed once the seal has been made.

It starts with an "intent to seal" attribute. Intent to seal is done when
applying the primary signature to a binary. We can apply an intent to seal
attribute using the `/itos` option with `signtool`. For example:

```
signtool sign 
    /sha1 2d0366fa88640481456079fd864f3f02c8103867
    /fd sha256 /tr http://timestamp.digicert.com
    /td SHA256 /itos authlint.exe
```

At this point the file has a primary signature, a time stamp, but the signature
is not valid. It has been marked as "intent to seal" but no seal has been
applied. Windows treats it as a bad signature if I try to run it.

Intent to seal is an *authenticated* attribute. That is, the signature at this
point includes the intention in its own signature. I could not remove the
intent to seal attribute without invalidating the whole signature.

![Run Intent to Seal][2]

Now I could add a nested signature, if I want. I'll skip that, but it's
something you could do at this point if you are using dual signatures.

The next step is to seal it:

```
signtool sign
    /sha1 2d0366fa88640481456079fd864f3f02c8103867
    /seal /tseal http://timestamp.digicert.com
    /td SHA256 authlint.exe
```

This finishes off the seal and timestamps the seal. Note that I am using the
same certificate as the one that was used in the primary signature. If I use a
different certificate, the seal is applied by removing the entire signature,
and re-signed with that certificate. Thus, you cannot seal a signature using a
different certificate without changing the primary signature in the first place.

Now we have a sealed signature. What happens if I try appending a signature
using the `/as` option? I get an error:

>The file has a sealed signature. In order to append more
signatures the seal will have to be removed and the file will have to
be re-signed. The /force option must be specified as part of the
command in order to do so.

This is interesting because appended signature are unauthenticated attributes,
yet it breaks the seal. This means seals are signatures that account for
unauthenticated attributes.

What this all culminates to is that a seal is a signature of the entire
signature graph, including the things that were being used to cheat authenticode
in the first place.

Sealing appears to be an unathenticated attribute itself which contains a
signature, same for the timestamp. It wold seem that sealing is, in a
strange way, Authenticode for Authenticode. The difference being is that a
sealing signature has no concept of unauthenticated attributes, and it uses the
certificates from the primary signature. That leaves no room for data to be
inserted in to the signature once it has been sealed.

To verify this, I first signed a binary without a seal, then changed an
unauthenticated attribute, and noted that `signtool verify /pa /all authlint.exe`
was still OK with the signature. With a seal,
`signtool verify /pa /all authlint-sealed.exe` now failed when I changed the
same unauthenticated attribute.

This has some interesting uses. As a signer, it gives me more power to ensure my
own signed binaries do not get tinkered with, or signatures get appended, or
somehow inserting tracking beacons. If someone were to do so, they would
invalidate the sealing signature. They cannot remove the seal because the
primary signature has the Intent to Seal attribute, which cannot be removed,
either. They can't re-seal it with a different certificate without completely
re-signing the primary signature, too.

As a consumer of signed executables, this doesn't make a huge impact on me, yet.
It would be interesting and exciting to see Windows's security UX take sealing
in to consideration. The UAC and Mark-of-the-Web dialogs could conceivably give
a more secure indicator if the file is sealed. This would mean that for authors
to insert tracking data in to their binaries, they would have to completely
re-sign the executable, which is expensive and why they don't do it in the first
place.

As a reminder, these are my observations of sealing. There is no documentation
about sealing that I am aware of, but based on the behavior that I observed, it
has some very powerful properties. I hope that it becomes better documented
and encouraged, and eventually more strictly enforced.

[1]: /2016/04/15/authenticode-stuffing-tricks/
[2]: /images/intent-to-seal.png
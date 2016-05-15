---
layout: post
title:  "Regaining Access to OS X after a lost Yubikey"
date:   2016-01-21 12:00:00 -0400
categories: Security
---

The Yubikey by Yubico has an interesting use beyond just OTP. It can do a myriad
of things, including [storing certificates][1], OATH, and, more interestingly,
HMAC-SHA1 challenge response. The last of which is interesting because it can be
used with a [PAM module][2].

OS X supports PAM modules, and one of Yubico's touted features is that you can
install a PAM module on OS X, and you now have two factor authentication into
your OS X account. In addition to the password, the Yubikey must also be plugged
in.

I set that up a while ago and it had been working fine, but I ran into a
situation where I needed to turn it off, temporarily, because I couldn't
actually log in. Say, because I didn't have my Yubikey with me.

Turns out this is really trivial. Just boot the Mac into recovery mode by
holding Command+R during boot. This let me edit the `/etc/pam.d/authorization`
file and comment out the Yubico PAM module. Once saved, a quick reboot command
later, I was back into my account, two factor turned off. The only thing to note
is that you want to edit the one on your Macintosh HD volume under `/Volumes`,
not the authorization file that the recovery partition uses.

This made my life easier, but it also led me to believe the Yubikey PAM module
on local OS X accounts had diminished value (the story is different for remote
authentication). If I can just *turn it off* with very little effort, no
authentication required, that's worrying.

There is a way to partially fix it – which is FileVault2. When you boot into
the Recovery console with FileVault2 enabled, you cannot edit
`/etc/pam.d/authorization` without knowing the password to the volume since it
is encrypted with your password. This however, still reduces authorization to a
single factor. If I have your password and no Yubikey, even with FileVault2
enabled I can get in to the account since I have physical access.

This takes a few seconds of extra work. First, you need the UUID of the volume
that you need to decrypt (like "Macintosh HD").

```
diskutil coreStorage list
```

and grab the UUID of the logical volume. From there, it's just one more command:

```
diskutil coreStorage unlockVolume <UUID> -stdinpassphrase
```

Enter your password, and then the volume will be mounted in `/Volumes/`.

In an ideal world, the Yubikey would play a role in unlocking the FileVault2
volume. This is easy enough to do with BitLocker and certificates since the
Yubikey can act like a PIV card. However I find this not possible with
FileVault2. Even in the case of BitLocker, it's difficult to accomplish this
without the help of being on an Active Directory Domain Joined machine and using
an Active Directory account.

My advice would be, take the value that the Yubikey PAM module gives with a
grain of salt for local account protection. At least on OS X (I have yet to
bother trying on Windows) it's quite easy to turn it off just by having access
to the physical machine.

A lot of people will be quick to point out, "If you have physical access to the
hardware, then it's game over" however that doesn't quite mean physical security
should just be completely ignored. Each little improvement has value.

[1]: https://textslashplain.com/2016/01/10/authenticode-in-2016/
[2]: https://en.wikipedia.org/wiki/Pluggable_authentication_module
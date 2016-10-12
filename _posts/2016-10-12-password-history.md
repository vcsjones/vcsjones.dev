---
layout: post
title:  "Password History"
date:   2016-10-12 10:30:00 -0400
categories: Security
---

A few tweets have started making the rounds about how companies *must* be doing
password security wrong because they seemingly do magic. Let's start with the
simple one, password history. Here's some musings on how I think some magic
could be implemented without a huge loss of security.

This is pretty straight forward to solve. Keep a history of the hashes. When the
user enters a new password, take the password they just entered, and see if it 
matches any of the password hashes in the history.

A password hash typically consists of a digest and a salt. I'd strongly
recommend that each password in the history have their own salt, so don't reuse
salts when a user types in a new password. So a password history table might
look like this:


| salt  | digest  | version |
|-------|---------|---------|
| salt1 | digest1 | 1       |
| salt2 | digest2 | 1       |
| salt3 | digest3 | 2       |

And the user enters a new password because they want to change it. The check
process would look something like this:

```
hash_alg_1(salt1 + newPassword) == digest1
hash_alg_1(salt2 + newPassword) == digest2
hash_alg_2(salt3 + newPassword) == digest3
```

If any of those are "yes", then they've used a password in their
history.

In real life, you are probably using something like bcrypt. Many bcrypt
libraries put the salt, digest, and "version" (work factor) in to a single
output separated by dollar signs. They also provide convenience APIs to make the
verify process simpler. You give it a previous bcrypt output and a plaintext
password, and it knows how to use the salt and the work factor to see if the
hashes match.

This approach typically works pretty well. I'd also caution how long you would
want to keep password history. Too long might mean keeping around hashes that
are weak. Let's say you were using bcrypt(8) a few years ago, but moved to
bcrypt(10). Keeping that bcrypt(8) password indefinitely means you're storing
passwords with less-than-ideal strength. If the password history is ever stolen
and the history is weak, then you might be giving the attacker clues as to a
password the user is using on another site, or their password habits.

If you ever need to drastically change the password hashing scheme because it's
broken (straight, unsalted MD5 for example) I'd purge the history altogether.
It's too much of a liability to have lying around.

The trickier one is fuzzy password history, but it can be done in some limited
ways. The trouble with hashes is, they either match, or they don't. There is no
good way today to see if two password hashes are related to each other.

You can however tweak the input of the plaintext when checking history.

Let's say the user's old password is "I<3BillMurray11" and they change it to
"I<3BillMurray12". A site might say this password is too similiar to a previous
password. You might quickly come to the conclusion they are storing passwords in
plain text, or reversable encryption.

The site also could simply try a few heuristics on the input. It's well known
that when a password needs to change, users might cop-out and just increment a
number at the end. So when the user types in a new password, check the history.
No matches? Well, does it end with a number? Yes? decrement it and try the
history again.

You are certainly limited to how much fiddling you can do like this. Good
password hashing schemes like bcrypt are by-design not fast (to counteract
offline brute force attacks). So checking hundreds of things is quite slow.

You can however use this to try a few of the worse offenders. Incremented
trailing numbers is a very common one, same with addign a letter. Try chopping
off a letter from the password end and see if it matches the history. Password
history for a user should also reasonably fit in to memory, so doing these
checks in parallel is doable, too.

Those are just some examples, and things that I think security engineers can
reasonably implement. Unfortunately when things like this do get implemented,
there is often suspicion and cries of plaintext problems.

That's not to say that there aren't sites that *do* store passwords in plaintext
or symmetric encryption. Those sites are problematic, and need to get fixed. If
the password history fuzziness seems too clever, such as Levenshtein or Hamming
distance, then that might indicate bigger problems.

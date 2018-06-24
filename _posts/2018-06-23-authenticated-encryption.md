---
layout: post
title:  "Authenticated Encryption"
date:   2018-06-23 10:42:00 -0400
categories: Security
hide: true
---

There's been some buzz lately about authenticated encryption. The buzz comes
from some interesting issues in OpenGPG, and more recently the folks at
Microsoft put out an advisory stating that unauthenticated encryption is simply
not advisable anymore.

I thought it would be fun to write about cryptography, despite
rarely doing it, even though I find it part of what defines me as an engineer
and developer.

When we think of "encryption", we usually think of an entity that has sensitive
information they want to protect with a "key" of some kind.

```
ciphertext = encrypt(plaintext, key)
```

Something like that. "Decryption" is usually visualized as the process in
reverse. The entity has encrypted data that they want to decrypt into its
plaintext form because they know the key.

The truth is, well designed systems that rely on cryptography aren't this
simple for a variety of reasons. Further on top of that, software developers
struggle to encrypt and decrypt information correctly because many frameworks
or libraries that developers depend on offer _primitives_.

A primitive is a cryptographic function that does very little, but it does
its job and it does its job well. That doesn't mean though that the primitive
is enough to fully complete the job. "AES" is a widely known primitive
encryption function.

It's most common mode of operation is Cipher Block Chaining, or CBC, which is
not authenticated. To put another way, it is _malleable_. Let's demonstrate with
some ruby code.

```ruby
require 'openssl'

encrypt_me = "what a fine day for coding" # Data to encrypt
aes_key = (1..16).to_a.pack("C*") # Dummy bad key
aes_iv = (17..32).to_a.pack("C*") # Dummy bad initialization vector
cipher = OpenSSL::Cipher::AES.new(128, :CBC)
cipher.encrypt # Put it in "encrypt" mode, doesn't actually encrypt
cipher.key = aes_key
cipher.iv = aes_iv
ciphertext = cipher.update(encrypt_me) + cipher.final
puts ciphertext.bytes.inspect
```

Which produces

```text
[15, 90, 144, 183, 105, 160, 17, 219, 160, 166, 20, 201, 53, 30, 2, 29,
217, 115, 3, 249, 2, 170, 203, 32, 37, 234, 147, 188, 167, 254, 254, 192]
```

There are some _bad_ things in the code example above - it uses a hard-coded, easy
to guess key and initialization vector. If you borrow this code, please be wary
that it is to demonstrate.

Decryption is a similar process.

```ruby
aes_key = (1..16).to_a.pack("C*") # Dummy bad key
aes_iv = (17..32).to_a.pack("C*") # Dummy bad initialization vector
cipher = OpenSSL::Cipher::AES.new(128, :CBC)
cipher.decrypt # Put it in "decrypt" mode, doesn't actually decrypt
cipher.key = aes_key
cipher.iv = aes_iv
plaintext = cipher.update(ciphertext) + cipher.final
puts plaintext
```

Which produces the original string, "what a fine day for coding".

What if we just... changed the first byte of the cipher text though?


```ruby
ciphertext[0] = "\1"
# same decryption code as above
```

That decrypts to ",=m1aH-q8hor coding". The decryption process didn't fail
in any clear way, it just produced some garbage. We've broken the entire "block"
of data that we changed a byte in, plus the Nth byte of the next block which was
changed. Since we changed the first (0th) byte, the first byte in the second
block is "h", not "f".

If we slice the data:

```ruby
plaintext[0..15]  # produces ,=m1aH-q8
plaintext[16..-1] # produces hor coding
```

If we change the second value of the cipher text:


```ruby
ciphertext[1] = "\1"

# Decrypt...
plaintext[0..15]  # produces non-ASCII characters
plaintext[16..-1] # produces f4r coding
```

We see that the "f" is correct for the first byte, but wrong for the second
byte.

This is malleable encryption. It allows an attacker to change bits or whole
bytes. However the decryption process doesn't "know" that it is producing
invalid data. It's obvious when you are
encrypting something like text, but it can be less obvious if the data being
encrypted is binary data, like a JPEG image.

More interestingly, let's try changing the last byte of the cipher text:

```ruby
ciphertext[-1] = "\1"

# Decrypt...
```

Boom! We get an error, `in 'final': bad decrypt (OpenSSL::Cipher::CipherError)`.
Why is that? What we just changed was a padding byte. You might have noticed
that when we encrypted our string, the resulting cipher text was bigger than
then plain text.

That's because AES-CBC is a block cipher. It has to operate on chunks of data
that are 16 bytes in size. Many implementations will pad the data for you. So
when we encrypted "what a fine day for coding", what actually got encrypted was
"what a fine day for coding\6\6\6\6\6\6".

Where did those \6 bytes come from? That how many bytes it took to reach a
multiple of 16. During decryption, it looks at the last byte to determine how
much padding to remove.

We can demonstrate this by telling the AES cipher that there is no padding.

```ruby
cipher.padding = 0
# Continue decryption...

puts plaintext.bytes.inspect
```

Which produces:

```text
[119, 104, 97, 116, 32, 97, 32, 102, 105, 110, 101, 32, 100, 97, 121,
32, 102, 111, 114, 32, 99, 111, 100, 105, 110, 103, 6, 6, 6, 6, 6, 6]
```

So we can see the padding is left there. Six bytes of padding.

Most implementations of AES will automatically apply and remove padding for
you.

A poor implementation of AES padding removal will look at the last byte and
blindly remove that many bytes:

```ruby
# Bad padding removal
last_octet = plaintext[-1].ord
unpadded = plaintext[0...-last_octet]
```

A better implementation of AES padding removal will check that all of the
padding bytes are equal to the amount of padding removed.

```ruby
# Better
last_octet = plaintext[-1].ord
padding = plaintext[-last_octet..-1]
is_padding_valid = padding.bytes.all? { |b| b == last_octet }

# Handle "false" for is_padding_valid
unpadded = plaintext[0...-last_octet]
```

An even better implementation of AES padding removal would validate the padding
in constant time, which is out of my hands with ruby.

It turns out that "false" case for `is_padding_valid` has caused a lot of
problems with AES-CBC, resulting in a _padding oracle_.

For fun, let's change the last byte of the _first_ block, and look at the decrypted
result and leave the padding on. Remember as we saw previously, changinge the
Nth byte of the previous block affects the Nth byte of the current block. That's
true for padding as well, it get encrypted like any other data.

```ruby
ciphertext[15] = "\1"
cipher.padding = 0

#Decrypt...
```

We get:

```test
[... 110, 103, 6, 6, 6, 6, 6, 26]
```

Clearly this padding is invalid, because the padding bytes are not all equal
to 26. In our home-grown padding removal, `is_adding_valid` would be false and
an error would be returned.

There is one other value that is valid padding, which is 1. If
we can change the last byte of the first block so that the last padding byte
is one, the padding will appear valid and no error is raised.
Let's use our bad padding removal code and throw an exception if the padding is
bad.

```ruby
def decrypt(data)
    aes_key = (1..16).to_a.pack("C*") # Dummy bad key
    aes_iv = (17..32).to_a.pack("C*") # Dummy bad initialization vector
    cipher = OpenSSL::Cipher::AES.new(128, :CBC)
    cipher.padding = 0
    cipher.decrypt # Put it in "decrypt" mode, doesn't actually decrypt
    cipher.key = aes_key
    cipher.iv = aes_iv
    plaintext = cipher.update(data)
    last_octet = plaintext[-1].ord
    padding = plaintext[-last_octet..-1]
    is_padding_valid = padding.bytes.all? { |b| b == last_octet }
    raise "BAD PADDING" unless is_padding_valid
    return plaintext[0...-last_octet]
end
```

Our test string is made up of two blocks. We happen to know the padding length
is 6, but let's pretend we don't. Here is the cipher text. Let's try
and break the last block.

```text
Block 1: [15, 90, 144, 183, 105, 160, 17, 219, 160, 166, 20, 201, 53, 30, 2, 29]
Block 2: [217, 115, 3, 249, 2, 170, 203, 32, 37, 234, 147, 188, 167, 254, 254, 192]
```

Let's assume we have a server that we can submit a cipher text to and we have
some encrypted data we want to decrypt. The server can accept encrypted data,
but it never actually reveals what the plaintext is. The server will either
give a padding error back, or say "OK, I was able to decrypt and process the
data".

Remember earlier we said:

>We've broken the entire "block" of data that we changed a byte in, plus
>the Nth byte of the next block which was changed.

It goes to reason then, that if we change the last value of the first block,
it will affect the last byte of the second block. We are assuming that this
encrypted data has padding, but we don't know how much. Perhaps we can fiddle
with the last byte of the penultimate block.

Fortunately, our decryption process makes a nice big fat error when the padding
is wrong. The byte of the padding has two possible values. The value it is supposed
to be (remember, it's six because we are cheating for now) and one. If it's one,
the padding remover will just remove the last byte. If we just try all
combinations for the last byte of the first block, perhaps we can figure out what
value makes a padding value of one.

Let's loop over it.

```ruby
(0..255).each do |b|
    # Set last byte of first block
    ciphertext[15] = b.chr
    begin
        decrypt(ciphertext)
        puts b
    rescue
        # The decryption process an error. Skip it and move on.
        next
    end
end
```

We get two values back. We 29 and 26. We already know that the value 29 is valid
because that's the actual value from the ciphertext. So 26 forces the padding to
one.

Let's cheat for a moment and verify our findings so that we are comfortable.
Given:

```ruby
ciphertext[15] = 26.chr
decrypt(ciphertext)
return
```

and if we peek inside the unpadded, decrypted, value we get:

```
[95, 9, 61, 149, 138, 173, 150, 56, 255, 200, 46, 73, 45, 145, 185,
77, 102, 111, 114, 32, 99, 111, 100, 105, 110, 103, 6, 6, 6, 6, 6, 1]
```

The first block is garbage, but crucially we see that we indeed coerce the
padding byte to 1.

OK, no more pretending. We know that if we tweak the cipher text's 15th byte to 26,
we end up with a padding of one. What can we learn from that? Let's take the
original ciphertext value, 29, and xor it with which is our guessed value 26,
and then with 1 which is the plaintext value we know it happens to be because
the padding was removed successfully.

```ruby
29 ^ 26 ^ 1 => 6
```

We were able to figure out the plaintext last byte of the second block.
This isn't "sensitive", yet, this is the only a padding value.  However, we did
successfully decrypt a byte without explicit knowledge of the key.

Let's see if we can figure out how to get the padding to (2, 2).

We can control the last byte of the plaintext now. We can force it to 2 using

```
ciphertext_value xor plaintext_value xor 2
```

```ruby
ciphertext[15] = (original_ct[15].ord ^ 6 ^ 2).chr
(0..255).each do |b|
    ciphertext[14] = b.chr
    begin
        decrypt(ciphertext)
        puts b
    rescue
        next
    end
end
```

The result we get back is 6 for this one. If we follow the same formula of

```
ciphertext_byte xor guess xor result
```

We get `2 ^ 6 ^ 2`, which is 6. So we we have decrypted another byte. Let's use
that to force our padding to three.

```
ciphertext[15] = (original_ct[15].ord ^ 6 ^ 3).chr
ciphertext[14] = (original_ct[14].ord ^ 6 ^ 3).chr
(0..255).each do |b|
    ciphertext[13] = b.chr
    begin
        decrypt(ciphertext)
        puts b
    rescue
        next
    end
end
```

The result is 27. `30 ^ 27 ^ 3` is yet again, 6. Which is what we expect since
we expect 6 padding bytes with a value of 6.

For the sake of brevity, let's skip ahead a bit. Let's see what happens if we
trick it in to thinking there are 7 padding bytes.

```ruby
ciphertext[15] = (original_ct[15].ord ^ 6 ^ 7).chr
ciphertext[14] = (original_ct[14].ord ^ 6 ^ 7).chr
ciphertext[13] = (original_ct[13].ord ^ 6 ^ 7).chr
ciphertext[12] = (original_ct[12].ord ^ 6 ^ 7).chr
ciphertext[11] = (original_ct[11].ord ^ 6 ^ 7).chr
ciphertext[10] = (original_ct[10].ord ^ 6 ^ 7).chr
(0..255).each do |b|
    ciphertext[9] = b.chr
    begin
        decrypt(ciphertext)
        puts b
    rescue
        next
    end
end
```

The result is 198. `166 ^ 198 ^ 7` is 103. 103 on the ASCII table is "g". Our
plaintext string ends in a "g". Let's keep advancing.

```ruby
ciphertext[10] = (original_ct[10].ord ^ 6 ^ 8).chr
ciphertext[9] = (original_ct[9].ord ^ 103 ^ 8).chr
# etc...
```

We get 198, and `160 ^ 198 ^ 8` is "n". If we repeat this pattern, we can fully
decrypt the block. Let's automate this a bit now.

```ruby
ciphertext.freeze
decrypt_data = ciphertext.dup
recovered = {}
(1..16).each do |i|
    position = 16-i
    (0..255).each do |guess|
        decrypt_data[position] = guess.chr
        begin
            decrypt(decrypt_data)
        rescue
            next # Bad padding.
        end
        recovered[position] = ciphertext[position].ord ^ guess ^ i
        (1..i).each do |j|
            z = 16 - j
            decrypt_data[z] = (ciphertext[z].ord ^ recovered[z] ^ (i+1)).chr
        end
        break
    end
end
pp recovered.sort.map { |k, v| v }.pack("c*")
```

The final output is:

```
for coding\x06\x06\x06\x06\x06\x06
```

The everything put together example of attacking padding is [available on GitHub][1].
You can run that in most online ruby REPLs, like [repl.it][2].

The crucial thing about this is that the "decrypt" process never returns the
decrypted data, it either raises an exception or returns "Data processed". Yet
we were still able to determine the contents. This doesn't seem like much
initially, however consider the example of an encrypted web cookie.

A visitor visits a website, and the server gives the browser an encrypted cookie
as a session identifier, maybe because they logged in. When the server receives
the cookie in later web requests, it needs to decrypt it to get the contents.
However, if the server returns clear error messages for padding failures like
our code above, an attacker that has stolen the cookie is able to decrypt it
by sending the cookie to the server and observing how it responds to padding
failures.

I would be remiss not to point out that there are several other design flaws
with this example we put together for the sake of demonstration. Namely, that
the IV and Key were hard coded and not generated with a CSPRNG or derived using
a KDF.

The solution for this is to _authenticate_ our cipher text, which is to say,
make it tamper-proof. This is easier said than done.

Let's clean up symmetric encryption a bit to make it less of an example.

```ruby
def process_data(iv, data)
    cipher = OpenSSL::Cipher::AES.new(128, :CBC)
    cipher.padding = 0
    cipher.decrypt
    cipher.key = @aes_key
    cipher.iv = iv
    plaintext = cipher.update(data)
    last_octet = plaintext[-1].ord
    raise PaddingError if plaintext.length - last_octet < 0
    padding = plaintext[-last_octet..-1]
    is_padding_valid = padding.bytes.inject(0) { |a, b|
        a | (b ^ last_octet)
    }.zero?
    raise PaddingError unless is_padding_valid

    # Process data
    return true
end
```

There. We have a function that takes an independent initialization vector and
the data, and does a little bit more error handling. It still has flaws mind
you, regarding padding removal. There are also some short
comings of our attack, such has handling the case where the amount of padding
on the ciphertext really is one or decrypting multiple blocks. Both of those are
currently left as an exercise.

The usual means of authenticating AES-CBC is with an HMAC using Encrypt-then-MAC
(EtM) to ensure the integrity of the ciphertext. Let's cleanup our code a bit
and reduce the amount of assumptions we make. No more hard coded keys and IVs.
We'll go with in-memory values, for now.

The final cleaned up version of this is also [available on GitHub][3]. For
brevity, here are the function definitions:

```ruby
def encrypt_data(plaintext); # return is [ciphertext, random_iv]
def process_data(iv, data); #return is "true", or an exception is raised
```

HMAC is a symmetric signature, or a "keyed hash". If we sign the contents of
the cipher text, then validate the HMAC before attempting to decrypt the data,
then we have reasonable assurance that the cipher text has not been changed.

Let's update the `encrypt_data` function to include a MAC.

```ruby
HASH_ALGORITHM = 'sha256'.freeze

def encrypt_data(plaintext)
    new_iv = OpenSSL::Random.random_bytes(16)
    cipher = OpenSSL::Cipher::AES.new(128, :CBC)
    cipher.encrypt
    cipher.key = @aes_key
    cipher.iv = new_iv
    ciphertext = cipher.update(plaintext) + cipher.final
    digest = OpenSSL::Digest.new(HASH_ALGORITHM)
    mac = OpenSSL::HMAC.digest(digest, @hmac_key, ciphertext)
    [mac.freeze, ciphertext.freeze, new_iv.freeze]
end
```

Our encrypt function now returns the MAC as well. Many uses of EtM simply prepend
the MAC to the front of the cipher text. The MAC's size will be consistent with
the underlying algorithm. For example, HMAC-SHA256 will always produce a 256-bit
length digest, or 32-bytes. When it comes time to decrypt the data, the HMAC is
split off from the cipher text since the length is known.

The `process_data` can be updated like this:

```ruby
HASH_ALGORITHM = 'sha256'.freeze

def process_data(iv, mac, data)
    raise MacError if mac.length != 32
    digest = OpenSSL::Digest.new(HASH_ALGORITHM)
    recomputed_mac = OpenSSL::HMAC.digest(digest, @hmac_key, data)
    is_mac_valid = 0
    (0...32).each do |index|
        is_mac_valid |= recomputed_mac[index].ord ^ mac[index].ord
    end
    raise MacError if is_mac_valid != 0

    # Continue normal decryption
```

Our attack on the padding no longer works. When we attempt to tweak the first
block, the HMAC no longer matches the supplied value. As an attacker, we can't
feasibly re-compute the HMAC without the HMAC key, and trying to guess one that
works is also not doable.

Going back to our cookie web server, when the server issues an encrypted cookie,
the encrypted cookie contains the HMAC for the encrypted data, as well as the
cipher text. When the server checks the cookie the browser sent, it first
verifies the HMAC, and if that passes, then it decrypts the cookie contents.

>Aside: The encrypted cookie was an example. If you really are using encrypted
>data in cookies, I would kindly ask _why_. Storing sensitive data in a cookie
>is rarely a good idea at all.

We have some simple authenticated data applied to AES-CBC now, and defeated our
padding oracle attack. Some final words on best practices here.

First, in an application, revealing _why_ the data failed to decrypt is never a
good idea. If our example cookie is a session identifier for authentication,
the web server should simply discard the cookie entirely if it cannot be
decrypted and redirect the user back to the login screen - not display an error
about decrypting the cookie's contents.

Authenticated encryption is a bare _minimum_ for properly encrypting data, it isn't
"bonus" security. Things get trickier when large amounts of data get involved,
or data is streamed, which we will look at next.


[1]: https://gist.github.com/vcsjones/f9d52327c31a822cdc2f73423cace383#file-break-cbc-padding-rb
[2]: https://repl.it/languages/ruby
[3]: https://gist.github.com/vcsjones/f9d52327c31a822cdc2f73423cace383#file-cleaned-up-aes-break-rb
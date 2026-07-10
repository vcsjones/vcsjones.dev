---
layout: post
title: "ML-DSA with ruby/openssl"
date:   2026-07-10 05:00:00 -0500
categories: General
excerpt: >
  How to use Ruby's OpenSSL gem to work with ML-DSA.
---

Ruby's `openssl` gem is more or less the de facto source of cryptography in Ruby. It supports largely unopinionated bindings
on top of OpenSSL's `EVP_PKEY`. While `ruby/openssl` has many helpers for classical algorithms like RSA and ECDSA, its
generic bindings on top of `EVP_PKEY` make most ML-DSA functionality available.

Since `ruby/openssl` provides Ruby bindings on top of OpenSSL, using ML-DSA requires building the gem against OpenSSL 3.5 or later.
Version 3.2 of the `ruby/openssl` gem is also required for some of the key import and export APIs.

Some quick notes:

1. I've omitted the `require 'openssl'` in snippets.
2. I'm showing ML-DSA-44, but you can change it to ML-DSA-65 or ML-DSA-87 for other parameter sets.

### Generating a Key

```ruby
key = OpenSSL::PKey.generate_key("ML-DSA-44")
```

### Importing a Seed

```ruby
seed = "\x01" * 32 # Example seed
key = OpenSSL::PKey.generate_key("ML-DSA-44", hexseed: seed.unpack1("H*"))
```

⚠️ Note: Take care to ensure `hexseed` is not `nil` or `""` (empty string). OpenSSL interprets this to mean generating a new key.

⚠️ Note: While `generate_key` has a `seed` option as well, you should import the seed as a hex string because a plain string
will fail to import if it contains `\x00` octets. `\x00` is valid for seeds, so hex should be used to ensure `\x00` bytes
are preserved properly.

### Exporting a Seed

```ruby
key = get_ml_dsa_key()
key.get_param("seed")
```

⚠️ Note: `get_param` at the time of writing [is new](https://github.com/ruby/openssl/pull/1078) and may not be available. If this API is not available to you yet, unfortunately there is no easy way to retrieve the seed. The two options for getting the seed without `get_param` are to use `to_text`, which requires awkward parsing, or perform a PKCS#8 export and extract the seed from the PKCS#8 private key.

### Importing a Private Key or Public Key

```ruby
key = OpenSSL::PKey.new_raw_private_key("ML-DSA-44", private_key)
key = OpenSSL::PKey.new_raw_public_key("ML-DSA-44", public_key)
```

### Exporting a Private Key or Public Key

```ruby
key = get_ml_dsa_key()
private_key = key.raw_private_key
public_key = key.raw_public_key
```

### Signing

```ruby
key = get_ml_dsa_key()
data_to_sign = get_data_to_sign()
signature = key.sign(nil, data_to_sign)
```

### Signing, Deterministic

```ruby
key = get_ml_dsa_key()
data_to_sign = get_data_to_sign()
signature = key.sign(nil, data_to_sign, deterministic: 1)
```

⚠️ Note: Hedged, or non-deterministic, is the better option to use. There are some uses for deterministic signatures,
but unless you know you should be using them, it's better to use hedged.

### Signing with Context

```ruby
key = get_ml_dsa_key()
data_to_sign = get_data_to_sign()
signature = key.sign(nil, data_to_sign, "context-string": "example context") # Hedged
signature = key.sign(nil, data_to_sign, "context-string": "example context", deterministic: 1) # Deterministic
```

⚠️ Note: If your context is a binary string, it should be passed in hex form for the same reasons as seed:

```ruby
signature = key.sign(nil, data_to_sign, "hexcontext-string": "example\x00context".unpack1("H*"))
```

### Signing with External-Mu

```ruby
key = get_ml_dsa_key()
mu_to_sign = calculate_mu()
signature = key.sign(nil, mu_to_sign, mu: 1) # Hedged
signature = key.sign(nil, mu_to_sign, mu: 1, deterministic: 1) # Deterministic
```

⚠️ Note: External-Mu mode lets callers supply the 64-byte message representative that ML-DSA normally computes internally. Constructing External-Mu
requires careful construction; it's not just a simple hash over the data you want to sign like RSA or ECDSA offer.
Calculating mu is an exercise left for another post. Right now it is impossible to calculate with `ruby/openssl` because
it requires squeezing output from SHAKE-256, which `ruby/openssl` doesn't support currently, but it
[will in the future](https://github.com/ruby/openssl/pull/1083).

⚠️ Note: `context-string` is ignored when using `mu`. That's because `mu`'s calculation already accounts for the context,
so it won't be used as part of signing or verifying.

### Verifying

```ruby
key = get_ml_dsa_key()
signature = signature_to_verify()
data_to_verify = get_data_to_verify()
result = key.verify(nil, signature, data_to_verify)
```

### Verifying with Context

```ruby
key = get_ml_dsa_key()
signature = signature_to_verify()
data_to_verify = get_data_to_verify()
result = key.verify(nil, signature, data_to_verify, "context-string": "example context") # UTF-8 context string
result = key.verify(nil, signature, data_to_verify, "hexcontext-string": "example context".unpack1("H*")) # Same context, hex encoded
```

### Verifying with External-Mu

```ruby
key = get_ml_dsa_key()
signature = signature_to_verify()
mu_to_verify = calculate_mu_to_verify()
result = key.verify(nil, signature, mu_to_verify, mu: 1)
```

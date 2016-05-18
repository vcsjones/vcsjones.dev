---
layout: post
title:  "Using ECC for an SSL Certificate"
date:   2013-05-27 12:00:00 -0400
categories: General
---

Recently I've been toying with the idea of using ECCDSA instead of RSA for SSL
certificates. Using an ECC key of 256 is [approximately][1] as strong as a 3072-bit
RSA key, which is what drew me towards them. However I found it a little
difficult to get the Certificate Authority to issue the right kind of
certificate. Eventually I got it working using CertReq.exe, here is the INF I
used to generate the certificate.

```ini
[Version]
Signature="$Windows NT$"

[NewRequest]
Subject = "CN=yourcommonname"
Exportable = FALSE
KeyLength = 256
KeyUsage = 0xA0
MachineKeySet = TRUE
KeySpec = 0
ProviderName = "Microsoft Software Key Storage Provider"
ProviderType=12
KeyAlgorithm = "ECDSA_P256"
HashAlgorithm = "SHA256"

[Strings]
szOID_SUBJECT_ALT_NAME2 = "2.5.29.17"
szOID_ENHANCED_KEY_USAGE = "2.5.29.37"
szOID_PKI_KP_SERVER_AUTH = "1.3.6.1.5.5.7.3.1"

[Extensions]
%szOID_SUBJECT_ALT_NAME2% = "{text}dns=domain1&dns=domain2"
%szOID_ENHANCED_KEY_USAGE% = "{text}%szOID_PKI_KP_SERVER_AUTH%"

[RequestAttributes]
CertificateTemplate= WebServer
```

With this template I was issued a ECDSA_P256 certificate, which is exactly what
I wanted. The usage of a SAN is optional, however it I needed to specify it as
well, so I left it here.

[1]: https://www.nsa.gov/business/programs/elliptic_curve.shtml

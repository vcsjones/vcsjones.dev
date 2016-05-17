---
layout: post
title:  "Making a self-signed SSL certificate (and trusting it) in PowerShell"
date:   2013-11-08 12:00:00 -0400
categories: General
---

I recently came across a new PowerShell cmdlet for creating self signed
certificates in PowerShell:

```powershell
$cert = New-SelfSignedCertificate -DnsName localhost, $env:COMPUTERNAME
        -CertStoreLocation Cert:\LocalMachine\My
```

This cmdlet is actually really helpful since it lets you specify subject
alternative names in the certificate as well. The DnsName parameter uses the
first value for the Common Name, and all of them for SANs. Since the cmdlet
returns an X509Certificate2 object, it's easy enough to use in other .NET API's
as well, such as adding it to the Trusted Root Authority:

```powershell
$rootStore = New-Object System.Security.Cryptography.X509Certificates.X509Store -ArgumentList Root, LocalMachine
$rootStore.Open("MaxAllowed")
$rootStore.Add($cert)
$rootStore.Close()
```

And even creating an SSL binding to an IIS Web Site:

```powershell
New-WebBinding -Name "Default Web Site" -IPAddress "*" -Port 443 -Protocol https
pushd IIS:\SslBindings
$cert | New-Item 0.0.0.0!443
popd
```

This is a handy little Cmdlet, though it lacks some flexibility, such as
specifying the validity period and RSA key size (though the default 2048
is just fine).
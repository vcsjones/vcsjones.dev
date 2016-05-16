---
layout: post
title:  "Authenticating ASP.NET 5 to AD FS OAuth Part 3: Validating JWTs"
date:   2015-06-01 12:00:00 -0400
categories: Security
---

In our [first part][1] of handling OAuth, we handle the response from AD FS and parse
the JWT back to the application.

OAuth 2.0 by nature depends on transport security (TLS). Without HTTPS, OAuth
2.0 is completely insecure. However the JWT that AD FS returns is in fact, signed.
It's signed by the Token Signing Certificate in AD FS, and using the Public Key
we can validate it. You can get the certificate from AD FS by simply exporting
to to disk and saving it as a .cer file.

Previously, we weren't validating the JWT – which isn't unreasonable if you have
correct transport security in place. If you want to validate the signature of
the JWT, you can modify your middleware configuration like so:

```csharp
OnGetUserInformationAsync = context =>
{
    var handler = new JwtSecurityTokenHandler();
    var signingCert = new X509Certificate2(Path.Combine(_appEnv.ApplicationBasePath, "jwtToken.cer"), (string)null);
    SecurityToken securityToken;
    var validationOptions = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new X509SecurityKey(signingCert),
        ValidateAudience = true,
        ValidateIssuer = true,
        ValidAudience = "http://www.example.com/",
        ValidIssuer = "http://www.example.com/",
        NameClaimType = ClaimTypes.Upn,
        RoleClaimType = ClaimTypes.Role,
        AuthenticationType = "oauth2",
        RequireSignedTokens = true,
    };
    var principle = handler.ValidateToken(context.AccessToken, validationOptions, out securityToken);
    context.Principal = principle;
    return Task.FromResult(0);
}
```

The first thing we'll need is the certificate – in this case I named it
jwtToken.cer and put it in the application base path, one level up from wwwroot.
You can change the validation as you like, such as not validating the audience
or issuer.

Alternatively, you can obtain the certificate from a certificate store:

```csharp
X509Store store = new X509Store(StoreName.My, StoreLocation.LocalMachine);
store.Open(OpenFlags.ReadOnly);
var thumbprint = "get-thumbprint-from-configuration";
var certificates = store.Certificates.Find(X509FindType.FindByThumbprint, thumbprint, false);
if (certificates.Count == 0)
{
    throw new System.Security.SecurityException($"Unable to find certificate with thumbprint \"{thumbprint}\".");
}
var certificate = certificates[0];
```

[1]: /2015/05/04/authenticating-asp-net-5-to-ad-fs-oauth/
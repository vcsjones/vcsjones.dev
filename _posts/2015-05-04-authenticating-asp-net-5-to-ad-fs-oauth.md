---
layout: post
title:  "Authenticating ASP.NET 5 to AD FS OAuth"
date:   2015-05-04 12:00:00 -0400
categories: Security
---

One of the new things that Active Directory Federation Services supports
starting in Windows Server 2012 R2 is OAuth2. I wanted to get ASP.NET 5 working
with AD FS's OAuth2 support (as opposed to WS-Federation or SAML).

To get this to work, we must first configure AD FS to support this. Use the AD
FS management tool to ensure the OAuth2 service endpoint is enabled:

![EndPoint][1]

The OAuth2 specification makes no security promises by itself, instead it relies
on Transport security, or TLS.

Next, you will want to ensure you have a relying party configured. If you have
one that exists you want to use already, then you can use an existing one.

Here we can set one up quickly for testing. Start with a manual configuration:

![AD FS Manual][2]

Next, specify an identifier for your relying party. This can be any valid URI,
including an URN or URL. For purposes of OAuth2, this can be any URI so long as
it is unique amongst all relying parties.

![AD FS Identifiers][3]

Continue through the wizard with the defaults or nothing selected since we will
not be using SAML or WS-Federation, then add a claim rule for for the user
principle name.

![AD FS Transform][4]

Now that you have a relying party, you use the `Add-AdfsClient` powershell cmdlet.
This adds an OAuth2 client to the relying party. Each client has a unique
identifier. How many clients you make per relying party is up to you – you can
reuse it for many multiple applications, or make a distinct client per
application.

* **-ClientId**: This is a unique identifier that is the client ID that we will
configure OAuth to use. Typically this is just a random GUID.
* **-Name**: The name of the client.
* **-RedirectUri**: This is an URI or array of URIs that AD FS is allowed to
post back to. This must be a fully qualified URI.
* **-Description** (optional): A description of the client.

Getting into the ASP.NET 5 web application, we use the OAuth middleware, which
performs the authentication. Because OAuth is just an authentication step, it
must piggy-back on another authentication provider that can authenticate the
entire browser session, like cookies.

Let's say my application is being hosted on https://myserver.com/, and AD FS is
located at https://adfs.mycompany.com/, and we'll see how this ties in to the
AD FS configuration.

```csharp
app.UseOAuthAuthentication("oauth2", options => {
    options.AutomaticAuthentication = true;
    options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.ClientId = "1bf8f5f1-c3c5-4a7c-993a-01d912409915";
    options.ClientSecret = "abc123";
    options.CallbackPath = new PathString("/oauth-callback");
    options.Notifications = new OAuthAuthenticationNotifications {
        OnApplyRedirect = context => {
            var parameter = new Dictionary
            {
                ["resource"] = "https://test.local"
            };
            var query = QueryHelpers.AddQueryString(context.RedirectUri, parameter);
            context.Response.Redirect(query);
        }
    };
    options.ClaimsIssuer = "https://myserver.com/";
    options.AuthorizationEndpoint = "https://adfs.mycompany.com/adfs/oauth2/authorize/";
    options.TokenEndpoint = "https://adfs.mycompany.com/adfs/oauth2/token/";
});
```

The ClientId is the GUID we specified in the `Add-AdfsClient` cmdlet. The
ClientSecret is a meaningless value, AD FS does not support client secrets.
However, the OAuth2 middleware requires it.

The CallbackPath is a relative path that the middleware expects AD FS to return
the OAuth token. Since our application's callback URI is
https://myserver.com/ouath-callback, this would be the URI we specify as the
`-RedirectUri` specified in the powershell cmdlet.

I did struggle with one thing for a bit, which was having to slightly modify the
query string the ASP.NET 5 OAuth middleware used to go to the AD FS portal.
AD FS expects a query string parameter of "resource" with a URI that matches one
of the relying party trust URIs. The OAuth middleware allows you to intercept
some events such as the redirection to the portal, handling the response back,
and setting the claims up from the response.

The last step is to enable cookie authentication:

```csharp
app.UseCookieAuthentication(config =>
{
    config.AutomaticAuthentication = true;
});
```

This is how the OAuth authentication "sticks" for the duration of the browser
session.

That was enough to get OAuth2 working with ASP.NET 5 and AD FS from a pure
authentication perspective. [Next time][5] we will look at setting up claims for
roles and permissions.

### Update

The NuGet packages needed for all of this is as following:

* "Microsoft.AspNet.Identity": "3.0.0-beta4"
* "Microsoft.AspNet.Authentication.Cookies": "1.0.0-beta4"
* "Microsoft.AspNet.Authentication.OAuth": "1.0.0-beta4"
* "Microsoft.AspNet.Authentication": "1.0.0-beta4"
* "System.IdentityModel.Tokens": "5.0.0-beta4"

Keep in mind that given of this is beta, it's possible some of the nuget
packages needed will change, some may be removed, and others may be renamed.
Finally, the namespaces used:

```csharp
using Microsoft.AspNet.Builder;
using Microsoft.Framework.DependencyInjection;
using Microsoft.AspNet.Http;
using Microsoft.AspNet.Hosting;
using Microsoft.AspNet.Authentication.OAuth;
using Microsoft.AspNet.WebUtilities;
using Microsoft.AspNet.Authentication.Cookies;
using Microsoft.AspNet.Authentication;
using Microsoft.Framework.Runtime;
using System.Security.Claims;
using System.Threading.Tasks;
using System.IdentityModel.Tokens;
using Microsoft.AspNet.Authorization;
```

[1]: /images/endpoint.png
[2]: /images/adfs-manual.png
[3]: /images/adfs-identifiers.png
[4]: /images/adfs-transform.png
[5]: /2015/05/05/authenticating-asp-net-5-to-ad-fs-oauth-part-2-claims/
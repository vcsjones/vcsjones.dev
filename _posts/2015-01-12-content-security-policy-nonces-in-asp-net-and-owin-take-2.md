---
layout: post
title:  "Content-Security-Policy Nonces in ASP.NET and OWIN, Take 2"
date:   2015-01-12 12:00:00 -0400
categories: General
---

I last wrote about using nonces in content security policies with ASP.NET and
OWIN. I've learned a few things since that should help a little bit.

First, in my previous example, I used a bit of a shotgun approach by applying
the CSP header in OWIN's middleware. This worked effectively, but it had one
downside: it added the CSP header to everything, including non-markup content
like .JPGs and .PNGs. While having the CSP header for these doesn't hurt
anything, it does add at minimum 28 bytes every time the content is served.

![Nonce in Static Content][1]

Since we are using MVC, it makes sense to move this functionality into an
ActionFilter and registering it as a global filter. Here is the action filter:

```csharp
public sealed class NonceFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext filterContext)
    {
        var context = filterContext.HttpContext.GetOwinContext();
        var rng = new RNGCryptoServiceProvider();
        var nonceBytes = new byte[32];
        rng.GetBytes(nonceBytes);
        var nonce = Convert.ToBase64String(nonceBytes);
        context.Set("ScriptNonce", nonce);
        context.Response.Headers.Add("Content-Security-Policy", 
            new[] { string.Format("script-src 'self' 'nonce-{0}'", nonce) });
    }

    public void OnActionExecuted(ActionExecutedContext filterContext)
    {
    }
}
```

Then we can remove our middleware from OWIN. Finally, we add it to our global
filters list:

```csharp
public static void RegisterGlobalFilters(GlobalFilterCollection filters)
{
    filters.Add(new NonceFilter());
    /* others omitted */
}
```

The `NonceHelper` used for rendering the nonce in script elements doesn't need
to change.

This adds the Content-Security-Policy header to MVC responses, but not static
content like CSS or JPG files. This also has the added benefit of working in
projects that don't use OWIN at all.

This does put more burden on putting Content-Security-Policy in other places
though, such as static HTML files, or any other places where the browser is
interpreting markup.

[1]: /images/nonce-static-content.png
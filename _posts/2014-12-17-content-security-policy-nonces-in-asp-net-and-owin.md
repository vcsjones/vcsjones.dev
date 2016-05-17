---
layout: post
title:  "Content-Security-Policy Nonces in ASP.NET and OWIN"
date:   2014-12-17 12:00:00 -0400
categories: General
---

I've been messing around with the latest Content-Security-Policy support in
Chrome, and wanted to try using the nonce feature for whitelisting inline
scripts. It looks like it will be less of a pain than hashes, and simplify the
case of dynamic JavaScript.

The basic theory is this: when I send my Content-Security-Policy header, I
include a randomly generated nonce, like this:

```
Content-Security-Policy: "script-src 'self' 'nonce-[random nonce]'"
```

Where \[random nonce\] is a securly generated nonce. This nonce will be unique for
every single response from the server.

On the web content side of things, where I have a `<script>` tag, I include an
attribute called "nonce" with the same value.

```html
<script nonce="[random nonce from header]" type="text/javascript">
//my script body
</script>
```

When the browser executes the inline JavaScript block, it checks that the nonce
attribute matches what was sent in the header.

This prevents an attacker from injecting scripts into a page with XSS. A common
scenario might be the attacker registers a username
`<script>/*do bad things in JS*/</script>`. If this were something like a chat
application that lists every active user, the attacker is able to execute
JavaScript in another user's session. Ouch.

However with the nonce, the attacker cannot inject script tags since the nonce
is changing on every request. Instead, the attacker will get a Content Security
Policy error:

>Refused to execute inline script because it violates the following Content
Security Policy directive: "script-src ‘self'". Either the ‘unsafe-inline'
keyword, a hash (‘sha256-…'), or a nonce (‘nonce-…') is required to enable
inline execution.

How do we accomplish this in ASP.NET MVC? Using the OWIN middleware, we can
inject the header pretty easily:

```csharp
public void Configuration(IAppBuilder app)
{
    app.Use((context, next) =>
    {
        var rng = new RNGCryptoServiceProvider();
        var nonceBytes = new byte[32];
        rng.GetBytes(nonceBytes);
        var nonce = Convert.ToBase64String(nonceBytes);
        context.Set("ScriptNonce", nonce);
        context.Response.Headers.Add("Content-Security-Policy",
            new[] {string.Format("script-src 'self' 'nonce-{0}'", nonce)});
        return next();
    });
    //Other configuration...
}
```

You might have a more preferred way of doing this in OWIN, such as using a
container to resolve a middleware implementation, but for simplicity's sake,
we'll go with this. This does two things. First, it securely generates a 32 byte
random nonce. There are no specific guidelines on how big a nonce should be, but
a 256-bit nonce is big enough that it is next to impossible to guess (assuming
the RNG isn't broken), and small enough that it isn't adding significant weight
to the response size. Realistically, a nonce could even be 32 or 64 bits and
still provide adequate security. It then adds this nonce to the header.
Secondly, it adds this nonce into the OWIN context so that we can use it
elsewhere.

We then want to add this generated nonce into the response body. We can build a
simple HTML helper to use this in our razor views:

```csharp
public static class NonceHelper
{
    public static IHtmlString ScriptNonce(this HtmlHelper helper)
    {
        var owinContext = helper.ViewContext.HttpContext.GetOwinContext();
        return new HtmlString(owinContext.Get<string>("ScriptNonce"));
    }
}
```

Then we can use this helper in our views:

```html
<script type="text/javascript" nonce="@Html.ScriptNonce()">
//my script body
</script>
```

The rendered result is something like this:

```html
<script type="text/javascript" nonce="WpvQQK0FO/ZAljsQDGMLEgi2hrvIBVPQNak9zIWqRZE=">
//my script body
</script>
```

This is a simple approach that works well. When Content Security Policy Level
2 gets broader adoption, I think this will be another effective tool web
developers can use to mitigate XSS attacks.

Nonces don't help you is if the attacker can influence the body of a script
element, where hashes can protect against that. However hashes have their own
shortcomings, such as bloat in HTTP headers and being a little more fragile.
Nonces however address the issue of a script that is truly dynamic, such as
those that contain CSRF tokens which are also generated per-request.
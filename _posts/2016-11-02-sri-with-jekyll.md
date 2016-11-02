---
layout: post
title:  "SRI with Jekyll"
date:   2016-11-02 10:30:00 -0400
categories: Security
---

[Subresource Integrity][1] - or SRI - is something I wanted to learn, so the
natual place to get started with it is right here on my blog. Though it has
somewhat limited value on my site since I don't use a CDN, it still proves
useful with helping me understand these things in a relatively safe place. After
all, no SLA is going to be violated if my blog's CSS doesn't load.

In fact, since we don't have *any* JavaScript here, the only thing I could
use it on right now is my lone CSS include.

To back up, SRI is the practice of including a hash of an external asset where
that external asset is included in the current page.

For example, using SRI on my current site looks like this:

```html
<link
    rel="stylesheet"
    crossorigin="anonymous"
    integrity="sha256-xk/GF3tsHVHrcjr3vColduFPXc/PrGx+WNHy+SvR8X8="
    href="/css/main.css">
```

Where the `integrity` attribute includes the digest algorithm along with the
digest itself. This is in the same manner and style as PKP. So `main.css` base64
digest is `xk/GF3tsHVHrcjr3vColduFPXc/PrGx+WNHy+SvR8X8=`, for now.

The purpose of this is *if* I were using a CDN, or my static content were
included on another server outside of my control - how do I know it hasn't been
tampered with along the way? It's meant to stop something like this:

```html
<link
    rel="stylesheet"
    crossorigin="anonymous"
    integrity="sha256-xk/GF3tsHVHrcjr3vColduFPXc/PrGx+WNHy+SvR8X8="
    href="//malicious.cdn.com/style.css">
```

Assuming that the page also wasn't hosted on `malicious.cdn.com`, the digest
would prevent them from changing it. The hashes would no longer match, and
the browser would refuse to load the stylesheet.

For CSS this has some advantages, but the real use here is with JavaScript
that's on a CDN.

So SRI is pretty straight forward, in theory. When you get down to it though,
many websites have an asset pipeline. These pipelines can minify JavaScript and
CSS, transpile them, or any other transformation. These can either happen at
build time or at run time. The digests on the assets need to be the digest of
the final asset of what the browser sees and actually executes.

As this is a static site, [my CSS][2] is actually a SCSS file that gets compiled
by Jekyll. Every page includes this stylesheet. I needed to have the generated
pages have the hash of my stylesheet *after* it gets compiled. So either I
needed to do this after Jekyll compiled the site, or figure out a way to get
Jekyll to put the hash in.

Jekyll, or more specifically Liquid, support custom tags. What I wanted to be
able to do was put something like this in my template:

```html
<link
    integrity="{% raw %}{% sri_scss_hash css/main.scss %}{% endraw %}"
    href="/css/main.scss" />
```

All I had to do here was make the `sri_scss_hash` tag. How hard could it be?

Well, not entirely straight forward, considering I know little about ruby. I
used Jekyll's source code as a reference on how to implement this. The final
version of this plugin is on [my GitHub repository][3] for this site.

It uses the existing `IncludeRelativeTag` Jekyll tag as a base, and instead of
including the content as-is, it runs it through the SCSS converter, first. The
meat of it is the `render` function:

```ruby
def render(context)
    cache_compiled_scss(@file, context, lambda {
        site = context.registers[:site]
        converter = site.find_converter_instance(Jekyll::Converters::Scss)
        result = super(context)
        scss = result.gsub(/^---.*---/m, '')
        data = converter.convert(scss)
        "sha256-#{Digest::SHA256.base64digest data}"
    })
end
``` 

This works well, but it does one thing that feels a little hacky to me which is
use a regular expression to remove the frontmatter from the stylesheet before
running it through the converter. The frontmatter is required for Jekyll to
trigger its compilations for the files, but the converter itself doesn't like
the frontmatter. I feel like there should be a better way to remove the
frontmatter, but this works for now. If there are any Jekyll experts out there,
I would love to know a better way to do this.

All you need to do then is drop a ruby file in `_plugins` along with a line
to register the plugin, and you can start using the plugin to generate SRI
hashes for SCSS stylesheets.

I learned a few things implementing this. Specifically, the `sandbox`
Content-Security-Policy directive gave me some trouble. This took me a little
while to understand, but the SRI check will fail if the origin the document
does not have Cross-Origin access to the resource.

All in all I think SRI is a worthwhile investment if you've got all of the
low-hanging fruit already picked. It's not as trivial to do as it would first
seem do to the complexities of build processes.


[1]: https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity
[2]: https://github.com/vcsjones/vcsjones.com/blob/master/css/main.scss
[3]: https://github.com/vcsjones/vcsjones.com/blob/61ba0443725f73898a78bdc625df36ca3b1c3735/_plugins/sri.rb

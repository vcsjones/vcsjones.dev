---
layout: post
title:  "Experimenting with WebP"
date:   2015-11-20 12:00:00 -0400
categories: General
---

A few years ago, Google put out the WebP image format. I won't dive in to the
merits of WebP, Google does a [good job of that][1].

For now, I wanted to focus on how I could support it for my website. The
thinking that if I am happy with the results here then I can use it in other
more useful ways. The trick with WebP is it isn't supported by all browsers, so
a flat "convert all images to WebP" approach wasn't going to work.

Enter the Accept request header. When a browser makes a request, it includes
this header to indicate to the server what the browser is capable of handling,
and the preference for the content. Chrome's Accept header currently looks
like this:

```
text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
```

Chrome explicitly indicates that it is willing to process WebP. We can use this
to conditionally rewrite what file is returned by the server.

The plan was to process all image uploads and append ".webp" to the file. So,
foo.png becomes foo.png.webp. We'll see why in a bit. The other constraint is I
don't want to do this for all images. Images that are part of WordPress itself
such as themes will be left alone, for now.

Processing the images was pretty straightforward. I installed the webp package
then processed all of the images in my upload directory. For now we'll focus on
just PNG files, but adapting this to JPEGs is easy.

```
find . -name '*.png' | (while read file; do cwebp -lossless $file -o $file.webp; done)
```

**Note**: This is a bit of a tacky way to do this. I'm aware there are probably
issues with this script if the path contains a space, but that is something
I didn't have to worry about.

This converts existing images, and using some WordPress magic I configured it
to run cwebp when new image assets are uploaded.

Now that we have side-by-side WebP images, I configured NGINX to conditionally
serve the WebP image if the browser supports it.

```nginx
map $http_accept $webpext {
    default         "";
    "~*image/webp"  ".webp";
}
```

This goes in the server section of NGINX configuration. It defines a new
variable called `$webpext` by examining the `$http_accept` variable, which NGINX
sets from the request header. If the `$http_accept` variable contains
"image/webp", then the `$webpext` variable will be set to .webp, otherwise it is
an empty string.

Later in the NGINX configuration, I added this:

```nginx
location ~* \.(?:png|jpg|jpeg)$ {
    add_header Vary Accept;
    try_files $uri$webpext $uri =404;
    #rest omitted for brevity
}
```

NGINX's `try_files` is clever. For PNG, JPG, and JPEG files, we try and find a
file that is the URI plus the webpext variable. The webpext variable is empty
if the browser doesn't support it, otherwise it's .webp. If the file doesn't
exist, it moves on to the original. Lastly, it returns a 404 if neither of
those worked. NGINX will automatically handle the content type for you.

If you are using a CDN like CloudFront, you'll want to configure it to vary
the cache based on the Accept header, otherwise it will serve WebP images to
browsers that don't support it if the CDN's cache is primed by a browser that
does support WebP.

So far, I'm pleased with the WebP results in lossless compression. The images
are smaller in a non-trivial way. I ran all the images though `pngcrush -brute`
and `cwebp -lossless` and compared the results. The average difference between
the crushed PNG and WebP is 15,872.77 bytes (WebP being smaller). The maximum
is 820,462. The maximum was 164,335 bytes, and the least was 1,363 bytes.
Even the smallest difference was a whole kilobyte. That doesn't seem like much,
but its a huge difference if you are trying to maximize the use of every byte
of bandwidth. Since non of the values were negative, WebP outperformed pngcrush
on all 79 images.

These figures are by no means conclusive, it's a very small sample of data,
but it's very encouraging.

[1]: https://developers.google.com/speed/webp/?hl=en
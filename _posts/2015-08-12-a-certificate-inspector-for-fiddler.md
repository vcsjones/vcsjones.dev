---
layout: post
title:  "A certificate inspector for Fiddler"
date:   2015-08-12 12:00:00 -0400
categories: Security
---

Fiddler is an awesome web development tool developed by Eric Lawrence.
It’s one of my "must haves" as a web developer and security researcher. If you
haven’t used it, I would recommend you take a look at it. It’s a bit difficult
to summarize what it does since it does so much, but it’s a tool inspecting,
modifying, and replaying HTTP traffic.

I’ve been tinkering with an extension called FiddlerCert that reveals greater
information about the certificates of an HTTPS enabled site. You can go get it
on GitHub right now under [vcsjones/FiddlerCert][1]. The README contains
installation and building instructions.

![FiddlerCert][2]

FiddlerCert is designed to make it easy to do common tasks with certificates
such as viewing common properties, installing it, and saving it to disk.

If you run into any issues or have feature requests, please let me know on GitHub.

[1]: https://github.com/vcsjones/FiddlerCert
[2]: /images/fiddlercert.png
---
layout: post
title:  "Moving to Static Content"
date:   2016-05-15 14:37:00 -0400
categories: Meta
---

If my site is looking a little different today, that's because I've redone it
from scratch. Gone is WordPress, gone is PHP.

Like many others, I've started using a static site generator, in this case Jekyll.
Static content makes a lot more sense, and a lot of things I wanted to play
around with on my previous blog I didn't get to do because WordPress fought me
most of the way.

Things are simpler here. There is no JavaScript. I've abandoned any kind
of in-page analytics because I don't value it more than I value other people's
privacy. Here, all we have is static HTML and CSS.

No JavaScript, dynamic content, or assets from other domains means I can have a
plain and simple Content Security Policy, which I effectively couldn't do with
WordPress due to the mess of inline CSS and JavaScript that were thrown around.

It also means I can enable brotli on everything.

Finally, there is a real deploy process for this. No more manually crushing images
and creating WebP variants of the image by hand. This all happens automatically,
behind the scenes.

### Making it Work

The site's content is now on [GitHub][1]. On commit, GitHub notifies AWS CodeDeploy,
which pulls down the repository to the EC2 instance and kicks off the build. It
starts as a gulp task, which runs Jekyll, then compresses images and creates WebP
copies. The repository also contains the NGINX configuration, which CodeDeploy
copies to the correct location and then reloads NGINX.

AWS CodeDeploy works pretty well for this. It's a tad difficult to get started
with, which was a bit discouraging, but after reading the documentation through
a few times it eventually clicked and I was able to get it working correctly.  

The migration has left some things missing, for now, such as comments, but
eventually I'll bring those back.

[1]: https://github.com/vcsjones/vcsjones.dev

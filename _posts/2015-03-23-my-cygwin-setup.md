---
layout: post
title:  "My cygwin setup"
date:   2015-03-23 12:00:00 -0400
categories: General
---

Part of changing jobs meant that I had to rebuild my Windows virtual machine.
Most of which I've managed to get down to a science at this point, but
remembering all of the little changes I've made to Cygwin over the years has
been lost. I thought, "make a blog post" since it'll help me remember, and
possibly help others.

### Ditching cygdrive

I don't really like having to type `/cygdrive/c` – I'd much rather type `/c`, like
Git Bash does out of the box.

The solution for this is to modify the `/etc/fstab` file and add this line at the
end:

```
c:/ /c fat32 binary 0 0
```

Don't worry about the "fat32" in there, use that even if your file system is
NTFS. You can do this for arbitrary folders, too:

```
c:/SomeFolder /SomeFolder fat32 binary 0 0
```

Now I can simply type `/SomeFolder` instead of `/cygdrive/c/SomeFolder`.

### Changing the home path
Cygwin's home path is not very helpful. I choose to map it to my Windows home
directory (again like Git Bash). The trick for this is to edit the file
`/etc/nsswitch.conf` and add the following line:

```
db_home: /%H
```

This sets the home to your Windows Home directory. Note that this change affects
all users, so if you have multiple users on Windows, don't hard code a
particular path, instead use an environment variable like above.

### Prompt

I typically set my prompt to this in my .bash_profile file:

```
export PS1="\[\e[00;32m\]\u\[\e[0m\]\[\e[00;37m\] \[\e[0m\]\[\e[00;33m\]\w\[\e[0m\]\[\e[00;37m\]\n\\$\[\e[0m\]"
```

This is similar to the one Cygwin puts there by default, but does not include
the machine name.

### vimrc

Not exactly cygwin related, but here is a starter .vimrc file I use, I'm sure
I'll update it to include more as I remember more.

```
set bs=indent,eol,start
set nocp
set nu
set tabstop=4 shiftwidth=4 expandtab
syntax on
```


If anyone has some recommendations, leave them in the comments.
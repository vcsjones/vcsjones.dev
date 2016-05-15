---
layout: post
title:  "Using Chocolatey with One Get and HTTPS"
date:   2015-12-08 12:00:00 -0400
categories: General
---

Having rebuilt my Windows 10 environment again, it was time to start installing
stuff I needed to use. I thought I should start making this scriptable, and I
know Windows 10 has this fancy new package manager called One Get, so I thought
I would give it a try.

I found a blog post from Scott Hanselman on [setting up One Get with Chocolatey][1].
Having set up Chocolatey, I ran Get-PackageSource to check that it was there,
and this was the output:

```
Name          ProviderName     IsTrusted  IsRegistered IsValidated  Location
----          ------------     ---------  ------------ -----------  --------
PSGallery     PowerShellGet    False      True         False        https://www.powershellgallery.com/api/v2/
chocolatey    Chocolatey       False      True         True         http://chocolatey.org/api/v2/
```

All seemed OK, but I noticed that the Chocolatey feed location was not HTTPS.
This was obviously a bit concerning. I fired up Fiddler to check if it was
actually doing HTTP queries, and yes, it was.

![Chocolatey Fiddler][2]

After checking out Chocolatey, it does appear that it supported HTTPS. After
doing a bit of tinkering, I found the proper cmdlets to update the location.

```powershell
Set-PackageSource -Name chocolatey -NewLocation https://chocolatey.org/api/v2/ -Force
```

After that, I re-ran my query, and queries were done over HTTPS now.

![Chocolatey Fiddler HTTPS][3]

[1]: https://www.hanselman.com/blog/AptGetForWindowsOneGetAndChocolateyOnWindows10.aspx
[2]: /images/chocolatey-fiddler.png
[3]: /images/chocolatey-fiddler-https.png
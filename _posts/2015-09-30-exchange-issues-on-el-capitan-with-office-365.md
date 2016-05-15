---
layout: post
title:  "Exchange Issues on El Capitan with Office 365"
date:   2015-09-30 12:00:00 -0400
categories: General
---

I just upgraded to El Capitan, and for the most part I haven't run into any
issues, except my Exchange accounts seemed wrong now. It was asking for my
password, and it changed the username from kevin@thedomain.com to just "kevin".

To fix this, I just removed the Exchange account and thought to re-add it.
However, it would not accept my username and password.

![OS X Unable To Connect][1]

The error was always "Unable to verify account name or password", and I knew the
password and username were correct.

Completing the dialog with the Internal and External URL worked, however. For
Office 365, setting the URLs to "https://outlook.office365.com/EWS/Exchange.asmx"
and completing the rest, and using my full email address for the username worked.

[1]: /images/osxunabletoconnect.png
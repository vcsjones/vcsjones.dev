---
layout: post
title:  "Writing a Managed Internet Explorer Extension: Part 3"
date:   2010-06-10 12:00:00 -0400
categories: General
---

I’m debating where to take this little series, and I think I am at a point
where we need to start explaining Internet Explorer, and why writing these things
can be a bit tricky. I don’t want to write a blog series where people are
blindly copying and pasting code and not knowing what IE is doing.


I am not a professional at it, but I’ve written browser extensions for most
popular browsers. IE, Chrome, Firefox, and Safari. In terms of difficulty,
IE takes it. That’s probably why there isn’t a big extension community for IE.

IE at it’s pinnacle, IE was 95% by web surfers with IE 5 and IE 6. If you are a
developer, you probably hear a lot of criticisms for IE 6, and rightly so. Back
then, IE supported a plug in model with that notorious name ActiveX. It was
criticized for allowing web pages to just ship run arbitrary code. Of course,
all of that changed and now IE really gets in your face before one of those
things run. In fact, it is one of the reasons why intranet apps still require
IE 6. Regardless, the message was clear to Microsoft. We need security!

Security was addressed in IE 7, and even more so in IE 8 with the help of
Windows Vista and Windows 7.

Hopefully by now you’ve had the opportunity to play around with writing IE Add
Ons, but you may have noticed some odd behavior, such as accessing the file
system.

### UAC / Integrity Access

UAC (User Access Control) was introduced in Windows Vista. There was a lot of
noise over it, but it does make things more secure, even if that lousy dialog is
turned off. It’s just transparent to the user. The purpose of UAC is the
Principle of Least Privilege. Don’t give a program access to a securable object,
like a file, unless it needs access to it. Even if your application will never
touch a specific file, another application might figure out a way to exploit
your application into doing dirty deeds for it. UAC provides a mechanism for
temporarily giving access to securable object the application would normally not
have permission to. UAC introduced the concept of Elevated and Normal. Normal is
what the user normally operates under until a UAC prompt shows up.

Those two names are just used on the surface though… there are actually three
Integrity Access Levels. Aptly named, they are called Low, Medium, and High.
Medium is Normal, and High is Elevated.

IE is a program that use Low by default. Low works just like threads and process
tokens. In theory, you could run your own application in “Low”. Low is it’s own
SID: “S-1-16-4096”. If we start a process using this SID, then it will be low
integrity. You can see [this article][2] for a chunk of code that does that. It’s
hard to do this in managed code, and will require a good amount of platform
invoke. You can also use this technique with threads.

Ultimately, Low mode has some really hard-core security limitations. You have no
access to the File System, except a few useful places

* %USERPROFILE%\Local Settings\Temporary Internet Files\Low
* %USERPROFILE%\Local Settings\Temp\Low
* %USERPROFILE%\AppData\LocalLow
* %USERPROFILE%\Cookies\Low
* %USERPROFILE%\Favorites\Low
* %USERPROFILE%\History\Low

That’s it. No user documents, nada. Some of those directories may not even
exist if a Low process hasn’t attempted to create them yet. If your extension is
going to only be storing settings, I recommend putting them into
%USERPROFILE%\AppData\LocalLow. This directory only exists in Windows Vista and
up. Windows XP has no UAC, and also it has no protected mode, so you are free to
do as you please on Windows XP.

To determine that path of LocalLow, I use this code. A domain policy might move
it elsewhere, or it might change in a future version of Windows:

<div id="more"></div>

```csharp
public static class LocalLowDirectoryProvider
{
    private static readonly Lazy _lazyLocalLowDirectory = new Lazy(LazyGetLocalLowDirectory, LazyThreadSafetyMode.ExecutionAndPublication);
 
    public static string LocalLowDirectory
    {
        get
        {
            return _lazyLocalLowDirectory.Value;
        }
    }
 
    private static string LazyGetLocalLowDirectory()
    {
        var shell32Handle = LoadLibrary("shell32.dll");
        try
        {
            var procAddress = GetProcAddress(shell32Handle, "SHGetKnownFolderPath");
            if (procAddress == IntPtr.Zero)
            {
                return null;
            }
        }
        finally
        {
            FreeLibrary(shell32Handle);
        }
        var localLowSavePath = IntPtr.Zero;
        try
        {
            if (SHGetKnownFolderPath(new Guid("A520A1A4-1780-4FF6-BD18-167343C5AF16"), 0, IntPtr.Zero, out localLowSavePath) != CONSTS.S_OK)
            {
                return null;
            }
            return Marshal.PtrToStringUni(localLowSavePath);
        }
        finally
        {
            if (localLowSavePath != IntPtr.Zero)
            {
                Marshal.FreeCoTaskMem(localLowSavePath);
            }
        }
    }
 
    [DllImport("shell32.dll", CallingConvention = CallingConvention.StdCall, EntryPoint = "SHGetKnownFolderPath")]
    private static extern uint SHGetKnownFolderPath([MarshalAs(UnmanagedType.LPStruct)] Guid rfid, uint dwFlags, IntPtr hToken, out IntPtr pszPath);
 
    [DllImport("kernel32.dll", CallingConvention = CallingConvention.StdCall, EntryPoint = "GetProcAddress", CharSet = CharSet.Ansi)]
    private static extern IntPtr GetProcAddress([In] IntPtr hModule, [In, MarshalAs(UnmanagedType.LPStr)] string lpProcName);
 
    [DllImport("kernel32.dll", CallingConvention = CallingConvention.StdCall, EntryPoint = "LoadLibrary", CharSet = CharSet.Auto)]
    private static extern IntPtr LoadLibrary([In, MarshalAs(UnmanagedType.LPTStr)] string lpFileName);
 
    [DllImport("kernel32.dll", CallingConvention = CallingConvention.StdCall, EntryPoint = "FreeLibrary")]
    private static extern IntPtr FreeLibrary([In] IntPtr hModule);
 
}
```

It returns null if there is no LocalLow directory. The Lazy class provides some
cool thread-safe caching for this value as it will never change (at least it
shouldn’t).
However, if you need to access the file system outside of one of these white 
isted directories, you have a couple of options later on down our journey:

1. Use IE’s built in Open File and Save File dialogs. They will give you access to
the file.
1. Use a broker process / COM server. We’ll discuss this one later.

### Loose Coupling

This tends to trick managed developers. Starting with IE 8, each tab is it’s own
process. That tends to break what developers get comfortable with, like the fact
that a static / shared variable are unique per tab. That was one of the design
goals of decoupling tabs – they can only talk to each other through securable
means, like RPC. Even in IE 7 which does not have a process per-tab, it still
isolates the BHO instances from one another. As far as the BHO knows, a tab is a
window.

Every time a new tab is opened, that tab gets it’s own instance of the BHO. This
was originally done to keep IE 7 as backward compatible with BHO’s as possible.
In IE 6, each Window was it’s own process. BHO’s got comfortable assuming there
would only be one instance of itself running. This loose coupling will also
change the behavior of how dialogs might be shown from a BHO. We’ll get into that
when we discuss UI design and interaction.

Part 4, we will back back up making a BHO do useful things. I just felt I had to
get this off my chest.

### More of this series

1. [Writing a Managed Internet Explorer Extension: Part 1 – Basics][1]
1. [Writing a Managed Internet Explorer Extension: Part 2 – DOM Basics][3]
1. Writing a Managed Internet Explorer Extension: Part 3
1. [Writing a Managed Internet Explorer Extension: Part 4 – Debugging][4]
1. [Writing a Managed Internet Explorer Extension: Part 5 – Working with the DOM][5]
1. [Writing a Managed Internet Explorer Extension: Part 6 – Regrets][6]

[1]: /2009/11/18/writing-a-managed-internet-explorer-extension-part-1-basics/
[2]: https://msdn.microsoft.com/en-us/library/bb250462(VS.85).aspx#dse_stlip
[3]: /2010/05/31/writing-a-managed-internet-explorer-extension-part-2-dom-basics/
[4]: /2010/11/28/writing-a-managed-internet-explorer-extension-part-4-debugging/
[5]: /2010/12/12/writing-a-managed-internet-explorer-extension-part-5-working-with-the-dom/
[6]: /2012/09/03/regrets-managed-browser-helper-objects/
[7]: /images/ieattach.png
[8]: /images/iebphit.png
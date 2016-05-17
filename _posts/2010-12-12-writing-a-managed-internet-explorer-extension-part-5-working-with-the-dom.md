---
layout: post
title:  "Writing a Managed Internet Explorer Extension: Part 5 – Working with the DOM"
date:   2010-12-12 12:00:00 -0400
categories: General
---

Internet Explorer is known for having a quirky rendering engine. Most web
developers are familiar with with concept of a rendering engine. Most know that
Firefox uses Gecko, and Chrome / Safari use WebKit (update: Opera uses WebKit 
ow too!). WebKit itself has an interesting history, originally forked from the
KHTML project by Apple. However pressed, not many can name Internet Explorer’s
engine. Most browsers also indicate their rendering engine in their User Agent.
For example, my current Chrome one is "Mozilla/5.0 (Windows; U; Windows NT 6.1;
en-US) AppleWebKit/534.7 (KHTML, like Gecko) Chrome/7.0.517.44 Safari/534.7" Not
as many web developers could name Internet Explorer’s, it was simply referred
to as “Internet Explorer”. The actual name of IE’s rendering engine is Trident.
It’s been part of Internet Explorer since 4.0 – it was just deeply integrated 
nto Internet Explorer. At it’s heart, Trident lives in the mshtml.dll and
shdocvw.dll libraries in the system32 directory. [Earlier][1], you referenced these
libraries as a COM type library.

When accessing IE’s DOM from a BHO, it’s in some regards very similar to doing
it from JavaScript. It has the familiar `getElementById`, and the rest of
the gang. You’re also constrained, like JavaScript, by the minimum version of IE
you plan to support with your BHO. If your BHO is going to be commercial, it
isn’t unreasonable to still support IE6. In many respects, you will be using OLE
Automation to manipulate the DOM.

Like JavaScript, it is desirable to know what version of IE you are working
against. Many JavaScript developers will tell you it’s poor practice to code
against versions of a browser, but rather test if the feature is available in a
browser. That keeps the JavaScript agnostic to the browser. However, we know we
are just coding against IE. I have no strong recommendation one way or the
other, but I’ll show you both. This is probably the simplest way to just get IE’s
version:

```csharp
var version = Process.GetCurrentProcess().MainModule.FileVersionInfo;
```

That provides a plethora of information about IE’s version. The ProductMajorPart
will tell you if it’s 6, 7, or 8. There are many other details in there – it can
tell you if it’s a debug build, the service pack, etc. You may have surmised 
hat if JavaScript can do it, then we can do it the same way JavaScript does
using the appVersion property. Before you start going crazy looking for it on
the IWebBrowser2 interface though – I’ll tell you it’s not there. Nor is it on
any of the HTMLDocument interfaces. It has it’s own special interface, called
`IOmNavigator`. That interface is defined in mshtml.dll – so since you have
already referenced that Type Library you should already have access to it – but
how do I get an instance of that thing?

It isn’t difficult, but there is where the interface complexity has it’s
disadvantages. `IOmNavigator` is on the window, and the `IHTMLDocument2` interface
can provide a path to the window.

```csharp
var document = (IHTMLDocument2) _webBrowser2;
var appVersion = document.parentWindow.navigator.appVersion;
```

However, if we wanted to do the right thing and test for feature availability
rather than relying on version numbers, how do we do that?

The most straightforward is determining which interfaces an object supports.
Most of your DOM work is going to be done through the Document property off of
WebBrowser2. This is of type HTMLDocument, but there are several different
interfaces available. Every time a change was made to the Document API, a new
interface was created to maintain backward compatibility (Remember COM uses
Interface Querying, so it makes more sense in that respect.)

In .NET we can do something similar using the “is” keyword.

```csharp
private void _webBrowser2Events_DocumentComplete(object pdisp, ref object url)
{
    if (!ReferenceEquals(pdisp, _pUnkSite))
    {
        return;
    }
    if (_pUnkSite.Document is IHTMLDocument5)
    {
        //IHTMLDocument5 was introduced in IE6, so we are at least IE6
    }
}
```

There are a several IHTMLDocumentX interfaces, currently up to `IHTMLDocument7`
which is part of IE9 Beta.

### WAIT! Where is IHTMLDocument6?

[The MSDN Documentation][2] for IHTMLDocument6 says it’s there for IE 8. Yet
there is a good chance you won’t see it even if you have IE 8 installed.

This is a downside of the automatically generated COM wrapper. If you look at
the reference that says MSHTML, and view it’s properties, you’ll notice that its
Path is actually in the GAC, something like this:
`C:\Windows\assembly\GAC\Microsoft.mshtml\7.0.3300.0__b03f5f7f11d50a3a\Microsoft.mshtml.dll`

Microsoft Shipped a GAC’ed version of this COM wrapper, which is used within
the .NET Framework itself. However, the one in the GAC is sorely out-of-date.
We can’t take that assembly out of the GAC (or risk a lot of problems).

What to do?

We are going to manually generate a COM wrapper around MSHTML without the Add
Reference Dialog. Pop open the Visual Studio 2010 Command Prompt. The tool we
will be using is part of the .NET Framework SDK, called tlbimp.

The resulting command should look something like this:

```
tlbimp.exe /out:mshtml.dll /keyfile:key.snk /machine:X86 mshtml.tlb
```

This will generate a new COM wrapper explicitly and write it out to mshtml.dll
in the current working directory. The keyfile switch is important – it should be
strong name signed, and you should already have a strong name key since it is
required for regasm. mshtml.tlb is a type library found in your system32
directory. This new generated assembly will contain the IHTMLDocument6 interface,
as we expect. If you have IE 9 beta installed, you will see IHTMLDocument7 as
well. NOTE: This is a pretty hefty type library. It might take a few minutes to
generate the COM Wrapper. Patience.

If you are happy just being able to access the DOM using IE 6’s interfaces, then
I wouldn’t bother with this. There are advantages to using the one in the GAC
(smaller distributable, etc).

In summary, you have two different means of detecting a browser’s features.
Using the version by getting the version of the browser, or testing if an
interface is implemented. I would personally recommend testing against
interfaces, because there is always a tiny chance that Microsoft may remove
functionality in a future version. It’s doubtful for the IHTMLDocument
interfaces, however for other things it’s a reality.

Now that we have a way of knowing what APIs are at our disposal, we can
manipulate the DOM however you see fit. There isn’t much to explain there – if
you think it’s hard, it’s probably because it is. It’s no different that trying
to do it in JavaScript.

This is an extremely resourceful page when trying to figure out which interface
you should be using based on a markup tag:
https://msdn.microsoft.com/en-us/library/aa741322(v=VS.85).aspx.

### More of this series

1. [Writing a Managed Internet Explorer Extension: Part 1 – Basics][1]
1. [Writing a Managed Internet Explorer Extension: Part 2 – DOM Basics][3]
1. [Writing a Managed Internet Explorer Extension: Part 3][4]
1. [Writing a Managed Internet Explorer Extension: Part 4 – Debugging][5]
1. Writing a Managed Internet Explorer Extension: Part 5 – Working with the DOM
1. [Writing a Managed Internet Explorer Extension: Part 6 – Regrets][6]

[1]: /2009/11/18/writing-a-managed-internet-explorer-extension-part-1-basics/
[2]: https://msdn.microsoft.com/en-us/library/cc288669(VS.85).aspx
[3]: /2010/05/31/writing-a-managed-internet-explorer-extension-part-2-dom-basics/
[4]: /2010/06/10/writing-a-managed-internet-explorer-extension-part-3/
[5]: /2010/11/28/writing-a-managed-internet-explorer-extension-part-4-debugging/
[6]: /2012/09/03/regrets-managed-browser-helper-objects/
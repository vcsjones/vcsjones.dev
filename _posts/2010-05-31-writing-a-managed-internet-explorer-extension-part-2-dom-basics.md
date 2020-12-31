---
layout: post
title:  "Writing a Managed Internet Explorer Extension: Part 2 – DOM Basic"
date:   2010-05-31 12:00:00 -0400
categories: General
---

Continuing my miniseries from Writing a Managed Internet Explorer Extension:
Part 1 – Basics, we discussed how to setup a simple Internet Explorer Browser
Helper Object in C# and got a basic, but somewhat useless, example working. We
want to interact with our Document Object Model a bit more, including listening
for events, like when a button was clicked. I’ll assume that you are all caught
up on the basics with my previous post, and we will continue to use the sample
solution.

Elements in the `HTMLDocument` can be accessed by `getElementById`,
`getElementsByName`, or `getElementsByTagName`, etc. We’ll use `getElementsByTagName`,
and then filter that based on their “type” attribute of “button” or “submit”.

An issue that regularly comes up with using the generated .NET MSHTML library is
its endless web of delegates, events, and interfaces. Looking at the object
explorer, you can see that there are several delegates per type. This makes it
tricky to say “I want to handle the ‘onclick’ event for all elements.” You
couldn’t do that because there is no common interface they all implement with a
single onclick element. However, if you are brave you can let dynamic types in
.NET Framework 4.0 solve that for you. Otherwise you will have a complex web of
casting ahead of you.

Another issue that you may run into is conflicting member names. Yes, you would
think this isn’t possible, but the CLR allows it, I just don’t believe C# and
VB.NET Compiles allow it. For example, on the interface HTMLInputElement, there
is a property called “onclick” and an event called “onclick”. This interface
will not compile under C# 4:

```csharp
public interface HelloWorld
{
    event Action HelloWorld;
    string HelloWorld { get; } 
}
```

However, an interesting fact about the CLR is it allows methods and properties
to be overloaded by the return type. Here is some bare bones MSIL you can
compile on your own using ilasm to see it in action:

```
.assembly extern mscorlib
{
  .publickeytoken = (B7 7A 5C 56 19 34 E0 89 )
  .ver 4:0:0:0
}
 
.module MsilExample.dll
.imagebase 0x00400000
.file alignment 0x00000200
.stackreserve 0x00100000
.subsystem 0x0003
.corflags 0x0000000b
 
.class interface public abstract auto ansi MsilExample.HelloWorld
{
  .method public hidebysig newslot specialname abstract virtual 
          instance void  add_HelloWorld
            (class [mscorlib]System.Action 'value') cil managed
  {
  }
 
  .method public hidebysig newslot specialname abstract virtual 
          instance void  remove_HelloWorld
            (class [mscorlib]System.Action 'value') cil managed
  {
  }
 
  .method public hidebysig newslot specialname abstract virtual 
          instance string  get_HelloWorld() cil managed
  {
  }
 
  .event [mscorlib]System.Action HelloWorld
  {
    .addon instance void MsilExample.HelloWorld::
            add_HelloWorld(class [mscorlib]System.Action)
    .removeon instance void MsilExample.HelloWorld::
            remove_HelloWorld(class [mscorlib]System.Action)
  }
  .property instance string HelloWorld()
  {
    .get instance string MsilExample.HelloWorld::get_HelloWorld()
  }
}
```

That MSIL isn’t fully complete as it lacks any sort of manifest, but it will
compile and .NET Reflector will be able to see it. You might have trouble
referencing it from a C# or VB.NET project.

You can work around this issue by being explicit in this case: cast it to the
interface to gain access to the event or do something clever with LINQ:

```csharp
void _webBrowser2Events_DocumentComplete(object pDisp, ref object URL)
{
    HTMLDocument document = _webBrowser2.Document;
    var inputElements = from element in document.getElementsByTagName("input").Cast()
                    select new { Class = element, Interface = (HTMLInputTextElementEvents2_Event)element };
    foreach (var inputElement in inputElements)
    {
        inputElement.Interface.onclick += inputElement_Click;
    }
}
 
static bool inputElement_Click(IHTMLEventObj htmlEventObj)
{
    htmlEventObj.cancelBubble = true;
    MessageBox.Show("You clicked an input element!");
    return false;
}
```


This is pretty straight forward: whenever the document is complete, loop through
all of the input elements and attach on onclick handler to it. Despite the name
of the interface, this will work with all HTMLInputElement objects.

Great! We have events wired up. Unfortunately, we’re not done. This appears to
work at first try. However, go ahead and load the add on and use IE for a while.
It’s going to start consuming more and more memory. We have written a beast with
an unquenchable thirst for memory! We can see that in WinDbg, too.

| MT      | Count       | TotalSize | Class Name                                             |
|---------|-------------|-----------|--------------------------------------------------------|
|03c87ecc | 3502        | 112064    | mshtml.HTMLInputTextElementEvents2_onclickEventHandler |
|06c2aac0 | 570         | 9120      | mshtml.HTMLInputElementClass                           |


This is a bad figure, because it is never going down, even if we Garbage Collect.
With just a few minutes of use of Internet Explorer, there is a huge number of
event handles. The reason being because we never unwire the event handler, thus
we are leaking events. We need to unwire them. Many people have bemoaned this
problem in .NET: event subscriptions increment the reference count. Many people
have written Framework wrappers for events to use “Weak Events”, or events that
don’t increment the reference count. Both strong and weak reference have their
advantages.

I’ve found the best way to do this is to keep a running Dictionary of all the
events you subscribed to, and unwire them in BeforeNavigate2 by looping through
the dictionary, then removing the element from the dictionary, allowing it to be
garbage collected.

Here is my final code for unwiring events:

```csharp
[ComVisible(true),
Guid("9AB12757-BDAF-4F9A-8DE8-413C3615590C"),
ClassInterface(ClassInterfaceType.None)]
public class BHO : IObjectWithSite
{
    private object _pUnkSite;
    private IWebBrowser2 _webBrowser2;
    private DWebBrowserEvents2_Event _webBrowser2Events;
    private readonly Dictionary
        <
            HTMLInputTextElementEvents2_onclickEventHandler,
            HTMLInputTextElementEvents2_Event
        > _wiredEvents
        = new Dictionary
        <
            HTMLInputTextElementEvents2_onclickEventHandler,
            HTMLInputTextElementEvents2_Event
        >();
 
    public int SetSite(object pUnkSite)
    {
        if (pUnkSite != null)
        {
            _pUnkSite = pUnkSite;
            _webBrowser2 = (IWebBrowser2)pUnkSite;
            _webBrowser2Events = (DWebBrowserEvents2_Event)pUnkSite;
            _webBrowser2Events.DocumentComplete += _webBrowser2Events_DocumentComplete;
            _webBrowser2Events.BeforeNavigate2 += _webBrowser2Events_BeforeNavigate2;
        }
        else
        {
            _webBrowser2Events.DocumentComplete -= _webBrowser2Events_DocumentComplete;
            _webBrowser2Events.BeforeNavigate2 -= _webBrowser2Events_BeforeNavigate2;
            _pUnkSite = null;
        }
        return 0;
    }
 
    void _webBrowser2Events_BeforeNavigate2(object pDisp, ref object URL, ref object Flags,
        ref object TargetFrameName, ref object PostData, ref object Headers, ref bool Cancel)
    {
        foreach (var wiredEvent in _wiredEvents)
        {
            wiredEvent.Value.onclick -= wiredEvent.Key;
        }
        _wiredEvents.Clear();
    }
 
    void _webBrowser2Events_DocumentComplete(object pDisp, ref object URL)
    {
        HTMLDocument document = _webBrowser2.Document;
        var inputElements = from element in document.getElementsByTagName("input").Cast()
                            select new { Class = element, Interface = (HTMLInputTextElementEvents2_Event)element };
        foreach (var inputElement in inputElements)
        {
            HTMLInputTextElementEvents2_onclickEventHandler interfaceOnOnclick = inputElement_Click;
            inputElement.Interface.onclick += interfaceOnOnclick;
            _wiredEvents.Add(interfaceOnOnclick, inputElement.Interface);
        }
    }
 
    static bool inputElement_Click(IHTMLEventObj htmlEventObj)
    {
        htmlEventObj.cancelBubble = true;
        MessageBox.Show("You clicked an input!");
        return false;
    }
 
    public int GetSite(ref Guid riid, out IntPtr ppvSite)
    {
        var pUnk = Marshal.GetIUnknownForObject(_pUnkSite);
        try
        {
            return Marshal.QueryInterface(pUnk, ref riid, out ppvSite);
        }
        finally
        {
            Marshal.Release(pUnk);
        }
    }
}
```

After performing the same level of stress as before, there were only 209
instances of HTMLInputTextElementEvents2_onclickEventHandler. That is still a bit
high, but it’s because the Garbage Collector done it’s cleanup. The Garbage
Collector makes it a bit subjective to counting how many objects are in memory.

There are alternative ways to wire events. If the strong typing and plethora of
interfaces is getting to you, it’s possible to use attachEvent and detachEvent
albeit it requires converting these events into objects that COM can understand.


### More of this series

1. [Writing a Managed Internet Explorer Extension: Part 1 – Basics][1]
1. Writing a Managed Internet Explorer Extension: Part 2 – DOM Basics
1. [Writing a Managed Internet Explorer Extension: Part 3][3]
1. [Writing a Managed Internet Explorer Extension: Part 4 – Debugging][4]
1. [Writing a Managed Internet Explorer Extension: Part 5 – Working with the DOM][5]
1. [Writing a Managed Internet Explorer Extension: Part 6 – Regrets][6]

[1]: /writing-a-managed-internet-explorer-extension-part-1-basics/
[3]: /writing-a-managed-internet-explorer-extension-part-3/
[4]: /writing-a-managed-internet-explorer-extension-part-4-debugging/
[5]: /writing-a-managed-internet-explorer-extension-part-5-working-with-the-dom/
[6]: /regrets-managed-browser-helper-objects/
[7]: /images/ieattach.png
[8]: /images/iebphit.png
---
layout: post
title:  "Parsing and modifying HTML in a Fiddler Extension"
date:   2016-02-29 12:00:00 -0400
categories: Fiddler
---

Continuing my "do everything in Fiddler" approach to web debugging, I ran into a
situation where I wanted to parse and modify the response of the server before
the browser received the response using Fiddler.

It’s definitely doable, but there wasn’t a clear cut example on how to do that,
so here we go.

The best to start is [Telerik's documentation][1] on building an extension. This
covers the ins and outs of getting started with developing an extension. Once
you have a “hello world” extension working, you’re ready to start parsing HTML.

The Fiddler interface of choice here is going to be `IAutoTamper2`, and use the
interface method `AutoTamperResponseBefore`. `AutoTamperResponseBefore` is where we
want to modify the HTML. This method is called after Fiddler has received the
response from the server, but before it has pushed it to the browser.
Modification’s to the response body here will be reflected in what the browser
renders.

There are a few guard checks we want to make first. Since we want to modify
HTML, we should check that the response is actually HTML. We can partially
accomplish this by examining the Content-Type header. If it contains "text/html",
then there is a good chance the content is HTML. Consult the [IANA registry][2] for
other content types you may want to handle.

<!--break-->

So to start, we have this:

### F\#
{% highlight ocaml %}
open Fiddler

type LinkAutoTamper() =
    interface IAutoTamper2 with
        member this.OnPeekAtResponseHeaders(session) =
            if session.ResponseHeaders.ExistsAndContains("Content-Type", "text/html") then
                session.bBufferResponse <- true

        member this.AutoTamperResponseBefore(session) = 
            if not <| session.ResponseHeaders.ExistsAndContains("Content-Type", "text/html") then
                ()
            else
                () //Handle HTML here
{% endhighlight %}

### C\#
{% highlight csharp %}
using Fiddler;

public class LinkAutoTamper : IAutoTamper2
{
    public void OnPeekAtResponseHeaders(Session oSession)
    {
        if (oSession.ResponseHeaders.ExistsAndContains("Content-Type", "text/html"))
        {
            oSession.bBufferResponse = true;
        }
    }
     
    public void AutoTamperResponseBefore(Session oSession)
    {
        if (!oSession.ResponseHeaders.ExistsAndContains("Content-Type", "text/html"))
        {
            return;
        }
        //Handle HTML here
    }
}
{% endhighlight %}

The `OnPeekAtResponseHeaders` is necessary to prevent Fiddler from streaming the
response back to the browser. Instead, Fiddler will buffer the whole response
into memory, allowing `AutoTamperResponseBefore` to receive the whole response at
once.

Fiddler nor .NET Framework have a built-in HTML parser. We can pull in a 3rd
party one, and HtmlAgilityPack is a fairly ubiquitous one. I pulled it down with
NuGet, and now we have an HTML parser.

Parsing a document is fairly trivial, and there are lots of examples of using
[HtmlAgilityPack][3]. We can get the body of the response using
`GetResponseBodyAsString()` off the session. Fortunately, Fiddler takes the
guess-work out of determining the encoding and provides
`GetResponseBodyEncoding()` which will be important later.

To make a trivial example of using this, lets make the extension change the
style attribute on anchor elements which have an href attribute beginning with
"http:".

### F\#
{% highlight ocaml %}
let body = session.GetResponseBodyAsString()
let encoding = session.GetResponseBodyEncoding()
let doc = HtmlDocument()
doc.LoadHtml(body)
{% endhighlight %}

### C\#

{% highlight ocaml %}
var body = oSession.GetResponseBodyAsString();
var encoding = oSession.GetResponseBodyEncoding();
var doc = new HtmlDocument();
doc.LoadHtml(body);
{% endhighlight %}

This gets us an HtmlDocument which we are free to manipulate. HtmlAgilityPack
has an odd behavior where null will be returned for empty collections, so we
have to check for null in a few cases. 

### F\#
{% highlight ocaml %}
let anchors : HtmlNode list = 
    match doc.DocumentNode with
    | null -> []
    | docNode -> match docNode.SelectNodes("//a") with | null -> [] | a -> a |> Seq.toList

anchors
|> Seq.filter(fun node -> node.GetAttributeValue("href", "").OICStartsWith("http:"))
|> Seq.iter(fun node ->
    node.SetAttributeValue("style", node.GetAttributeValue("style", "") + "; border: 1px solid red")
    |> ignore)
    
{% endhighlight %}

### C\#
{% highlight csharp %}
var anchors = doc.DocumentNode?.SelectNodes("//a")?.ToList() ?? new List();
var httpAnchors = anchors.Where(node => node.GetAttributeValue("href", "").OICStartsWith("http:"));
foreach(var node in httpAnchors)
{
    node.SetAttributeValue("style", node.GetAttributeValue("style", "") + "; border: 1px solid red");
}
{% endhighlight %}

Once we've modified the document to our liking, we can set it back to Fiddler.

### F\#
{% highlight ocaml %} 
use ms = new MemoryStream()
doc.Save(ms, encoding)
session.ResponseBody <- ms.ToArray()
{% endhighlight %}

### C\#
{% highlight csharp %}
using (var ms = new MemoryStream())
{
    doc.Save(ms, encoding);
    oSession.ResponseBody = ms.ToArray();
}
{% endhighlight %}

Note that any 3rd party library your Fiddler extension use must also be copied
to the same place where to install your Fiddler extension.

There are a few things to keep in mind with this, however. First, you pay a
performance penalty doing this. Doing this adds about 0.04 seconds to each
request. Secondly, this is only capable of handling the raw content. It does not
have a live DOM that the browser sees. If the document is mostly constructed by
javascript, such is the case of an SPA, then HtmlAgilityPack won't see much of
the content. If you need to manipulate the actual DOM that the browser sees, you
can use Fiddler to inject a javascript script into the DOM and handle it from
JavaScript.

Both the F# and C# examples [are available as a gist][4].


[1]: http://docs.telerik.com/fiddler/Extend-Fiddler/Interfaces
[2]: https://www.iana.org/assignments/media-types/media-types.xhtml
[3]: https://www.nuget.org/packages/HtmlAgilityPack
[4]: https://gist.github.com/vcsjones/ad4a8c195655c6a59b77
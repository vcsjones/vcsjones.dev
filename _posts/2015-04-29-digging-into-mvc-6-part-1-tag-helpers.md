---
layout: post
title:  "Digging into MVC 6 – Part 1: Tag Helpers"
date:   2015-04-29 12:00:00 -0400
categories: General
---

I've always found some of razor's syntax less idiomatic than I would like. HTML
is a fairly ubiquitous thing amongst web developers. Whether you use ASP.NET,
Symfony, Flask, ColdFusion, or WordPress, a firm grasp of HTML is required. So
when I see views with this kind of markup:

```csharp
@using (Html.BeginForm("Login", "Authentication"))
{
    @Html.TextBoxFor(m => m.UserName, new { @class="LoginTextBox" })
    <!-- login form contents -->
}
```

I can't help but cringe a little bit. This is a far cry from HTML. The form
element is a using statement, the text box for the user name uses anonymously
typed objects for applying attributes to the element. It all seems a little off.
If I were a designer and all I wanted to do was apply a class attribute to the
form and didn't have strong ASP.NET MVC skills, I might be at a loss.

I'd much prefer something that actually resembled HTML. HTML is, after all, what
we are trying to render here. This was one of the huge benefits of MVC over web
forms. With MVC, you have complete control over what HTML gets rendered. No more
crazy view state, enormous element IDs, or controls that require hours and hours
of overriding default behaviors to get it render the markup you want.

Tag helpers are the next step in the continuation of putting HTML back into the
hands of MVC developers. Instead of all of the HTML helpers and extension
methods as seen above, we can write natural HTML, and decorate them with some
simple attributes that MVC recognizes. Here's the above written as tag helpers:

```html
<form method="post" asp-controller="Authentication" asp-action="Login">
    <input type="text" asp-for="UserName" class="LoginTextBox" />
</form>
```

Tag helpers let us write what we want using plain HTML. Jeff Fritz has a great
[blog post][1] discussing the plumbing of tag helpers, and even how to develop
your own. These are very powerful mechanisms that offer a lot of flexibility
over how the final markup gets rendered.

[1]: http://www.jeffreyfritz.com/2014/11/get-started-with-asp-net-mvc-taghelpers/
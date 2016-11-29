---
layout: post
title:  "Making Sense of the .NET CLI"
date:   2016-11-29 09:00:00 -0500
categories: General
---

I've been using the .NET Core CLI for a while now, and lurk on the GitHub
issues. I've seen that some of the aspects of it are a little difficult to
understand, especially if you want to contribute to it.

# What .NET Version Am I Using?

There's been a number of issues filed where people are trying to interpret the
output of `dotnet --version`, which today looks something like
"1.0.0-preview2-1-003177". Quite often, the user just installed .NET Core 1.1,
then did `--version` to see that the update took, but then still noticed that 
it said something like "1.0.0-preview2-1-003177". What gives?

The first thing to point out is that the Tooling and the Runtime are two
different versions. The Runtime has not yet release in 1.0.0 form. The Runtime
however, is at 1.1.0 as of writing.

In short, `dotnet --version` **is the version of the tooling**. If you want the
version of the runtime, then `dotnet` is the correct option. It will print
something like this:

> Microsoft .NET Core Shared Framework Host
>
>
> Version  : 1.1.0

That "Microsoft .NET Core Shared Framework Host" is the version of the runtime.

There is an issue [on GitHub][1] to make `--info` better. I would encourage
feedback on that issue if all of this seems confusing to you.

# SDK versions and the Muxer

.NET CLI allows installing multiple versions. In macOS, you can list them in
the directory `/usr/local/share/dotnet/sdk/`. Which version is used currently
depends on your `global.json` for your project.

`global.json` allows specifying an SDK version. If `global.json` doesn't declare
what SDK version it should use, the maximum, non-preview version will be used.
Today, we don't have any versions that *aren't* preview, so it's whatever the
maximum version you have installed is.

If you do specify a version, like this:

```json
{
    "sdk": {
        "version": "1.0.0-preview2-1-003177"
    }
}
```

Then that version of the SDK will be used, even if I have
`1.0.0-preview4-004130` installed.

This process is handled by the [*muxer*][2]. The muxer's responsibility is to
bootstrap the SDK and tooling version. The first thing the muxer does is walk
down the directory structure looking for a `global.json` and an "sdk" to use.
If it finds one and the version is valid, the muxer loads that SDK's path
and tooling.

It's worth pointing out that `global.json` affects *everything*. If you're
in a directory that has a `global.json`, then everything respects that version
of the SDK. If I run `dotnet --info` or `dotnet` in a directory that has an SDK,
it will behave exactly as that version of the SDK.

This makes it easy to have projects use different SDKs by specifying the
`global.json` at the project root. This means I can have the preview4 nightly
toolings installed, all of which use csproj for projects, but also continue
to build `project.json` style projects.

The last thing to remember is that the muxer looks for `global.json` down the 
directory structure. So if a parent directory, or parent's parent directory has
one of these files, it will be respected. The "nearest" `global.json` is
honored.

An icky quirk of the muxer is that it silently fails. If you ask to use an SDK
version that doesn't exist, it will just behave as if you didn't specify one in
the first place.

# Running Applications

You've probably noticed that when you compile and publish an application, it
does not include a native executable (ready-to-run). It produces a DLL.

If you want to run a project, use `dotnet run`. 

If you want to run a compiled DLL, use `dotnet myapp.dll`.

Doing `dotnet run myapp.dll` *looks* right, and it might work, but it might not
do what you expect. It runs a project, and passes `myapp.dll` as an argument to
`Main`. If you happen to have a project.json in your working directory, then it
is running that.

[1]: https://github.com/dotnet/cli/issues/3773
[2]: https://github.com/dotnet/core-setup/blob/dd1bade6d7f411f3b0746dc21faa8cab415efaef/src/corehost/cli/fxr/fx_muxer.cpp
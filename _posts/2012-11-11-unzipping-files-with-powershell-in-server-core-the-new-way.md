---
layout: post
title:  "Unzipping Files with Powershell in Server Core – The New Way"
date:   2012-11-11 12:00:00 -0400
categories: General
---

I know this topic has been [blogged][1] [to][2] [death][3], but every solution
I've found that does this uses the Windows Shell, something along these lines:

```powershell
$shellApplication = new-object -com shell.application
$zipPackage = $shellApplication.NameSpace($zipfilename)
$destinationFolder = $shellApplication.NameSpace($destination)
$destinationFolder.CopyHere($zipPackage.Items())
```

That's all fine and well, but in Server Core, this isn't going to work.

What the script is doing is trying to automate the Windows Shell, which is
exactly what Server Core doesn't have. This will fail with HRESULT E_FAIL. So
what do do?

I got a bit frustrated by this – how could a scripting language that is suppose
to be powerful and flexible, not be able to unzip a zip file? Unix has had this
for ages with unzip.

It turns out that in .NET Framework 4.5, there is a [ZipFile][4] class that is
simple enough to use.

Knowing this, the work was trivial.

```powershell
#Load the assembly
[System.Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem") | Out-Null
#Unzip the file
[System.IO.Compression.ZipFile]::ExtractToDirectory($pathToZip, $targetDir)
```

You'll need the .NET Framework 4.5 installed for this to work, which can be
installed easily enough on Server 2012 Core like so:

```powershell
Install-WindowsFeature Net-Framework-45-Core
```

This will of course also work even if you aren't using Server Core, and are
using the full installation of Windows Server.

Big thanks to [Peter Hahndorf][5] for putting me in the right direction.

[1]: https://blogs.msdn.com/b/daiken/archive/2007/02/12/compress-files-with-windows-powershell-then-package-a-windows-vista-sidebar-gadget.aspx
[2]: http://www.techiebirdsnest.com/2009/01/powershell-script-to-unzip-many-files.html
[3]: http://www.sneal.net/blog/2007/09/07/UnzipFilesWithShell32AndPowerShell.aspx
[4]: https://msdn.microsoft.com/en-us/library/system.io.compression.zipfile.aspx
[5]: https://serverfault.com/a/447073/64680

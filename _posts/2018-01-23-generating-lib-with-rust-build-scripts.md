---
layout: post
title:  "Generating .lib with Rust build scripts"
date:   2018-01-23 22:04:00 -0500
categories: General
---

Something I've been working on in my spare time is porting [Azure SignTool][1]
to Rust. I've yet to make up mind if Rust is the one-true way forward with that,
but that's a thought for another day.

I wanted to check out the feasibility of it. I'm happy to say that I think all
of the concepts necessary are there, they just need to be glued together.

One roadblock with Azure SignTool is that it needs to use an API,
`SignerSignEx3`, which isn't included in the Windows SDK. In fact, just about
nothing in `mssign32` is in the Windows SDK. Not being in the Windows SDK means
no headers, and no .lib to link against.

For .NET developers, no .lib for linking hasn't really mattered when consuming
Win32 APIs. It simply needs the ordinal or name of the export and the CLR takes
care of the rest with platform invoke. For languages like C that use a linker,
you need a .lib to link against. Rust is no different.

For most cases, the `winapi` crate has all of the Win32 functions you
need. It's only in the case of APIs that are not in the Windows SDK (or like
`SignerSignEx3`, entirely undocumented) that an API will not be in the crate.

We need to call `SignerSignEx3` without something to link against. We have a few
different options.

1. Use `LoadLibrary(Ex)` and `GetProcAddress`.
2. Make our own .lib.

The latter seemed appealing because then the Rust code can continue to look
clean.

```rust
#[link(name = "mssign32")]
extern {
    fn SignerSignEx3(...)
}
```

Making a .lib that contains exports only is not too difficult. We can define
our own .def file like so:

```
LIBRARY mssign32

EXPORTS
SignerSignEx3
```

and use `lib.exe` to convert it to a linkable lib file:

```sh
lib.exe /MACHINE:X64 /DEF:mssign32.def /OUT:mssign32.lib
```

If we put this file somewhere that the Rust linker can find it, our code will
compile successfully and we'll have successfully linked.

![Dependency Walker with azure_sign_tool_rs][2]

I wasn't thrilled about the idea of checking in an opaque binary in to source
for building, so I sought an option to make it during the rust build process.

Fortunately, cargo makes that easy with build scripts. A build script is a rust
file itself named `build.rs` in the same directory as your `Cargo.toml` file.
It's usage is simple:

```rust
fn main() {
    // Build script
}
```

Crucially, if you write to stdout using `println!`, the build process will
recognize certain output as commands to modify the build process. For example:

```rust
println!("cargo:rustc-link-search={}", "C:\\foo\\bar");
```

Will add a path for the linker to search. We can begin to devise a plan to make
this part of a build. We can in our build call out to `lib.exe` to generate a
.lib to link against, shove it somewhere, and add the directory to to linker's
search path.

The next trick in our build script will be to find where `lib.exe` is.
Fortunately, the Rust toolchain already solves this since it relies on `link.exe` 
from Visual Studio anyway, so it knows how to find SDK tooling (which move all
over the place between Visual Studio versions). The `cc` crate makes this easy
for us.

```rust
let target = env::var("TARGET").unwrap();
let lib_tool = cc::windows_registry::find_tool(&target, "lib.exe")
            .expect("Could not find \"lib.exe\". Please ensure a supported version of Visual Studio is installed.");
```

The `TARGET` environment variable is set by cargo and contains the architecture
the build is for, since Rust can cross-compile. Conveniently, we can use this to
support cross-compiled builds of `azure_sign_tool_rs` so that we can make 32-bit
builds on x64 Windows and x64 builds on 32-bit Windows. This allows us to modify
the `/MACHINE` argument for lib.exe.

I wrapped that up in to a helper in case I need to add additional libraries.

```rust
enum Platform {
    X64,
    X86,
    ARM64,
    ARM
}

impl std::fmt::Display for Platform {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match *self {
            Platform::X64 => write!(f, "X64"),
            Platform::X86 => write!(f, "X86"),
            Platform::ARM => write!(f, "ARM"),
            Platform::ARM64 => write!(f, "ARM64"),
        }
    }
}

struct LibBuilder {
    pub platform : Platform,
    pub lib_tool : cc::Tool,
    pub out_dir : String
}

impl LibBuilder {
    fn new() -> LibBuilder {
        let target = env::var("TARGET").unwrap();
        let out_dir = env::var("OUT_DIR").unwrap();
        let platform =
            if target.contains("x86_64") { Platform::X64 }
            else if target.contains("ARM64") { Platform::ARM64 }
            else if target.contains("ARM") { Platform::ARM }
            else { Platform::X86 };
        let lib_tool = cc::windows_registry::find_tool(&target, "lib.exe")
            .expect("Could not find \"lib.exe\". Please ensure a supported version of Visual Studio is installed.");
        LibBuilder {
            platform : platform,
            lib_tool : lib_tool,
            out_dir : out_dir
        }
    }

    fn build_lib(&self, name : &str) -> () {
        let mut lib_cmd = self.lib_tool.to_command();
        lib_cmd
            .arg(format!("/MACHINE:{}", self.platform))
            .arg(format!("/DEF:build\\{}.def", name))
            .arg(format!("/OUT:{}\\{}.lib", self.out_dir, name));
        lib_cmd.output().expect("Failed to run lib.exe.");
    }
}
```

Then our build script's main can contain this:

```rust
fn main() {
    let builder = LibBuilder::new();
    builder.build_lib("mssign32");
    println!("cargo:rustc-link-search={}", builder.out_dir);
}
```

After this, I was able to link against `mssign32`.

Note that, since this entire project is Windows's specific and has zero chance
of running anywhere, I did not bother to decorate anything with
`#[cfg(target_os = "windows")]`. If you *are* attempting to make a cross-platform
project, you'll want to account for all of this in the Windows-specific parts.

With this, I now only need to check in a `.def` text file and Cargo will take
care of the rest.

[1]: /2017/12/14/azure-signtool/
[2]: /images/mssign32-link.png
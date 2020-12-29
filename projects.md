---
layout: page
title: Projects
permalink: /projects/
---

## [Azure Sign Tool][1]
Azure Sign Tool is an implementation of Microsoft's SignTool backed by Azure
Key Vault instead of a certificate in a certificate store. This is used by
[Sign Service][2].

## [Open OPC Sign Tool][3]
Open OPC Sign Tool allow signing Microsoft VSIX packages with a certificate
in the certificate store, on file, or using Azure Key Vault. This is used by
[Sign Service][2].

## [Fiddler Cert Inspector][4]
Fiddler Cert Inspector is an extension for Fiddler allowing inspection of the
certificate chain presented by the server. This is useful when you want to view
the certificates in an HTTPS connection while Fiddler is performing HTTPS
interception. When Fiddler performs HTTPS interception, the browser shows
Fiddler's generated certificate - not the one sent by the server.

[1]: https://github.com/vcsjones/AzureSignTool
[2]: https://github.com/dotnet/SignService
[3]: https://github.com/vcsjones/OpenOpcSignTool
[4]: https://github.com/vcsjones/FiddlerCert
# Windows installers and macOS signing

Read this when writing the installer script, setting up signing in CI or debugging a notarization failure. Check Apple's and Microsoft's current documentation before relying on a specific certificate product; both change their signing offerings.

## Inno Setup (minimal)

```ini
[Setup]
AppId={{8C5E2F0A-REPLACE-WITH-YOUR-GUID}}
AppName=MyApp
AppVersion=1.4.0
DefaultDirName={autopf}\MyApp
DefaultGroupName=MyApp
OutputBaseFilename=MyApp-1.4.0-setup
Compression=lzma2
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequiredOverridesAllowed=dialog

[Files]
Source: "dist\MyApp\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Icons]
Name: "{group}\MyApp"; Filename: "{app}\MyApp.exe"

[Run]
Filename: "{app}\MyApp.exe"; Flags: nowait postinstall skipifsilent
```

Keep `AppId` fixed forever; upgrades find the old install by it. Compile with `iscc installer.iss`. Inno Setup can call the signer itself through a `SignTool=` entry so the uninstaller is signed too.

## MSIX

Needs an `AppxManifest.xml` whose `Publisher` matches the signing certificate subject exactly. Package with `makeappx pack /d <folder> /p MyApp.msix`, sign with `signtool sign /fd SHA256 ...`. MSIX apps run with a virtualized file system and registry; test file writes and per-user settings.

## signtool

```
signtool sign /fd SHA256 /tr http://timestamp.example-ca.com /td SHA256 /a dist\MyApp\MyApp.exe
signtool verify /pa /v dist\MyApp\MyApp.exe
```

Use the timestamp URL your CA or signing service documents. Cloud signing services ship their own signtool plug-in (dlib) and metadata file instead of `/a` or `/f`.

## macOS entitlements for a frozen Python app

Frozen Python apps often need these under the hardened runtime:

```xml
<key>com.apple.security.cs.allow-unsigned-executable-memory</key><true/>
<key>com.apple.security.cs.disable-library-validation</key><true/>
```

Add only what the app needs; start without them and add one at a time if the signed app crashes at launch. Camera, microphone or Apple Events access also need usage strings in `Info.plist`.

## macOS signing in CI

1. Export the Developer ID Application certificate as `.p12`, store it base64-encoded with its password as CI secrets.
2. In the job: create a temporary keychain (`security create-keychain`), import the `.p12` (`security import ... -T /usr/bin/codesign`), allow codesign access (`security set-key-partition-list -S apple-tool:,apple:`), sign, then delete the keychain.
3. Notarize with an App Store Connect API key (`xcrun notarytool submit --key <p8> --key-id <id> --issuer <uuid>`) or an app-specific password stored with `xcrun notarytool store-credentials`.

## Common notarization failures

| Message | Fix |
|---|---|
| The binary is not signed with a valid Developer ID certificate | A nested `.so`/`.dylib` was skipped; sign every Mach-O file |
| The signature does not include a secure timestamp | Add `--timestamp` |
| The executable does not have the hardened runtime enabled | Add `--options runtime` |
| Signed app fails after editing | Any change after signing breaks it; sign last, then package |

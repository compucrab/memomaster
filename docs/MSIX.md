# Microsoft Store MSIX package

MemoMaster uses Tauri 2. Tauri's Windows bundler creates MSI and NSIS installers, so this project uses Microsoft's **WinApp CLI** to package the built Tauri executable as an MSIX.

This workflow creates an **unsigned x64 MSIX** specifically for Microsoft Store submission. A certificate is not needed: Partner Center signs MSIX packages after they pass Store certification.

## One-time setup

On Windows 11, install Microsoft's Windows App Development CLI:

```powershell
winget install Microsoft.WinAppCLI --source winget
```

Open `src-tauri/msix/Package.appxmanifest` and update the identity values after reserving the app name in Partner Center:

- `Identity Name`: use the exact **Package/Identity/Name** value shown under your app's Product identity.
- `Identity Publisher`: use the exact **Publisher** value shown there, including the `CN=` prefix.
- `PublisherDisplayName`: use the publisher's display name shown to customers.

The values currently in the manifest are placeholders/defaults. The package can be built with them, but Partner Center will reject an identity that does not exactly match the reserved product identity.

## Build the Store package

From the repository root:

```powershell
npm install
npm run tauri:msix
```

The script:

1. Builds the frontend and Tauri release executable without creating an MSI.
2. Stages the executable and the app icons required by the package manifest.
3. Updates the MSIX four-part version from `package.json`.
4. Calls `winapp pack --no-sign` to create an unsigned Store package.

Output:

```
src-tauri/target/msix/MemoMaster_0.1.0.0_x64.msix
```

The version in the filename changes with `package.json`. The staging folder and generated package are under Cargo's `target` directory and are not source files.

## Submit to Microsoft Store

Upload the generated `.msix` from Partner Center. Do **not** create or install a self-signed certificate for Store submission. Microsoft signs the package after it passes certification.

An unsigned Store-submission package is not intended for normal double-click installation or sideloading. Local sideload testing is a separate workflow and requires a locally trusted development certificate.

## Platform notes

- This build currently targets **x64**.
- The manifest currently sets Windows 11 (build 22000) as the minimum version. Tauri relies on the system WebView2 Runtime; Windows 11 includes it. Keeping this minimum avoids shipping a separate, very large fixed WebView2 runtime inside the MSIX.
- The package uses the existing MemoMaster executable and does not include an MSI/NSIS installer.
- If you change the package identity in Partner Center, update the manifest before building the submission package.

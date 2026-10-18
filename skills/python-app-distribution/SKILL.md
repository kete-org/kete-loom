---
name: python-app-distribution
description: Ships a Python application to people who do not have Python, by freezing it with PyInstaller or compiling it with Nuitka per target OS, wrapping Windows builds in an Inno Setup or MSIX installer with Authenticode signing, signing macOS app bundles with a Developer ID under the hardened runtime and notarizing them with notarytool, and publishing wheels and an sdist to PyPI through GitHub trusted publishing. Use when turning a Python script, CLI or Qt/Tk GUI into a downloadable .exe, .app or .dmg, an installer, or a pip-installable release, or when a frozen build misses data files, gets flagged by SmartScreen or Gatekeeper, or a PyPI upload needs to drop API tokens.
license: MIT
compatibility: Any Agent Skills host. Builds must run on each target OS (no cross-compiling); macOS signing needs Xcode command line tools and an Apple Developer account, Windows signing needs a code-signing certificate or signing service.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: runs-commands
  kete-loom/requires: "python"
  kete-loom/owner: "Kete-org"
---

# Python app distribution

Ship a build the user can double-click or `pip install` without warnings, missing files or a second Python install, built the same way every time in CI.

Project layout, `pyproject.toml` tooling and code style belong to `python-patterns`. Version numbers and changelogs belong to `release-management`. This skill covers turning a working app into artifacts and getting them signed and published.

## 0. Decide the channel

Ask, or infer from the project:

| Users | Ship |
|---|---|
| Developers who have Python | Wheel + sdist on PyPI (`pip install`, `pipx install`, `uv tool install`) |
| End users on Windows | Frozen app inside an installer (Inno Setup `.exe`, or MSIX) |
| End users on macOS | Signed, notarized `.app`, usually inside a `.dmg` |
| End users on Linux | Frozen folder in a tarball, or AppImage/Flatpak (check the project's preference) |

If both developers and end users are targets, do both. If signing credentials do not exist yet, **stop and ask**: who owns the Apple Developer account and the Windows certificate, and where CI may read them.

## 1. Make the app freezable

1. One entry point (`src/app/__main__.py` or a `[project.scripts]` function).
2. Read bundled data through `importlib.resources`, or through a helper that checks `getattr(sys, "frozen", False)` and `sys._MEIPASS` for PyInstaller. Never rely on the current working directory.
3. Write user data to the platform's user directory (`platformdirs`), never next to the executable; `Program Files` and signed `.app` bundles are read-only.
4. Pin dependencies with a lockfile so builds are repeatable.

## 2. Freeze

### PyInstaller

1. `pyinstaller --name MyApp --windowed --onedir src/app/__main__.py` once, then commit the generated `MyApp.spec` and build from it: `pyinstaller MyApp.spec --clean --noconfirm`.
2. Declare data files and hidden imports in the spec (`datas`, `hiddenimports`), not by copying files after the build.
3. Prefer `--onedir` for GUI apps inside an installer or `.app`: faster start, fewer antivirus false positives. Use `--onefile` only for a single-file CLI download.
4. Build on each OS and architecture you ship (Windows x64, macOS arm64 and x86_64 or universal2, Linux on the oldest glibc you support). PyInstaller does not cross-compile.

### Nuitka

`python -m nuitka --mode=standalone --include-data-dir=src/app/assets=assets src/app/__main__.py` (or `--mode=onefile`, `--mode=app` on macOS). Test standalone first; data-file problems are easier to see there. Expect longer builds and a C compiler requirement; Nuitka's benefit is speed and harder-to-unpack code, not secrecy.

### Smoke test the frozen build

Run the built executable on a clean machine or VM without Python, exercise the main path, and check its log for `ModuleNotFoundError` or missing files.

## 3. Windows: installer and signing

1. Installer: Inno Setup script (`installer.iss`) compiled with `iscc installer.iss`, or MSIX packaged with `makeappx pack` (MSIX gives clean uninstall and Store distribution; it needs a manifest and signing with a matching publisher). Details in `references/windows-macos-signing.md`.
2. Sign the app executable first, then the installer: `signtool sign /fd SHA256 /tr <timestamp URL> /td SHA256 ...`. Always timestamp so signatures outlive the certificate.
3. Code-signing keys now live in hardware or a cloud signing service (for example Azure Artifact Signing, formerly Trusted Signing, or a CA's cloud HSM); plan CI around that, not around a `.pfx` in a secret.
4. A new certificate still builds SmartScreen reputation gradually; tell the user to expect warnings on the first downloads.

## 4. macOS: sign, notarize, staple

1. Sign every binary inside the bundle, inside out, with the hardened runtime and a secure timestamp: `codesign --force --options runtime --timestamp --entitlements entitlements.plist --sign "Developer ID Application: <Team> (<TEAMID>)" MyApp.app` (nested `.dylib`/`.so` files first, or use the PyInstaller `--codesign-identity` option and re-check).
2. Verify: `codesign --verify --deep --strict --verbose=2 MyApp.app`.
3. Package (`.dmg` via `hdiutil create`, or a `.zip`), sign the `.dmg`, then notarize: `xcrun notarytool submit MyApp.dmg --keychain-profile <profile> --wait`.
4. On failure read the log: `xcrun notarytool log <submission-id> --keychain-profile <profile>`.
5. Staple: `xcrun stapler staple MyApp.dmg`, then check with `spctl --assess --type open --context context:primary-signature -v MyApp.dmg`.

Entitlements, CI keychain setup and common notarization errors are in `references/windows-macos-signing.md`.

## 5. PyPI: wheels, sdist, trusted publishing

1. Build backend declared in `pyproject.toml` (`hatchling`, `setuptools`, `flit-core`, `uv_build`, or `maturin`/`scikit-build-core` for compiled extensions).
2. Build: `python -m build` (or `uv build`), then `twine check dist/*`. Install the wheel into a fresh virtual environment and run the CLI once.
3. Compiled extensions: build platform wheels with `cibuildwheel` in CI; pure Python ships one `py3-none-any` wheel.
4. Publish from CI with trusted publishing, no API token: register the publisher on PyPI (project settings, or a pending publisher for a new project) naming the repository, workflow file and environment; the workflow then needs `permissions: id-token: write` and `pypa/gh-action-pypi-publish@release/v1`. Template in `references/pypi-trusted-publishing.md`.
5. Rehearse on TestPyPI first. A version number can never be re-uploaded, even after deleting it.

## 6. CI

One workflow, triggered by a version tag: a build matrix per OS that freezes, signs, smoke-tests and uploads artifacts; a publish job that needs the builds and runs in a protected environment with required reviewers. Secrets (Apple app-specific password or API key, signing credentials) live only in that environment.

## Never

- Never commit certificates, `.p12` files, passwords or PyPI tokens.
- Never tell users to disable Gatekeeper, SmartScreen or antivirus as the fix.
- Never ship an unsigned build labelled as a release when signing was expected; ask first.
- Never publish to PyPI from a developer laptop when the project has a CI publisher.

## Regulated or high-stakes distribution

Export controls on cryptography, app-store rules and licence obligations of bundled libraries (GPL/LGPL Qt bindings, for example) are not covered here. Flag them and have the owner or legal review before a public release.

## Report back

```
## Distribution: <app> <version>
Channels: <PyPI | Windows installer | macOS dmg | Linux>
Builds: <OS/arch -> artifact, size>
Signing: Windows <signed+timestamped yes/no>, macOS <signed, notarized, stapled yes/no>
PyPI: <TestPyPI ok, trusted publisher configured, published yes/no>
Smoke tests: <clean-machine result per OS>
Open items: <credentials, reputation, licences>
```

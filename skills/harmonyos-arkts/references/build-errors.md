# HarmonyOS build errors and fixes

Exact error wording changes between SDK and hvigor versions. Match on the meaning and the rule tag, then confirm the fix in the official docs for your API level.

## ArkTS compiler errors

| Error (rule tag) | Cause | Fix |
|---|---|---|
| Use explicit types instead of "any", "unknown" (`arkts-no-any-unknown`) | Untyped variable, parameter or `JSON.parse` result | Declare a class or interface and annotate; for loose JSON use `Record<string, Object>` and check fields |
| Object literal must correspond to some explicitly declared class or interface (`arkts-no-untyped-obj-literals`) | `{ a: 1 }` passed where no declared type matches | Declare an `interface`, annotate the variable or parameter |
| Indexed access is not supported for fields (`arkts-no-props-by-index`) | `obj[key]` on a class instance | Use a `Map<string, T>` or named fields |
| Decorator not allowed / V1 and V2 mixed | `@State` in `@ComponentV2`, or `@Local` in `@Component` | Use one decorator family per struct (see SKILL.md table) |
| `@Param` cannot be assigned | Child writes to its input | Add an `@Event` callback and let the parent change the value |
| Page not found at runtime after `loadContent` or navigation | Page missing from `main_pages.json` or wrong path | Add `"pages/Name"` to `resources/base/profile/main_pages.json` |

For every other rule tag, search the official "Adaptation Cases" page of the ArkTS migration guide for the tag; it gives a before and after for each.

## Dependency errors

| Symptom | Fix |
|---|---|
| Cannot find module `@ohos/...` or a third-party package | Run `ohpm install` in the project root (and in the module if it has its own `oh-package.json5`); check the registry in `.ohpmrc` |
| Package installs but fails to compile | It targets OpenHarmony or an older API; find a HarmonyOS NEXT version or replace it |
| hvigor plugin download fails in CI | Configure the npm registry used by `hvigor/hvigor-config.json5` |

## SDK and configuration errors

| Symptom | Fix |
|---|---|
| API not available at the compatible SDK version | Gate the call with `canIUse('SystemCapability.<name>')` or raise `compatibleSdkVersion` in `build-profile.json5` (ask the user first) |
| Product or target not found | Use a product name that exists under `products` in `build-profile.json5` (`-p product=<name>`) |
| Module not found by `--mode module` | Check the module is listed under `modules` in the root `build-profile.json5` |

## Signing and install errors

| Symptom | Fix |
|---|---|
| Unsigned HAP, install rejected | Add a `signingConfigs` entry and reference it from the product; DevEco Studio can generate debug signing for a connected device |
| Install fails with a signature or bundle mismatch | Uninstall the old app (`hdc uninstall <bundleName>`) or use the same signing profile |
| Install fails, device not found | `hdc list targets` to see devices; start the emulator or reconnect |

Never paste keystore passwords into config committed to git; inject them in CI.

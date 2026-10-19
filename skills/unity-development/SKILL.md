---
name: unity-development
description: Unity game development in C# - MonoBehaviour lifecycle order (Awake, OnEnable, Start, Update, FixedUpdate, LateUpdate, OnDisable, OnDestroy), per-frame allocation traps found with the Profiler's GC.Alloc column, cached component lookups, ScriptableObjects for shared data and settings, coroutines versus Awaitable with destroyCancellationToken, structured runtime logging and in-game debug console commands, Edit Mode and Play Mode tests with the Unity Test Framework, and headless batch-mode builds and test runs from the command line for CI. Use when writing or debugging Unity scripts, a Unity game stutters from garbage collection, setting up Unity tests, or running Unity builds and tests without the Editor UI.
license: MIT
compatibility: Any Agent Skills host. Needs a Unity Editor install matching the project's ProjectSettings/ProjectVersion.txt for builds and tests; examples target Unity 6 (6000.x) and note where older LTS versions differ.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Unity development

Write Unity C# that respects the engine's lifecycle and frame budget, can be tested headlessly, and builds the same way in CI as on a laptop. General C# style is the `csharp-patterns` skill; plain .NET tests are `csharp-testing`.

## First, read the project

1. Unity version from `ProjectSettings/ProjectVersion.txt`; packages from `Packages/manifest.json` (Test Framework, Input System, Addressables, URP or HDRP).
2. Assembly definitions (`*.asmdef`) and where tests live.
3. Existing logging, event and singleton patterns. Follow them; don't add a second one.
4. Never edit `Library/`, `Temp/` or generated files; keep `.meta` files with their assets (moving an asset without its `.meta` breaks references).

## Lifecycle rules

| Callback | Use for | Don't |
|---|---|---|
| `Awake` | Cache own components, set own state | Touch other objects' state (their `Awake` may not have run) |
| `OnEnable` / `OnDisable` | Subscribe and unsubscribe events, symmetrical | Subscribe in `Start` and forget to unsubscribe |
| `Start` | Read other objects' state, first-frame setup | Heavy loading that blocks the frame |
| `Update` | Input, non-physics per-frame logic | Physics forces, allocation, `Find*` or `GetComponent` calls |
| `FixedUpdate` | Rigidbody forces and physics queries | Read one-shot input (it can miss or double frames) |
| `LateUpdate` | Camera follow, after-movement logic | Gameplay that others depend on in `Update` |
| `OnDestroy` | Release native resources, unsubscribe statics | Assume other objects still exist |

Order between different scripts is not guaranteed; if one must run first, use Script Execution Order or explicit initialisation, and say which.

## Frame budget and allocations

1. Measure first: Profiler, CPU Usage module, Hierarchy view, sort by **GC.Alloc**; turn on allocation call stacks to find the line. Profile a development build on the target device, not only the Editor.
2. Common per-frame garbage: string concatenation and `ToString()` for UI each frame (update on change), LINQ and lambdas capturing locals in `Update`, `foreach` over some non-`List` collections, boxing value types into `object`, `GetComponents` returning new arrays (use the `List<T>` overloads), `Physics.RaycastAll` (use `RaycastNonAlloc`), `gameObject.tag == "..."` (use `CompareTag`), `Camera.main` in hot loops on older versions (cache it).
3. Cache `GetComponent<T>()` results in `Awake`; never `GameObject.Find` in `Update`.
4. Pool frequently spawned objects (`UnityEngine.Pool.ObjectPool<T>`) instead of `Instantiate` and `Destroy` every few frames.
5. Unity objects have a fake null: a destroyed object compares `== null` as true, but `?.` and `??` skip Unity's check. Use explicit `== null` or `if (obj)` for `UnityEngine.Object`.

## ScriptableObjects

- Use them for shared configuration (weapon stats, level data) and as asset-based event channels. Create with `[CreateAssetMenu]`.
- Changes made in Play Mode to a ScriptableObject asset persist in the Editor but not in builds; don't use them for save data. Copy with `Instantiate(so)` if runtime state must be mutable.

## Async work

- Coroutines (`IEnumerator`, `yield return`) stop when the GameObject is disabled or destroyed.
- `Awaitable` (Unity 2023.1 and Unity 6) gives `NextFrameAsync`, `WaitForSecondsAsync`, `BackgroundThreadAsync` and `MainThreadAsync`. Pass `destroyCancellationToken` (cache it before the object is destroyed) so work stops with the object. Never await the same `Awaitable` instance twice; instances are pooled.
- Unity APIs are main-thread only; switch back with `MainThreadAsync` before touching scene objects.

## Logging and debug console

Details and a console command example in `references/debugging.md`. In short: one logging wrapper with categories and context objects (`Debug.Log(message, this)` lets you click through to the object), compiled out of release builds with `[Conditional("DEVELOPMENT_BUILD")]` and `[Conditional("UNITY_EDITOR")]`; a development-only console that registers named commands (spawn, teleport, set time scale) to reproduce bugs quickly. Never ship cheat commands in release builds.

## Tests

- Edit Mode tests: plain `[Test]` methods in an Editor-only test assembly; for pure logic, fast, no scene.
- Play Mode tests: `[UnityTest]` returning `IEnumerator`, can `yield return null` to step frames; use them for components, physics and scene behaviour. Load a dedicated test scene, clean up in `[TearDown]`.
- Keep game logic in plain C# classes where possible so most tests are Edit Mode.
- Test assemblies need an `.asmdef` that references `UnityEngine.TestRunner` (plus `UnityEditor.TestRunner` and the Editor-only platform for Edit Mode) and the assemblies under test, with `nunit.framework.dll` under precompiled references and `UNITY_INCLUDE_TESTS` as a define constraint, so tests stay out of player builds. Creating the assembly from the Test Runner window sets this up.

## Command line builds and tests

See `references/batch-mode.md` for full commands. Key rules:

1. Use the exact Editor version the project specifies.
2. Builds: `-batchmode -nographics -quit -projectPath <path> -executeMethod BuildScript.BuildAndroid -logFile <file>`, where the static method calls `BuildPipeline.BuildPlayer` and exits non-zero if `report.summary.result` is not `Succeeded`.
3. Tests: `-batchmode -projectPath <path> -runTests -testPlatform EditMode|PlayMode -testResults results.xml -logFile <file>`, **without** `-quit` (the test runner exits the Editor when done; `-quit` is not supported while tests run). Read the NUnit XML, not just the exit code.
4. Cache the `Library/` folder between CI runs, and keep licence activation out of logs and the repo.

## Stop and ask the user

- Before upgrading the Unity version or render pipeline, or changing Player Settings, scripting backend (Mono or IL2CPP) or API compatibility level.
- Before moving or renaming assets in bulk (references can break).
- When a fix needs a paid Asset Store package or a licence change.

## Before you finish

Run the relevant Edit Mode and Play Mode tests from the command line, check the Console and log file for new errors and warnings, and for performance work show the Profiler numbers before and after.

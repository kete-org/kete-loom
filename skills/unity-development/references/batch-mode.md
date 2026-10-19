# Unity batch mode: builds and tests

Editor paths: macOS `/Applications/Unity/Hub/Editor/<version>/Unity.app/Contents/MacOS/Unity`, Windows `C:\Program Files\Unity\Hub\Editor\<version>\Editor\Unity.exe`, Linux `~/Unity/Hub/Editor/<version>/Editor/Unity`. Take `<version>` from `ProjectSettings/ProjectVersion.txt`.

## Build

```bash
"$UNITY" -batchmode -nographics -quit \
  -projectPath "$PWD" \
  -buildTarget Android \
  -executeMethod BuildScript.BuildAndroid \
  -logFile build.log
```

`Assets/Editor/BuildScript.cs`:

```csharp
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

public static class BuildScript
{
    public static void BuildAndroid()
    {
        var options = new BuildPlayerOptions
        {
            scenes = EditorBuildSettingsScenes(),
            locationPathName = "Builds/Android/game.apk",
            target = BuildTarget.Android,
            options = BuildOptions.None
        };
        BuildReport report = BuildPipeline.BuildPlayer(options);
        Debug.Log($"Build {report.summary.result}: {report.summary.totalSize} bytes, {report.summary.totalErrors} errors");
        if (report.summary.result != BuildResult.Succeeded)
            EditorApplication.Exit(1);
    }

    static string[] EditorBuildSettingsScenes()
    {
        var list = new System.Collections.Generic.List<string>();
        foreach (var s in EditorBuildSettings.scenes)
            if (s.enabled) list.Add(s.path);
        return list.ToArray();
    }
}
```

Notes:

- `-buildTarget` on the command line switches platform before scripts compile, avoiding a second import.
- `-nographics` fails for work that needs a GPU (some lightmap baking, shader compilation on certain targets); drop it if the build needs graphics.
- `-logFile -` writes the log to stdout on most platforms, useful in CI.
- Signing keys and keystore passwords come from CI secrets, set in the build script from environment variables; never commit them.

## Tests

```bash
"$UNITY" -batchmode -projectPath "$PWD" \
  -runTests -testPlatform EditMode \
  -testResults results-editmode.xml \
  -logFile tests-editmode.log

"$UNITY" -batchmode -projectPath "$PWD" \
  -runTests -testPlatform PlayMode \
  -testResults results-playmode.xml \
  -logFile tests-playmode.log
```

- Do not add `-quit`; it isn't supported during test runs and can end the Editor before tests finish.
- Narrow runs with `-testFilter "Namespace.Class.Method"` (semicolon list or regex, `!` to negate), `-testCategory "Fast"` and `-assemblyNames "Game.Tests"`.
- `-testPlatform` also accepts a `BuildTarget` value to run Play Mode tests in a player on that platform.
- Results are NUnit XML. Parse `test-run` attributes (`total`, `passed`, `failed`) and list failing `test-case` names; the exit code alone is not a reliable signal across versions.

## CI checklist

- Same Editor version as `ProjectVersion.txt`.
- Licence activated through the CI provider's secure mechanism.
- `Library/` cached by a key of the Unity version plus `Packages/packages-lock.json`.
- Logs and test XML uploaded as artifacts.

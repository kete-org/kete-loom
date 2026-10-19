# Runtime logging and debug commands

## A logging wrapper

```csharp
using System.Diagnostics;
using UnityEngine;
using Debug = UnityEngine.Debug;

public static class GameLog
{
    [Conditional("UNITY_EDITOR"), Conditional("DEVELOPMENT_BUILD")]
    public static void Info(string category, string message, Object context = null)
        => Debug.Log($"[{category}] {message}", context);

    public static void Warn(string category, string message, Object context = null)
        => Debug.LogWarning($"[{category}] {message}", context);

    public static void Error(string category, string message, Object context = null)
        => Debug.LogError($"[{category}] {message}", context);
}
```

- `[Conditional]` removes the call *and its argument evaluation* from release builds, so string formatting costs nothing there. Keep warnings and errors in release.
- Pass `this` as context so a Console click selects the object.
- Use stable categories (`Save`, `Net`, `AI`, `Input`) and key=value pairs (`level=3 hp=12`) so logs can be filtered and grepped.
- On device, read logs with `adb logcat -s Unity` (Android) or the Xcode console (iOS); the Player log file location is listed in the Unity manual under "Log files".
- `Application.logMessageReceived` lets you mirror logs to an in-game overlay or a crash reporter. Unsubscribe in `OnDisable`.

## A development console

```csharp
using System;
using System.Collections.Generic;

public static class DevCommands
{
    static readonly Dictionary<string, Action<string[]>> commands = new();

    public static void Register(string name, Action<string[]> run) => commands[name] = run;

    public static string Execute(string line)
    {
        var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return "";
        if (!commands.TryGetValue(parts[0], out var run)) return $"Unknown command: {parts[0]}";
        try { run(parts[1..]); return "ok"; }
        catch (Exception e) { return $"error: {e.Message}"; }
    }
}
```

- Register commands from the systems that own them (`DevCommands.Register("timescale", a => Time.timeScale = float.Parse(a[0], CultureInfo.InvariantCulture))`).
- Wrap the console UI and every registration in `#if UNITY_EDITOR || DEVELOPMENT_BUILD` so none of it ships.
- Useful commands for reproducing bugs: load scene, teleport, give item, set time scale, toggle god mode, dump state of a system to the log.
- Parse with `CultureInfo.InvariantCulture` for numbers, or a device set to a comma-decimal locale will break `float.Parse`.

# .NET analyzer settings and high-value rules

Read this when enabling nullable or analyzers, or when a build reports `CA` / `CS86xx` / `IDE` diagnostics.

## Project settings

Put shared settings in `Directory.Build.props` at the repo root so every project gets them:

```xml
<Project>
  <PropertyGroup>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <EnableNETAnalyzers>true</EnableNETAnalyzers>
    <AnalysisLevel>latest-recommended</AnalysisLevel>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  </PropertyGroup>
</Project>
```

- `AnalysisLevel` values: `latest`, `latest-minimum`, `latest-recommended`, `latest-all` (also numeric, for example `8.0-recommended`). Start at `recommended`; `all` is noisy.
- `EnforceCodeStyleInBuild` makes `IDE` rules configured in `.editorconfig` run during `dotnet build`.
- Turning on `TreatWarningsAsErrors` in an existing repo can break the build. Ask first; a softer start is `<WarningsAsErrors>nullable</WarningsAsErrors>`.

## Per-rule severity in `.editorconfig`

```ini
[*.cs]
dotnet_diagnostic.CA2007.severity = none      # ConfigureAwait: off in ASP.NET Core apps, warning in libraries
dotnet_diagnostic.CA2000.severity = warning   # dispose objects before losing scope
dotnet_diagnostic.CA1849.severity = warning   # call async methods when in an async method
```

Prefer `.editorconfig` over `<NoWarn>`; it is scoped and reviewable. Every suppression needs a reason in a comment.

## Rules worth enforcing

| Id | Meaning | Usual fix |
|---|---|---|
| CS8600-CS8604 | Possible null assignment, dereference, or argument | Check for null, or change the type to `T?` |
| CS8618 | Non-nullable member uninitialised when constructor exits | `required` member or constructor parameter |
| CS8625 | `null` literal passed to non-nullable | Make the parameter nullable or stop passing null |
| CS4014 | Call not awaited | `await` it, or assign to a variable and await later |
| CS1998 | `async` method with no `await` | Remove `async` and return `Task.CompletedTask` / `Task.FromResult` |
| CA2007 | Missing `ConfigureAwait` | `ConfigureAwait(false)` in libraries |
| CA2000 | Disposable not disposed | `using` / `await using` |
| CA2016 | `CancellationToken` not forwarded | Pass the token through |
| CA1849 | Sync call with async alternative in async method | Use the `...Async` method |
| CA1848 / CA2254 | Logging performance / non-constant template | Constant templates, or `LoggerMessage` source generator on hot paths |
| CA1822 | Member can be static | Mark `static` if it touches no instance state |
| CA1305 / CA1307 | Culture or string comparison not specified | Pass `CultureInfo.InvariantCulture` / `StringComparison.Ordinal` |
| CA5394 | Insecure randomness | `RandomNumberGenerator` for security values |

## Commands

- `dotnet build -warnaserror` : fail on any warning.
- `dotnet format --verify-no-changes` : CI check for whitespace, style and analyzer fixes.
- `dotnet format analyzers --diagnostics CA1822` : apply one rule's code fix across the solution. Review the diff before keeping it.

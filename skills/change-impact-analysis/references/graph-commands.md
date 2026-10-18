# Dependency graph commands by build system

Use only the tool the repository already uses. Check flags against the installed version with `--help`.

| Tool | Affected or reverse-dependency query | Run affected tests |
|---|---|---|
| Nx | `nx show projects --affected -t test --base=origin/main --head=HEAD`; `nx graph --affected` to view | `nx affected -t test --base=origin/main --head=HEAD` (or set `NX_BASE` / `NX_HEAD`) |
| Turborepo | `turbo run test --affected --dry-run` lists tasks; `--filter=...[origin/main]` selects changed packages and their dependents | `turbo run test --affected` (base defaults to `main`; override with `TURBO_SCM_BASE`, head with `TURBO_SCM_HEAD`) |
| Bazel | `bazel query "rdeps(//..., //path/to:target)"`; tests only: `bazel query "kind('.*_test', rdeps(//..., //path/to:target))"` | `bazel test $(bazel query "kind('.*_test', rdeps(//..., //path/to:target))")` |
| Go modules | No built-in reverse lookup. `go list -test -f '{{.ImportPath}} {{join .Deps " "}}' ./... \| grep -E ' <changed/import/path>( \|$)' \| awk '{print $1}' \| grep -v '\.test$' \| sort -u` lists packages whose code or tests depend on it directly or transitively; add the changed package itself | `go test <listed packages>` plus `go vet` |
| pnpm workspaces | `pnpm --filter "...[origin/main]" list --depth -1` (changed packages and their dependents); `pnpm --filter "...<pkg>"` for one package | `pnpm --filter "...[origin/main]" test` |
| Maven | `mvn -pl <module> -amd validate` prints the dependents in the Reactor Build Order (don't pass `-q`, it hides that list) | `mvn -pl <module> -amd verify` |
| Gradle | No built-in reverse-dependency listing; `buildDependents` runs them | `./gradlew :<module>:buildDependents` (builds and tests the project and every project that depends on it) |
| Cargo workspace | `cargo tree -i <crate> --workspace` (inverted tree) | `cargo test -p <crate> -p <each dependent>` |
| Python (no monorepo tool) | Search imports: `git grep -nE "^(from\|import) <package>"`; `pipdeptree -r -p <dist>` for installed distributions | `pytest <dirs>`; `pytest --testmon` with pytest-testmon for test-level selection |

## Related-test modes inside one package

- Jest: `jest --findRelatedTests <changed files>`, `jest --changedSince=origin/main`
- Vitest: `vitest related <changed files> --run`, `vitest --changed origin/main`
- Go: `go test ./<pkg>/...` is already scoped; there is no file-level mode.

These follow static imports only. Dynamic imports, string-keyed lookups, DI containers and reflection need a codebase search.

## CI notes

- Fetch enough history to contain the merge base (`fetch-depth: 0`, or a blobless clone with `--filter=blob:none`); a too-shallow clone makes turbo treat every package as changed.
- Use the last green commit on the default branch as the base when the tool supports it (Nx recommends this).

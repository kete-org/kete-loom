---
name: typescript
description: Always-on rules for TypeScript and JavaScript files, covering type safety, untrusted input, async errors, modules and the project's own tooling.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: read-only
  kete-loom/paths: "**/*.ts, **/*.tsx, **/*.mts, **/*.cts, **/*.js, **/*.jsx, **/*.mjs, **/*.cjs"
  kete-loom/owner: "Kete-org"
---

- Use the project's package manager (the one its lockfile belongs to), formatter, linter and test runner. Never add a second lockfile.
- Run the project's type check (often `tsc --noEmit`) and lint after a change, not only the tests.
- Never weaken `tsconfig.json` or lint settings to make an error go away.
- Never silence the compiler with `any`, `as any`, `@ts-ignore` or a `!` non-null assertion. If a suppression is truly needed, use `@ts-expect-error` with a reason.
- Type values you have not checked as `unknown` and narrow them. Validate untrusted input (request bodies, `JSON.parse`, env vars, files) at the boundary with the project's schema library or a type guard.
- End a `switch` over a union with a `never` check so a new case fails to compile.
- Use `const` by default, `let` when reassigned, never `var`. Use `===` and `!==` (the project's `== null` idiom aside).
- Await or return every promise, or mark it with `void` and handle its rejection. Never leave a floating promise.
- Never pass an async function to `forEach`; use `for...of` with `await`, or `Promise.all` / `Promise.allSettled` over `map`.
- Catch errors as `unknown`, and throw `Error` objects, never strings. Pass the original as `{ cause }` when wrapping.
- Use `?.` and `??` for missing values; `||` also replaces `0`, `""` and `false`.
- Never build HTML, SQL, shell commands or file paths by string concatenation with user input. Use parameterized queries, `execFile`/`spawn` with an argument array, and the framework's escaping.
- Never use `eval`, `new Function` or `innerHTML` with untrusted data.
- Match the package's module system (`"type"` in `package.json`, `.mjs`/`.cjs`); never mix `require` and `import` in one file.
- Never put secrets in client code or in env vars the framework exposes to the browser (such as `NEXT_PUBLIC_` or `VITE_`).

For more, load the typescript-patterns and typescript-testing skills.

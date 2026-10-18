---
name: php
description: Always-on rules for modern PHP 8 code, covering strict types, typed signatures, input handling, SQL, errors, Composer and tests.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: read-only
  kete-loom/paths: "**/*.php"
  kete-loom/owner: "Kete-org"
---

- Start new files with `declare(strict_types=1);` and match existing files that already use it.
- Type every parameter, return and property. Use `?T` or union types only when null or another type is a real state.
- Use enums for fixed sets of values when the project's PHP version supports them (8.1+), not loose strings.
- Compare with `===` and `!==`. Use `match` over `switch` when mapping values; it compares strictly and throws `UnhandledMatchError` on no match.
- Never build SQL by string concatenation. Use prepared statements with bound parameters (PDO or the project's query builder/ORM).
- Escape output for its context: `htmlspecialchars($v, ENT_QUOTES, 'UTF-8')` for HTML, or the template engine's auto-escaping.
- Never pass user input to `eval`, `include`/`require`, `unserialize`, `exec`, `shell_exec` or `system`. Use `json_decode` for untrusted data and `escapeshellarg` if a shell is unavoidable.
- Hash passwords with `password_hash` and check with `password_verify`. Use `random_bytes`/`random_int` for tokens, never `rand` or `mt_rand`.
- Throw specific exceptions and catch them where you can act. Never suppress errors with `@`.
- Run the project's configured formatter and code style tool; keep classes in PSR-4 autoload paths (one class per file, namespace matches directory).
- Run the project's static analyser (PHPStan or Psalm) at its configured level and fix what you introduce.
- Add dependencies with `composer require`, commit `composer.lock` in applications, and never edit `vendor/`.
- Validate request input at the boundary; never trust `$_GET`, `$_POST`, `$_COOKIE` or headers.
- Add or update tests with the project's test framework (PHPUnit or Pest) and run them.

For more, load the php-patterns, php-testing and laravel-patterns skills.

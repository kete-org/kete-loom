---
name: php-patterns
description: Modern PHP 8 conventions for writing new code and restructuring old code, covering declare(strict_types=1), typed and readonly properties, backed enums, constructor promotion, exception hierarchies, PSR-4 autoloading through Composer, PSR-12 style, PHPStan or Psalm at a high level, and safe handling of SQL, output escaping, passwords and unserialize. Use when writing or modernising PHP 8.x classes, designing a Composer package or PHP service, or asking how idiomatic typed PHP should look.
license: MIT
compatibility: Any Agent Skills host. Needs php and composer; PHPStan or Psalm and PHP-CS-Fixer or PHP_CodeSniffer are used if the project has them.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "php, composer"
  kete-loom/owner: "Kete-org"
---

# PHP patterns

Write PHP that a static analyser can fully understand: every file strict, every value typed, no magic you can't see. Follow the project's existing conventions and framework first (Laravel, Symfony and others have their own); these rules fill the gaps.

## 0. Before you write

1. Read `composer.json`: the `require.php` constraint and `config.platform.php` set the lowest PHP version you may target. Do not use a feature newer than that (see the table in section 2).
2. Note `autoload.psr-4` namespaces so new classes land in the right folder with the right namespace.
3. Find the quality tools: `phpstan.neon(.dist)`, `psalm.xml`, `.php-cs-fixer(.dist).php`, `phpcs.xml(.dist)`, `rector.php`, and the `scripts` section of `composer.json`. Use those commands, not your own.
4. Search the codebase for an existing exception, value object, enum or helper before adding one.

## 1. Every file

- Start with `<?php`, then `declare(strict_types=1);` as the first statement, then the namespace and `use` lines. No closing `?>` in pure-PHP files.
- One class, interface, trait or enum per file; file name equals the class name; path matches the PSR-4 prefix.
- Type every parameter, return and property. Use `void`, `never`, `?T`, union `A|B`, and `mixed` only when the value really is anything.
- Mark classes `final` unless they are designed for extension. Keep constructors free of I/O.
- Follow PSR-12 (or PER Coding Style) layout; let the project's fixer format it rather than formatting by hand.

`strict_types` applies to calls made *from* that file. Without it, `strlen(123)` and `function f(int $x)` called with `"5"` silently coerce. Adding it to an old file can turn a silent coercion into a `TypeError`: run the tests after adding it.

## 2. Language features by version

| Feature | Since | Use for |
|---|---|---|
| Constructor promotion, `match`, nullsafe `?->`, named arguments, union types, `#[Attributes]` | 8.0 | Short value objects, exhaustive branching |
| Enums (pure and backed), `readonly` properties, `never`, first-class callables `f(...)`, `new` in initialisers | 8.1 | Closed sets of values, immutable data |
| `readonly` classes, DNF types `(A&B)\|null`, `true`/`false`/`null` as standalone types | 8.2 | Immutable DTOs |
| Typed class constants, `#[\Override]`, `json_validate()` | 8.3 | Catching broken overrides |
| Property hooks, asymmetric visibility `public private(set)`, `new Foo()->bar()` without parentheses, `#[\Deprecated]` | 8.4 | Replacing trivial getters/setters |

PHP 8.4 deprecates implicitly nullable parameters (`function f(Foo $x = null)`); write `?Foo $x = null`.

## 3. Data and types

- Value objects: `final readonly class Money { public function __construct(public int $amountMinor, public Currency $currency) {} }`. Validate in the constructor and throw on invalid input; a constructed object is always valid.
- Money is integer minor units or a decimal library (`brick/money`, `moneyphp/money`), never `float`.
- Use a backed enum for any closed set of strings or ints that crosses a boundary (database column, API field): `enum Status: string { case Paid = 'paid'; }`. Parse with `Status::from()` when invalid input is a bug, `Status::tryFrom()` when it is user input you will reject.
- Use `match` instead of `switch`: it compares strictly, returns a value and throws `UnhandledMatchError` on a missing case. Over an enum, list every case and omit `default` so a new case fails loudly.
- Always compare with `===` and `!==`. Pass `true` as the strict flag to `in_array()` and `array_search()`. Never compare hashes or tokens with `==` (`"0e123" == "0e456"` is true); use `hash_equals()`.
- Arrays with a fixed shape are a missing class. Return a DTO, not `['id' => ..., 'name' => ...]`. Where arrays stay, document them for the analyser: `@param list<int>`, `@return array<string, User>`, `@var array{id: int, name: string}`.
- Prefer immutability: return a new instance (`withX()`) instead of mutating shared objects.

## 4. Errors

- Throw exceptions; never return `false` or `null` to mean "failed" in new code. Return `null` only for "not found" and type it `?T`.
- Define a small hierarchy per module: `final class InvoiceNotFound extends \DomainException`. Extend SPL exceptions (`InvalidArgumentException`, `RuntimeException`, `LogicException`, `DomainException`) so callers can catch broadly.
- When rethrowing, chain the cause: `throw new PaymentFailed('charge declined', previous: $e);`.
- Catch only what you can handle. Never write an empty `catch (\Throwable $e) {}`. Catch `\Throwable` only at the top level (HTTP kernel, queue worker, CLI entry point) to log and respond.
- Many built-ins still signal failure by return value: check `file_get_contents`, `fopen`, `preg_match`, `json_decode`, `strpos` results with `=== false`. For JSON use `json_decode($s, true, 512, JSON_THROW_ON_ERROR)` and `json_encode($v, JSON_THROW_ON_ERROR)`.
- Never use the `@` error-suppression operator to hide a failure.

## 5. Composer and autoloading

- Every class loads through Composer's PSR-4 autoloader; no `require_once` for classes. Tests use `autoload-dev`.
- After changing `autoload` in `composer.json` run `composer dump-autoload`. In production builds use `composer install --no-dev --optimize-autoloader` (or `--classmap-authoritative`).
- Commit `composer.lock` for applications; packages usually don't. Run `composer validate --strict` after editing `composer.json`.
- Add dependencies with `composer require vendor/pkg` (`--dev` for tools), using a caret constraint (`^2.3`). Do not hand-edit versions and skip the lock update.
- Set `config.platform.php` to the production PHP version so the lock file resolves for the server, not your laptop.
- Run `composer audit` before release and when adding a dependency.

## 6. Static analysis

- PHPStan: aim for the highest level the project can sustain; for new projects start at level 6 or higher and raise it. Run `vendor/bin/phpstan analyse`.
- Psalm: `vendor/bin/psalm`, with `errorLevel` in `psalm.xml` (1 is strictest).
- Fix the type, don't silence the error. If legacy code makes a level impossible, generate a baseline (`phpstan analyse --generate-baseline`, `psalm --set-baseline=psalm-baseline.xml`) and never add new code to it.
- When you must ignore one line, use an identifier-specific ignore with a reason (`// @phpstan-ignore argument.type (reason)`, `/** @psalm-suppress PossiblyNullReference */`), never a blanket ignore.
- Use generics in docblocks (`@template T`, `Collection<int, User>`) where the language can't express the type.

## 7. Security defaults

| Risk | Do | Never |
|---|---|---|
| SQL injection | PDO or the framework query builder with bound parameters: `$stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?'); $stmt->execute([$id]);`. Allow-list column and sort names. | Interpolate input into SQL, even "just an int" |
| XSS | Escape at output in the template engine (Twig, Blade escape by default). In raw PHP: `htmlspecialchars($s, ENT_QUOTES \| ENT_SUBSTITUTE, 'UTF-8')` | `echo $_GET[...]`, `{!! !!}` / `\|raw` on user data |
| Passwords | `password_hash($p, PASSWORD_DEFAULT)`, `password_verify()`, `password_needs_rehash()` | `md5`, `sha1`, unsalted hashes |
| Tokens | `random_bytes()`, `random_int()`, `bin2hex(random_bytes(32))` | `rand`, `mt_rand`, `uniqid` for secrets |
| Deserialisation | `json_decode`; if `unserialize` is unavoidable, `unserialize($s, ['allowed_classes' => false])` | `unserialize()` on any data a user can influence |
| Commands | Avoid the shell; if required, `escapeshellarg()` each argument or pass an array to `proc_open()` | Build shell strings from input |
| Files | Resolve with `realpath()` and check the prefix; store uploads outside the web root with generated names | `include`/`require` a path built from input |
| Config | Secrets from environment or a secrets manager; `display_errors=Off` in production | Commit `.env` or credentials |

Also: set PDO `PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION` and `PDO::ATTR_EMULATE_PREPARES => false` unless the project relies on emulation.

## 8. Stop and ask the user

- The change needs a higher PHP version than `composer.json` allows, or a new runtime dependency.
- Adding `strict_types` or tightening types would change behaviour that existing callers depend on and there are no tests.
- You would need to raise or lower the PHPStan/Psalm level, or regenerate the baseline.

## 9. Before you finish

1. Run the project's linters and analyser on touched files (`vendor/bin/phpstan analyse <paths>`, `vendor/bin/psalm <paths>`, the fixer in check/dry-run mode).
2. Run `php -l` on any file you could not analyse.
3. Run the test suite (`vendor/bin/phpunit` or `vendor/bin/pest`). For writing tests, use the `php-testing` skill.
4. Report what you changed and anything you did not run.

## Never

- Leave a file without `declare(strict_types=1);` in a project that uses it.
- Use `extract()`, `eval()`, variable variables (`$$name`) or `global`.
- Use `float` for money, `==` for security comparisons, or `unserialize` on untrusted input.
- Disable a check, lower an analysis level or add to a baseline to make new code pass.

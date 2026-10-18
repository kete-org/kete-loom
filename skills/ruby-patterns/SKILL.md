---
name: ruby-patterns
description: Ruby 3 idioms for plain Ruby and gem code - small objects with clear responsibilities, blocks and Enumerable over manual loops, custom exception hierarchies and narrow rescue, frozen string literals, keyword arguments, Bundler and Gemfile.lock discipline, RuboCop configuration, optional RBS or Sorbet signatures, and the allocation and lookup mistakes that make Ruby slow. Use when writing or restructuring Ruby classes and modules, designing a gem's public API, setting up RuboCop or type signatures, or asking why a Ruby script is slow or allocating heavily.
license: MIT
compatibility: Any Agent Skills host. Needs ruby and bundler; rubocop, steep or sorbet only if the project uses them.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "ruby, bundle"
  kete-loom/owner: "Kete-org"
---

# Ruby patterns

Ruby code that reads plainly, fails loudly, and does not surprise the next person.

## 0. Read the project first

1. Find the Ruby version: `.ruby-version`, `.tool-versions`, the `ruby` line in `Gemfile`, `required_ruby_version` in a `.gemspec`. Do not use syntax newer than that version (for example the `it` block parameter needs Ruby 3.4).
2. Read `.rubocop.yml` and any `inherit_from` / `inherit_gem` files. Their rules win over this skill.
3. Check for typing: `sig/` and `Steepfile` (RBS + Steep), or `sorbet/` and `# typed:` comments (Sorbet). Follow whichever exists; don't add one without asking.
4. Run commands through Bundler: `bundle exec rubocop`, `bundle exec rake`. Never rely on globally installed gem versions.

If the code is a Rails app, apply this skill to plain Ruby objects only; framework conventions come from the project.

## 1. Object design

- One class, one job. If a class name needs "And" or "Manager", split it.
- Prefer plain objects with an explicit `initialize` over hashes passed around. A hash with fixed keys that travels more than one method wants to be a `Data` (Ruby 3.2+) or `Struct`:

  ```ruby
  Point = Data.define(:x, :y)        # immutable, value equality, keyword or positional init
  Point.new(x: 1, y: 2).with(y: 3)
  ```

- Use keyword arguments for anything beyond one or two obvious positionals. Required keywords (`def charge(amount:, currency:)`) fail at the call site instead of deep inside.
- Keep the public surface small: mark helpers `private`. Expose `attr_reader`, not `attr_accessor`, unless callers truly must write.
- Composition over inheritance. Use a module for shared behaviour that has no state of its own; use `Comparable` / `Enumerable` by defining `<=>` / `each`.
- Avoid metaprogramming (`method_missing`, `define_method`, `send` with user input, `class_eval` strings) unless it removes real duplication. If you add `method_missing`, also define `respond_to_missing?`.
- Do not monkey-patch core classes. If you must extend one, use a `refinement` scoped with `using`.

## 2. Blocks and Enumerable

- Reach for `map`, `select`/`filter`, `reject`, `filter_map`, `each_with_object`, `sum`, `group_by`, `partition`, `tally`, `min_by`/`max_by`, `each_slice`, `find` before writing `each` with an accumulator.
- `each` is for side effects only. Never `map` and ignore the result.
- `sum` with floats: `sum(0.0)`; for money use `BigDecimal` or integer minor units, never `Float`.
- Large or infinite sequences: `.lazy` or `each_slice` so you don't build huge intermediate arrays.
- Methods that yield should return an `Enumerator` when called without a block: `return enum_for(__method__) unless block_given?`.
- `&:name` for single method calls; a short block (`{ it.strip }` on 3.4+, `{ _1.strip }` on 2.7+, or a named param) otherwise. Named params read best beyond one line.

## 3. Exceptions

- Define one base error per library or domain and subclass it:

  ```ruby
  module Billing
    class Error < StandardError; end
    class CardDeclined < Error; end
  end
  ```

- Rescue the narrowest class you can handle. Never `rescue Exception` (it swallows `Interrupt`, `NoMemoryError`, `SystemExit`). A bare `rescue` means `StandardError`; still too broad unless you re-raise.
- Never `rescue => e` and then do nothing. Either handle it, re-raise (`raise`), or wrap it with context: `raise Billing::Error, "charge #{id} failed"` (Ruby sets `cause` automatically).
- Keep `begin` blocks to the call that can fail. Use `ensure` for cleanup, or better a block API (`File.open(path) { |f| ... }`) that closes for you.
- Use `retry` only with a counter and backoff; an unbounded `retry` loops forever.
- Don't use exceptions for expected control flow (lookups that may miss): return `nil` or a result object and let the caller decide. Use `fetch` when a missing key is a bug.

## 4. Strings, symbols and nil

- Put `# frozen_string_literal: true` at the top of every file if the project does (RuboCop `Style/FrozenStringLiteralComment`). Build strings with `+"..."`, `String.new` or interpolation when you need a mutable one.
- On Ruby 3.4, mutating a literal in a file without the magic comment emits a deprecation warning when deprecation warnings are on (`ruby -W:deprecated` or `Warning[:deprecated] = true`). Turn them on in CI to find code that will break when literals become frozen.
- Use `<<` on a mutable buffer for loops; `+=` allocates a new string each time.
- Treat `nil` deliberately: `&.` for genuinely optional values, `Hash#fetch` / `Array#fetch` to fail loudly, `Array(x)` to normalise. Repeated `&.` chains usually mean a missing object.
- Symbols for identifiers and keys you control; never `to_sym` on user input in long-lived processes.

## 5. Bundler and dependencies

- Commit `Gemfile.lock` for applications. For a gem, declare runtime dependencies in the `.gemspec` with `~>` ranges and keep the lockfile out of the release.
- Pin loosely with intent: `gem "faraday", "~> 2.9"`. No unbounded `>=` for runtime gems.
- Group dev and test gems (`group :development, :test do`), and `require: false` for gems loaded on demand (`rubocop`, `bootsnap`).
- Add or upgrade one gem at a time: `bundle add <gem>`, `bundle update --conservative <gem>`. Never a bare `bundle update` without asking: it moves every gem.
- In CI and deploys: `bundle config set frozen true` (or `deployment true`) so a stale lockfile fails instead of re-resolving.
- Since Ruby 3.4, `base64`, `bigdecimal`, `csv`, `drb`, `mutex_m`, `observer`, `getoptlong`, `nkf`, `syslog`, `abbrev`, `rinda` and `resolv-replace` are bundled gems: under Bundler, declare them in the Gemfile if you `require` them.

## 6. RuboCop

- Run `bundle exec rubocop` on changed files; `-a` applies safe corrections only. Use `-A` (unsafe) only on files you are editing, and review the diff.
- Fix the cause rather than disabling a cop. If a disable is right, scope it: `# rubocop:disable Metrics/MethodLength` ... `# rubocop:enable ...` on the smallest range, with a reason.
- Adopting RuboCop on an old codebase: `rubocop --auto-gen-config` to create `.rubocop_todo.yml`, then shrink it over time. Don't reformat the whole repo in a feature change.
- Use plugins the project already has (`rubocop-performance`, `rubocop-rspec`, `rubocop-rails`); ask before adding new ones.

## 7. Optional typing

Only when the project already uses it, or the user asks.

- **RBS + Steep:** signatures in `sig/**/*.rbs`; check with `bundle exec steep check`. Start with `rbs prototype rb lib/foo.rb` and then tighten `untyped` by hand.
- **Sorbet:** `# typed: false|true|strict` per file, `sig { params(x: Integer).returns(String) }` above methods, check with `bundle exec srb tc`; generate gem RBIs with `bundle exec tapioca gem`.
- Type the public API first. Don't use `T.unsafe`, `T.untyped` or `untyped` to silence an error you don't understand.

## 8. Performance pitfalls

Measure first: `Benchmark.realtime`, `benchmark-ips`, `memory_profiler`, `stackprof`. Then look for:

| Pitfall | Fix |
|---|---|
| `array.include?(x)` inside a loop | build a `Set` (or Hash) once |
| `+=` / `+` building strings or arrays in loops | `<<`, `concat`, `join`, `each_with_object` |
| `.map { }.flatten`, `.select { }.first`, `.select { }.count` | `flat_map`, `find`, `count { }` |
| Reading a whole file to iterate lines | `File.foreach(path)` |
| Regex or object built inside a hot loop | hoist it to a constant |
| `method_missing` / `send` on hot paths | define real methods |
| `Hash#merge` in a loop | `merge!` / `[]=` on one hash |
| N+1 calls to a DB or HTTP API per element | batch the call, then index the result by key |

Ruby threads share the GVL: they help with I/O waits, not CPU-bound work. For CPU-bound parallelism use processes; consider `Ractor` only after checking it is stable enough for the project's Ruby version.

## Never

- `eval`, `instance_eval` or `class_eval` with strings built from input.
- `Marshal.load` or `YAML.load` of untrusted data; use `JSON.parse` or `YAML.safe_load`.
- Backticks, `system("cmd #{x}")` or `%x()` with interpolated input; pass an argument list: `system("git", "log", ref)`.
- Global state via `$globals` or class variables (`@@var`); use constants, injected objects, or class-level instance variables.

## Report back

When you finish, say: files changed, the RuboCop (and type-check) command you ran and its result, the test command and pass/fail counts, and anything you chose not to change.

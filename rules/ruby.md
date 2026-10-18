---
name: ruby
description: Always-on rules for Ruby code, covering style, nil handling, exceptions, unsafe input, Bundler, Rails safety and tests.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: read-only
  kete-loom/paths: "**/*.rb, **/*.rake, **/*.erb, **/*.gemspec, **/Gemfile, **/Rakefile"
  kete-loom/owner: "Kete-org"
---

- Run the project's configured linter and formatter (RuboCop or Standard) and fix what you introduce. Don't add inline disables to hide real problems.
- Match the project's use of `# frozen_string_literal: true`; don't mutate string literals.
- Handle `nil` explicitly. Use `fetch` for required keys so a missing key raises instead of returning `nil`; use `&.` only where `nil` is a valid state.
- Rescue specific exception classes. Never `rescue Exception` (it catches `Interrupt` and `SystemExit`); re-raise with bare `raise` when you can't handle it.
- Use `ensure` or block forms (`File.open { }`) so resources are always released.
- Never pass user input to `eval`, `instance_eval`, `send`, `public_send`, `constantize` or `Object.const_get` without an allowlist.
- Call shell commands with argument arrays (`system("cmd", arg)`, `Open3.capture3("cmd", arg)`), never interpolated strings or backticks.
- Never use `Marshal.load` or `YAML.load` on untrusted data; use `JSON.parse` or `YAML.safe_load`.
- In Rails, never interpolate into SQL; use `where(name: v)` or bound placeholders. Permit params with strong parameters, never `permit!`.
- In Rails views, never call `html_safe` or `raw` on user input; let ERB escape it.
- In Rails, avoid N+1 queries with `includes`/`preload`, and change the schema only through migrations.
- Add gems through the `Gemfile` with Bundler and commit `Gemfile.lock`. Run commands with `bundle exec`.
- Add or update tests with the project's framework (RSpec or Minitest) and run them.

For more, load the ruby-patterns, ruby-testing and rails-patterns skills.

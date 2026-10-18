---
name: perl-testing
description: Perl test suites with Test::More or Test2::V0, run through prove - writing .t files, subtests, exception and warning checks, mocking with Test::MockModule or Test2::Mock, temp-file fixtures, and coverage reports from Devel::Cover. Use when adding or fixing tests for a Perl module or script, setting up a t/ directory, making a flaky prove run deterministic, or finding which Perl code paths no test exercises.
license: MIT
compatibility: Any Agent Skills host. Needs perl and prove; coverage needs Devel::Cover from CPAN.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "perl, prove"
  kete-loom/owner: "Kete-org"
---

# Perl testing

Tests live in `t/*.t`, run with `prove`, and stay deterministic. Match the framework the project already uses.

## 0. Before you start

1. Find the test setup: `t/`, `xt/` (author tests), `cpanfile` `on test` block, `Makefile.PL` / `Build.PL` / `dist.ini`, CI config.
2. Find the framework in existing tests: `use Test::More`, `use Test2::V0`, Test::Class, Test::Most. Keep it. New projects: Test2::V0.
3. Run the suite once: `prove -lr t` (`-l` adds `lib/` to `@INC`, `-r` recurses). With Carton: `carton exec prove -lr t`. Dist::Zilla: `dzil test`.
4. If it already fails, **stop and tell the user** which files fail before changing anything.

## 1. File shape

Test::More:

```perl
use strict;
use warnings;
use Test::More;

use My::Parser;

subtest 'parses a simple line' => sub {
    my $r = My::Parser->new->parse("a=1");
    is_deeply $r, { a => 1 }, 'key and value';
};

done_testing;
```

Test2::V0 (enables strict and warnings itself):

```perl
use Test2::V0;
use My::Parser;

is(My::Parser->new->parse("a=1"), { a => 1 }, 'deep compare with is');
like(dies { My::Parser->new->parse(undef) }, qr/no input/, 'dies on undef');

done_testing;
```

- End every file with `done_testing;` instead of a hard-coded plan.
- One behaviour per `subtest`, named as a sentence.
- Name every assertion; the name is what a failure prints.

## 2. Assertions to reach for

| Check | Test::More | Test2::V0 |
|---|---|---|
| Scalar equal | `is` | `is` |
| Deep structure | `is_deeply` | `is` (with `hash`/`array` builders for partial checks) |
| Regex | `like` | `like` |
| Dies | `eval` + `like $@` or Test::Fatal `exception { }` | `dies { }`, `lives { }` |
| Warns | Test::Warnings / Test::Warn | `warning { }`, `warnings { }`, `no_warnings { }` |
| Object | `isa_ok`, `can_ok` | `isa_ok`, `can_ok` |

- Add Test::Warnings (or `Test2::Plugin::NoWarnings`) so an unexpected warning fails the test.
- Compare numbers with a tolerance for floats; do not use `is` on computed floats.

## 3. Fixtures and isolation

- Temp files: `File::Temp qw(tempdir)` with `tempdir(CLEANUP => 1)`. Never write into the repo or `/tmp` by fixed name.
- Small data files go in `t/data/`; locate them with `FindBin` or `File::Spec->catfile(...)` relative to the test file.
- Shared helpers go in `t/lib/` and load with `use lib 't/lib';`.
- Environment: `local $ENV{TZ} = 'UTC';` inside the test, never global changes.
- Time: inject a clock, or override with Test::MockTime; do not sleep.

## 4. Mocking

Mock only slow or external boundaries (network, clock, external commands). Never mock the module under test.

Test::MockModule:

```perl
use Test::MockModule;
my $mock = Test::MockModule->new('HTTP::Tiny');
$mock->redefine(get => sub { { success => 1, content => '{"ok":1}' } });
# restored automatically when $mock goes out of scope
```

Test2::Mock (with Test2::V0): `my $m = mock 'HTTP::Tiny' => (override => [ get => sub { ... } ]);`.

- Use `redefine` (fails if the sub does not exist) rather than `mock` so a typo or API rename breaks the test.
- For external commands, wrap the call in one sub in your code and mock that sub.
- Keep the mock object in a lexical that lives for the whole test; once it goes out of scope the real sub returns.

## 5. Running

- Single file, verbose: `prove -lv t/parser.t`.
- Parallel: `prove -lr -j4 t` (only if tests do not share files or ports).
- Author/release tests: `prove -lr xt` with `AUTHOR_TESTING=1` or `RELEASE_TESTING=1`, as the project expects.
- Shuffle to find order dependence: `prove -lr --shuffle t`.

## 6. Coverage with Devel::Cover

1. Install: `cpanm Devel::Cover` (or add to the `on develop` block of `cpanfile`).
2. Clear old data and run: `cover -delete && HARNESS_PERL_SWITCHES=-MDevel::Cover prove -lr t && cover`.
   For ExtUtils::MakeMaker or Module::Build dists, `cover -test` does the same.
3. Read `cover_db/coverage.html`, or `cover -report text` in a terminal. Look at branch and condition columns, not only statement.
4. Add tests for uncovered branches that carry behaviour (error paths, input validation). Do not write tests that only execute lines.
5. Add `cover_db/` to `.gitignore`.

## Rules

- Never delete, skip (`skip`, `todo`) or weaken an existing test to make the suite pass without telling the user why.
- No real network in `t/`. Live tests go in `xt/` behind an env var.
- Fixed seeds (`srand 42` only inside the test) and fixed time.
- If a test cannot be made green after three focused attempts, stop and report what you tried.

## Report back

End with: test files added or changed, the exact `prove` command run, the pass/fail counts from its summary, coverage before and after if measured, and what is left untested.

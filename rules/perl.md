---
name: perl
description: Always-on rules for modern Perl 5 code, covering strict and warnings, lexical scope, safe open and system calls, untrusted input, SQL, encoding and tests.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: read-only
  kete-loom/paths: "**/*.pl, **/*.pm, **/*.t, **/*.psgi"
  kete-loom/owner: "Kete-org"
---

- Start every file with `use strict;` and `use warnings;` (or the project's equivalent bundle, such as `use v5.36;`).
- Declare variables with `my` in the smallest scope. Never use undeclared globals; use `our` only for package interfaces.
- Use three-argument `open` with a lexical filehandle and check it: `open(my $fh, '<', $path) or die "Can't open $path: $!";`.
- Check the result of every system call (`open`, `close`, `mkdir`, `unlink`, `rename`) and include `$!` in the error, or `use autodie`.
- Call external programs with list-form `system` or `exec` (`system('cmd', @args)`), never one interpolated string. Check `$?` afterwards.
- Never pass untrusted input to string `eval`, two-argument `open`, or backticks. Catch exceptions with block `eval { }` or the project's try/catch module.
- Localise special variables (`local $_`, `local $/`) when you change them.
- Use placeholders (`?`) with DBI `prepare`/`execute`; never interpolate values into SQL.
- Pass and return complex data by reference; don't flatten hashes and arrays you need to keep separate.
- Decode input and encode output explicitly (`use utf8;` when the source has non-ASCII text, `:encoding(UTF-8)` layers on handles).
- Run `perl -c` and the project's configured Perl::Critic and Perl::Tidy settings on changed files.
- Write tests in `t/*.t` with `Test::More` (or the project's framework), end with `done_testing`, and run them with `prove -lr t`.

For more, load the perl-patterns and perl-testing skills.

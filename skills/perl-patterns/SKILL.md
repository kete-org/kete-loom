---
name: perl-patterns
description: Modern Perl 5 conventions for writing and restructuring code - strict and warnings, lexical scope, references and nested data, Moo or Moose classes, try/catch error handling, cpanfile with cpanm or Carton, Perl::Critic policy and taint-safe system calls. Use when writing new Perl, modernising a legacy .pl or .pm script, choosing between Moo and Moose, or deciding how a Perl program should manage CPAN dependencies and shell out safely.
license: MIT
compatibility: Any Agent Skills host. Needs perl 5.10 or newer; guidance marks what needs 5.36 or 5.40.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/requires: "perl"
  kete-loom/owner: "Kete-org"
---

# Modern Perl patterns

Write Perl that a maintainer can read in five years. Match the project first, then apply these rules.

## 0. Before you write

1. Find the minimum perl the code must run on: `use v5.x` lines, `cpanfile` (`requires 'perl', '5.x'`), `Makefile.PL` (`MIN_PERL_VERSION`), `dist.ini`, CI matrix, and `perl -v` on the target host.
2. Find the house OO system (Moo, Moose, Mouse, Object::Pad, hand-rolled `bless`) and the error style (die objects, Try::Tiny, `feature 'try'`). Keep using them.
3. If the target perl is unknown and you need features newer than 5.10, **stop and ask** which perl ships in production.

## 1. File header

Every file starts with strict and warnings. Pick one form:

```perl
use v5.36;            # strict, warnings, say, signatures; disables indirect and multidimensional
```

```perl
use strict;
use warnings;         # for code that must run on perls older than 5.36
```

- `use v5.40` adds the stable `try` feature and the builtin bundle (`true`, `false`, `trim`, ...). `finally` blocks are still experimental there.
- Modules end with `1;` unless the file uses `v5.38`+ (the `module_true` feature).
- Add `use utf8;` only when the source itself contains non-ASCII literals. Decode input and encode output explicitly (`open my $fh, '<:encoding(UTF-8)', $path`).

## 2. Scope and variables

- Declare every variable with `my` in the smallest enclosing block. Use `state` for per-sub persistent values, not file-level globals.
- Never use `local $_` tricks or package globals to pass data between subs; pass arguments.
- `local` is only for dynamic globals you must change temporarily: `local $/;`, `local $@;`, `local $ENV{PATH}`.
- Use signatures on 5.36+: `sub fetch($url, %opt) { ... }`. Older code: `my ($self, %args) = @_;` on the first line.

## 3. References and data structures

- Build nested data with literals: `my %cfg = (hosts => [ ... ], retry => { max => 3 });`.
- Dereference with postfix syntax on 5.24+: `$cfg->{hosts}->@*`, `$row->%{qw(id name)}`. Use `@{ $ref }` on older perls.
- Check shape before you trust it: `ref $x eq 'HASH'`, or `Scalar::Util::reftype` / `blessed` for objects.
- Copy deeply only when needed (`Storable::dclone`); assigning a ref shares the data.
- Avoid autovivification surprises: `exists $h{a} && exists $h{a}{b}` instead of testing `$h{a}{b}` directly, or use the `autovivification` pragma if the project already does.
- Know context: `my $n = @list` gives a count, `my ($first) = @list` gives an element, `return;` (not `return undef;`) for "nothing" so list callers get an empty list.

## 4. Object orientation

Decision rule:

| Need | Use |
|---|---|
| Plain classes, fast startup, few dependencies | Moo |
| Introspection, meta-programming, MooseX extensions already in the project | Moose |
| perl 5.38+ and the team accepts an experimental feature | core `class` (`use feature 'class'`) |
| Tiny script with one data holder | a hash, not a class |

Moo class shape:

```perl
package My::Client;
use v5.36;
use Moo;
use HTTP::Tiny;
use Types::Standard qw(Str Int);
use namespace::autoclean;

has base_url => (is => 'ro', isa => Str, required => 1);
has timeout  => (is => 'ro', isa => Int, default => 10);
has _ua      => (is => 'lazy');
sub _build__ua ($self) { HTTP::Tiny->new(timeout => $self->timeout) }

1;
```

- Prefer `is => 'ro'` and build new objects instead of mutating.
- Use roles (`Moo::Role`, `with`) for shared behaviour instead of deep inheritance.
- With Moose, end the class with `__PACKAGE__->meta->make_immutable;`.

## 5. Error handling

- Fail with `die`, using `Carp::croak` in modules so the error points at the caller.
- For errors callers branch on, throw objects (an exception class with a `message` and a type) rather than matching message strings.
- Catching, by target perl:
  - 5.40+: `use v5.40; try { ... } catch ($e) { ... }`.
  - 5.34 to 5.38: `use feature 'try'; no warnings 'experimental::try';` only if the team accepts experimental code; otherwise Try::Tiny.
  - Older: Try::Tiny (`try { } catch { warn $_ };` note the trailing semicolon and that `return` inside returns from the block, not the sub), or Syntax::Keyword::Try.
- Without Try::Tiny or `try`, never write `eval { ... }; if ($@)`: `$@` can be empty or clobbered by a destructor. Use `eval { ...; 1 } or do { my $err = $@ || 'unknown error'; ... };`.
- Check every system call: `open(...) or die "open $path: $!"`, `close $fh or die ...`. Or `use autodie;` file-wide.

## 6. Dependencies (CPAN)

1. Declare dependencies in a `cpanfile` (`requires 'Moo', '2.004';`, `on test => sub { requires 'Test2::V0'; };`).
2. Install for development: `cpanm --installdeps .`.
3. For reproducible apps, use Carton: `carton install` writes `cpanfile.snapshot` and `local/`; run with `carton exec perl script.pl` or `carton exec prove -lr t`. Commit `cpanfile.snapshot`, never `local/`.
4. Do not install into the system perl with `sudo cpan`. Use local::lib, Carton, or perlbrew/plenv.
5. Before adding a module, check it is maintained (MetaCPAN: recent release, CPAN Testers results) and that a core module (`List::Util`, `Scalar::Util`, `File::Spec`, `File::Temp`, `HTTP::Tiny`, `JSON::PP`, `Time::Piece`) does not already do the job.

## 7. Perl::Critic and tidying

- Run `perlcritic --severity 3 lib/ bin/` (lower number is stricter; 5 is gentlest). Respect the project's `.perlcriticrc`.
- Fix the code rather than adding `## no critic`. If a disable is justified, name the policy and give the reason on the same line: `## no critic (ProhibitStringyEval) -- loads generated plugin code`.
- Format with `perltidy` using the project's `.perltidyrc`; do not reformat files you did not otherwise change.

## 8. Security: input, files, shells

- Run untrusted-input programs (CGI, setuid, scripts fed by other users) under taint mode: `#!/usr/bin/perl -T`. Untaint only by matching a strict allow-list regex and using the capture: `my ($id) = $in =~ /\A(\d{1,10})\z/ or die "bad id";`.
- Under taint, set a safe environment before any command: `local $ENV{PATH} = '/usr/bin:/bin'; delete @ENV{qw(IFS CDPATH ENV BASH_ENV)};`.
- Always three-arg `open` with a lexical handle: `open my $fh, '<', $path`. Never two-arg `open(FH, $path)`; a filename like `| rm -rf ~` runs a command.
- Run commands with the list form so no shell parses the arguments: `system('git', 'log', '--', $file) == 0 or die "git failed: $?";`.
- Capture output without a shell: `open my $ph, '-|', 'git', 'log', '--', $file or die $!;` or IPC::Run3 / IPC::Open3. Never interpolate input into backticks, `qx//` or one-string `system`.
- Anchor validation regexes with `\A` and `\z` (not `^` and `$`, which allow a trailing newline).
- Never `eval` a string built from input. Use `quotemeta` / `\Q...\E` when input goes into a regex.
- Database code: placeholders with DBI (`$dbh->prepare('SELECT * FROM t WHERE id = ?')`), never interpolated SQL. Set `RaiseError => 1`.

## Never

- Never ship code without `use strict; use warnings` (or a `use v5.36`+ line).
- Never use `$&`, `$'` or `` $` `` in code that must run on perls older than 5.20 (global slowdown).
- Never rely on hash order; sort keys when output order matters.
- Never change the house OO system or error style in a patch that has another purpose.

## Report back

End with: files changed, the minimum perl the code now needs, new CPAN dependencies (with versions) and whether `cpanfile` was updated, the `perlcritic` severity you ran and its result, and anything you did not verify (for example "did not run under -T").

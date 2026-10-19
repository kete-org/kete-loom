# Semgrep and CodeQL for variant analysis

## Semgrep rule skeleton

```yaml
rules:
  - id: unchecked-exec-from-request
    languages: [python]
    severity: ERROR
    message: >
      os.system called with request-derived data (variant of BUG-1234).
    patterns:
      - pattern: os.system($CMD)
      - pattern-not: os.system("...")        # exclude the safe literal case
    metadata:
      root-cause: "user input reaches a shell without sanitisation"
      origin: "BUG-1234"
```

Key building blocks:
- `pattern:` one match; `patterns:` all must hold; `pattern-either:` any.
- `...` matches any sequence (args, statements). `$NAME` is a metavariable; reuse it to force two spots to be the same value.
- `pattern-not:` and `pattern-inside:` / `pattern-not-inside:` scope the match (e.g. only inside a handler, not inside a sanitiser).
- `metavariable-pattern` / `metavariable-regex` constrain a captured value.

Taint mode (does a source reach a sink?):
```yaml
    mode: taint
    pattern-sources:
      - pattern: flask.request.$ANY
    pattern-sanitizers:
      - pattern: shlex.quote(...)
    pattern-sinks:
      - pattern: os.system(...)
```

Run:
```
semgrep --config rule.yaml .                  # one rule
semgrep --config rule.yaml --sarif -o out.sarif .
semgrep --config auto .                       # registry rulesets
```
Iterate: confirm it matches the known instance and not the fixed version before generalising.

## CodeQL — when you need data flow

Use CodeQL when the bug is "untrusted value reaches dangerous sink via these steps" and a syntactic match can't see it.

```ql
import python
import semmle.python.dataflow.new.TaintTracking

from DataFlow::Node source, DataFlow::Node sink
where TaintTracking::localTaint(source, sink)
  and source instanceof RequestInput
  and sink instanceof OsSystemArg
select sink, "request data reaches os.system (variant of BUG-1234)"
```

Run:
```
codeql database create db --language=python --source-root=.
codeql database analyze db rule.ql --format=sarifv2.1.0 -o out.sarif
```

## SARIF triage

SARIF 2.1.0 shape:
```
runs[] -> {
  tool.driver.rules[]        # rule definitions
  results[] -> {
    ruleId, level,           # error | warning | note
    message.text,
    locations[].physicalLocation.{artifactLocation.uri, region.startLine}
  }
}
```
Triage order: group by `ruleId`, sort `level` error→note, read each result's location in context, assign true-variant / false-positive / intended, and record why. Report the triaged list, not the raw file.

## Generalisation discipline

Change one thing, re-run, count true vs false positives. Stop when false positives exceed ~50% of the new hits; revert to the last precise version. A rule bound for CI must stay quiet on correct code.

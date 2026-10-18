# PyPI trusted publishing (GitHub Actions)

Read this when wiring a release workflow. Trusted publishing exchanges a short-lived GitHub OIDC token for a PyPI upload token; nothing long-lived is stored.

## On PyPI

Project settings, Publishing, add a GitHub publisher with: owner, repository, workflow file name (for example `release.yml`) and environment name (for example `pypi`). For a project that does not exist yet, add a pending publisher from your account's Publishing page. Do the same on TestPyPI for rehearsals.

## Workflow

```yaml
name: release
on:
  push:
    tags: ["v*"]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: python -m pip install build twine
      - run: python -m build
      - run: twine check dist/*
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  publish:
    needs: build
    runs-on: ubuntu-latest
    environment: pypi          # must match the publisher on PyPI
    permissions:
      id-token: write          # required for trusted publishing
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      - uses: pypa/gh-action-pypi-publish@release/v1
```

For TestPyPI add `with: repository-url: https://test.pypi.org/legacy/` and a separate environment.

Keep `id-token: write` on the publish job only, and protect the environment with required reviewers and a tag rule. Recent versions of the publish action also generate and upload attestations by default; leave that on.

## Checks before the first real upload

- `name` and `version` in `pyproject.toml` are right; the version matches the tag.
- `readme`, `license` and `classifiers` render: `twine check` passes.
- A fresh `pip install` of the TestPyPI release works (`--extra-index-url https://pypi.org/simple/` so dependencies resolve).

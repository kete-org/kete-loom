---
name: block-secret-reads
description: Stops the agent from printing or copying secrets files into the conversation through shell commands, such as cat .env, git show HEAD:.env or reading SSH keys and cloud credentials, while still letting it load them with source or --env-file.
license: MIT
metadata:
  kete-loom/version: "0.1.1"
  kete-loom/category: security
  kete-loom/risk: read-only
  kete-loom/event: "pre-shell"
  kete-loom/opt-in: "true"
  kete-loom/owner: "Kete-org"
---

# Block secret reads

Runs before every shell command. Once a secret is in the conversation, it is in the model provider's logs and in any transcript. This hook blocks commands that would print or copy these into the conversation:

- `.env` files (but not `.env.example`, `.sample`, `.template` and the like);
- private keys and keystores;
- `.netrc`, `.npmrc`, `.pgpass`, `.pypirc`;
- `~/.aws/credentials`, gcloud credential files, `~/.docker/config.json`, `~/.kube/config`;
- `~/.ssh/` (except `.pub` files).

It also blocks printing secrets that never touch a file:
- secret-named environment variables (`echo $GITHUB_TOKEN`, `printenv AWS_SECRET_ACCESS_KEY`);
- dumps of the whole environment (bare `env`, `printenv`, `export -p`, `set`);
- `kubectl get secret <name> -o yaml|json|jsonpath`;
- `docker inspect` output that includes the container's environment.

Using a secret without printing it, as in `curl -H "Authorization: Bearer $TOKEN"` or `env NODE_ENV=test npm test`, is allowed.

It looks inside pipelines, `&&` chains and `bash -c '…'`, and catches `git show <ref>:.env` and `< .env` redirections.

These stay allowed, because they name a secrets file without showing it, or load it without printing it:

- `ls`, `stat`, `rm`, `git check-ignore`, `git ls-files`;
- `source .env` and `dotenv`/`env-cmd`;
- `docker run --env-file .env`;
- `cp .env.example .env`.

The agent is told to read `.env.example` or the code that loads the settings, or to ask you.

It only sees shell commands. A host's own file-read tool isn't covered, because no host exposes a portable hook before a read; use the host's own deny rules for that (for example a `Read(./.env)` deny in Claude Code). It is a seatbelt: a command built at run time can get past it.

Opt-in: `--hooks` leaves it out; install it with `--hook block-secret-reads`, `--profile security` or `--profile strict`.

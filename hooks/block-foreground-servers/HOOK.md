---
name: block-foreground-servers
description: Stops the agent from starting a dev server or file watcher in the foreground, where it never exits and hangs the agent's shell, and tells it to run it in the background with output going to a log.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: read-only
  kete-loom/event: "pre-shell"
  kete-loom/opt-in: "true"
  kete-loom/owner: "Kete-org"
---

# Block foreground servers

Runs before every shell command. It blocks commands that start a long-running server or watcher and never return:

- `npm|pnpm|yarn|bun run dev|start|serve|watch`, `next dev`, `vite` (not `vite build`), `ng serve`, `webpack serve`, `nodemon`;
- `rails server`, `php artisan serve`, `flask run`, `uvicorn`, `python -m http.server`, `manage.py runserver`;
- `docker compose up` without `-d`, `hugo server`, `jekyll serve`, `tsc --watch`, test runners in `--watch` mode.

They are allowed when they are already backgrounded:

- with a trailing `&` or `nohup`;
- under `setsid`, `tmux`, `screen`, `pm2` or `timeout`;
- by the host's own background option (for example Claude Code's background shell).

When it blocks, the agent is told to start the server in the background with its output in a log file, wait for it to be ready, and stop it when done:

```bash
npm run dev > .dev-server.log 2>&1 &
```

Opt-in: `--hooks` leaves it out; install it by name with `--hook` or with `--profile strict`.

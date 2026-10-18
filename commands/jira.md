---
name: jira
description: Work with Jira from the agent: find, read, create or update issues with JQL and transitions, asking before any change.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/argument-hint: "<what to do in Jira>"
  kete-loom/owner: "Kete-org"
---

Use the `jira-integration` skill if it is available; it covers authentication, JQL, transitions and custom fields. Otherwise use the Jira Cloud REST API or a configured Jira MCP server.

- Reading and searching need no approval: run the JQL, and show results as key, summary, status and assignee.
- Creating issues, commenting, transitioning or editing fields: show exactly what will change and **apply it only after the user agrees**.
- Never put credentials in commands or files; read them from the environment or the MCP server's sign-in.

Request: $ARGUMENTS

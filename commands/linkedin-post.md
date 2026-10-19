---
name: linkedin-post
description: Turn an idea into an approved, copy-ready LinkedIn post in the user's own voice: load the voice profile, get one specific true fact, research and source any claims, offer three hooks, draft, run the prose and format checks, and log it once the user approves. Never publishes.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: writes-files
  kete-loom/argument-hint: "<the idea, or what happened>"
  kete-loom/owner: "Kete-org"
---

Write a LinkedIn post for the idea below with the `linkedin-content` skill, in this order. Stop where a step needs the user.

1. **Voice.** Load the voice profile (`~/.kete-loom/linkedin/voice.md` or the path the user keeps). If there is none, ask for three of the user's posts and propose one; don't draft in an invented voice.
2. **Objective and reader.** Say in one line who the post is for and what they should do or think after it. Check the profile's off-limits list.
3. **The true thing.** Make sure the idea has one specific fact the user owns. If not, ask one batched question. Never fill the gap with an invented number; use `{{your number}}`.
4. **Sources.** For any claim about the world, verify it with the `fact-checking` skill (or `deep-research`), keep the link and its date, or drop the claim.
5. **Hooks.** Three opening lines from different patterns; recommend one.
6. **Draft** on the chosen hook, shaped for the feed.
7. **Check.** Run `ai-prose-cleanup`'s `prose-scan.js` (tier 1 must be zero) and `post-check.js` (zero errors), fix, and report both results.
8. **Approval.** Show the copy-ready block and the readiness summary. Only on an explicit "yes", log it as `approved`. The user publishes it; mark it `published` only when they confirm, with the URL.

If the user's own app publishes through the official API, hand the approved text to the `social-media-publishing` queue with the approver recorded. Never post, schedule or automate LinkedIn from here.

Idea: $ARGUMENTS

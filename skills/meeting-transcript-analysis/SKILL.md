---
name: meeting-transcript-analysis
description: Meeting transcript and call recording analysis that normalises speaker labels, then extracts decisions, action items with owners and due dates, open questions and risks, each tied to a timestamp and a short quote, and on request gives one participant evidence-backed feedback on how they communicated (share of talking time, interruptions, softened hard messages, questions asked). Use when someone has a transcript, captions file or call notes and wants the outcomes and follow-ups pulled out, or wants coaching on their own meeting behaviour.
license: MIT
compatibility: Any Agent Skills host. No tools required; reads pasted transcripts or VTT, SRT and plain-text files the user points to.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Meeting transcript analysis

Turn what was said into what was decided and who does what next, with every item traceable to the moment it was said. Writing a status update from the results belongs to `internal-communications`.

## 0. Before reading

1. **Consent and sensitivity.** Ask whether participants knew the meeting was recorded or transcribed, if that is not clear. If the user says they did not, or the recording was covert, stop: say that recording without consent can be unlawful in some places and that you will not analyse it. If the meeting covers HR, legal, health or personal matters, confirm the user is entitled to analyse it and keep the output to what they need.
2. **Mode.** `outcomes` (decisions and actions, the default), `coaching` (feedback for one named participant, who should be the user or someone who asked for it), or both.
3. **Format.** WebVTT (`.vtt`), SubRip (`.srt`), a meeting tool's export, or plain text. Note whether timestamps and speaker labels exist.

## 1. Normalise the transcript

1. Map speaker labels to names. Automatic labels ("Speaker 1", "Unknown") need the user's help or clues in the text ("Thanks, Priya"). List your mapping and how confident you are; ask about any guess that matters.
2. Merge consecutive lines from the same speaker into turns, keeping the first timestamp of each turn.
3. Note transcription quality: garbled passages, `[inaudible]`, crosstalk. Never infer content from a garbled passage.
4. If there are no timestamps, cite by turn number instead.

## 2. Extract outcomes

Read the whole transcript before extracting. Then list:

- **Decisions**: something the group agreed, not something one person proposed. Look for explicit agreement ("Let's go with B", "Agreed") and for proposals nobody objected to before the topic changed; mark the latter `implicit` and treat as needing confirmation.
- **Action items**: a task, an owner and, if said, a due date. An item with no clear owner is listed as `owner: unassigned`; never assign one yourself. Turn "someone should look at..." into an unassigned item.
- **Open questions**: raised and not resolved.
- **Risks and concerns**: worries raised, with who raised them.
- **Parking lot**: topics deferred to another meeting.

Each item gets a timestamp (or turn number) and a short verbatim quote of 20 words or fewer as evidence. Paraphrase in the item; quote in the evidence.

## 3. Coaching (only when asked)

Analyse only the participant named by the user. Measure, then interpret:

| Signal | How to measure |
|---|---|
| Share of talking time | Their words divided by all words (or turn durations if timestamps allow). Compare with an even split for the number of participants. |
| Interruptions | Turns that start before the previous speaker finished: overlap in timestamps, or a cut-off sentence followed by their turn. |
| Questions asked | Count open questions versus yes/no and leading questions. |
| Hedging on hard messages | Disagreement, bad news or feedback wrapped in qualifiers ("just", "maybe", "sort of", "I might be wrong but") or delayed behind praise. |
| Follow-through | Whether they closed topics with a decision or an owner. |

For each finding give two or three quoted moments with timestamps, why it matters, and one concrete alternative phrasing. Point out what they did well, with the same evidence standard. Never diagnose personality, motives or feelings; describe behaviour only.

## 4. Report

```
Meeting: <title or file>, <date if known>, <duration>, participants: <names>
Speaker mapping: <label → name (confidence)>
Transcript quality: <good | gaps at mm:ss–mm:ss>

Decisions
| # | Decision | Status (explicit / implicit) | When | Evidence |

Action items
| # | Action | Owner | Due | When | Evidence |

Open questions
| # | Question | Raised by | When |

Risks and concerns
| # | Concern | Raised by | When |

Parking lot: <topics>
```

In coaching mode, add:

```
Communication feedback for <name>
Talk share: <x%> (even split would be <y%>)   Interruptions: <n>   Questions: <n open / n closed>
Strengths: <finding, quotes with timestamps>
To work on: <finding, quotes with timestamps, alternative phrasing>
```

## Rules

- Every item must trace to the transcript. If you cannot cite it, it does not go in.
- Never invent owners, dates or decisions; mark gaps instead.
- Do not quote more than needed; keep sensitive remarks out of the report unless they are the decision.
- Do not share one participant's coaching feedback about another participant.

## Stop and ask the user when

- Participants did not consent to recording or transcription.
- Speaker labels are missing and the owner of an action item depends on a guess.
- The user asks for coaching on someone other than themselves without that person's agreement, or wants the analysis used for a performance or disciplinary decision; recommend involving HR and the person concerned.

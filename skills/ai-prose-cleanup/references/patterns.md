# Pattern lists for AI prose cleanup

Read before the first detection pass. Each entry: the pattern, how to spot it, and what to do. Flag by density and context, never by a single word.

## Tier 1: must fix

| Pattern | Examples | Fix |
|---|---|---|
| Assistant framing | "Certainly!", "Great question", "Here is a revised version", "I hope this helps", "Let me know if you'd like" | Delete. |
| Model self-reference | "As an AI language model", "as of my last update", "I don't have access to real-time data" | Delete; if a date matters, state the real date. |
| Placeholders | "[Your Name]", "[insert statistic]", "Lorem ipsum", "XX%" | Fill from the user's material or ask. Never ship. |
| Markup leakage | `**bold**`, `###`, bullet asterisks in an email, SMS or plain-text field | Convert to the destination's format. |
| Vague attribution | "Experts agree", "Research shows", "It is widely believed", "Some argue" | Name the source, cut the claim, or mark `[source needed]`. |
| Fabrication risk | Precise statistics, quotes or citations with no source in the input | Flag to the user; never keep unverified. |

## Tier 2: should fix

### Vocabulary clusters

Common in generated text when they appear together or repeatedly. Prefer the plain or specific alternative.

| Cluster | Plain alternatives |
|---|---|
| delve, dive into, unpack, explore (as filler) | look at, cover, explain, or just start |
| tapestry, landscape, realm, ecosystem, sphere | the actual field: "UK fintech", "the Python packaging tools" |
| leverage, harness, utilize, empower | use, let, help |
| robust, seamless, cutting-edge, game-changing, transformative | say what it does: "handles 10k requests a second" |
| crucial, pivotal, vital, paramount | important, or show why it matters |
| foster, cultivate, navigate (abstract), underscore, showcase | build, handle, show |
| testament to, in the realm of, at the heart of | cut |
| meticulous, intricate, nuanced, multifaceted | detailed, complex, or show the detail |
| elevate, unlock, supercharge, streamline | improve, enable, speed up, simplify, with a number if possible |

### Template moves

| Pattern | Spot it | Fix |
|---|---|---|
| Stock opener | "In today's fast-paced world", "In the ever-evolving landscape of", "Have you ever wondered" | Delete; start with the point. |
| Stock closer | "In conclusion", "Ultimately", "At the end of the day", "The future is bright" | Delete or end on the last real point. |
| False contrast | "It's not just X, it's Y", "This isn't about X. It's about Y." | State Y. |
| Rule of three | Three adjectives or three clauses where one carries the meaning | Keep the one that matters. |
| Hedge stack | "may potentially", "could possibly help to", "it could be argued that" | One hedge at most, only where uncertainty is real. |
| Synonym cycling | "the tool… the platform… the solution… the offering" for one thing | Pick one name and keep it. |
| Empty intensifier | "truly", "incredibly", "absolutely", "deeply" | Delete. |
| Signposting | "It's important to note that", "It's worth mentioning", "Let's break it down" | Delete; say the thing. |
| Question-answer hooks | "So what does this mean? It means…" | State the meaning. |
| Faux balance | "While X has benefits, it also has drawbacks" with neither named | Name them or cut. |

## Tier 3: polish (fix-all only)

- Sentence lengths all within a few words of each other: vary by merging or splitting.
- Every paragraph opens with a topic sentence and closes with a summary line: drop some summaries.
- Em-dashes or colons in most paragraphs: replace some with full stops or commas.
- Bold scattered through running prose: remove unless it is a UI label or warning.
- Headings or bullet lists on short prose: return to paragraphs.
- A closing summary that repeats the body: cut it.
- Emoji used as bullet markers in professional text: remove.

## Genre notes

- Technical docs: repeating the same term is correct; do not "fix" it into synonyms. Numbered steps are fine.
- Academic: hedges such as "suggests" or "is consistent with" are accurate when evidence is limited; keep them.
- Fiction: figurative language is fine when specific; flag only stock images ("a symphony of", "a dance of").
- Translated text: some tells come from translation; coordinate with `prose-translation` rather than rewriting meaning.

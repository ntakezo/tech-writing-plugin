---
name: technical-writing
description: Google's technical writing rules, plus Vale prose linting. Use when writing or editing prose that ships to other engineers - documentation, READMEs, API reference, guides, tutorials, release notes, design docs, doc comments, commit messages, PR descriptions, and user-facing error messages - and when reviewing someone's prose for clarity. Not for marketing copy, fiction, or code that contains no prose.
---

# Technical writing

Apply these rules to prose you write or edit. They come from Google's technical
writing courses; `references/google-technical-writing-guide.md` holds the full
text when you need the reasoning or more examples.

## Workflow

1. Identify the audience and what they already know before drafting.
2. Draft, applying the rules below.
3. Lint it. If the `vale` MCP tools are available, call `check_text` on the draft
   (or `check_file` once it is saved) and fix what it reports. Vale's `Google`
   style package enforces these same rules mechanically, so it catches what you
   miss. Treat `error` and `warning` as must-fix; weigh `suggestion` in context.
4. Re-read the first sentence of each paragraph on its own. If that sequence
   doesn't track, reorganize before polishing wording.

Vale is a linter, not an author. It cannot tell you the document is aimed at the
wrong audience or missing a prerequisite. Do that part yourself.

## Words

- Define or link unfamiliar terms on first use. Don't reinvent an existing explanation.
- Use one term per concept, consistently. Renaming a thing mid-document breaks the reader.
- Spell out an acronym on first use, bold both forms: **Telekinetic Tactile Network** (**TTN**). Only define acronyms that are much shorter than the term *and* recur often. Never alternate between the two forms.
- Replace ambiguous pronouns with the noun. Treat `it`, `they`, `this`, and `that` as suspects: if more than about five words separate pronoun from referent, or a second noun intervenes, repeat the noun.

## Verbs and voice

- Prefer active voice: actor + verb + target. Passive voice hides the actor and inverts the order readers expect.
- Spot passive voice by looking for a form of *be* plus a past participle, with an optional "by the ..." that is often missing entirely.
- Prefer a specific strong verb over a weak one. `occurs`, `happens`, and forms of *be* usually signal a buried verb: "The exception **occurs** when dividing by zero" becomes "Dividing by zero **raises** the exception."
- Write in the present tense. Avoid `will`.

## Sentences

- One idea per sentence. Split a sentence that carries two.
- Cut filler: `the fact that`, `in order to`, `it is important to note that`.
- Convert `that`/`which`/`who` clauses into their own sentences when the sentence is overloaded.
- Reduce subordinate clauses; prefer lists when a sentence enumerates.
- Use `that` before a dependent clause; `which` only for non-essential clauses, preceded by a comma.

## Lists and tables

- Bulleted lists for unordered items; numbered lists for ordered items. If reordering changes the meaning, it must be numbered.
- Keep list items parallel: same part of speech, same tense, same capitalization, consistent punctuation.
- Start numbered-list items with an imperative verb when they are steps.
- Convert an embedded ("run-in") list of three or more items into a real list.
- Tables need informative column headings; keep cells short and content parallel. A table with one column should be a list.
- Introduce every list and table with a sentence that ends in a colon and says what the items are.

## Paragraphs and documents

- Make the first sentence of each paragraph the point of that paragraph.
- One topic per paragraph. Three to five sentences is a good target; a one-sentence paragraph is suspicious, a page-long one is unreadable.
- Answer what, why, and how for the reader.
- Open a document by stating its scope, and its non-goals when they are not obvious. Then state the audience and prerequisites.
- Summarize the key points at the start; readers decide whether to continue from that.
- Write for the audience you defined: match vocabulary, and beware the curse of knowledge - what is obvious to you is the thing they are missing.
- Prefer short, common words and culturally neutral phrasing. Avoid idioms, metaphors drawn from one culture's sports, and humor that depends on context.
- Organize a long document around the reader's task, not your system's architecture. Use headings as a navigable outline; a heading should tell the reader what they will learn.
- When illustrating, caption every figure, keep diagrams to one idea each, and zoom into the part that matters instead of showing the whole schematic.
- For sample code, make it correct, runnable, idiomatic, and short; show a range from simple to complex; comment the non-obvious part, not the obvious one.

## Error messages

Error messages are documentation delivered at the worst moment. For each one:

- Never fail silently.
- Say what happened, what caused it, and how to fix it. Identify the specific invalid input, and quote it back.
- State the requirement or constraint that was violated, with the valid range or format.
- Show how to fix the problem; add a concrete example when the fix has a format.
- Be concise, but not cryptic. `Unsupported.` helps nobody.
- Avoid double negatives.
- Write for whoever reads it: end users get plain language, programmers get the call and the parameter.
- Use the same terminology as the product's documentation and UI.
- Format for readability: put the cause and the fix in separate sentences; use a list for multiple problems.
- Set a neutral tone. Don't blame the user ("You forgot to..."), don't apologize theatrically, and don't be funny.
- Don't swallow the root cause when wrapping an error.

## Reference

`references/google-technical-writing-guide.md` contains the complete courses -
Technical Writing One, Technical Writing Two, and Writing Helpful Error
Messages - with every rule's rationale and worked examples. Read the relevant
section when a rule above is not enough to settle a decision, or when the user
asks why a rule exists.

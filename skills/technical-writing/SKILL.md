---
name: technical-writing
description: Google's technical writing rules, plus Vale prose linting. Use when writing or editing prose that ships to other engineers - documentation, READMEs, API reference, guides, tutorials, release notes, design docs, doc comments, commit messages, PR descriptions, and user-facing error messages - and when reviewing someone's prose for clarity. Not for marketing copy, fiction, or code that contains no prose.
---

# Technical writing

Apply these rules to prose you write or edit. They come from Google's technical
writing courses; `references/google-technical-writing-guide.md` holds the full
text when you need the reasoning or more examples.

## Workflow

Three passes, in order. Each catches what the one before it can't.

### 1. Write to the specification

Identify the audience and what they already know, then draft against the rules
below. They are the Google technical writing courses, condensed.

### 2. Lint

If the `vale` MCP tools are available, call `check_text` on the draft, or
`check_file` once it's saved. Set the project up first if it has no Vale config;
see the next section. Two layers come back:

- **Specification** (`Google`, `TechWriting`, `GlobalEnglish`, `PlainLanguage`,
  `Microcopy`, `A11y`). Treat `error` and `warning` as must-fix and weigh
  `suggestion` in context. These enforce the mechanical half of the rules below
  and a layer this file doesn't list - contractions, pronouns, American
  spelling, punctuation, date and unit formatting, heading capitalization - so
  take their verdict on those rather than arguing with it.
- **AI tells** (`ai-tells`, always `suggestion`). Fingerprints of
  machine-written prose: opening clichés, overused vocabulary, tricolons,
  hedging, "it's worth noting", "not just X, but Y". Judge each one. The package
  is calibrated for general prose, so a hit on genuine technical phrasing is a
  false positive - fix the ones that are real and move on.

### 3. Semantic pass

Vale matches patterns; it cannot judge meaning, and it has no rule for anything
below. Re-read the draft and answer these yourself. This pass is where most of
the value is, because nothing else in the pipeline covers it.

Structure:

1. Does the opening state the scope, and the non-goals when they aren't obvious?
2. Does it name the audience and the prerequisites?
3. Are the key points in the first paragraph, so a reader can stop there?
4. Read only the first sentence of each paragraph, in order. Does that sequence
   tell the story? If not, reorganize before touching wording.
5. Does each paragraph cover one topic?
6. Does each heading say what the reader will learn? "Misc" and "Details" don't.
7. Is the document organized around the reader's task, not the system's
   architecture?

Sentences and lists:

8. Does any sentence carry two ideas? Split it. Vale only measures length, and
   two ideas in fifteen words is still two ideas.
9. Would a sentence with stacked clauses be clearer as a list?
10. Is each list the right kind - numbered when reordering changes the meaning,
    bulleted when it doesn't?
11. Are list items parallel in part of speech, tense, and capitalization?
12. Do steps start with an imperative verb?
13. Does every list and table have a lead-in sentence ending in a colon?
14. Do table column headings say what the column holds?

Words:

15. Is every unfamiliar term defined or linked on first use?
16. Does each concept keep one name throughout? Vale checks a fixed list of
    pairs only, not the names specific to this document.
17. Any idiom, sports metaphor, or joke a non-native reader would miss?

Code and figures:

18. Is the sample code runnable, idiomatic, and short, and does the set range
    from simple to complex?
19. Do comments explain the non-obvious part instead of restating the code?
20. Does each caption say what the figure shows, and does each diagram carry
    one idea?

Error messages:

21. Does the message say what happened and what caused it?
22. Does it quote the invalid input back?
23. Does it state the requirement - the valid range or format?
24. Does it show how to fix the problem, with an example if the fix has a shape?
25. Is it concise without being cryptic?
26. Is the wording right for whoever actually reads it?

Report what you changed in each pass, and say which Vale suggestions you
rejected and why. A suggestion silently ignored looks the same as one missed.

## Set up Vale in a project

Before the first lint in a repository, check whether it has a `.vale.ini`.

If one exists, leave it alone and lint with it. The project already chose a
style, and silently replacing it is not your call. Mention the difference if it
conflicts with the guidance here.

If none exists, write this to `.vale.ini` at the repository root so the project
follows the same style these rules teach. It pulls the specification packages,
`TechWriting` for the course rules none of them covers, and `ai-tells` for
machine-prose fingerprints, downgraded to `suggestion` with the rules that
contradict the courses switched off:

```ini
MinAlertLevel = suggestion

Packages = Google, GlobalEnglish, PlainLanguage, Microcopy, A11y, ai-tells, https://github.com/ntakezo/tech-writing-plugin/releases/latest/download/TechWriting.zip

[*.{md,mdx,txt,rst,adoc,html}]
BasedOnStyles = Vale, Google, GlobalEnglish, PlainLanguage, Microcopy, A11y, TechWriting, ai-tells

ai-tells = suggestion

ai-tells.FormalTransitions = NO
ai-tells.Metacommentary = NO
ai-tells.CataphoricForecasting = NO
ai-tells.EmDashUsage = NO
ai-tells.FormalRegister = NO
ai-tells.FillerIntensifier = NO

PlainLanguage.PassiveVoice = NO
PlainLanguage.NounStack = NO
PlainLanguage.Acronyms = NO
Google.Latin = NO

Vale.Spelling = suggestion
Google.Colons = suggestion

Google.Parens = NO
ai-tells.VerbTricolon = NO

Google.Will = suggestion
Google.We = suggestion

ai-tells.ColonUsage = NO
ai-tells.NounString = NO

[*.{go,ts,tsx,js,jsx,py,rs,java,rb,c,h,cc,cpp,sh}]
BasedOnStyles = Vale, Google, GlobalEnglish, PlainLanguage, TechWriting
Google.Headings = NO
```

The config doesn't set `StylesPath`, which is deliberate. Vale then reads one
directory per machine, and every repository on it shares that directory. Run
`vale ls-dirs` to print its location. A `StylesPath` in the project writes about
ten megabytes into the repository instead, then writes the same ten megabytes
into the next repository you lint.

Then download the styles, which `.vale.ini` only names:

```sh
vale sync
```

The sync writes to the shared directory. The repository gains nothing to commit
and nothing to ignore. Most of the download is Tree-sitter grammars, one for
each language in the code-file glob. Those grammars let Vale lint the comments
in source files.

If `vale` isn't installed, say so and point at `brew install vale` or
<https://vale.sh/docs/install> rather than skipping the lint silently.

One directory contains one set of package versions. A project that pins its own
versions needs `StylesPath` back. Set it to a local directory, add that
directory to `.gitignore` before you sync, and say what you added and why. Git
refuses to re-include a file when a rule excludes its parent directory. To keep
a file inside an ignored directory, open one level at a time.

If the lint comes back dominated by code identifiers that Vale reads as
misspellings, add them to a vocabulary rather than switching spelling off. Name
the vocabulary after the project, because the next project reads the same
directory. For a project named `kafka-ui`, write the terms one per line to
`<StylesPath>/config/vocabularies/kafka-ui/accept.txt`. Then set `Vocab` to
`kafka-ui` below `MinAlertLevel`. Vale reads a vocabulary only when a setting
names it. Each term accepts a regular expression, so `[Kk]afka` covers both
casings. List those two spellings on separate lines instead, and Vale flags each
one where the other belongs.

Tell the reader where you put that vocabulary and what it costs. The file is
outside the repository. A fresh clone reads the project's own nouns as spelling
suggestions until someone writes the file again. Those suggestions are noise at
the lowest level rather than a broken lint.

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

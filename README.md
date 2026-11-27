# tech-writing

An agent skill that applies Google's technical writing rules, with [Vale](https://vale.sh)
for linting. The agent reaches for it when it writes or edits documentation.

Works in **Claude Code**, **Codex**, and **OpenCode**.

## How it works

Three passes over a draft:

1. **Write** to the rules in `skills/technical-writing/SKILL.md`.
2. **Lint** with Vale, through the `vale` MCP server. Two layers: the style
   packages below, and [`ai-tells`](https://github.com/tbhb/vale-ai-tells) for
   the fingerprints of machine-written prose.
3. **Semantic pass**: 26 review questions the agent answers itself, covering
   scope, audience, organization, list and table structure, figures, sample
   code, and error-message content. Vale has no rule for any of them.

## Install

Vale is a separate binary:

```sh
brew install vale          # or https://vale.sh/docs/install
```

Then install the plugin with your harness's own commands. Claude Code and Codex
read the bundled `mcp.json`, so they pick up the Vale server with the plugin.
OpenCode keeps MCP servers in its own config, hence the second command there.

**Claude Code**

```sh
claude plugin marketplace add ntakezo/tech-writing-plugin
claude plugin install tech-writing@tech-writing-plugin
```

**Codex**

```sh
codex plugin marketplace add ntakezo/tech-writing-plugin
codex plugin add tech-writing
```

**OpenCode**

```sh
opencode plugin add github:ntakezo/tech-writing-plugin
opencode mcp add vale -- npx -y vale-mcp@0.3.0
```

The skill sets Vale up on its first lint in a repository that has no
`.vale.ini`: it writes one configured for these styles and runs `vale sync`. To
do that by hand instead:

```sh
cp vale/.vale.ini /path/to/your/project/ && cd /path/to/your/project && vale sync
```

To work on a local clone, point the harness at the directory: Claude Code takes
`--plugin-dir`, and Codex takes a local marketplace root with
`codex plugin marketplace add ./path`.

## Vale styles

| Package | Covers |
| --- | --- |
| `Google` | the style guide itself, maintained by the Vale project |
| `GlobalEnglish` | bare pronouns, idioms, noun stacks |
| `PlainLanguage` | double negatives, hidden verbs, sentence length, and paragraph length |
| `Microcopy` | error-message tone: blame, vagueness, harshness |
| `A11y` | alt text, heading order, table headers |
| `TechWriting` | the seven course rules no other package covers |
| `ai-tells` | AI prose fingerprints, advisory only |

Google publishes no Vale configuration of its own, so `Google` is the Vale
project's implementation of the published guide.

`ai-tells` targets technical documentation as well, but on a few points it
encodes a stricter house style than the Google guide: it bans the em dash
outright, flags "For example" among its connectives, and flags the `**Note:**`
callout. So `vale/.vale.ini` runs it at `suggestion` and switches off the rules
that would contradict the courses, with each reason recorded there.
`write-good` and `proselint` are left off because they roughly double the alert
count; add them per project for a wider net.

### Measurement

`scripts/corpus-measure.sh` runs the config over four unrelated house styles,
each pinned to a late-2022 commit so the prose predates widespread
LLM-assisted writing: the Kubernetes website, Django, the Rust Book, and MDN.
About 137,000 words.

On that corpus the config reports **68 alerts per 1,000 words, of which 7.7 are
errors or warnings**. Read the must-fix tier first: it is the mechanical layer,
and on this corpus it is almost entirely the Google word list, sentence-case
headings, Latin abbreviations, and punctuation.

The suggestion tier is large because none of these projects follows the Google
guide. Its bulk is passive voice, sentence length, contractions, "will", and
"we", and spot-checking says those findings are correct: the number measures
how far a house style sits from Google's, not how noisy the linter is. Tuning
removed what was actually wrong, not what was merely numerous: three pairs of
rules reporting the same finding twice, one rule that flagged every
parenthetical, one that read any three verbs as a rhetorical tricolon, and
spelling, which without a project vocabulary flags code identifiers.

`TechWriting` is the only style written for this plugin. Vale installs styles
from a URL, so it ships as `TechWriting.zip` on the releases page, and
`Packages` in `.vale.ini` points at that URL. `npm run build:style` rebuilds
the zip from `vale/packages/TechWriting/`.

The lint layer covers 21 of the skill's 43 rules. `docs/vale-coverage.md`
has the matrix of which, and what the semantic pass is left to catch.

## Layout

| Path | |
| --- | --- |
| `skills/technical-writing/SKILL.md` | the rules, and the trigger that loads them |
| `skills/technical-writing/references/` | the three Google courses in full |
| `vale/.vale.ini` | the Vale config the skill installs into a project |
| `vale/packages/TechWriting/` | source for the `TechWriting` Vale style |
| `mcp.json` | the `vale-mcp` server that Claude Code and Codex both read |
| `src/opencode.ts` | OpenCode plugin that registers the skill |
| `scripts/vale-coverage.mjs` | regenerates `docs/vale-coverage.md` |
| `scripts/corpus-measure.sh` | measures the config against third-party docs |

## Development

```sh
npm run build                            # the OpenCode plugin
npm run build:style                      # TechWriting.zip for a release
vale test vale/packages/TechWriting      # the custom rules' own tests
node scripts/vale-coverage.mjs --write   # regenerate the coverage matrix
scripts/corpus-measure.sh                # measure against third-party docs
```

## Licensing

Plugin code is MIT (`LICENSE`). The Google course text under
`skills/technical-writing/references/` is Google's, under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) rather than MIT; each
file carries its own source link. The Vale style packages and
[`vale-mcp`](https://github.com/ChrisChinchilla/Vale-MCP) are MIT, used
unmodified.

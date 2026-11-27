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

### Claude Code

The repository is its own plugin marketplace:

```sh
claude plugin marketplace add ntakezo/tech-writing-plugin
claude plugin install tech-writing@tech-writing-plugin
```

To work on a local clone instead, use `claude --plugin-dir /path/to/tech-writing-plugin`.

### Codex and OpenCode

Run the installer from the project you want to write docs in:

```sh
git clone https://github.com/ntakezo/tech-writing-plugin
cd tech-writing-plugin && npm install && npm run build
node dist/install.js --dir /path/to/your/project
```

It writes `.vale.ini`, runs `vale sync`, and wires up the hosts you name
(`claude`, `codex`, `opencode`, or all by default). Safe to re-run; it merges
into existing config.

To wire a host by hand:

- **Codex**: list the plugin in `<project>/.agents/plugins/marketplace.json`
  with `"source": {"source": "local", "path": "./tech-writing-plugin"}`, then
  set `[plugins."tech-writing@local"] enabled = true` in
  `<project>/.codex/config.toml`. The plugin must sit inside the marketplace
  root, because `source.path` has to be `./`-prefixed.
- **OpenCode**: add the plugin directory to `plugins` and
  `{"vale": {"type": "local", "command": ["npx", "-y", "vale-mcp@0.3.0"]}}` to
  `mcp.servers` in `opencode.json`.

For every project rather than one, put those entries in
`~/.config/opencode/opencode.json`, or for Codex copy
`skills/technical-writing` into `~/.agents/skills/` and add `[mcp_servers.vale]`
to `~/.codex/config.toml`. Vale's own config stays per-project, since
`.vale.ini` is how a project declares the style it follows.

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
| `src/install.ts` | the installer |
| `scripts/vale-coverage.mjs` | regenerates `docs/vale-coverage.md` |
| `scripts/corpus-measure.sh` | measures the config against third-party docs |

## Development

```sh
npm run build                            # TypeScript
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

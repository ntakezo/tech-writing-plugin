# tech-writing

An agent skill that carries Google's technical writing rules, paired with
[Vale](https://vale.sh) for mechanical prose linting. The agent reaches for it
when it writes or edits documentation.

Works in **Claude Code**, **Codex**, and **OpenCode**.

## What's in it

| Part | What it does |
| --- | --- |
| `skills/technical-writing/SKILL.md` | The rules the agent applies, and the trigger that makes it load them |
| `skills/technical-writing/references/google-technical-writing-guide.md` | All three Google courses in full, for when a rule needs its rationale |
| `mcp.json` | Wires [`vale-mcp`](https://github.com/ChrisChinchilla/Vale-MCP) so the agent can lint its own drafts |
| `vale/.vale.ini` | Vale config, pulling the `Google` and `TechWriting` styles |
| `vale/packages/TechWriting/` | The seven Vale rules no published package covers; released as a zip |
| `src/opencode.ts` | OpenCode plugin that registers the skill |
| `src/install.ts` | `tech-writing-setup`, which wires the plugin into a project |
| `scripts/vale-coverage.mjs` | Regenerates `docs/vale-coverage.md` by running Vale over a violation of every rule |

The skill teaches the rules; Vale enforces what can be enforced. Most of that
is already published, so the config pulls it rather than reimplementing it:

| Package | Covers |
| --- | --- |
| `Google` | the style guide itself, maintained by the Vale project |
| `GlobalEnglish` | bare pronouns, idioms, noun stacks |
| `PlainLanguage` | double negatives, hidden verbs, sentence and paragraph length, simple words |
| `Microcopy` | error-message tone: blame, vagueness, harshness |
| `A11y` | alt text, heading order, table headers |
| `TechWriting` | the seven course rules none of the above covers |

Google publishes no Vale configuration of its own: `google/styleguide` has no
`.vale.ini` and no styles directory, and `developers.google.com/style` never
mentions Vale. The `Google` package is the Vale project's implementation of the
published guide.

`TechWriting` ships with this plugin as a release asset and is deliberately
small. Each rule exists because measurement showed no package covers it, and
each records that reason in the file - for instance `GlobalEnglish.BarePronoun`
exempts a bare `It` before any verb but `is`/`was`, which is exactly the
course's own example ("It has an almost cult-like following"), so
`TechWriting.BarePronounVerb` covers only that remainder. Every rule carries
Vale `tests` cases; run them with `vale test vale/packages/TechWriting`.

Together these enforce roughly **19 of the skill's 43 rules**.
`docs/vale-coverage.md` has the matrix and `node scripts/vale-coverage.mjs
--write` regenerates it. `write-good` and `proselint` are left off by default
because they roughly double the alert count; add them per project for a wider
net.

## Setup

Vale is a separate binary. Install it first:

```sh
brew install vale          # or see https://vale.sh/docs/install
```

For Claude Code, that's all the setup there is - see below. For Codex and
OpenCode, run the installer from the project you want to write docs in:

```sh
git clone https://github.com/ntakezo/tech-writing-plugin
cd tech-writing-plugin && npm install && npm run build
node dist/install.js --dir /path/to/your/project
```

That writes a `.vale.ini`, runs `vale sync` to download the style package, and
wires up whichever hosts you name (`claude`, `codex`, `opencode`, or all of
them by default). It merges into existing config files and is safe to re-run.

## Per-host install

Each host has its own format; the package ships all three side by side. The
Vale server is declared once, in the portable `mcp.json`: Codex reads that file
natively, and the Claude Code manifest points at it with `"mcpServers":
"./mcp.json"` rather than duplicating it as `.mcp.json`.

### Claude Code

The repository is its own plugin marketplace, so install it in two commands:

```sh
claude plugin marketplace add ntakezo/tech-writing-plugin
claude plugin install tech-writing@tech-writing-plugin
```

`.claude-plugin/plugin.json` is the manifest and `skills/` is picked up from the
standard layout. To hack on a local clone instead, skip the install and run
`claude --plugin-dir /path/to/tech-writing-plugin`.

### Codex

Codex reads a plugin from a marketplace catalog. The plugin has to sit inside
the marketplace root, because `source.path` must be a `./`-prefixed relative
path:

```jsonc
// <project>/.agents/plugins/marketplace.json
{
  "name": "local",
  "plugins": [
    { "name": "tech-writing", "source": { "source": "local", "path": "./tech-writing-plugin" } }
  ]
}
```

```toml
# <project>/.codex/config.toml
[plugins."tech-writing@local"]
enabled = true
```

`plugin.json` is the portable [Agent Plugins](https://agent-plugins.org) 1.0.0
manifest, which Codex reads directly.

### OpenCode

OpenCode loads the TypeScript plugin and the Vale server from config:

```jsonc
// opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/path/to/tech-writing-plugin"],
  "mcp": {
    "servers": {
      "vale": { "type": "local", "command": ["npx", "-y", "vale-mcp@0.3.0"] }
    }
  }
}
```

OpenCode discovers skills from its own directories, so `src/opencode.ts`
registers this package's skill through `ctx.skill.transform` rather than asking
you to copy files around.

## Install globally

To make the skill available in every project instead of one:

- **Claude Code** — keep using `--plugin-dir`, or add the directory to a
  marketplace and install it to your user scope.
- **Codex** — skip the plugin and drop the skill straight into the user skills
  directory, which Codex scans on every session:
  ```sh
  cp -R skills/technical-writing ~/.agents/skills/technical-writing
  ```
  Then add Vale to `~/.codex/config.toml`:
  ```toml
  [mcp_servers.vale]
  command = "npx"
  args = ["-y", "vale-mcp@0.3.0"]
  ```
- **OpenCode** — put the same `plugins` and `mcp.servers` entries shown above in
  `~/.config/opencode/opencode.json`.

Vale's own config stays per-project, since `.vale.ini` is how a project declares
which style it follows.

## Licensing

Plugin code is MIT (see `LICENSE`). The Google course text under
`skills/technical-writing/references/` is Google's work under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), not MIT. `NOTICE`
lists that and the other third-party content.

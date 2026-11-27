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
| `vale/packages/TechWriting/` | Custom Vale rules for what `Google` leaves unchecked; published as a release asset |
| `src/opencode.ts` | OpenCode plugin that registers the skill |
| `src/install.ts` | `tech-writing-setup`, which wires the plugin into a project |
| `scripts/vale-coverage.mjs` | Regenerates `docs/vale-coverage.md` by running Vale over a violation of every rule |

The skill teaches the rules; Vale enforces what can be enforced. Two styles do
that: `Google`, the official Vale implementation of the style guide, and
`TechWriting`, which ships with this plugin and adds eleven rules from the
courses that `Google` doesn't check - vague pronouns, weak verbs, filler,
sentence length, missing alt text, term consistency, and error-message tone.

Together they mechanically enforce **20 of the skill's 43 rules**, measured by
running Vale over a minimal violation of each. `docs/vale-coverage.md` has the
full matrix and `node scripts/vale-coverage.mjs --write` regenerates it. Every
`TechWriting` rule was tuned against the courses themselves - 28,681 words of
Google's own prose - so that it stays quiet on text that follows the guidance.

Both implement the same Google style guide, so they agree where they meet. The
skill also sets Vale up: on its first lint in a repository without a
`.vale.ini`, it writes one configured for the `Google` package and runs
`vale sync`, leaving an existing config alone.

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

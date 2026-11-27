#!/usr/bin/env node
import { execFile } from "node:child_process"
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { promisify } from "node:util"
import { PLUGIN_ROOT, VALE_CONFIG } from "./skill.js"

const run = promisify(execFile)
const HOSTS = ["claude", "codex", "opencode"] as const
type Host = (typeof HOSTS)[number]

const log = (msg: string) => console.log(msg)
const VALE_SERVER = { command: "npx", args: ["-y", "vale-mcp@0.3.0"] }

async function readJson<T>(path: string, fallback: T): Promise<T> {
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(await readFile(path, "utf8")) as T
  } catch {
    throw new Error(`${path} is not valid JSON; fix or move it, then re-run`)
  }
}

async function writeJson(path: string, value: unknown) {
  await mkdir(join(path, ".."), { recursive: true })
  await writeFile(path, JSON.stringify(value, null, 2) + "\n")
  log(`  wrote ${path}`)
}

/** Installs the Vale config and style package into the target project. */
async function setupVale(dir: string) {
  log("Vale")
  const config = join(dir, ".vale.ini")
  if (existsSync(config)) {
    log("  .vale.ini exists, leaving it alone")
  } else {
    await copyFile(VALE_CONFIG, config)
    log("  wrote .vale.ini (BasedOnStyles = Vale, Google)")
  }
  const hasVale = await run("vale", ["--version"]).then(() => true, () => false)
  if (!hasVale) {
    log("  vale not installed, so styles aren't downloaded yet.")
    log("  install it (brew install vale, or https://vale.sh/docs/install),")
    log("  then run: vale sync")
    return
  }
  try {
    await run("vale", ["sync"], { cwd: dir })
    log("  vale sync: style packages downloaded")
  } catch (err) {
    log(`  vale sync failed, run it yourself: ${(err as Error).message.split("\n")[0]}`)
  }
}

/** Claude Code loads this directory as a plugin; nothing to write. */
function setupClaude(dir: string) {
  log("Claude Code")
  log("  this package is already a Claude Code plugin (.claude-plugin/plugin.json)")
  log("  load it with:")
  log(`    claude --plugin-dir ${PLUGIN_ROOT}`)
  log("  or add it to a marketplace to install it permanently.")
  void dir
}

/** Codex reads a repo marketplace, then enables the plugin per project. */
async function setupCodex(dir: string) {
  log("Codex")
  // Codex resolves source.path relative to the marketplace root (dir) and the
  // path must be ./-prefixed, so the plugin has to live inside the project.
  const rel = relative(dir, PLUGIN_ROOT)
  if (rel.startsWith("..") || rel === "") {
    log(`  the plugin lives outside ${dir}, and Codex needs a ./-prefixed path`)
    log("  inside the marketplace root. Copy it in, then re-run:")
    log(`    cp -R ${PLUGIN_ROOT} ./plugins/tech-writing`)
    log("  or register it globally; see 'Install globally' in the plugin README.")
    return
  }
  const path = `./${rel}`
  const marketplacePath = join(dir, ".agents", "plugins", "marketplace.json")
  type Entry = { name: string; source: { source: string; path: string } }
  const marketplace = await readJson<{ name: string; plugins: Entry[] }>(marketplacePath, {
    name: "local",
    plugins: [],
  })
  marketplace.plugins = [
    ...marketplace.plugins.filter((p) => p.name !== "tech-writing"),
    { name: "tech-writing", source: { source: "local", path } },
  ]
  await writeJson(marketplacePath, marketplace)

  const configPath = join(dir, ".codex", "config.toml")
  const key = `[plugins."tech-writing@${marketplace.name}"]`
  const existing = existsSync(configPath) ? await readFile(configPath, "utf8") : ""
  if (existing.includes(key)) {
    log(`  ${key} already set in .codex/config.toml`)
  } else {
    await mkdir(join(configPath, ".."), { recursive: true })
    const block = `${existing.trimEnd()}\n\n${key}\nenabled = true\n`.trimStart()
    await writeFile(configPath, block)
    log(`  enabled ${key} in .codex/config.toml`)
  }
}

/** OpenCode loads the TypeScript plugin and the Vale MCP server from config. */
async function setupOpencode(dir: string) {
  log("OpenCode")
  const configPath = join(dir, "opencode.json")
  type Config = {
    $schema?: string
    plugins?: unknown[]
    mcp?: { servers?: Record<string, unknown> }
    [key: string]: unknown
  }
  const config = await readJson<Config>(configPath, {
    $schema: "https://opencode.ai/config.json",
  })
  const plugins = (config.plugins ?? []).filter(
    (p) => typeof p !== "string" || !p.includes("tech-writing"),
  )
  config.plugins = [...plugins, PLUGIN_ROOT]
  // OpenCode nests servers under mcp.servers; a server connects unless disabled.
  config.mcp = {
    ...config.mcp,
    servers: {
      ...config.mcp?.servers,
      vale: { type: "local", command: [VALE_SERVER.command, ...VALE_SERVER.args] },
    },
  }
  await writeJson(configPath, config)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes("--help") || args.includes("-h")) {
    log("Usage: tech-writing-setup [claude|codex|opencode|all] [--dir <path>]")
    return
  }
  const dirFlag = args.indexOf("--dir")
  const dir = resolve(dirFlag === -1 ? process.cwd() : args[dirFlag + 1] ?? ".")
  const requested = args.filter((a) => (HOSTS as readonly string[]).includes(a)) as Host[]
  const hosts = requested.length ? requested : [...HOSTS]

  log(`Setting up tech-writing in ${dir}\n`)
  await setupVale(dir)
  for (const host of hosts) {
    log("")
    if (host === "claude") setupClaude(dir)
    if (host === "codex") await setupCodex(dir)
    if (host === "opencode") await setupOpencode(dir)
  }
  log("\nDone. Start a new session so the host picks up the skill.")
}

main().catch((err: unknown) => {
  console.error(`tech-writing-setup: ${(err as Error).message}`)
  process.exit(1)
})

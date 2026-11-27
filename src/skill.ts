import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
export const SKILL_PATH = join(PLUGIN_ROOT, "skills", "technical-writing", "SKILL.md")

export interface Skill {
  name: string
  description: string
  body: string
}

/** Reads SKILL.md and splits its YAML frontmatter from the instructions. */
export async function loadSkill(path = SKILL_PATH): Promise<Skill> {
  const raw = await readFile(path, "utf8")
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!match) throw new Error(`${path} has no YAML frontmatter`)
  const [, frontmatter, body] = match
  const field = (key: string) => {
    const hit = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(frontmatter)
    return hit?.[1].trim().replace(/^['"]|['"]$/g, "") ?? ""
  }
  const name = field("name")
  const description = field("description")
  if (!name || !description) throw new Error(`${path} needs both name and description`)
  return { name, description, body: body.trim() }
}

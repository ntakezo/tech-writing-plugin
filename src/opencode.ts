import { Plugin, Skill } from "@opencode/plugin"
import { loadSkill, SKILL_PATH } from "./skill.js"

/**
 * OpenCode server plugin. OpenCode discovers skills from its own directories,
 * so the plugin registers this package's skill in place instead of asking the
 * user to copy files. Vale is wired separately as an MCP server; see README.
 */
export default Plugin.define({
  id: "tech-writing",
  async setup(ctx) {
    const skill = await loadSkill()
    await ctx.skill.transform((editor) => {
      editor.add({
        id: Skill.ID.make("technical-writing"),
        name: Skill.Name.make(skill.name),
        description: skill.description,
        path: Skill.Info.fields.path.make(SKILL_PATH),
        content: skill.body,
      })
    })
  },
})

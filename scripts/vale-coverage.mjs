#!/usr/bin/env node
// Measures which rules in SKILL.md the Vale Google package actually enforces,
// by running Vale over a minimal violation of each. Regenerates
// docs/vale-coverage.md. Requires vale on PATH.
//
//   node scripts/vale-coverage.mjs [--write]

import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync, copyFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

// [section, directive, violating sample, checks that would actually address it]
const CASES = [
  ["Words", "Define new or unfamiliar terms on first use", "The TTN root forwards the request.\n", ["Google.Acronyms"]],
  ["Words", "Use one term per concept, consistently", "Move backward through the list.\n\nThen move backwards again.\n", ["TechWriting.TermConsistency"]],
  ["Words", "Spell out an acronym on first use, bold both forms", "The OGS holds all servable items.\n", ["Google.Acronyms"]],
  ["Words", "Replace ambiguous pronouns (it/they)", "Python is interpreted, while C++ is compiled. It has a cult-like following.\n", ["TechWriting.BarePronounVerb"]],
  ["Words", "Replace ambiguous pronouns (this/that)", "The process generates a user ID. This lets users authenticate.\n", ["GlobalEnglish.BarePronoun"]],
  ["Verbs", "Prefer active voice", "The configuration file is read by the server.\n", ["Google.Passive"]],
  ["Verbs", "Prefer a strong verb over a weak one (occurs)", "The exception occurs when dividing by zero.\n", ["TechWriting.WeakVerbs"]],
  ["Verbs", "Prefer a strong verb over a weak one (happens)", "This error message happens when the cache expires.\n", ["TechWriting.WeakVerbs"]],
  ["Verbs", "Write in the present tense; avoid will", "The server will read the configuration file.\n", ["Google.Will"]],
  ["Sentences", "One idea per sentence", "The server reads the file and the client caches the response while the proxy rewrites the header and the logger records the duration.\n", []],
  ["Sentences", "Keep sentences short (length is only a proxy for one idea)", "To get started with the Frambus app you must first find the app at a suitable store, pay for it with a valid credit card or an equivalent form of electronic payment, and then download and install it onto your device before opening it.\n", ["Microsoft.SentenceLength", "PlainLanguage.SentenceLength"]],
  ["Sentences", "Cut filler: the fact that", "Note the fact that the cache expires.\n", ["ai-tells.FillerPhrases", "PlainLanguage.Wordy"]],
  ["Sentences", "Cut filler: in order to", "Use the API in order to fetch data.\n", ["Google.WordListCase"]],
  ["Sentences", "Cut filler: it is important to note that", "It's important to note that the cache expires.\n", ["TechWriting.Padding", "ai-tells.HedgingPhrases"]],
  ["Sentences", "Cut filler: utilize", "You can utilize the cache.\n", ["PlainLanguage.SimpleWords"]],
  ["Sentences", "Split overloaded that/which clauses", "The server, which reads the file that the installer wrote when the operator provisioned the cluster, caches the response.\n", []],
  ["Sentences", "Use that for dependent, which for non-essential", "The file which is invalid blocks the upload.\n", []],
  ["Lists", "Numbered list for ordered items", "Reconfigure the server:\n\n- Stop the server.\n- Edit the file.\n- Restart the server.\n", []],
  ["Lists", "Keep list items parallel", "The API supports:\n\n- Creating llamas\n- Alpaca analysis\n- To delete vicunas\n", []],
  ["Lists", "Start step items with an imperative verb", "Steps:\n\n1. Stopping the server.\n2. The configuration file.\n", []],
  ["Lists", "Convert an embedded run-in list into a real list", "The API lets callers create llamas, analyze alpacas, delete vicunas, and track dromedaries.\n", []],
  ["Lists", "Tables need informative column headings", "| A | B |\n| --- | --- |\n| 1 | 2 |\n", []],
  ["Lists", "Introduce every list with a sentence and a colon", "The server supports these modes\n\n- Fast\n- Slow\n", []],
  ["Paragraphs", "First sentence of a paragraph is its point", "Some preamble. The server caches responses, the single most important fact here.\n", []],
  ["Paragraphs", "One topic per paragraph", "The server caches responses. The cafeteria serves lunch at noon. The cache uses an LRU policy.\n", []],
  ["Paragraphs", "State the document scope", "# Guide\n\nThe server caches responses.\n", []],
  ["Paragraphs", "State the audience and prerequisites", "# Guide\n\nRun the carambola command to start.\n", []],
  ["Paragraphs", "Summarize key points at the start", "# Guide\n\nFirst, unrelated project history from 1998 onward.\n", []],
  ["Paragraphs", "Avoid idioms and culturally specific metaphors", "Get the ball rolling and hit this one out of the park.\n", []],
  ["Paragraphs", "Prefer short, common words", "Employ the aforementioned heretofore unmentioned methodology.\n", ["PlainLanguage.SimpleWords", "PlainLanguage.Legalese"]],
  ["Paragraphs", "Headings say what the reader will learn", "## Misc\n\nThe server caches responses.\n", []],
  ["Paragraphs", "Caption every figure", "![](diagram.png)\n", ["A11y.AltEmpty", "A11y.AltMissing"]],
  ["Paragraphs", "Comment the non-obvious part of sample code", "Create a stream:\n\n```\n/* Create a stream from the file. */\nmystream = br.openstream(pathname=\"/tmp/f\", mode=\"z\")\n```\n", []],
  ["Errors", "Say what happened, the cause, and the fix", "Error: operation failed.\n", ["TechWriting.VagueError", "Microcopy.Vague"]],
  ["Errors", "Identify and quote the invalid input", "The age you entered isn't valid.\n", []],
  ["Errors", "State the requirement or constraint violated", "That file is too big.\n", []],
  ["Errors", "Show how to fix the problem", "The SiteID is invalid.\n", []],
  ["Errors", "Be concise but not cryptic", "Unsupported.\n", []],
  ["Errors", "Avoid double negatives", "Don't fail to unset the flag; the result is not uncommon.\n", ["PlainLanguage.DoubleNegatives", "TechWriting.DoubleNegative"]],
  ["Errors", "Write for the target audience", "The age 32.6 is a floating-point number instead of an integer.\n", []],
  ["Errors", "Do not blame the user", "You forgot to open the stream.\n", ["Microcopy.Blame"]],
  ["Errors", "Do not apologize theatrically or joke", "Oops, something went wrong on the end here.\n", ["Microcopy.Vague"]],
  ["Errors", "Do not swallow the root cause", "Internal error.\n", ["TechWriting.VagueError", "Microcopy.Vague"]],
]

// [Google rule, violating sample, does SKILL.md state this rule?]
const RULES = [
  ["Acronyms", "The TTN root forwards the request.\n", true],
  ["Passive", "The file is read by the server.\n", true],
  ["Will", "The server will read the file.\n", true],
  ["WordListCase", "Use the API in order to fetch data.\n", true],
  ["WordList", "Enable authN for the endpoint.\n", "partly"],
  ["Jargon", "The feature works out-of-the-box.\n", "partly"],
  ["Slang", "TL;DR the server caches responses.\n", "partly"],
  ["Exclamation", "The server caches responses!\n", "partly"],
  ["AMPM", "The meeting starts at 3PM.\n", false],
  ["Anthropomorphism", "The server sees the request.\n", false],
  ["Colons", "Important: Restart the server now.\n", false],
  ["Contractions", "Do not restart the server.\n", false],
  ["DateFormat", "The release shipped on 31/07/2016.\n", false],
  ["Ellipses", "The server caches responses...\n", false],
  ["EmDash", "The server \u2014 fast \u2014 caches responses.\n", false],
  ["ExcessiveClaims", "This is the fastest database available.\n", false],
  ["FirstPerson", "I recommend restarting the server.\n", false],
  ["Gender", "Ask whether he/she approved it.\n", false],
  ["GenderBias", "The anchorman approved the design.\n", false],
  ["Headings", "## Setting Up The Server\n\nText.\n", false],
  ["HeadingPunctuation", "## Setting up the server.\n\nText.\n", false],
  ["Latin", "Use a cache, e.g. Redis.\n", false],
  ["LyHyphens", "Restart the newly-created server.\n", false],
  ["OptionalPlurals", "Enter the value(s) in the field.\n", false],
  ["Ordinal", "Complete the 2nd step first.\n", false],
  ["OxfordComma", "The API creates llamas, alpacas and vicunas.\n", false],
  ["Parens", "The server (fast) caches responses (quickly).\n", false],
  ["Periods", "The U.S.A. server caches responses.\n", false],
  ["Quotes", "The operator said \"restart it\".\n", false],
  ["Ranges", "The cache holds between 5-10 entries.\n", false],
  ["Semicolons", "The server caches; the client reads.\n", false],
  ["Spacing", "The server caches.  The client reads.\n", false],
  ["Spelling", "Choose the colour of the label.\n", false],
  ["Timeless", "The new dashboard is currently available.\n", false],
  ["Units", "Upload a 5GB file.\n", false],
  ["We", "We recommend restarting the server.\n", false],
]

const dir = mkdtempSync(join(tmpdir(), "vale-cov-"))
copyFileSync(join(ROOT, "vale", ".vale.ini"), join(dir, ".vale.ini"))
try {
  execFileSync("vale", ["sync"], { cwd: dir, stdio: "pipe" })
} catch (err) {
  console.error("vale sync failed; is vale installed?", err.message)
  process.exit(1)
}

const lint = (sample) => {
  const file = join(dir, "sample.md")
  writeFileSync(file, sample)
  let out = ""
  try {
    out = execFileSync("vale", ["--output=JSON", file], { cwd: dir, encoding: "utf8" })
  } catch (err) {
    out = err.stdout ?? "{}" // vale exits non-zero when it finds alerts
  }
  const parsed = JSON.parse(out || "{}")
  return [...new Set(Object.values(parsed).flat().map((a) => a.Check))].sort()
}

const ruleResults = RULES.map(([rule, sample, inSkill]) => ({
  rule,
  inSkill,
  fires: lint(sample).includes(`Google.${rule}`),
}))

const results = CASES.map(([section, directive, sample, relevant]) => {
  const fired = lint(sample)
  const hit = fired.filter((c) => relevant.includes(c))
  return { section, directive, fired, enforced: hit.length > 0, by: hit, incidental: fired.filter((c) => !relevant.includes(c)) }
})
rmSync(dir, { recursive: true, force: true })

const enforced = results.filter((r) => r.enforced)
const lines = [
  "# What Vale enforces, and what it doesn't",
  "",
  `Generated by \`node scripts/vale-coverage.mjs\` against Vale ${execFileSync("vale", ["--version"], { encoding: "utf8" }).trim().split(" ").pop()} and the current \`Google\` package.`,
  "Each row runs a minimal violation of one rule from `SKILL.md` through Vale and",
  "records what fired. Incidental alerts are hits on something other than the rule",
  "under test, so they don't count as enforcement.",
  "",
  `**${enforced.length} of ${results.length}** rules in the skill are mechanically enforced by Vale.`,
  "",
  "| Rule in SKILL.md | Enforced by Vale | Incidental alerts |",
  "| --- | --- | --- |",
  ...results.map((r) => `| ${r.section}: ${r.directive} | ${r.enforced ? "**" + r.by.join(", ") + "**" : "no"} | ${r.incidental.join(", ") || "-"} |`),
  "",
  "## The other direction",
  "",
  "Every rule in the `Google` package, and whether `SKILL.md` states it. A rule",
  "that doesn't fire here means the sample failed to trigger it, not that the rule",
  "is absent - fix the sample.",
  "",
  `**${ruleResults.filter((r) => r.inSkill === false).length} of ${ruleResults.length}** Google rules cover ground the skill never mentions.`,
  `All ${ruleResults.filter((r) => r.fires).length} of ${ruleResults.length} fire on their sample.`,
  "",
  "| Google rule | Stated in SKILL.md | Fires |",
  "| --- | --- | --- |",
  ...ruleResults.map((r) => `| Google.${r.rule} | ${r.inSkill === true ? "yes" : r.inSkill === "partly" ? "partly" : "**no**"} | ${r.fires ? "yes" : "NO - FIX SAMPLE"} |`),
  "",
]
const md = lines.join("\n")
if (process.argv.includes("--write")) {
  writeFileSync(join(ROOT, "docs", "vale-coverage.md"), md)
  console.log("wrote docs/vale-coverage.md")
} else {
  console.log(md)
}

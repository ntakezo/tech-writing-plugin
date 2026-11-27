#!/usr/bin/env bash
# Measures the shipped Vale config against third-party technical documentation.
#
# The corpus is four unrelated house styles, each pinned to a late-2022 commit
# so the prose predates widespread LLM-assisted writing. That matters because
# one layer of the config detects AI tells: measuring it against text that may
# itself be machine-written would tell us nothing.
#
#   Kubernetes website   CC BY 4.0
#   Django               BSD-3-Clause
#   The Rust Book        MIT/Apache-2.0
#   MDN Web Docs         CC BY-SA 2.5
#
# Usage: scripts/corpus-measure.sh [workdir]   (default: a temp directory)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${1:-$(mktemp -d)}"
mkdir -p "$WORK/docs"
echo "corpus: $WORK"

fetch () { # repo sha prefix label ext max
  local repo=$1 sha=$2 prefix=$3 label=$4 ext=$5 max=$6
  mkdir -p "$WORK/docs/$label"
  [ -n "$(ls -A "$WORK/docs/$label" 2>/dev/null)" ] && { echo "  $label: cached"; return; }
  gh api "repos/$repo/git/trees/$sha?recursive=1" --jq ".tree[] | select(.type==\"blob\") | .path" \
    | grep "^$prefix" | grep "\\$ext\$" | head -"$max" | while read -r p; do
        curl -sL -o "$WORK/docs/$label/$(echo "$p" | tr '/' '_')" \
          "https://raw.githubusercontent.com/$repo/$sha/$p"
      done
  echo "  $label: $(ls "$WORK/docs/$label" | wc -l | tr -d ' ') files"
}

fetch kubernetes/website 3c21786c content/en/docs/concepts           k8s      .md  30
fetch django/django      c8eb9a7c docs/topics                        django   .txt 20
fetch rust-lang/book     2bd5d42c src                                rustbook .md  25
fetch mdn/content        f260ab0d files/en-us/web/accessibility      mdn      .md  25
# Django ships reStructuredText; Vale needs the extension to skip code blocks.
for f in "$WORK/docs/django"/*.txt; do [ -e "$f" ] && mv "$f" "${f%.txt}.rst"; done

( cd "$ROOT" && npm run build:style --silent )
cp "$ROOT/TechWriting.zip" "$WORK/"
sed 's|https://github.com/ntakezo/tech-writing-plugin/releases/latest/download/TechWriting.zip|./TechWriting.zip|' \
  "$ROOT/vale/.vale.ini" > "$WORK/.vale.ini"
( cd "$WORK" && vale sync >/dev/null && vale --no-exit --output=JSON docs/*/* ) | python3 -c '
import json, sys
from collections import Counter
d = json.load(sys.stdin)
al = [a for v in d.values() for a in v]
sev = Counter(a["Severity"] for a in al)
import glob, os
words = sum(len(open(f, errors="ignore").read().split())
            for f in glob.glob(os.path.join(sys.argv[1], "docs", "*", "*")))
mf = sev["error"] + sev["warning"]
print(f"\n  {words} words, {len(al)} alerts ({len(al)/words*1000:.1f} per 1k)")
print(f"  must-fix (error+warning): {mf} ({mf/words*1000:.1f} per 1k)")
print(f"  by severity: {dict(sev)}")
print("\n  top rules:")
for k, n in Counter(a["Check"] for a in al).most_common(12):
    print(f"   {n:>5} ({n/words*1000:>5.2f}/1k)  {k}")
' "$WORK"

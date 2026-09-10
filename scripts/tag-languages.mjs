#!/usr/bin/env node
/*
 * 글에 쓰인 코드 언어를 태그로 달아준다.  node scripts/tag-languages.mjs [--dry]
 *
 * 태그는 분류를 "가로지르는" 것에 써야 값이 생긴다. 분류가 어떤 문제인지를
 * 말한다면, 언어 태그는 무엇으로 풀었는지를 말한다. 둘은 겹치지 않는다.
 *
 * 볼트를 고친다. 저장소를 고쳐봐야 다음 동기화에 덮어써진다.
 * 이미 달린 태그는 건드리지 않고 없는 것만 더한다.
 */

import { readFileSync, writeFileSync } from "node:fs"
import { basename, extname, join, relative, sep } from "node:path"
import { readdirSync } from "node:fs"
import { VAULT_BLOG_DIR } from "./lib/config.mjs"
import { parseFrontmatter, stringifyFrontmatter, slugify } from "./lib/markdown.mjs"

const DRY = process.argv.includes("--dry")

const NAMES = {
  cpp: "C++", "c++": "C++", cc: "C++", cxx: "C++",
  c: "C", py: "Python", python: "Python",
  js: "JavaScript", javascript: "JavaScript",
  ts: "TypeScript", typescript: "TypeScript",
  java: "Java", kt: "Kotlin", go: "Go", rs: "Rust",
}

function walk(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "assets") continue
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full))
    else if (extname(e.name).toLowerCase() === ".md") out.push(full)
  }
  return out
}

/** frontmatter 키 순서를 사람이 읽기 좋게 고정한다 */
const ORDER = ["publish", "title", "description", "tags", "date"]
const ordered = (data) => {
  const out = {}
  for (const k of ORDER) if (k in data) out[k] = data[k]
  for (const k of Object.keys(data)) if (!(k in out)) out[k] = data[k]
  return out
}

const report = { tagged: [], skipped: [], already: [] }

for (const file of walk(VAULT_BLOG_DIR)) {
  const { data, body } = parseFrontmatter(readFileSync(file, "utf8"))
  const rel = relative(VAULT_BLOG_DIR, file)

  const langs = [
    ...new Set(
      [...body.matchAll(/^[ \t]*(?:`{3,}|~{3,})([A-Za-z+#]+)/gm)]
        .map((m) => NAMES[m[1].toLowerCase()])
        .filter(Boolean),
    ),
  ]
  if (!langs.length) {
    report.skipped.push(`${rel} — 코드 블록이 없다`)
    continue
  }

  /*
   * 그 글이 이미 그 이름의 분류에 들어 있으면 태그로 또 달지 않는다.
   * JavaScript 분류의 글에 #JavaScript 를 붙이면 같은 말을 두 번 하는 것이고,
   * 그건 애초에 폴더 태그를 걷어낸 이유와 똑같은 문제다.
   */
  const folders = rel.split(sep).slice(0, -1).map(slugify)
  const useful = langs.filter((l) => !folders.includes(slugify(l)))
  if (!useful.length) {
    report.skipped.push(`${rel} — ${langs.join(", ")} 은 이미 분류 이름이다`)
    continue
  }

  const existing = Array.isArray(data.tags) ? data.tags.map(String) : []
  const merged = [...new Set([...existing, ...useful])]
  if (merged.length === existing.length) {
    report.already.push(rel)
    continue
  }

  if (!DRY) {
    writeFileSync(file, stringifyFrontmatter(ordered({ ...data, tags: merged }), body), "utf8")
  }
  report.tagged.push(`${rel} → ${useful.join(", ")}`)
}

console.log(`언어 태그 달기${DRY ? " (미리보기)" : ""}`)
console.log(`  태그 추가 ${report.tagged.length}개 · 이미 있음 ${report.already.length}개 · 건너뜀 ${report.skipped.length}개\n`)
for (const t of report.tagged) console.log(`    ${t}`)
if (report.skipped.length) {
  console.log(`\n  건너뜀:`)
  for (const s of report.skipped) console.log(`    · ${s}`)
}

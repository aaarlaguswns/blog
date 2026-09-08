#!/usr/bin/env node
/*
 * 저장소의 글을 옵시디언 볼트로 내보낸다. 볼트를 원본으로 삼기 위한 1회성 이사다.
 *
 *   node scripts/export-to-vault.mjs [--dry] [--force]
 *
 * 왜 필요한가
 *   Quartz 에서 옮겨온 글들은 저장소에만 있어서 옵시디언에서 고칠 수가 없다.
 *   이 스크립트로 볼트에 옮겨두면 그 뒤로는 옵시디언 하나로 전부 관리된다.
 *
 * 주소가 바뀌지 않게 하는 것이 핵심이다.
 *   volt 의 폴더·파일 이름은 다시 슬러그로 눌렸을 때 지금 주소와 같아야 한다.
 *   그래서 폴더 이름은 category-labels.json 의 보기 좋은 이름을 쓰되,
 *   슬러그가 어긋나면 그 자리에서 멈춘다 (조용히 주소를 깨뜨리지 않는다).
 *
 * 이미 볼트에 같은 이름의 노트가 있으면 건드리지 않는다 (--force 로 덮어쓰기).
 */

import {
  readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync,
} from "node:fs"
import { join, dirname } from "node:path"
import { BLOG_ROOT, POSTS_DIR, VAULT_BLOG_DIR } from "./lib/config.mjs"
import {
  parseFrontmatter, stringifyFrontmatter, slugify,
} from "./lib/markdown.mjs"

const args = new Set(process.argv.slice(2))
const DRY = args.has("--dry")
const FORCE = args.has("--force")

const LABELS = JSON.parse(
  readFileSync(join(BLOG_ROOT, "category-labels.json"), "utf8"),
)

/** 폴더 경로 → 볼트에서 쓸 사람이 읽는 이름 */
function labelFor(path) {
  if (LABELS[path]) return LABELS[path]
  const last = path.split("/").at(-1) ?? path
  return last
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
}

/** 글이 사는 폴더들을 재귀로 찾는다 (index.md 가 있는 폴더) */
function findPosts(base = POSTS_DIR, prefix = "") {
  if (!existsSync(base)) return []
  const out = []
  for (const e of readdirSync(base, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === "assets") continue
    const id = prefix ? `${prefix}/${e.name}` : e.name
    if (existsSync(join(base, e.name, "index.md"))) out.push(id)
    out.push(...findPosts(join(base, e.name), id))
  }
  return out
}

const posts = findPosts()
const report = { written: [], skipped: [], assets: 0, errors: [] }

for (const id of posts) {
  const segments = id.split("/")
  const name = segments.pop()
  const dir = join(POSTS_DIR, id)
  const { data, body } = parseFrontmatter(readFileSync(join(dir, "index.md"), "utf8"))

  /*
   * 이미 볼트가 원본인 글은 되돌려 보내지 않는다.
   * 그러면 슬러그로 눌린 이름(readme-여기에-...)으로 노트가 하나 더 생겨서
   * 원본과 나란히 놓이고, 다음 동기화 때 서로를 덮어쓴다.
   */
  if (data.source === "obsidian") {
    report.skipped.push(`${id} — 이미 볼트에서 온 글이다`)
    continue
  }

  // 볼트에서 쓸 폴더·파일 이름
  const vaultSegments = segments.map((_, i) =>
    labelFor(segments.slice(0, i + 1).join("/")),
  )

  /*
   * 되돌려 눌렀을 때 지금 주소와 같아야 한다.
   * 다르면 링크가 조용히 깨지므로 옮기지 않고 알린다.
   */
  const roundTrip = [...vaultSegments.map(slugify), slugify(name)].join("/")
  if (roundTrip !== id) {
    report.errors.push(
      `${id} — 볼트 이름(${[...vaultSegments, name].join("/")})이 ` +
        `다시 슬러그로 눌리면 ${roundTrip} 가 되어 주소가 바뀐다`,
    )
    continue
  }

  const vaultDir = join(VAULT_BLOG_DIR, ...vaultSegments)
  const vaultFile = join(vaultDir, `${name}.md`)

  if (existsSync(vaultFile) && !FORCE) {
    report.skipped.push(`${id} — 볼트에 이미 있다`)
    continue
  }

  /*
   * publish: true 를 넣어야 사이트에 남는다.
   * 이 글들은 이미 공개돼 있으므로, 안 넣으면 내보내는 순간 전부 내려간다.
   */
  const out = {
    publish: true,
    title: data.title,
    description: data.description,
    date: data.date,
  }
  if (data.tags?.length) out.tags = data.tags

  if (!DRY) {
    mkdirSync(vaultDir, { recursive: true })
    writeFileSync(vaultFile, stringifyFrontmatter(out, body), "utf8")

    // 첨부는 노트 옆 assets/ 로. 본문의 ./assets/x.png 가 그대로 맞아떨어진다.
    const assetDir = join(dir, "assets")
    if (existsSync(assetDir)) {
      for (const f of readdirSync(assetDir)) {
        const dest = join(vaultDir, "assets", f)
        mkdirSync(dirname(dest), { recursive: true })
        if (!existsSync(dest) || FORCE) copyFileSync(join(assetDir, f), dest)
        report.assets++
      }
    }
  }
  report.written.push(`${[...vaultSegments, name].join("/")}.md`)
}

console.log(`저장소 → 옵시디언 볼트 내보내기${DRY ? " (미리보기)" : ""}`)
console.log(`  볼트: ${VAULT_BLOG_DIR}`)
console.log(`  내보낸 글 ${report.written.length}개, 첨부 ${report.assets}개\n`)
for (const w of report.written) console.log(`    ${w}`)
if (report.skipped.length) {
  console.log(`\n  건너뜀 ${report.skipped.length}개:`)
  for (const s of report.skipped) console.log(`    · ${s}`)
}
if (report.errors.length) {
  console.log(`\n  옮기지 못함 ${report.errors.length}개:`)
  for (const e of report.errors) console.log(`    ✗ ${e}`)
}
process.exitCode = report.errors.length ? 1 : 0

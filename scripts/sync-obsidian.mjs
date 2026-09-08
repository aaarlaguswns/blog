#!/usr/bin/env node
/*
 * 옵시디언 볼트의 Blog/ 폴더를 Astro 콘텐츠로 동기화한다.
 *
 *   node scripts/sync-obsidian.mjs          사람이 읽는 요약 출력
 *   node scripts/sync-obsidian.mjs --json   watch.sh 가 읽는 기계용 출력
 *   node scripts/sync-obsidian.mjs --dry    쓰지 않고 무엇이 바뀔지만 보여줌
 *
 * 규칙
 *  · 볼트의 Blog/ 폴더 밖은 읽지 않는다.
 *  · frontmatter 에 `publish: true` 가 없으면 draft 로 넘어간다 → 사이트에 안 뜬다.
 *  · 내용이 실제로 달라졌을 때만 파일을 쓴다 (쓸데없는 커밋·재빌드 방지).
 *  · 볼트에서 사라진 글은 지우되, 볼트에서 온 글(source: obsidian)만 지운다.
 */

import {
  readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, statSync, existsSync,
} from "node:fs"
import { readdir } from "node:fs/promises"
import { basename, dirname, extname, join, relative, sep } from "node:path"
import {
  POSTS_DIR,
  VAULT_BLOG_DIR,
  SOURCE_KEY,
  SOURCE_OBSIDIAN,
} from "./lib/config.mjs"
import {
  parseFrontmatter,
  stringifyFrontmatter,
  convertBody,
  normalizeFrontmatter,
  stripLeadingH1,
  stripLedeParagraph,
  slugify,
} from "./lib/markdown.mjs"

const args = new Set(process.argv.slice(2))
const DRY = args.has("--dry")
const JSON_OUT = args.has("--json")

const IMAGE_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg",
])

/* ── 파일 훑기 ───────────────────────────────────────────────────────── */

async function walk(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (err) {
    if (err.code === "ENOENT") return []
    throw err
  }
  const out = []
  for (const e of entries) {
    if (e.name.startsWith(".")) continue
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(full)))
    else out.push(full)
  }
  return out
}

/* ── 동기화 ──────────────────────────────────────────────────────────── */

async function main() {
  const files = await walk(VAULT_BLOG_DIR)
  const notes = files.filter((f) => extname(f).toLowerCase() === ".md")
  const attachments = files.filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()))

  // 첨부 인덱스: 파일명 → 실제 경로. 같은 이름이 여럿이면 먼저 찾은 것을 쓴다.
  const assetIndex = new Map()
  for (const a of attachments) {
    const name = basename(a)
    if (!assetIndex.has(name)) assetIndex.set(name, a)
  }

  // 링크 인덱스: 노트 이름 → 사이트 경로. 위키링크 해석에 쓴다.
  const linkIndex = new Map()
  for (const n of notes) {
    const name = basename(n, ".md")
    const cat = relative(VAULT_BLOG_DIR, dirname(n))
      .split(sep).filter(Boolean).map(slugify).filter(Boolean).join("/")
    const nameSlug = slugify(name)
    if (!nameSlug) continue
    linkIndex.set(name, `/blog/${cat ? `${cat}/${nameSlug}` : nameSlug}`)
  }

  const report = {
    created: [], updated: [], unchanged: [], removed: [],
    drafts: [], warnings: [], errors: [],
  }

  const seen = new Set()

  for (const note of notes) {
    const noteName = basename(note, ".md")
    /*
     * 볼트 안의 폴더 구조를 그대로 카테고리로 쓴다.
     *   Blog/알고리즘/DP/배낭.md → src/content/blog/알고리즘/dp/배낭/index.md
     * 옵시디언에서 폴더를 만들면 사이트에도 분류가 생긴다.
     */
    const categoryPath = relative(VAULT_BLOG_DIR, dirname(note))
      .split(sep)
      .filter(Boolean)
      .map(slugify)
      .filter(Boolean)
      .join("/")
    const nameSlug = slugify(noteName)
    const slug = categoryPath ? `${categoryPath}/${nameSlug}` : nameSlug
    if (!nameSlug) {
      report.errors.push(`슬러그를 만들 수 없는 파일명: ${basename(note)}`)
      continue
    }
    seen.add(slug)

    const outDir = join(POSTS_DIR, slug)
    const outFile = join(outDir, "index.md")
    const previous = readIfExists(outFile)

    try {
      const raw = readFileSync(note, "utf8")
      const { data: fm, body: rawBody } = parseFrontmatter(raw)

      const usedAssets = new Map() // 원본경로 → 글 폴더 안 상대경로
      const converted = convertBody(rawBody, {
        resolveLink: (name) => linkIndex.get(name) ?? null,
        resolveAsset: (name) => {
          const src = assetIndex.get(name) ?? assetIndex.get(basename(name))
          if (!src) return null
          usedAssets.set(src, `./assets/${basename(src)}`)
          return `./assets/${basename(src)}`
        },
      })

      const body = stripLeadingH1(converted.body)

      // 날짜가 원본에 없으면, 이미 발행된 글의 날짜를 유지한다.
      // 그러지 않으면 저장할 때마다 날짜가 바뀌어 매번 커밋이 생긴다.
      const priorDate = previous
        ? parseFrontmatter(previous).data.date
        : null
      const fallbackDate = priorDate
        ? new Date(priorDate)
        : statSync(note).mtime

      const norm = normalizeFrontmatter(fm, body, {
        title: noteName,
        date: fallbackDate,
      })

      // 안전장치: publish: true 를 명시하지 않으면 초안이다.
      const published = fm.publish === true
      const data = { ...norm.data, [SOURCE_KEY]: SOURCE_OBSIDIAN }
      if (!published) {
        data.draft = true
        report.drafts.push(slug)
      } else {
        delete data.draft
      }

      // 요약을 첫 문단에서 가져왔으면 그 문단은 본문에서 뺀다.
      // 첫 문단을 본문에 남기고 싶으면 노트에 description 을 직접 써두면 된다.
      const finalBody = norm.warnings.includes("description 이 없어 본문 첫 문단에서 뽑음")
        ? stripLedeParagraph(body, data.description)
        : body

      const next = stringifyFrontmatter(data, finalBody)

      for (const w of [...converted.warnings, ...norm.warnings]) {
        report.warnings.push(`${slug}: ${w}`)
      }

      if (previous === next) {
        report.unchanged.push(slug)
      } else if (DRY) {
        ;(previous ? report.updated : report.created).push(slug)
      } else {
        mkdirSync(outDir, { recursive: true })
        writeFileSync(outFile, next, "utf8")
        ;(previous ? report.updated : report.created).push(slug)
      }

      if (!DRY) {
        for (const [src, rel] of usedAssets) {
          const dest = join(outDir, rel.replace(/^\.\//, ""))
          mkdirSync(dirname(dest), { recursive: true })
          if (!sameFile(src, dest)) copyFileSync(src, dest)
        }
      }
    } catch (err) {
      report.errors.push(`${slug}: ${err.message}`)
    }
  }

  // 볼트에서 사라진 글 치우기 — 출처가 옵시디언인 것만.
  for (const dir of await listPostDirs()) {
    if (seen.has(dir)) continue
    const file = join(POSTS_DIR, dir, "index.md")
    const content = readIfExists(file)
    if (!content) continue
    const { data } = parseFrontmatter(content)
    if (data[SOURCE_KEY] !== SOURCE_OBSIDIAN) continue
    report.removed.push(dir)
    if (!DRY) rmSync(join(POSTS_DIR, dir), { recursive: true, force: true })
  }

  print(report)
  process.exitCode = report.errors.length ? 1 : 0
}

/* ── 보조 ────────────────────────────────────────────────────────────── */

function readIfExists(path) {
  try {
    return readFileSync(path, "utf8")
  } catch {
    return null
  }
}

function sameFile(a, b) {
  try {
    const sa = statSync(a)
    const sb = statSync(b)
    return sa.size === sb.size && sa.mtimeMs <= sb.mtimeMs
  } catch {
    return false
  }
}

/** 글이 중첩 폴더에 살기 때문에 index.md 를 찾아 재귀로 훑는다. */
async function listPostDirs(base = POSTS_DIR, prefix = "") {
  let entries
  try {
    entries = await readdir(base, { withFileTypes: true })
  } catch {
    return []
  }
  const out = []
  for (const e of entries) {
    if (!e.isDirectory() || e.name === "assets") continue
    const id = prefix ? `${prefix}/${e.name}` : e.name
    if (existsSync(join(base, e.name, "index.md"))) out.push(id)
    out.push(...(await listPostDirs(join(base, e.name), id)))
  }
  return out
}

function print(r) {
  if (JSON_OUT) {
    const changed = r.created.length + r.updated.length + r.removed.length
    console.log(JSON.stringify({ ...r, changed }))
    return
  }
  const line = (label, list) =>
    list.length ? `  ${label} ${list.length}: ${list.join(", ")}` : null

  console.log(`옵시디언 → 블로그 동기화${DRY ? " (미리보기)" : ""}`)
  console.log(`  볼트: ${VAULT_BLOG_DIR}`)
  for (const l of [
    line("새 글", r.created),
    line("바뀐 글", r.updated),
    line("그대로", r.unchanged),
    line("지운 글", r.removed),
    line("초안(publish: true 없음)", r.drafts),
  ]) if (l) console.log(l)

  if (r.warnings.length) {
    console.log("  경고:")
    for (const w of r.warnings) console.log(`   · ${w}`)
  }
  if (r.errors.length) {
    console.log("  오류:")
    for (const e of r.errors) console.log(`   ✗ ${e}`)
  }
  if (!r.created.length && !r.updated.length && !r.removed.length) {
    console.log("  바뀐 것 없음")
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

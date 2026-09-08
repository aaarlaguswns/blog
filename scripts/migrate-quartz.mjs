#!/usr/bin/env node
/*
 * Quartz(v4) 글을 Astro 콘텐츠로 옮긴다. 한 번만 돌리면 되는 스크립트지만,
 * 결과를 다시 확인하거나 규칙을 고쳐 다시 돌릴 수 있게 저장소에 남겨둔다.
 *
 *   node scripts/migrate-quartz.mjs --ref quartz-archive [--dry]
 *
 * 원본은 git 안에 있는 그대로 읽는다 (체크아웃하지 않는다).
 *
 * 옮기는 규칙
 *  · content/<A>/<B>/이름.md  →  src/content/blog/<a>/<b>/<이름>/index.md
 *    폴더 구조가 그대로 주소가 된다: /blog/algorithm/binary-search/1920
 *  · 폴더 이름을 태그로 중복해 달지 않는다 (주소가 이미 분류를 보여준다)
 *  · 제목은 본문 첫 H1. 숫자로 시작하면(문제 번호) 앞에 폴더명을 붙인다: "1-1" → "NYPC 1-1"
 *  · 날짜는 그 파일의 git 최초 커밋 시각
 *  · 본문이 빈 파일과 index.md 는 건너뛴다 (index 는 새 홈화면이 대신한다)
 *  · 옛 주소가 죽지 않게 public/_redirects 를 만든다
 */

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { basename, join } from "node:path"
import { BLOG_ROOT, POSTS_DIR } from "./lib/config.mjs"
import {
  parseFrontmatter, stringifyFrontmatter, convertBody,
  normalizeFrontmatter, stripLeadingH1, stripLedeParagraph, slugify,
} from "./lib/markdown.mjs"

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback
}
const REF = flag("ref", "quartz-archive")
const DRY = args.includes("--dry")

const git = (...a) =>
  execFileSync("git", a, { cwd: BLOG_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })

const gitBinary = (...a) =>
  execFileSync("git", a, { cwd: BLOG_ROOT, maxBuffer: 64 * 1024 * 1024 })

/* ── 원본 목록 ───────────────────────────────────────────────────────── */

let tree
try {
  tree = git("ls-tree", "-r", "--name-only", REF).split("\n").filter(Boolean)
} catch {
  console.error(`✗ '${REF}' 를 읽을 수 없다. 브랜치 이름을 확인할 것.`)
  process.exit(1)
}

const mdFiles = tree.filter(
  (f) => f.startsWith("content/") && f.toLowerCase().endsWith(".md"),
)
const assetFiles = tree.filter(
  (f) => f.startsWith("content/") && /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(f),
)

// 첨부는 파일명으로만 찾는다. 원본 본문이 ./asset/8.png (단수) 를 가리키는데
// 실제 폴더는 content/assets/ (복수) 라 경로로는 절대 못 찾는다.
const assetByName = new Map()
for (const a of assetFiles) {
  const n = basename(a)
  if (!assetByName.has(n)) assetByName.set(n, a)
}

/* ── 경로 → 제목·주소 ───────────────────────────────────────────────── */

const isProblemCode = (s) => /^\d/.test(s.trim())

function planFor(path) {
  const rel = path.slice("content/".length)
  const segments = rel.split("/")
  const file = segments.pop()
  const name = file.replace(/\.md$/i, "")
  const parent = segments.at(-1) ?? ""

  /*
   * 폴더 구조를 주소에 그대로 살린다.
   *   Algorithm/Binary Search/1920.md → algorithm/binary-search/1920
   * 이렇게 두면 /blog/algorithm 같은 상위 주소가 카테고리 목록이 되고,
   * 경로 전체가 유일하므로 이름이 겹쳐도(1-1 이 SCPC 와 NYPC 양쪽에 있다) 안 부딪힌다.
   */
  const categoryPath = segments.map(slugify).filter(Boolean).join("/")
  const nameSlug = slugify(name)
  const slug = categoryPath ? `${categoryPath}/${nameSlug}` : nameSlug

  return { rel, segments, name, parent, slug, categoryPath }
}

/*
 * SCPC·NYPC·Algorithm 글들은 본문이 제목 한 줄과 코드 블록뿐이라
 * 요약으로 뽑아낼 문장이 없다. 그렇다고 제목을 요약 자리에 그대로 넣으면
 * 목록에서 같은 문장이 두 번 나온다. 최소한 무슨 언어인지는 알려준다.
 */
const LANGUAGE_NAMES = {
  cpp: "C++", "c++": "C++", cc: "C++", cxx: "C++",
  c: "C", py: "Python", python: "Python",
  js: "JavaScript", javascript: "JavaScript",
  ts: "TypeScript", typescript: "TypeScript",
  java: "Java", kt: "Kotlin", go: "Go", rs: "Rust",
}

function codeOnlyDescription(body) {
  const lang = body.match(/^[ \t]*(?:`{3,}|~{3,})([A-Za-z+#]+)/m)?.[1]
  if (!lang) return null
  const name = LANGUAGE_NAMES[lang.toLowerCase()]
  return name ? `${name} 코드` : null
}

function makeTitle(h1, name, parent) {
  const base = (h1 ?? "").trim() || name
  // "1-1", "15649", "9663 - N-Queen" 처럼 번호로 시작하면 그것만으로는
  // 목록에서 무엇인지 알 수 없다. 폴더 이름을 앞에 붙여 맥락을 준다.
  if (parent && isProblemCode(base)) return `${parent} ${base}`
  return base
}

/** 그 파일이 처음 커밋된 시각 */
function firstCommitDate(path) {
  try {
    const out = git("log", "--format=%aI", "--diff-filter=A", "--follow", REF, "--", path)
      .trim().split("\n").filter(Boolean)
    const iso = out.at(-1)
    if (iso) return new Date(iso)
  } catch {
    /* 아래 fallback */
  }
  try {
    const iso = git("log", "-1", "--format=%aI", REF, "--", path).trim()
    if (iso) return new Date(iso)
  } catch {
    /* 무시 */
  }
  return new Date()
}

/* ── 옮기기 ──────────────────────────────────────────────────────────── */

const plans = new Map() // slug → plan
const skipped = []

for (const path of mdFiles) {
  const plan = planFor(path)
  if (plan.rel.toLowerCase() === "index.md") {
    skipped.push(`${plan.rel} — 새 홈화면이 대신한다`)
    continue
  }
  const raw = git("show", `${REF}:${path}`)
  if (!raw.trim()) {
    skipped.push(`${plan.rel} — 내용이 비어 있다`)
    continue
  }
  if (plans.has(plan.slug)) {
    skipped.push(`${plan.rel} — 슬러그 충돌(${plan.slug}), 건너뜀`)
    continue
  }
  plans.set(plan.slug, { ...plan, path, raw })
}

// 위키링크가 가리킬 수 있는 대상 목록 (문서 이름 → 새 주소)
const linkIndex = new Map()
for (const [slug, p] of plans) {
  linkIndex.set(p.name, `/blog/${slug}`)
}

const results = []
const allWarnings = []
const redirects = []
const usedAssetPaths = new Set()

for (const [slug, p] of plans) {
  const { data: fm, body: rawBody } = parseFrontmatter(p.raw)

  const usedAssets = new Map()
  const converted = convertBody(rawBody, {
    resolveLink: (n) => linkIndex.get(n) ?? null,
    resolveAsset: (n) => {
      const src = assetByName.get(basename(n))
      if (!src) return null
      usedAssets.set(src, `./assets/${basename(src)}`)
      return `./assets/${basename(src)}`
    },
  })

  const h1 = rawBody.match(/^#\s+(.+)$/m)?.[1]
  const body = stripLeadingH1(converted.body)
  const title = makeTitle(h1, p.name, p.parent)

  const norm = normalizeFrontmatter(
    { ...fm, title },
    body,
    { title, date: firstCommitDate(p.path) },
  )
  const data = { ...norm.data }
  /*
   * 폴더 이름을 태그로도 달지 않는다.
   * 주소와 목록이 이미 폴더 구조를 보여주므로, 같은 정보를 태그로 또 붙이면
   * "Back Tracking" 섹션 안의 글마다 #Back Tracking 이 찍혀 눈만 어지럽다.
   * 태그는 폴더로 안 묶이는 주제(회고, DP 처럼)를 위해 비워둔다.
   */

  const warnings = [...converted.warnings, ...norm.warnings]

  // 요약을 첫 문단에서 가져왔으면 그 문단은 본문에서 뺀다 (같은 문장 두 번 방지)
  const lede = "description 이 없어 본문 첫 문단에서 뽑음"
  const finalBody = warnings.includes(lede)
    ? stripLedeParagraph(body, data.description)
    : body

  // 요약이 제목과 같아졌으면(뽑을 문장이 없었으면) 코드 언어로라도 채운다
  if (data.description === title) {
    const fromCode = codeOnlyDescription(body)
    if (fromCode) {
      data.description = fromCode
      warnings.splice(warnings.indexOf("description 을 제목으로 대체함"), 1)
    }
  }

  for (const w of warnings) allWarnings.push(`${slug}: ${w}`)

  // 옛 Quartz 주소: 경로의 공백을 - 로 바꾼 것 (대소문자는 그대로)
  redirects.push([
    "/" + p.rel.replace(/\.md$/i, "").split("/").map((s) => s.replace(/ /g, "-")).join("/"),
    `/blog/${slug}`,
  ])

  for (const src of usedAssets.keys()) usedAssetPaths.add(src)
  results.push({ slug, title, category: p.segments.join(" / "), assets: usedAssets.size, date: data.date })

  if (DRY) continue

  const dir = join(POSTS_DIR, slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "index.md"), stringifyFrontmatter(data, finalBody), "utf8")

  for (const [src, rel] of usedAssets) {
    const dest = join(dir, rel.replace(/^\.\//, ""))
    mkdirSync(join(dir, "assets"), { recursive: true })
    writeFileSync(dest, gitBinary("show", `${REF}:${src}`))
  }
}

/* ── 리다이렉트 ──────────────────────────────────────────────────────── */

if (!DRY) {
  const lines = [
    "# Quartz 시절 주소를 새 주소로 넘긴다. scripts/migrate-quartz.mjs 가 생성.",
    "/index / 301",
    ...redirects.map(([from, to]) => `${from} ${to} 301`),
  ]
  mkdirSync(join(BLOG_ROOT, "public"), { recursive: true })
  writeFileSync(join(BLOG_ROOT, "public", "_redirects"), lines.join("\n") + "\n", "utf8")
}

/* ── 보고 ────────────────────────────────────────────────────────────── */

console.log(`Quartz → Astro 마이그레이션${DRY ? " (미리보기)" : ""}  ref=${REF}`)
console.log(`  원본 마크다운 ${mdFiles.length}개, 첨부 ${assetFiles.length}개`)
console.log(`  옮긴 글 ${results.length}개\n`)

const byTag = new Map()
for (const r of results) {
  const key = r.category || "(분류 없음)"
  byTag.set(key, [...(byTag.get(key) ?? []), r])
}
for (const [tag, rs] of [...byTag].sort()) {
  console.log(`  ${tag}`)
  for (const r of rs) {
    const img = r.assets ? `  이미지 ${r.assets}` : ""
    console.log(`    ${r.slug.padEnd(28)} ${String(r.date).slice(0, 10)}  ${r.title}${img}`)
  }
}

if (skipped.length) {
  console.log(`\n  건너뛴 것 ${skipped.length}개:`)
  for (const s of skipped) console.log(`    · ${s}`)
}

const unusedAssets = assetFiles.filter((a) => !usedAssetPaths.has(a))
if (unusedAssets.length) {
  console.log(`\n  어느 글에서도 쓰이지 않는 첨부 ${unusedAssets.length}개:`)
  console.log(`    ${unusedAssets.map((a) => basename(a)).join(", ")}`)
}

if (allWarnings.length) {
  // 같은 종류의 경고가 35번 찍히면 아무도 안 읽는다. 종류별로 묶어서 보여준다.
  const grouped = new Map()
  for (const w of allWarnings) {
    const [slug, ...restParts] = w.split(": ")
    const message = restParts.join(": ")
    grouped.set(message, [...(grouped.get(message) ?? []), slug])
  }
  console.log(`\n  확인이 필요한 것 ${allWarnings.length}건 (${grouped.size}종류):`)
  for (const [message, slugs] of [...grouped].sort((a, b) => b[1].length - a[1].length)) {
    const uniq = [...new Set(slugs)]
    const shown = uniq.slice(0, 6).join(", ")
    const more = uniq.length > 6 ? ` 외 ${uniq.length - 6}개` : ""
    console.log(`    · ${message}  (${uniq.length}개 글)`)
    console.log(`        ${shown}${more}`)
  }
}

if (!DRY) {
  console.log(`\n  리다이렉트 ${redirects.length + 1}개 → public/_redirects`)
}

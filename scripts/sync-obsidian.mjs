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
 *  · PDF 는 두 갈래다. 노트가 임베드한 PDF 는 그 노트 안에 펼쳐지고,
 *    아무 노트도 임베드하지 않은 PDF 는 그 자체로 글 하나가 된다(바로 공개).
 *    이름이 _ 로 시작하는 PDF 와 assets/ 폴더 안의 PDF 는 따로 글이 되지 않는다.
 *  · 공개되는 글의 원본 PDF 는 public/files/<글 주소>/ 로 복사된다. 이 폴더는 이 스크립트가 관리한다.
 */

import {
  readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, copyFileSync, statSync, existsSync,
} from "node:fs"
import { readdir } from "node:fs/promises"
import { basename, dirname, extname, join, relative, sep } from "node:path"
import {
  BLOG_ROOT,
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
import { renderPdf, pdfMarkdown, pdfDescription } from "./lib/pdf.mjs"

const args = new Set(process.argv.slice(2))
const DRY = args.has("--dry")
const JSON_OUT = args.has("--json")

const IMAGE_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg",
])

/** 공개되는 원본 PDF 가 놓이는 곳. 사이트에서는 /files/... */
const FILES_DIR = join(BLOG_ROOT, "public", "files")

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
    // 맥 파일 시스템은 한글 파일명을 자모 분리(NFD)로 줄 때가 있고, 노트 본문은 보통 NFC 다.
    // 같은 이름인데 서로 다른 글자로 비교돼 못 찾는 일이 없도록 한쪽으로 맞춘다.
    const name = basename(a).normalize("NFC")
    if (!assetIndex.has(name)) assetIndex.set(name, a)
  }

  const pdfs = files.filter(
    (f) => extname(f).toLowerCase() === ".pdf" && !basename(f).startsWith("_"),
  )
  const pdfIndex = new Map()
  for (const p of pdfs) {
    const name = basename(p).normalize("NFC")
    if (!pdfIndex.has(name)) pdfIndex.set(name, p)
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
    drafts: [], files: [], warnings: [], errors: [],
  }

  // 그림으로 구워둔 PDF. 본문 변환은 동기라 미리 다 그려둔다.
  const rendered = new Map()
  for (const p of pdfs) {
    try {
      rendered.set(p, await renderPdf(p))
    } catch (err) {
      report.errors.push(`PDF 를 못 그림: ${relative(VAULT_BLOG_DIR, p)} — ${err.message}`)
    }
  }
  const embeddedPdfs = new Set()
  const publicFiles = new Map() // public/files 안 경로 → 원본

  const seen = new Set()

  /*
   * 폴더 이름을 바꾸면 글의 주소가 바뀌어서, 같은 주소의 이전 글에서 날짜를 이어받을 수 없다.
   * (2026-10-31 "Deep Learning" → "밑바닥부터 시작하는 딥러닝" 으로 바꿨을 때 Chapter 2~6 의
   * 날짜가 전부 그날로 바뀌었다.) 그래서 기존 글들의 날짜를 제목·파일이름으로도 찾아둔다.
   * 지워질 옛 글은 이 동기화가 끝날 때 지워지므로 지금은 아직 남아 있다.
   */
  const datesByTitle = new Map()
  const datesByName = new Map()
  for (const dir of await listPostDirs()) {
    const content = readIfExists(join(POSTS_DIR, dir, "index.md"))
    if (!content) continue
    const { data } = parseFrontmatter(content)
    if (data[SOURCE_KEY] !== SOURCE_OBSIDIAN || !data.date) continue
    if (data.title) datesByTitle.set(String(data.title), data.date)
    datesByName.set(dir.split("/").at(-1), data.date)
  }

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

    const previous = readIfExists(join(POSTS_DIR, slug, "index.md"))

    try {
      const raw = readFileSync(note, "utf8")
      const { data: fm, body: rawBody } = parseFrontmatter(raw)
      const published = fm.publish === true

      const usedAssets = new Map() // 원본경로 → 글 폴더 안 상대경로
      const converted = convertBody(rawBody, {
        resolvePdf: (name) => {
          const key = name.normalize("NFC")
          const src = pdfIndex.get(key) ?? pdfIndex.get(basename(key))
          const pdf = src && rendered.get(src)
          if (!pdf) return null
          embeddedPdfs.add(src)
          // 한 글에 PDF 가 여럿일 수 있으니 쪽 그림 이름 앞에 PDF 이름을 붙인다
          const stem = slugify(basename(src, extname(src)))
          const pageRel = (i) => `./assets/${stem}-${pdf.pages[i].file}`
          pdf.pages.forEach((p, i) => usedAssets.set(join(pdf.dir, p.file), pageRel(i)))
          // 초안의 PDF 까지 공개 폴더에 두면 글보다 먼저 새어 나간다
          const href = `/files/${slug}/${basename(src)}`
          if (published) publicFiles.set(href.slice("/files/".length), src)
          return pdfMarkdown({ href, pages: pdf.pages, pageSrc: pageRel, bytes: pdf.bytes })
        },
        resolveLink: (name) => linkIndex.get(name) ?? null,
        resolveAsset: (name) => {
          const key = name.normalize("NFC")
          const src = assetIndex.get(key) ?? assetIndex.get(basename(key))
          if (!src) return null
          usedAssets.set(src, `./assets/${basename(src)}`)
          return `./assets/${basename(src)}`
        },
      })

      const body = stripLeadingH1(converted.body)

      // 날짜가 원본에 없으면, 이미 발행된 글의 날짜를 유지한다.
      // 그러지 않으면 저장할 때마다 날짜가 바뀌어 매번 커밋이 생긴다.
      // 같은 주소에 없으면(폴더 이름을 바꾼 경우) 같은 제목·파일이름의 기존 글에서 찾는다.
      const priorDate =
        (previous ? parseFrontmatter(previous).data.date : null) ??
        datesByTitle.get(String(fm.title ?? noteName)) ??
        datesByName.get(nameSlug) ??
        null
      const fallbackDate = priorDate ? new Date(priorDate) : statSync(note).mtime

      const norm = normalizeFrontmatter(fm, body, {
        title: noteName,
        date: fallbackDate,
      })

      // 안전장치: publish: true 를 명시하지 않으면 초안이다.
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

      for (const w of [...converted.warnings, ...norm.warnings]) {
        report.warnings.push(`${slug}: ${w}`)
      }

      writePost(report, slug, previous, stringifyFrontmatter(data, finalBody), usedAssets)
    } catch (err) {
      report.errors.push(`${slug}: ${err.message}`)
    }
  }

  /*
   * 아무 노트도 임베드하지 않은 PDF 는 그 자체로 글이 된다.
   *   Blog/밑바닥부터 시작하는 딥러닝/발표.pdf → /blog/밑바닥부터-시작하는-딥러닝/발표
   * PDF 에는 frontmatter 를 쓸 수 없어서 공개 스위치가 없다. 볼트의 Blog/ 에 넣는 것이 곧 발행이다.
   * 요약·날짜·태그를 직접 정하고 싶으면 노트를 하나 만들어 PDF 를 임베드하면 된다.
   */
  for (const pdfPath of pdfs) {
    const pdf = rendered.get(pdfPath)
    if (!pdf || embeddedPdfs.has(pdfPath)) continue
    const rel = relative(VAULT_BLOG_DIR, pdfPath)
    if (rel.split(sep).includes("assets")) continue // 노트에 붙이려던 첨부. 임베드가 빠졌을 뿐이다

    const name = basename(pdfPath, extname(pdfPath))
    const categoryPath = rel.split(sep).slice(0, -1).map(slugify).filter(Boolean).join("/")
    const nameSlug = slugify(name)
    const slug = categoryPath ? `${categoryPath}/${nameSlug}` : nameSlug
    if (!nameSlug) {
      report.errors.push(`슬러그를 만들 수 없는 파일명: ${basename(pdfPath)}`)
      continue
    }
    if (seen.has(slug)) {
      report.warnings.push(`${slug}: 같은 이름의 노트가 있어 PDF 를 따로 글로 만들지 않음 — 노트에 임베드하면 보인다`)
      continue
    }
    seen.add(slug)

    try {
      const previous = readIfExists(join(POSTS_DIR, slug, "index.md"))
      const priorDate =
        (previous ? parseFrontmatter(previous).data.date : null) ??
        datesByTitle.get(name) ??
        datesByName.get(nameSlug) ??
        null
      const pageRel = (i) => `./assets/${pdf.pages[i].file}`
      const href = `/files/${slug}/${basename(pdfPath)}`
      // 첫 쪽은 대표 그림(image)으로 글머리에 이미 뜨니 본문은 둘째 쪽부터
      const body = pdfMarkdown({ href, pages: pdf.pages, pageSrc: pageRel, bytes: pdf.bytes, from: 1 })
      const { data } = normalizeFrontmatter(
        {
          title: name,
          description: pdfDescription(pdf.pages, name) ?? `${name} (PDF ${pdf.pages.length}쪽)`,
        },
        body,
        { date: priorDate ? new Date(priorDate) : statSync(pdfPath).birthtime },
      )
      // 첫 쪽을 대표 그림으로 — 목록 카드와 링크 공유 미리보기에 뜬다
      data.image = pageRel(0)
      data[SOURCE_KEY] = SOURCE_OBSIDIAN

      const assets = new Map(pdf.pages.map((p, i) => [join(pdf.dir, p.file), pageRel(i)]))
      publicFiles.set(href.slice("/files/".length), pdfPath)
      writePost(report, slug, previous, stringifyFrontmatter(data, body), assets)
    } catch (err) {
      report.errors.push(`${slug}: ${err.message}`)
    }
  }

  syncPublicFiles(report, publicFiles)

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

/** 내용이 달라졌을 때만 글을 쓰고, 쓰인 첨부를 글 폴더로 복사한다. */
function writePost(report, slug, previous, next, assets) {
  const outDir = join(POSTS_DIR, slug)
  if (previous === next) {
    report.unchanged.push(slug)
  } else {
    ;(previous ? report.updated : report.created).push(slug)
    if (!DRY) {
      mkdirSync(outDir, { recursive: true })
      writeFileSync(join(outDir, "index.md"), next, "utf8")
    }
  }
  if (DRY) return
  for (const [src, rel] of assets) {
    const dest = join(outDir, rel.replace(/^\.\//, ""))
    mkdirSync(dirname(dest), { recursive: true })
    if (!sameFile(src, dest)) copyFileSync(src, dest)
  }
}

/**
 * public/files 를 이번에 공개할 PDF 들과 똑같이 맞춘다.
 * 글은 그대로인데 PDF 만 바뀐 경우에도 배포가 되도록 바뀐 파일을 report.files 에 남긴다.
 */
function syncPublicFiles(report, wanted) {
  for (const [rel, src] of wanted) {
    const dest = join(FILES_DIR, rel)
    if (sameFile(src, dest)) continue
    report.files.push(rel)
    if (DRY) continue
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(src, dest)
  }
  const prune = (dir) => {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        prune(full)
        continue
      }
      const rel = relative(FILES_DIR, full).split(sep).join("/")
      if (wanted.has(rel) || e.name === ".DS_Store") continue
      report.files.push(`${rel} (지움)`)
      if (!DRY) rmSync(full)
    }
    if (!DRY && dir !== FILES_DIR && readdirSync(dir).every((n) => n === ".DS_Store")) {
      rmSync(dir, { recursive: true })
    }
  }
  prune(FILES_DIR)
}

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
    const changed = r.created.length + r.updated.length + r.removed.length + r.files.length
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
    line("공개 PDF", r.files),
  ]) if (l) console.log(l)

  if (r.warnings.length) {
    console.log("  경고:")
    for (const w of r.warnings) console.log(`   · ${w}`)
  }
  if (r.errors.length) {
    console.log("  오류:")
    for (const e of r.errors) console.log(`   ✗ ${e}`)
  }
  if (!r.created.length && !r.updated.length && !r.removed.length && !r.files.length) {
    console.log("  바뀐 것 없음")
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

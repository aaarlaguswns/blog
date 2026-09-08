#!/usr/bin/env node
/*
 * 글 관리 CLI. OpenClaw 블로그 스킬이 이걸 호출한다.
 *
 *   post.mjs new --title "제목" [--body-file F | --body -] [--category 경로]
 *                [--tags a,b] [--description D] [--date YYYY-MM-DD] [--publish]
 *   post.mjs list [--drafts | --published]
 *   post.mjs show <슬러그>
 *   post.mjs set <슬러그> [--publish|--draft] [--title T] [--description D] [--tags a,b]
 *   post.mjs attach <슬러그> --file /경로/사진.png [--alt "설명"]
 *   post.mjs rm <슬러그>
 *
 * 모든 명령이 --json 을 받으면 기계가 읽을 JSON 을 낸다.
 * 본문 자체를 고치는 일은 이 CLI 가 하지 않는다 — 에이전트가 index.md 를 직접 편집하면 된다.
 *
 * 이 CLI 는 커밋도 푸시도 하지 않는다. 발행(=공개)은 scripts/publish.sh 가 따로 한다.
 * 글을 만드는 일과 세상에 내보내는 일을 갈라둬야 실수로 공개되는 일이 없다.
 */

import {
  readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync,
  existsSync, readdirSync, statSync,
} from "node:fs"
import { basename, extname, join } from "node:path"
import { POSTS_DIR, SITE_URL } from "./lib/config.mjs"
import {
  parseFrontmatter, stringifyFrontmatter, slugify,
} from "./lib/markdown.mjs"

/* ── 인자 파싱 ───────────────────────────────────────────────────────── */

function parseArgs(argv) {
  const flags = {}
  const positional = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("--")) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next === undefined || next.startsWith("--")) flags[key] = true
      else {
        flags[key] = next
        i++
      }
    } else positional.push(a)
  }
  return { flags, positional }
}

const { flags, positional } = parseArgs(process.argv.slice(2))
const [command, ...rest] = positional
const JSON_OUT = flags.json === true

function out(human, data) {
  if (JSON_OUT) console.log(JSON.stringify(data))
  else console.log(human)
}

function fail(message) {
  if (JSON_OUT) console.log(JSON.stringify({ ok: false, error: message }))
  else console.error(`✗ ${message}`)
  process.exit(1)
}

/* ── 글 읽기/쓰기 ────────────────────────────────────────────────────── */

const postPath = (slug) => join(POSTS_DIR, slug, "index.md")

function readPost(slug) {
  const file = postPath(slug)
  if (!existsSync(file)) fail(`그런 글이 없다: ${slug}`)
  const { data, body } = parseFrontmatter(readFileSync(file, "utf8"))
  return { slug, file, data, body }
}

function writePost(slug, data, body) {
  const dir = join(POSTS_DIR, slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(postPath(slug), stringifyFrontmatter(data, body), "utf8")
}

/** 글은 카테고리 폴더 안에 중첩돼 있으므로 index.md 를 찾아 재귀로 훑는다. */
function listSlugs(base = POSTS_DIR, prefix = "") {
  if (!existsSync(base)) return []
  const out = []
  for (const e of readdirSync(base, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === "assets") continue
    const id = prefix ? `${prefix}/${e.name}` : e.name
    if (existsSync(join(base, e.name, "index.md"))) out.push(id)
    out.push(...listSlugs(join(base, e.name), id))
  }
  return out
}

function summarize(slug) {
  const { data } = readPost(slug)
  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? "",
    date: data.date instanceof Date ? data.date.toISOString() : String(data.date ?? ""),
    tags: data.tags ?? [],
    draft: data.draft === true,
    source: data.source ?? "telegram",
    url: `${SITE_URL}/blog/${encodeURI(slug)}`,
  }
}

const parseTags = (v) =>
  typeof v === "string"
    ? [...new Set(v.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean))]
    : []

const readBody = () => {
  if (typeof flags["body-file"] === "string") {
    return readFileSync(flags["body-file"], "utf8")
  }
  if (flags.body === "-") return readFileSync(0, "utf8")
  if (typeof flags.body === "string") return flags.body
  return ""
}

/* ── 명령 ────────────────────────────────────────────────────────────── */

const commands = {
  new() {
    const title = typeof flags.title === "string" ? flags.title.trim() : ""
    if (!title) fail("--title 이 필요하다")

    /*
     * 카테고리는 폴더이자 주소다. --category "algorithm/dp" 로 주면
     * src/content/blog/algorithm/dp/<제목>/index.md 에 만들어지고
     * 주소는 /blog/algorithm/dp/<제목> 이 된다.
     */
    const category =
      typeof flags.category === "string"
        ? flags.category.split("/").map(slugify).filter(Boolean).join("/")
        : ""
    const nameSlug =
      (typeof flags.slug === "string" && slugify(flags.slug)) || slugify(title)
    if (!nameSlug) fail(`제목에서 슬러그를 만들 수 없다: ${title}`)
    const slug = category ? `${category}/${nameSlug}` : nameSlug
    if (existsSync(postPath(slug))) {
      fail(`이미 있는 글이다: ${slug} — 고치려면 set/편집을 쓸 것`)
    }

    const body = readBody().trim()
    const description =
      typeof flags.description === "string" && flags.description.trim()
        ? flags.description.trim()
        : firstLine(body) || title

    const date =
      typeof flags.date === "string" ? new Date(flags.date) : new Date()
    if (Number.isNaN(+date)) fail(`날짜를 못 읽겠다: ${flags.date}`)

    const data = { title, description, date }
    const tags = parseTags(flags.tags)
    if (tags.length) data.tags = tags
    // 기본은 초안이다. --publish 를 명시해야 사이트에 나간다.
    if (flags.publish !== true) data.draft = true

    writePost(slug, data, body || "_(아직 내용 없음)_")

    const info = summarize(slug)
    out(
      `${info.draft ? "초안" : "발행 대기"} 생성: ${slug}\n  ${postPath(slug)}` +
        (info.draft ? "" : `\n  발행하려면: scripts/publish.sh`),
      { ok: true, ...info, path: postPath(slug) },
    )
  },

  list() {
    let slugs = listSlugs().map(summarize)
    if (flags.drafts) slugs = slugs.filter((p) => p.draft)
    if (flags.published) slugs = slugs.filter((p) => !p.draft)
    slugs.sort((a, b) => (a.date < b.date ? 1 : -1))

    if (JSON_OUT) return console.log(JSON.stringify({ ok: true, posts: slugs }))
    if (!slugs.length) return console.log("글이 없다")
    for (const p of slugs) {
      const mark = p.draft ? "초안" : "공개"
      console.log(`[${mark}] ${p.slug}  ·  ${p.title}  ·  ${p.date.slice(0, 10)}  ·  ${p.source}`)
    }
  },

  show() {
    const slug = rest[0]
    if (!slug) fail("슬러그가 필요하다")
    const post = readPost(slug)
    if (JSON_OUT) {
      return console.log(
        JSON.stringify({ ok: true, ...summarize(slug), body: post.body }),
      )
    }
    console.log(readFileSync(post.file, "utf8"))
  },

  set() {
    const slug = rest[0]
    if (!slug) fail("슬러그가 필요하다")
    const post = readPost(slug)
    const data = { ...post.data }

    if (flags.publish === true) delete data.draft
    if (flags.draft === true) data.draft = true
    if (typeof flags.title === "string") data.title = flags.title.trim()
    if (typeof flags.description === "string") {
      data.description = flags.description.trim()
    }
    if (typeof flags.tags === "string") {
      const tags = parseTags(flags.tags)
      if (tags.length) data.tags = tags
      else delete data.tags
    }
    if (typeof flags.date === "string") {
      const d = new Date(flags.date)
      if (Number.isNaN(+d)) fail(`날짜를 못 읽겠다: ${flags.date}`)
      data.date = d
    }

    writePost(slug, data, post.body)
    const info = summarize(slug)
    out(`${slug} → ${info.draft ? "초안" : "공개 예정"}`, { ok: true, ...info })
  },

  attach() {
    const slug = rest[0]
    if (!slug) fail("슬러그가 필요하다")
    if (typeof flags.file !== "string") fail("--file 이 필요하다")
    readPost(slug) // 없으면 여기서 죽는다
    const src = flags.file
    if (!existsSync(src)) fail(`그런 파일이 없다: ${src}`)

    const ext = extname(src).toLowerCase() || ".png"
    const stem = slugify(basename(src, extname(src))) || "image"
    const dir = join(POSTS_DIR, slug, "assets")
    mkdirSync(dir, { recursive: true })

    // 같은 이름이 있으면 숫자를 붙인다
    let name = `${stem}${ext}`
    for (let i = 2; existsSync(join(dir, name)); i++) name = `${stem}-${i}${ext}`
    copyFileSync(src, join(dir, name))

    const alt = typeof flags.alt === "string" ? flags.alt : ""
    const markdown = `![${alt}](./assets/${name})`
    out(`첨부 완료: ${name}\n본문에 넣을 것:\n${markdown}`, {
      ok: true, slug, file: join(dir, name), markdown,
      bytes: statSync(join(dir, name)).size,
    })
  },

  rm() {
    const slug = rest[0]
    if (!slug) fail("슬러그가 필요하다")
    readPost(slug)
    rmSync(join(POSTS_DIR, slug), { recursive: true, force: true })
    out(`지웠다: ${slug}\n사이트에서 내리려면 scripts/publish.sh 를 실행할 것`, {
      ok: true, slug, removed: true,
    })
  },
}

function firstLine(body) {
  const line = body
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#") && !l.startsWith(":::"))
  if (!line) return ""
  return line.length > 150 ? `${line.slice(0, 149).trimEnd()}…` : line
}

if (!command || !commands[command]) {
  console.error(
    `쓰는 법:\n` +
      `  post.mjs new --title "제목" [--body-file F] [--category a/b] [--tags a,b] [--publish]\n` +
      `  post.mjs list [--drafts|--published]\n` +
      `  post.mjs show <슬러그>\n` +
      `  post.mjs set <슬러그> [--publish|--draft] [--title T] [--tags a,b]\n` +
      `  post.mjs attach <슬러그> --file 사진.png [--alt "설명"]\n` +
      `  post.mjs rm <슬러그>\n` +
      `모든 명령에 --json 을 붙이면 JSON 으로 답한다.`,
  )
  process.exit(1)
}

commands[command]()

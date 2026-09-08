#!/usr/bin/env node
/*
 * 글 관리 CLI. OpenClaw 블로그 스킬이 이걸 호출한다.
 *
 *   post.mjs new --title "제목" [--body-file F | --body -] [--category 경로]
 *                [--tags a,b] [--description D] [--date YYYY-MM-DD] [--publish]
 *   post.mjs list [--drafts | --published]
 *   post.mjs show <글>
 *   post.mjs edit <글> --body-file F        본문 통째로 교체
 *   post.mjs set <글> [--publish|--draft] [--title T] [--description D] [--tags a,b]
 *   post.mjs attach <글> --file /경로/사진.png [--alt "설명"]
 *   post.mjs rm <글>
 *   post.mjs categories                     지금 있는 분류 보기
 *
 * 모든 명령에 --json 을 붙이면 기계가 읽을 JSON 을 낸다.
 *
 * ── 이 CLI 는 옵시디언 볼트를 고친다 ──
 *
 * 볼트가 글의 원본이다. 저장소의 src/content/blog 는 볼트에서 생성된 결과물이라,
 * 거기를 고쳐봐야 다음 동기화에 덮어써진다. 그래서 여기서는 볼트만 건드린다.
 *
 * 커밋도 푸시도 하지 않는다. 감시 데몬이 볼트 변경을 보고 20초 뒤에 알아서 한다.
 * 사이트에 나가려면 frontmatter 에 publish: true 가 있어야 하고, 그건 --publish
 * 를 줬을 때만 붙는다. 즉 "글을 만드는 일"과 "세상에 내보내는 일"이 갈라져 있다.
 */

import {
  readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync,
  existsSync, readdirSync, statSync,
} from "node:fs"
import { basename, dirname, extname, join, relative, sep } from "node:path"
import { BLOG_ROOT, VAULT_BLOG_DIR, SITE_URL } from "./lib/config.mjs"
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

const out = (human, data) =>
  console.log(JSON_OUT ? JSON.stringify(data) : human)

function fail(message, extra = {}) {
  if (JSON_OUT) console.log(JSON.stringify({ ok: false, error: message, ...extra }))
  else console.error(`✗ ${message}`)
  process.exit(1)
}

const LABELS = JSON.parse(
  readFileSync(join(BLOG_ROOT, "category-labels.json"), "utf8"),
)

/* ── 볼트 훑기 ───────────────────────────────────────────────────────── */

function walk(dir) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const found = []
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name === "assets") continue
    const full = join(dir, e.name)
    if (e.isDirectory()) found.push(...walk(full))
    else if (extname(e.name).toLowerCase() === ".md") found.push(full)
  }
  return found
}

/** 볼트의 노트 전부. id 는 사이트 주소와 같은 슬러그 경로다. */
function vaultNotes() {
  return walk(VAULT_BLOG_DIR).map((file) => {
    const rel = relative(VAULT_BLOG_DIR, file)
    const segments = rel.split(sep)
    const name = basename(segments.pop(), ".md")
    const categorySlug = segments.map(slugify).filter(Boolean).join("/")
    const nameSlug = slugify(name)
    return {
      file,
      dir: dirname(file),
      name,
      categoryFolders: segments,
      categorySlug,
      id: categorySlug ? `${categorySlug}/${nameSlug}` : nameSlug,
    }
  })
}

/** 슬러그 id 로 찾는다. 정확히 맞는 게 없으면 파일 이름으로도 찾아본다. */
function resolveNote(query) {
  if (!query) fail("어느 글인지 알려줘야 한다 (슬러그나 제목)")
  const notes = vaultNotes()
  const wanted = query.replace(/^\/+|\/+$/g, "")

  const exact = notes.find((n) => n.id === wanted)
  if (exact) return exact

  const bySlug = notes.filter((n) => slugify(n.name) === slugify(wanted))
  if (bySlug.length === 1) return bySlug[0]
  if (bySlug.length > 1) {
    fail(`이름이 겹친다. 전체 슬러그로 지정할 것: ${bySlug.map((n) => n.id).join(", ")}`)
  }

  const byTitle = notes.filter((n) => {
    const { data } = parseFrontmatter(readFileSync(n.file, "utf8"))
    return data.title === query
  })
  if (byTitle.length === 1) return byTitle[0]

  fail(`그런 글이 없다: ${query}`, {
    hint: "post.mjs list 로 목록을 볼 것",
  })
}

function summarize(note) {
  const { data } = parseFrontmatter(readFileSync(note.file, "utf8"))
  const published = data.publish === true
  return {
    id: note.id,
    title: data.title ?? note.name,
    description: data.description ?? "",
    date: data.date ? new Date(data.date).toISOString() : "",
    tags: data.tags ?? [],
    category: note.categoryFolders.join("/"),
    published,
    url: published ? `${SITE_URL}/blog/${encodeURI(note.id)}` : null,
    vaultPath: relative(VAULT_BLOG_DIR, note.file),
  }
}

const parseTags = (v) =>
  typeof v === "string"
    ? [...new Set(v.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean))]
    : []

const readBody = () => {
  if (typeof flags["body-file"] === "string") return readFileSync(flags["body-file"], "utf8")
  if (flags.body === "-") return readFileSync(0, "utf8")
  if (typeof flags.body === "string") return flags.body
  return ""
}

function firstLine(body) {
  const line = body.split("\n").map((l) => l.trim())
    .find((l) => l && !l.startsWith("#") && !l.startsWith(":::"))
  if (!line) return ""
  return line.length > 150 ? `${line.slice(0, 149).trimEnd()}…` : line
}

/**
 * 분류 입력을 볼트의 실제 폴더 이름으로 바꾼다.
 * "algorithm/binary-search" 든 "Algorithm/Binary Search" 든 같은 곳을 가리켜야 한다.
 * 이미 있는 폴더가 있으면 그 이름을 그대로 쓴다 (같은 분류가 두 벌로 갈라지지 않게).
 */
function resolveCategoryFolders(input) {
  if (typeof input !== "string" || !input.trim()) return []
  const wanted = input.split("/").map((s) => s.trim()).filter(Boolean)
  const existing = new Map()
  for (const n of vaultNotes()) {
    for (let i = 1; i <= n.categoryFolders.length; i++) {
      const slug = n.categoryFolders.slice(0, i).map(slugify).join("/")
      if (!existing.has(slug)) existing.set(slug, n.categoryFolders.slice(0, i))
    }
  }
  const slugPath = wanted.map(slugify).filter(Boolean).join("/")
  if (existing.has(slugPath)) return existing.get(slugPath)

  // 없는 분류다. 보기 좋은 이름이 정해져 있으면 그걸 쓴다.
  return wanted.map((_, i) => {
    const slug = wanted.slice(0, i + 1).map(slugify).join("/")
    return LABELS[slug] ?? wanted[i]
  })
}

/* ── 명령 ────────────────────────────────────────────────────────────── */

const commands = {
  new() {
    const title = typeof flags.title === "string" ? flags.title.trim() : ""
    if (!title) fail("--title 이 필요하다")

    const folders = resolveCategoryFolders(flags.category)
    const name = typeof flags.slug === "string" ? flags.slug.trim() : title
    if (!slugify(name)) fail(`제목에서 주소를 만들 수 없다: ${title}`)

    const dir = join(VAULT_BLOG_DIR, ...folders)
    const file = join(dir, `${name}.md`)
    if (existsSync(file)) fail(`이미 있는 글이다: ${relative(VAULT_BLOG_DIR, file)}`)

    const body = readBody().trim()
    const data = {
      // publish 가 맨 위에 있어야 옵시디언에서 열자마자 발행 여부가 보인다
      publish: flags.publish === true,
      title,
      description:
        typeof flags.description === "string" && flags.description.trim()
          ? flags.description.trim()
          : firstLine(body) || title,
      date: typeof flags.date === "string" ? new Date(flags.date) : new Date(),
    }
    if (Number.isNaN(+data.date)) fail(`날짜를 못 읽겠다: ${flags.date}`)
    const tags = parseTags(flags.tags)
    if (tags.length) data.tags = tags

    mkdirSync(dir, { recursive: true })
    writeFileSync(file, stringifyFrontmatter(data, body || "_(아직 내용 없음)_"), "utf8")

    const note = resolveNote(
      [...folders.map(slugify), slugify(name)].filter(Boolean).join("/"),
    )
    const info = summarize(note)
    out(
      `${info.published ? "발행" : "초안"} 생성: ${info.id}\n` +
        `  볼트: ${info.vaultPath}` +
        (info.published
          ? `\n  감시 데몬이 20초 뒤 배포한다 → ${info.url}`
          : `\n  사이트에 올리려면: post.mjs set ${info.id} --publish`),
      { ok: true, ...info },
    )
  },

  list() {
    let items = vaultNotes().map(summarize)
    if (flags.drafts) items = items.filter((p) => !p.published)
    if (flags.published) items = items.filter((p) => p.published)
    items.sort((a, b) => (a.date < b.date ? 1 : -1))

    if (JSON_OUT) return console.log(JSON.stringify({ ok: true, posts: items }))
    if (!items.length) return console.log("글이 없다")
    for (const p of items) {
      console.log(
        `[${p.published ? "공개" : "초안"}] ${p.id}  ·  ${p.title}  ·  ${p.date.slice(0, 10)}`,
      )
    }
  },

  categories() {
    const seen = new Map()
    for (const n of vaultNotes()) {
      for (let i = 1; i <= n.categoryFolders.length; i++) {
        const folders = n.categoryFolders.slice(0, i)
        const slug = folders.map(slugify).join("/")
        const e = seen.get(slug) ?? { slug, folders, count: 0 }
        if (i === n.categoryFolders.length) e.count++
        seen.set(slug, e)
      }
    }
    const list = [...seen.values()].sort((a, b) => a.slug.localeCompare(b.slug))
    if (JSON_OUT) return console.log(JSON.stringify({ ok: true, categories: list }))
    if (!list.length) return console.log("분류가 없다 (모든 글이 최상위에 있다)")
    for (const c of list) {
      console.log(`  ${c.folders.join("/")}   →  --category "${c.slug}"   (글 ${c.count}개)`)
    }
  },

  show() {
    const note = resolveNote(rest[0])
    if (JSON_OUT) {
      const { body } = parseFrontmatter(readFileSync(note.file, "utf8"))
      return console.log(JSON.stringify({ ok: true, ...summarize(note), body }))
    }
    console.log(readFileSync(note.file, "utf8"))
  },

  edit() {
    const note = resolveNote(rest[0])
    if (flags["body-file"] === undefined && flags.body === undefined) {
      fail("--body-file 이나 --body 로 새 본문을 줘야 한다")
    }
    const { data } = parseFrontmatter(readFileSync(note.file, "utf8"))
    writeFileSync(note.file, stringifyFrontmatter(data, readBody().trim()), "utf8")
    out(`본문 교체: ${note.id}`, { ok: true, ...summarize(note) })
  },

  set() {
    const note = resolveNote(rest[0])
    const { data, body } = parseFrontmatter(readFileSync(note.file, "utf8"))

    if (flags.publish === true) data.publish = true
    if (flags.draft === true) data.publish = false
    if (typeof flags.title === "string") data.title = flags.title.trim()
    if (typeof flags.description === "string") data.description = flags.description.trim()
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

    writeFileSync(note.file, stringifyFrontmatter(data, body), "utf8")
    const info = summarize(note)
    out(
      `${info.id} → ${info.published ? "공개" : "초안"}` +
        (info.published ? `\n  감시 데몬이 20초 뒤 배포한다 → ${info.url}` : ""),
      { ok: true, ...info },
    )
  },

  attach() {
    const note = resolveNote(rest[0])
    if (typeof flags.file !== "string") fail("--file 이 필요하다")
    if (!existsSync(flags.file)) fail(`그런 파일이 없다: ${flags.file}`)

    const ext = extname(flags.file).toLowerCase() || ".png"
    const stem = slugify(basename(flags.file, extname(flags.file))) || "image"
    const dir = join(note.dir, "assets")
    mkdirSync(dir, { recursive: true })

    let name = `${stem}${ext}`
    for (let i = 2; existsSync(join(dir, name)); i++) name = `${stem}-${i}${ext}`
    copyFileSync(flags.file, join(dir, name))

    const alt = typeof flags.alt === "string" ? flags.alt : ""
    const markdown = `![${alt}](./assets/${name})`
    out(`첨부 완료: ${name}\n본문에 넣을 것:\n${markdown}`, {
      ok: true, id: note.id, markdown,
      vaultPath: relative(VAULT_BLOG_DIR, join(dir, name)),
      bytes: statSync(join(dir, name)).size,
    })
  },

  rm() {
    const note = resolveNote(rest[0])
    const info = summarize(note)
    rmSync(note.file, { force: true })
    out(
      `볼트에서 지웠다: ${info.vaultPath}` +
        (info.published ? "\n  공개돼 있던 글이라 20초 뒤 사이트에서도 내려간다." : ""),
      { ok: true, ...info, removed: true },
    )
  },
}

if (!command || !commands[command]) {
  console.error(
    `쓰는 법 (글은 옵시디언 볼트에 만들어진다):\n` +
      `  post.mjs new --title "제목" [--body-file F] [--category a/b] [--tags a,b] [--publish]\n` +
      `  post.mjs list [--drafts|--published]\n` +
      `  post.mjs categories\n` +
      `  post.mjs show <글>\n` +
      `  post.mjs edit <글> --body-file F\n` +
      `  post.mjs set <글> [--publish|--draft] [--title T] [--tags a,b]\n` +
      `  post.mjs attach <글> --file 사진.png [--alt "설명"]\n` +
      `  post.mjs rm <글>\n` +
      `모든 명령에 --json 을 붙이면 JSON 으로 답한다.`,
  )
  process.exit(1)
}

commands[command]()

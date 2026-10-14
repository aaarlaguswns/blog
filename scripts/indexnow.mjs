#!/usr/bin/env node
/*
 * IndexNow 로 검색엔진에 "이 주소들 바뀌었으니 새로 읽어가라" 고 알린다.
 * 한 번 보내면 IndexNow 에 참여하는 엔진(네이버, 빙, 얀덱스 등)에 함께 전달된다.
 * 구글은 IndexNow 를 쓰지 않는다 — 구글은 서치 콘솔에 등록한 사이트맵을 읽는다.
 *
 *   node scripts/indexnow.mjs --all                  사이트맵의 모든 주소
 *   node scripts/indexnow.mjs --since <커밋>          그 커밋 이후 바뀐 글과, 그 글이 걸린 목록 페이지
 *   node scripts/indexnow.mjs <주소> [<주소> ...]
 *   ... --wait     보내기 전에 새 배포가 실제로 떠 있을 때까지 기다린다 (감시 데몬이 쓴다)
 *   ... --dry      보내지 않고 무엇을 보낼지만 보여준다
 *
 * 알림은 "빨리 와서 보라" 는 요청일 뿐, 색인을 보장하지는 않는다.
 */

import { execFileSync } from "node:child_process"
import { BLOG_ROOT, INDEXNOW_KEY, SITE_URL } from "./lib/config.mjs"

const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const valueOf = (f) => {
  const i = args.indexOf(f)
  return i >= 0 ? args[i + 1] : undefined
}

const site = new URL(SITE_URL)
const abs = (path) => new URL(path, site).href

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 사이트맵의 모든 주소 (배포된 실제 사이트에서 읽는다) */
async function allUrls() {
  const index = await (await fetch(abs("/sitemap-index.xml"))).text()
  const urls = []
  for (const [, sub] of index.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const xml = await (await fetch(sub)).text()
    for (const [, loc] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.push(loc)
  }
  return urls
}

/**
 * 그 커밋 이후 바뀐 글의 주소. 글이 걸린 분류 페이지·글 목록·홈도 함께 —
 * 새 글이 생기면 그 목록들도 내용이 바뀌기 때문이다.
 */
function changedSince(rev) {
  const out = execFileSync(
    "git", ["diff", "--name-only", "-z", `${rev}..HEAD`, "--", "src/content/blog"],
    { cwd: BLOG_ROOT, encoding: "utf8" },
  )
  const ids = new Set()
  for (const file of out.split("\0").filter(Boolean)) {
    const m = file.match(/^src\/content\/blog\/(.+?)\/(?:index\.md|assets\/.+)$/)
    if (m) ids.add(m[1])
  }
  const paths = new Set()
  for (const id of ids) {
    paths.add(`/blog/${id}/`)
    const segs = id.split("/").slice(0, -1)
    segs.forEach((_, i) => paths.add(`/blog/${segs.slice(0, i + 1).join("/")}/`))
  }
  if (paths.size) ["/", "/blog/", "/categories/"].forEach((p) => paths.add(p))
  return { ids: [...ids], urls: [...paths].map((p) => abs(encodeURI(p))) }
}

/** 새 배포가 떴는지: 바뀐 주소 중 하나가 살아 있으면 된다. 지운 글만 있으면 시간으로 기다린다. */
async function waitForDeploy(urls) {
  const probe = urls.find((u) => !["/", "/blog/", "/categories/"].includes(new URL(u).pathname))
  const deadline = Date.now() + 5 * 60_000
  await sleep(30_000) // 푸시 직후엔 아직 옛 배포다
  while (Date.now() < deadline) {
    if (probe) {
      const r = await fetch(`${probe}?indexnow=${Date.now()}`, { method: "HEAD" }).catch(() => null)
      if (r?.ok) return true
    } else {
      await sleep(90_000)
      return true
    }
    await sleep(15_000)
  }
  return false
}

async function main() {
  let urls
  if (has("--all")) urls = await allUrls()
  else if (valueOf("--since")) urls = changedSince(valueOf("--since")).urls
  else urls = args.filter((a) => !a.startsWith("--")).map((u) => (u.startsWith("http") ? u : abs(u)))

  if (!urls.length) {
    console.log("알릴 주소가 없다")
    return
  }

  console.log(`IndexNow: ${urls.length}개 주소`)
  for (const u of urls.slice(0, 8)) console.log(`  ${decodeURI(u)}`)
  if (urls.length > 8) console.log(`  … 외 ${urls.length - 8}개`)
  if (has("--dry")) return

  if (has("--wait")) {
    const live = await waitForDeploy(urls)
    if (!live) console.log("  배포 확인을 못 했지만 그대로 보낸다 (검색엔진이 나중에 다시 와도 된다)")
  }

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: site.host,
      key: INDEXNOW_KEY,
      keyLocation: abs(`/${INDEXNOW_KEY}.txt`),
      urlList: urls,
    }),
  })
  // 200 = 접수, 202 = 접수했고 키 확인은 나중에. 그 밖은 실패.
  if (res.status === 200 || res.status === 202) {
    console.log(`  ✓ 접수됨 (${res.status})`)
  } else {
    console.log(`  ✗ 실패 (${res.status}) ${(await res.text()).slice(0, 200)}`)
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

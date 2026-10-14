import { defineConfig } from "astro/config"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { parse as parseYaml } from "yaml"
import sitemap from "@astrojs/sitemap"
import { satteri } from "@astrojs/markdown-satteri"
import {
  blockExpressiveCode,
  inlineExpressiveCode,
} from "./src/lib/expressive-code"
import { temmlMath } from "./src/lib/math"
import { calloutDirective } from "./src/lib/callout"
import { externalLinks } from "./src/lib/external-links"
import { headingNamespace } from "./src/lib/heading-namespace"
import { headingAnchors } from "./src/lib/heading-anchors"

/*
 * 사이트맵의 <lastmod> 를 채우려고 글 날짜를 미리 읽어둔다.
 * 검색엔진은 이 값을 보고 어느 페이지를 다시 읽으러 올지 정한다.
 * 글은 그 글의 날짜, 분류·홈 같은 목록 페이지는 그 아래 가장 최근 글의 날짜를 쓴다.
 */
function readPostDates(): Map<string, Date> {
  const dates = new Map<string, Date>()
  const walk = (dir: string, prefix: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name === "assets") continue
      const id = prefix ? `${prefix}/${e.name}` : e.name
      try {
        const raw = readFileSync(join(dir, e.name, "index.md"), "utf8")
        const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
        const data = fm ? parseYaml(fm[1]) : null
        if (data?.date && !data.draft) dates.set(`/blog/${id}/`, new Date(data.date))
      } catch {
        // index.md 가 없는 폴더(분류 폴더)는 그냥 지나간다
      }
      walk(join(dir, e.name), id)
    }
  }
  walk("./src/content/blog", "")
  return dates
}

const postDates = readPostDates()

function lastModified(path: string): Date | null {
  const exact = postDates.get(path)
  if (exact) return exact
  let latest: Date | null = null
  for (const [p, d] of postDates) {
    if (p.startsWith(path) && (!latest || d > latest)) latest = d
  }
  return latest
}

export default defineConfig({
  site: "https://aaarlaguswns.pages.dev",
  compressHTML: true,
  prefetch: { prefetchAll: true },
  integrations: [
    sitemap({
      // 태그 페이지는 같은 글을 다시 묶어놓은 것뿐이라 색인에서 뺀다.
      // 카테고리 페이지와 글은 전부 넣는다.
      filter: (page) => !page.includes("/tags/"),
      serialize(item) {
        const d = lastModified(decodeURI(new URL(item.url).pathname))
        if (d) item.lastmod = d.toISOString()
        return item
      },
    }),
  ],
  markdown: {
    syntaxHighlight: false,
    processor: satteri({
      features: { directive: true, math: true },
      mdastPlugins: [calloutDirective, inlineExpressiveCode, temmlMath],
      hastPlugins: [
        externalLinks,
        blockExpressiveCode,
        headingNamespace,
        headingAnchors,
      ],
    }),
  },
})

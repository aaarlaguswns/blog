/*
 * PDF → 쪽마다 이미지 + 쪽마다 글자.
 *
 * 브라우저에 PDF 를 그대로 띄우는 방법(<iframe>, <object>)은 안드로이드 크롬에서 아예 안 보이고
 * 아이폰에서는 첫 쪽만 보인다. 그래서 동기화할 때 쪽마다 그림으로 구워 글에 넣는다.
 * 원본 PDF 파일은 사이트에 올리지 않는다. 쪽에서 뽑은 글자는 그림 설명(alt)이 되어
 * 화면낭독기와 검색엔진이 읽는다.
 *
 * 그리는 데 쪽당 0.1~0.3초가 걸려서, 내용 해시로 .cache/pdf/ 에 구워둔 것을 다시 쓴다.
 * 동기화는 볼트가 바뀔 때마다 돌기 때문이다.
 */

import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { BLOG_ROOT } from "./config.mjs"

const CACHE_DIR = join(BLOG_ROOT, ".cache", "pdf")

/** 그림 너비. 본문 칸보다 넉넉하게 — 빌드 때 Astro 가 화면 크기별로 다시 줄인다. */
const PAGE_WIDTH = 1600

/**
 * @param {string} file  PDF 경로
 * @returns {Promise<{ dir: string, pages: { file: string, text: string }[], title: string|null }>}
 *   dir 안에 page-01.webp … 가 있다.
 */
export async function renderPdf(file) {
  const data = readFileSync(file)
  const hash = createHash("sha1").update(data).digest("hex")
  const dir = join(CACHE_DIR, hash)
  const metaFile = join(dir, "meta.json")

  if (existsSync(metaFile)) {
    return { dir, ...JSON.parse(readFileSync(metaFile, "utf8")) }
  }

  // 무거운 모듈이라 PDF 가 있을 때만 불러온다
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const { createCanvas } = await import("@napi-rs/canvas")

  const task = getDocument({ data: new Uint8Array(data), verbosity: 0 })
  const doc = await task.promise
  const title = (await doc.getMetadata()).info?.Title?.trim() || null

  mkdirSync(dir, { recursive: true })
  const pages = []
  const digits = Math.max(2, String(doc.numPages).length)
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const unit = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: PAGE_WIDTH / unit.width })
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height))
    await page.render({ canvas, canvasContext: canvas.getContext("2d"), viewport }).promise

    const name = `page-${String(i).padStart(digits, "0")}.webp`
    writeFileSync(join(dir, name), await canvas.encode("webp", 85))

    const content = await page.getTextContent()
    const text = content.items
      .map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : "") : ""))
      .join("")
    pages.push({ file: name, text: tidy(text) })
    page.cleanup()
  }
  await task.destroy()

  const meta = { pages, title }
  writeFileSync(metaFile, JSON.stringify(meta, null, 2))
  return { dir, ...meta }
}

/** 아이콘 글꼴 자리(사용자 영역 글자)와 줄바꿈을 걷어내고 한 줄로 */
function tidy(s) {
  return s
    .replace(/[-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * 글 본문에 들어갈 마크다운. 쪽 그림을 차례로 싣는다.
 *
 * @param {object} o
 * @param {{ text: string }[]} o.pages
 * @param {(i:number)=>string} o.pageSrc  i번째 쪽 그림의 글 폴더 기준 상대경로
 * @param {number} [o.from]     이 쪽부터 싣는다 (0부터). 첫 쪽이 이미 대표 그림으로 위에 떠 있으면 1
 */
export function pdfMarkdown({ pages, pageSrc, from = 0 }) {
  const lines = []
  pages.forEach((p, i) => {
    if (i < from) return
    // 설명이 너무 길면 화면낭독기가 지루하다. 대괄호는 마크다운 문법과 부딪힌다.
    const alt = `${i + 1}쪽${p.text ? `: ${p.text}` : ""}`
      .replace(/[[\]]/g, "")
      .slice(0, 240)
    lines.push(`![${alt}](${pageSrc(i)})`, "")
  })
  return lines.join("\n").trim()
}

/** 첫 쪽 글자로 만든 요약. 글자가 없는(스캔한) PDF 면 null */
export function pdfDescription(pages, title) {
  const first = pages.find((p) => p.text)?.text
  if (!first) return null
  // 표지에 제목이 그대로 있으면 요약에서 빼는 편이 덜 중복된다
  const text = title ? first.replace(title, "").trim() : first
  return text.length > 150 ? `${text.slice(0, 149)}…` : text || null
}

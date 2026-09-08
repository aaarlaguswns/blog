#!/usr/bin/env node
/*
 * 분류별 썸네일 SVG 를 만든다.  node scripts/make-thumbs.mjs
 *
 * 글에 대표 이미지가 없으면 목록 카드가 그 글이 속한 분류의 썸네일을 쓴다.
 * 분류를 새로 만들었다면 categories.json 에 색을 넣고 이 스크립트를 다시 돌린다.
 * (그림 정의가 없는 분류는 상위 분류의 그림을 빌려 쓴다)
 *
 * 그리는 규칙
 *  · 640×336, 배경은 분류의 tint(연한 파스텔), 도형은 ink(진한 색)
 *  · 도형은 단순한 기하 형태만 쓴다. 작게 줄여도 뭉개지지 않아야 한다
 *  · 라이트/다크 어느 쪽에 놓여도 읽히도록 배경을 반드시 칠한다
 *    (투명 배경이면 다크모드에서 진한 도형이 사라진다)
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { BLOG_ROOT } from "./lib/config.mjs"

const W = 640
const H = 336
const OUT = join(BLOG_ROOT, "public", "thumbs")

const cats = JSON.parse(readFileSync(join(BLOG_ROOT, "categories.json"), "utf8"))

/*
 * 보조 도형 색.
 * 처음엔 흰색을 썼는데 연한 파스텔 배경 위에서는 거의 보이지 않았다.
 * 진한 색과 배경색을 섞은 중간톤이라야 작게 줄여도 형태가 남는다.
 */
const mix = (a, b, t) => {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [ar, ag, ab] = rgb(a)
  const [br, bg, bb] = rgb(b)
  const ch = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0")
  return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`
}

/* ── 그리기 도우미 ───────────────────────────────────────────────────── */

const rect = (x, y, w, h, fill, r = 10, o = 1) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" opacity="${o}"/>`
const circle = (cx, cy, r, fill, o = 1) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="${o}"/>`
const line = (x1, y1, x2, y2, stroke, w = 6, o = 1) =>
  `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`
const path = (d, stroke, w = 6, o = 1) =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${o}"/>`

/* ── 분류별 그림 ─────────────────────────────────────────────────────── */

const scenes = {
  // 시상대 + 별: 대회
  "2025-scpc": (ink, soft) =>
    [
      rect(196, 196, 96, 96, soft, 8),
      rect(272, 148, 96, 144, ink, 8),
      rect(348, 220, 96, 72, soft, 8),
      path("M320 60 l16 34 37 5 -27 26 7 37 -33 -18 -33 18 7 -37 -27 -26 37 -5 z", ink, 8),
    ].join(""),

  // 주사위 두 개: 게임사 대회
  nypc: (ink, soft) =>
    [
      rect(176, 120, 132, 132, soft, 20),
      circle(210, 154, 11, ink), circle(274, 218, 11, ink), circle(242, 186, 11, ink),
      rect(332, 152, 132, 132, ink, 20),
      circle(366, 186, 11, soft), circle(430, 186, 11, soft),
      circle(366, 250, 11, soft), circle(430, 250, 11, soft),
    ].join(""),

  // 중괄호 + 문서
  javascript: (ink, soft) =>
    [
      rect(236, 76, 168, 184, soft, 14),
      rect(264, 112, 112, 12, ink, 6, 0.55),
      rect(264, 142, 84, 12, ink, 6, 0.55),
      rect(264, 172, 100, 12, ink, 6, 0.55),
      path("M204 128 q-24 0 -24 26 t-24 26 q24 0 24 26 t24 26", ink, 10),
      path("M436 128 q24 0 24 26 t24 26 q-24 0 -24 26 t-24 26", ink, 10),
    ].join(""),

  // 노드와 간선: 일반 알고리즘
  algorithm: (ink, soft) =>
    [
      line(240, 106, 176, 216, ink, 7, 0.45),
      line(240, 106, 320, 186, ink, 7, 0.45),
      line(320, 186, 264, 268, ink, 7, 0.45),
      line(320, 186, 432, 138, ink, 7, 0.45),
      line(432, 138, 456, 250, ink, 7, 0.45),
      circle(240, 106, 26, ink), circle(320, 186, 26, ink),
      circle(176, 216, 22, soft), circle(264, 268, 22, soft),
      circle(432, 138, 22, soft), circle(456, 250, 22, soft),
    ].join(""),

  // 퍼져나가는 물결: 너비 우선 탐색
  "algorithm/bfs": (ink, soft) =>
    [
      circle(320, 168, 132, ink, 0.12),
      circle(320, 168, 92, ink, 0.2),
      circle(320, 168, 52, ink, 0.32),
      circle(320, 168, 20, ink),
      circle(452, 168, 16, soft), circle(320, 300, 16, soft),
      circle(188, 168, 16, soft), circle(320, 36, 16, soft),
    ].join(""),

  // 갈라지는 나무와 끊긴 가지: 백트래킹
  "algorithm/back-tracking": (ink, soft) =>
    [
      line(320, 78, 232, 166, ink, 7, 0.45),
      line(320, 78, 408, 166, ink, 7, 0.45),
      line(232, 166, 184, 258, ink, 7, 0.45),
      line(408, 166, 456, 258, ink, 7, 0.2),
      circle(320, 78, 24, ink),
      circle(232, 166, 20, ink), circle(184, 258, 18, soft),
      circle(408, 166, 20, ink, 0.35),
      circle(456, 258, 18, soft, 0.35),
      path("M436 238 l40 40 M476 238 l-40 40", ink, 8),
    ].join(""),

  // 반씩 좁혀 들어가는 구간: 이분 탐색
  "algorithm/binary-search": (ink, soft) =>
    [
      rect(150, 96, 340, 40, soft, 12),
      rect(150, 152, 170, 40, soft, 12),
      rect(320, 152, 170, 40, ink, 12, 0.25),
      rect(320, 208, 85, 40, ink, 12, 0.55),
      rect(405, 208, 85, 40, soft, 12),
      rect(320, 264, 44, 40, ink, 12),
      circle(342, 284, 0, ink),
    ].join(""),

  // 노드와 간선 (연결 강조): 그래프
  "algorithm/graph": (ink, soft) =>
    [
      line(200, 120, 320, 92, ink, 7, 0.45),
      line(320, 92, 440, 132, ink, 7, 0.45),
      line(200, 120, 252, 244, ink, 7, 0.45),
      line(252, 244, 396, 254, ink, 7, 0.45),
      line(396, 254, 440, 132, ink, 7, 0.45),
      line(320, 92, 252, 244, ink, 7, 0.25),
      circle(200, 120, 24, ink), circle(320, 92, 24, soft),
      circle(440, 132, 24, ink), circle(252, 244, 24, soft),
      circle(396, 254, 24, ink),
    ].join(""),

  // 큰 것부터 집어가는 막대: 그리디
  "algorithm/greedy": (ink, soft) =>
    [
      rect(168, 96, 56, 196, ink, 10),
      rect(240, 140, 56, 152, ink, 10, 0.55),
      rect(312, 180, 56, 112, soft, 10),
      rect(384, 214, 56, 78, soft, 10),
      rect(456, 244, 56, 48, soft, 10),
      path("M196 62 l0 -0.1 M168 66 l28 -30 28 30", ink, 9),
    ].join(""),
}

/* ── 출력 ────────────────────────────────────────────────────────────── */

mkdirSync(OUT, { recursive: true })

/** 그림이 없으면 상위 분류의 그림을 빌린다 */
function sceneFor(slug) {
  const parts = slug.split("/")
  for (let i = parts.length; i > 0; i--) {
    const key = parts.slice(0, i).join("/")
    if (scenes[key]) return scenes[key]
  }
  return scenes.algorithm
}

/*
 * 색은 최상위 분류 것으로 통일한다.
 * Algorithm 아래 글들이 저마다 다른 색 배지를 달면 목록이 산만해진다.
 * 그림만 세부 분류별로 다르게 해서, 같은 계열 안에서 구분이 되게 한다.
 */
const colorsFor = (slug) => cats[slug.split("/")[0]] ?? cats[slug]

const made = []
for (const [slug] of Object.entries(cats)) {
  const meta = { ...colorsFor(slug), label: cats[slug].label }
  const draw = sceneFor(slug)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${meta.label}">` +
    `<rect width="${W}" height="${H}" fill="${meta.tint}"/>` +
    draw(meta.ink, mix(meta.ink, meta.tint, 0.62)) +
    `</svg>`

  const file = join(OUT, `${slug.replace(/\//g, "-")}.svg`)
  writeFileSync(file, svg, "utf8")
  made.push(`${slug} → thumbs/${slug.replace(/\//g, "-")}.svg  (${svg.length}B)`)
}

console.log(`분류 썸네일 ${made.length}장 생성 → public/thumbs/`)
for (const m of made) console.log(`  ${m}`)

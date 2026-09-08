import type { SvgComponent } from "astro/types"
import Email from "@/assets/icons/email.svg"
import GitHub from "@/assets/icons/github.svg"
import RSS from "@/assets/icons/rss.svg"

export const SITE = {
  title: "aaarlaguswns",
  description: "기록해두지 않으면 사라지는 것들.",
  author: "aaarlaguswns",
  locale: "ko-KR",
  dir: "ltr",
  defaultPageImage: "/static/opengraph-image.png",
  defaultPostImage: "/static/1200x630.png",
} as const

export const NAVIGATION = [
  { href: "/blog", label: "글" },
  { href: "/tags", label: "태그" },
]

/*
 * 카테고리 폴더 이름은 주소에 쓰이느라 소문자·하이픈으로 눌려 있다.
 * 화면에 보여줄 이름은 여기서 정한다. 키는 폴더 경로 전체.
 * 없는 카테고리는 폴더 이름을 그대로 다듬어 쓴다(아래 categoryLabel).
 * 새 카테고리 폴더를 만들면 여기 한 줄 추가하면 된다.
 */
export const CATEGORY_LABELS: Record<string, string> = {
  "2025-scpc": "2025 SCPC",
  nypc: "NYPC",
  javascript: "JavaScript",
  algorithm: "Algorithm",
  "algorithm/bfs": "BFS",
  "algorithm/back-tracking": "Back Tracking",
  "algorithm/binary-search": "Binary Search",
  "algorithm/graph": "Graph",
  "algorithm/greedy": "Greedy",
}

export const SOCIALS: { href: string; label: string; icon: SvgComponent }[] = [
  { href: "https://github.com/aaarlaguswns", label: "GitHub", icon: GitHub },
  { href: "mailto:khj2006516@gmail.com", label: "Email", icon: Email },
  { href: "/rss.xml", label: "RSS", icon: RSS },
]

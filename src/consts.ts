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
 * 분류(카테고리) 정의.
 *
 * 폴더 이름은 주소에 쓰이느라 소문자·하이픈으로 눌려 있어서, 화면에 보여줄 이름과
 * 색을 여기서 정한다. 색은 목록 카드의 배지와 썸네일에 함께 쓰인다.
 *
 * 사이트(TypeScript)와 스크립트(Node)가 같이 읽어야 해서 JSON 으로 빼뒀다.
 * 새 분류를 만들면 categories.json 에 넣고 `node scripts/make-thumbs.mjs` 를 돌린다.
 * 정의가 없는 분류는 폴더 이름을 다듬어 쓰고, 색과 그림은 상위 분류 것을 빌린다.
 */
import categories from "../categories.json"

export type CategoryMeta = {
  label: string
  /** [라이트, 다크] 배지 글자색 */
  accent: [string, string]
  /** 썸네일 배경 */
  tint: string
  /** 썸네일 도형 */
  ink: string
}

export const CATEGORIES = categories as unknown as Record<string, CategoryMeta>

export const SOCIALS: { href: string; label: string; icon: SvgComponent }[] = [
  { href: "https://github.com/aaarlaguswns", label: "GitHub", icon: GitHub },
  { href: "mailto:khj2006516@gmail.com", label: "Email", icon: Email },
  { href: "/rss.xml", label: "RSS", icon: RSS },
]

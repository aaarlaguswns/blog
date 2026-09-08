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
 * 화면에 보여줄 이름과, 옵시디언 볼트에서 쓸 폴더 이름을 여기서 정한다.
 *
 * 사이트(TypeScript)와 스크립트(Node)가 함께 읽어야 해서 JSON 파일로 빼뒀다.
 * 새 분류를 만들면 category-labels.json 에 한 줄 추가하면 된다.
 * 없는 분류는 폴더 이름을 다듬어 쓴다(lib/content.ts 의 categoryLabel).
 */
import categoryLabels from "../category-labels.json"

export const CATEGORY_LABELS: Record<string, string> = categoryLabels

export const SOCIALS: { href: string; label: string; icon: SvgComponent }[] = [
  { href: "https://github.com/aaarlaguswns", label: "GitHub", icon: GitHub },
  { href: "mailto:khj2006516@gmail.com", label: "Email", icon: Email },
  { href: "/rss.xml", label: "RSS", icon: RSS },
]

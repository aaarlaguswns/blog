import { SITE } from "@/consts"

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(SITE.locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(date)
}

/*
 * 글의 id 는 폴더 구조 그대로다: "algorithm/binary-search/1920"
 * 마지막 조각이 글, 앞의 조각들이 카테고리 경로다.
 */

/** "algorithm/binary-search/1920" → ["algorithm", "binary-search"] */
export const categorySegments = (id: string) => id.split("/").slice(0, -1)

/** "algorithm/binary-search/1920" → "algorithm/binary-search" (없으면 "") */
export const categoryPath = (id: string) => categorySegments(id).join("/")

/** 카테고리 경로를 상위부터 누적한 목록. 빵부스러기(breadcrumb)에 쓴다. */
export const categoryTrail = (id: string) =>
  categorySegments(id).map((_, i, all) => all.slice(0, i + 1).join("/"))

export const normalizePath = (pathname: string) => {
  try {
    return decodeURIComponent(pathname).replace(/\/+$/, "")
  } catch {
    return pathname.replace(/\/+$/, "")
  }
}

export const hashId = (hash: string) => decodeURIComponent(hash.slice(1))

import { CATEGORIES, SITE } from "@/consts"
import { getCollection, type CollectionEntry } from "astro:content"
import { categoryPath, categorySegments } from "@/lib/utils"

export type Post = CollectionEntry<"blog">

export const pageTitle = (title: string) => `${title} | ${SITE.title}`

/** 공개된 글 전부, 최신순. 카테고리 폴더 안에 있든 아니든 다 나온다. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection("blog", ({ data }) => !data.draft)
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}

/**
 * 폴더 경로를 사람이 읽을 이름으로.
 * categories.json 에 있으면 그것을, 없으면 폴더 이름을 다듬어 쓴다.
 */
export function categoryLabel(path: string): string {
  if (CATEGORIES[path]) return CATEGORIES[path].label
  const last = path.split("/").at(-1) ?? path
  return last
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
}

/**
 * 글 하나를 목록 카드에 그릴 때 필요한 분류 정보.
 *
 * 배지는 최상위 분류를 보여준다 — 태그보다 큰 범주가 눈에 먼저 들어와야 하고,
 * 같은 계열 글이 같은 색으로 묶여 보여야 하기 때문이다.
 * 세부 분류(Binary Search 처럼)는 그 옆에 옅게 덧붙이고, 썸네일은 세부 분류의
 * 그림을 쓴다. 그래서 색은 통일되고 그림만 달라진다.
 */
export function postCategory(id: string) {
  const segments = id.split("/").slice(0, -1)
  if (!segments.length) return null

  const rootPath = segments[0]
  const leafPath = segments.join("/")
  const root = CATEGORIES[rootPath]

  return {
    root: { path: rootPath, label: categoryLabel(rootPath) },
    leaf:
      leafPath === rootPath
        ? null
        : { path: leafPath, label: categoryLabel(leafPath) },
    /** [라이트, 다크] 배지 글자색. 정의가 없으면 본문 색을 쓴다. */
    accent: root?.accent ?? null,
    /** 세부 분류의 그림. 없으면 상위 분류 것으로 거슬러 올라간다. */
    thumb: thumbFor(leafPath),
  }
}

function thumbFor(path: string): string | null {
  const parts = path.split("/")
  for (let i = parts.length; i > 0; i--) {
    const key = parts.slice(0, i).join("/")
    if (CATEGORIES[key]) return `/thumbs/${key.replace(/\//g, "-")}.svg`
  }
  return null
}

export type CategoryNode = {
  /** 폴더 경로. 예: "algorithm/binary-search" */
  path: string
  label: string
  /** 이 폴더에 바로 들어 있는 글 (하위 폴더 것은 빼고) */
  posts: Post[]
  /** 하위 폴더 */
  children: CategoryNode[]
  /** 하위 폴더까지 합친 글 수 */
  total: number
}

/**
 * 글들의 폴더 구조를 트리로 만든다.
 * 글 목록·카테고리 페이지·사이드바가 전부 이걸 쓴다.
 */
export async function getCategoryTree(): Promise<{
  roots: CategoryNode[]
  /** 폴더 경로 → 노드. 카테고리 페이지를 만들 때 쓴다. */
  byPath: Map<string, CategoryNode>
  /** 어느 폴더에도 안 들어간 글 */
  loose: Post[]
}> {
  const posts = await getPosts()
  const byPath = new Map<string, CategoryNode>()
  const loose: Post[] = []

  const ensure = (path: string): CategoryNode => {
    const existing = byPath.get(path)
    if (existing) return existing
    const node: CategoryNode = {
      path,
      label: categoryLabel(path),
      posts: [],
      children: [],
      total: 0,
    }
    byPath.set(path, node)

    const parentPath = path.split("/").slice(0, -1).join("/")
    if (parentPath) ensure(parentPath).children.push(node)
    return node
  }

  for (const post of posts) {
    const segments = categorySegments(post.id)
    if (!segments.length) {
      loose.push(post)
      continue
    }
    // 상위 폴더들도 빠짐없이 만들어 둔다 (글이 직접 없어도 트리에 있어야 한다)
    for (let i = 1; i <= segments.length; i++) {
      ensure(segments.slice(0, i).join("/"))
    }
    ensure(categoryPath(post.id)).posts.push(post)
  }

  // 하위까지 합친 개수를 아래에서 위로 채운다
  const countUp = (node: CategoryNode): number => {
    node.total = node.posts.length + node.children.reduce((s, c) => s + countUp(c), 0)
    return node.total
  }

  const roots = [...byPath.values()].filter((n) => !n.path.includes("/"))
  const byLabel = (a: CategoryNode, b: CategoryNode) =>
    a.label.localeCompare(b.label, "ko")

  for (const root of roots) countUp(root)
  for (const node of byPath.values()) node.children.sort(byLabel)
  roots.sort(byLabel)

  return { roots, byPath, loose }
}

export async function getTags(): Promise<Map<string, Post[]>> {
  const posts = await getPosts()
  const tags = new Map<string, Post[]>()
  for (const post of posts) {
    for (const tag of new Set(post.data.tags ?? [])) {
      const tagged = tags.get(tag)
      if (tagged) tagged.push(post)
      else tags.set(tag, [post])
    }
  }
  return new Map(
    [...tags].sort(
      ([a, postsA], [b, postsB]) =>
        postsB.length - postsA.length || a.localeCompare(b, "ko"),
    ),
  )
}

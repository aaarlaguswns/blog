/*
 * 그래프 뷰가 읽는 데이터. 빌드할 때 한 번 만들어 /graph.json 으로 내보낸다.
 *
 * 노드는 세 종류다.
 *   post  글
 *   cat   분류(폴더)
 *   tag   태그
 *
 * 글끼리 서로 링크한 경우가 아직 거의 없어서, 링크만으로 그리면 점만 흩어진
 * 그래프가 된다. 그래서 글 → 분류, 하위 분류 → 상위 분류, 글 → 태그도 선으로 잇는다.
 * 그러면 같은 분류의 글이 한데 모이고, 태그가 분류를 가로질러 다리를 놓는다.
 */
import type { APIRoute } from "astro"
import { CATEGORIES } from "@/consts"
import { getCategoryTree, getPosts } from "@/lib/content"

type GraphNode = {
  id: string
  label: string
  type: "post" | "cat" | "tag"
  url: string
  /** 색을 정하는 최상위 분류 (없으면 null) */
  group: string | null
}

type GraphLink = {
  source: string
  target: string
  kind: "link" | "cat" | "tag"
}

/** 본문 속 내부 링크: ](/blog/xxx) 또는 ](/blog/xxx#제목) */
const INTERNAL_LINK = /\]\(\s*\/blog\/([^)\s#?]+)/g

export const GET: APIRoute = async () => {
  const posts = await getPosts()
  const { byPath } = await getCategoryTree()

  const nodes = new Map<string, GraphNode>()
  const links: GraphLink[] = []
  const linkKeys = new Set<string>()

  const addLink = (source: string, target: string, kind: GraphLink["kind"]) => {
    if (source === target) return
    // 방향 없는 선이므로 a-b 와 b-a 는 한 번만 넣는다
    const key = [source, target].sort().join("|") + `|${kind}`
    if (linkKeys.has(key)) return
    linkKeys.add(key)
    links.push({ source, target, kind })
  }

  // 분류
  for (const node of byPath.values()) {
    nodes.set(`cat:${node.path}`, {
      id: `cat:${node.path}`,
      label: node.label,
      type: "cat",
      url: `/blog/${node.path}`,
      group: node.path.split("/")[0],
    })
    const parent = node.path.split("/").slice(0, -1).join("/")
    if (parent) addLink(`cat:${node.path}`, `cat:${parent}`, "cat")
  }

  // 글
  const postIds = new Set(posts.map((p) => p.id))
  for (const post of posts) {
    const segments = post.id.split("/").slice(0, -1)
    nodes.set(`post:${post.id}`, {
      id: `post:${post.id}`,
      label: post.data.title,
      type: "post",
      url: `/blog/${post.id}`,
      group: segments[0] ?? null,
    })
    if (segments.length) addLink(`post:${post.id}`, `cat:${segments.join("/")}`, "cat")

    for (const tag of post.data.tags ?? []) {
      const id = `tag:${tag}`
      if (!nodes.has(id)) {
        nodes.set(id, { id, label: `#${tag}`, type: "tag", url: `/tags/${tag}`, group: null })
      }
      addLink(`post:${post.id}`, id, "tag")
    }

    for (const m of (post.body ?? "").matchAll(INTERNAL_LINK)) {
      let target: string
      try {
        target = decodeURIComponent(m[1]).replace(/\/+$/, "")
      } catch {
        continue
      }
      if (postIds.has(target)) addLink(`post:${post.id}`, `post:${target}`, "link")
    }
  }

  // 분류별 색 [라이트, 다크]. 그래프가 테마에 맞춰 골라 쓴다.
  const groups = Object.fromEntries(
    Object.entries(CATEGORIES)
      .filter(([path]) => !path.includes("/"))
      .map(([path, meta]) => [path, meta.accent]),
  )

  return new Response(
    JSON.stringify({ nodes: [...nodes.values()], links, groups }),
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  )
}

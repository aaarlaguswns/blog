import { glob } from "astro/loaders"
import { defineCollection } from "astro:content"
import { z } from "astro/zod"

/*
 * 글 하나의 frontmatter 계약.
 *
 * 텔레그램 스킬(scripts/new-post.mjs)과 옵시디언 동기화(scripts/sync-obsidian.mjs)가
 * 모두 이 스키마에 맞춰 파일을 만든다. 필드를 바꾸면 그 두 곳도 같이 고쳐야 한다.
 */
const blog = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.md",
    base: "./src/content/blog",
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      /** 시리즈(하위 글) 정렬용. 단독 글은 안 써도 된다. */
      order: z.number().optional(),
      tags: z.array(z.string()).optional(),
      /** 목록·OG 이미지에 쓰이는 대표 이미지. */
      image: image().optional(),
      /** true 면 빌드에서 제외된다. 옵시디언 쪽 기본값이 이것이다. */
      draft: z.boolean().optional(),
    }),
})

export const collections = { blog }

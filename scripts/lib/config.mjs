/*
 * 스크립트들이 공유하는 경로·상수.
 * 환경변수로 덮어쓸 수 있게 해둔 것은 나중에 볼트를 옮기거나
 * 테스트용 임시 디렉터리로 돌려볼 때를 위해서다.
 */

import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))

/** 블로그 저장소 루트 (scripts/lib/ 에서 두 단계 위) */
export const BLOG_ROOT = resolve(HERE, "..", "..")

/** 글이 실제로 사는 곳. content.config.ts 의 base 와 반드시 같아야 한다. */
export const POSTS_DIR = join(BLOG_ROOT, "src", "content", "blog")

/** 옵시디언 볼트 루트 */
export const VAULT_DIR =
  process.env.BLOG_VAULT_DIR ?? join(homedir(), "Documents", "Obsidian Vault")

/**
 * 볼트에서 감시할 폴더. 여기 밖은 절대 읽지 않는다.
 * 자동 배포가 걸려 있으므로 감시 범위를 좁히는 것이 유일한 유출 방지책이다.
 */
export const VAULT_BLOG_DIR =
  process.env.BLOG_VAULT_BLOG_DIR ?? join(VAULT_DIR, "Blog")

export const SITE_URL = "https://aaarlaguswns.pages.dev"

/**
 * 이 값이 frontmatter 에 있으면 "볼트에서 온 글" 이라는 뜻이다.
 * 볼트에서 지워진 글만 골라 지우려면 출처를 알아야 한다.
 * (텔레그램으로 쓴 글까지 같이 지워버리면 안 된다)
 */
export const SOURCE_KEY = "source"
export const SOURCE_OBSIDIAN = "obsidian"

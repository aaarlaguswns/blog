# aaarlaguswns.pages.dev

Astro 로 만든 개인 블로그. `v4` 브랜치에 푸시하면 Cloudflare Pages 가 자동으로 배포한다.

## 글은 어디에 있나

**원본은 옵시디언 볼트 `~/Documents/Obsidian Vault/Blog/` 다.**
저장소의 `src/content/blog/` 는 볼트에서 만들어진 결과물이라 직접 고치면 덮어써진다.

감시 데몬이 볼트를 지켜보다가 변경 후 20초쯤 조용해지면 동기화 → 빌드 → 커밋 → 푸시한다.
사이트에 나가는 조건은 frontmatter 의 `publish: true` 하나뿐이다.

글 쓰는 길은 둘.

| 방법 | 어떻게 | 발행 |
| --- | --- | --- |
| 옵시디언 | 볼트 `Blog/` 에 노트 작성 | `publish: true` 를 넣으면 1~2분 뒤 자동 |
| 텔레그램 | OpenClaw 에게 "블로그에 ~ 써줘" | 초안으로 만들고, 사람이 "발행" 해야 나감 |

둘 다 결국 볼트를 고치는 것이라 서로 부딪히지 않는다.

## 구조

```
src/
  content/blog/<분류>/<글>/index.md  글 하나. 폴더 구조가 그대로 주소가 된다
  content/blog/<분류>/<글>/assets/   그 글에 쓰이는 이미지
  content.config.ts                 frontmatter 스키마 (여기가 계약)
  consts.ts                         사이트 제목·설명·네비게이션·소셜
  styles/korean.css                 한글 타이포그래피 조정 (테마 위에 덮어씀)
  styles/pretendard.css             생성 파일 — 직접 고치지 말 것
categories.json                     분류 이름·색 (사이트와 스크립트가 함께 읽음)
public/
  fonts/pretendard/                 Pretendard 동적 서브셋 92개
  thumbs/                           분류 썸네일 (생성 파일)
  _redirects                        Quartz 시절 주소 → 새 주소 (생성 파일)
scripts/                            아래 참고
```

## 분류

글은 폴더에 담기고, 폴더 구조가 그대로 주소가 된다.

```
src/content/blog/algorithm/binary-search/1920/index.md
        → https://aaarlaguswns.pages.dev/blog/algorithm/binary-search/1920
```

`/blog/algorithm` 과 `/blog/algorithm/binary-search` 는 자동으로 그 분류의
목록 페이지가 된다. 깊이 제한은 없다.

목록 카드는 분류를 태그보다 크게 보여준다. 색이 들어간 배지가 최상위 분류,
그 옆 옅은 배지가 세부 분류, 오른쪽 썸네일은 세부 분류의 그림이다.
글에 `image` 가 있으면 썸네일 대신 그걸 쓴다.

폴더 이름은 주소에 쓰이느라 소문자·하이픈이므로, 보여줄 이름과 색은
**`categories.json`** 에 적는다. 없는 분류는 폴더 이름을 다듬어 쓰고 색·그림은
상위 분류 것을 빌린다.

분류를 새로 만들면:

```bash
# categories.json 에 { "슬러그": { label, accent, tint, ink } } 추가한 뒤
node scripts/make-thumbs.mjs
```

그림 자체를 새로 그리려면 `scripts/make-thumbs.mjs` 의 `scenes` 에 추가한다.
없으면 상위 분류의 그림을 쓴다.

옵시디언 볼트의 `Blog/` 안에 폴더를 만들면 그대로 분류가 된다.
텔레그램에서는 `--category` 로 지정한다.

## frontmatter

```yaml
---
title: 제목            # 필수
description: 한 줄 요약  # 필수 — 목록·검색결과·공유카드에 쓰인다
date: 2026-09-08       # 필수
tags: [태그, 목록]      # 선택
image: ./assets/x.png  # 선택, 대표 이미지
draft: true            # 있으면 사이트에 안 나감
source: obsidian       # 볼트에서 온 글이라는 표시 (자동)
---
```

본문에서 쓸 수 있는 것: 콜아웃(`:::note` `:::tip` `:::warning` `:::caution` `:::important`,
접으려면 `:::note[제목]{closed}`), 코드 블록, 표, 수식.
이미지는 `./assets/파일명` 상대 경로로 쓰면 빌드 때 webp 로 최적화된다.

## 스크립트

| 명령 | 하는 일 |
| --- | --- |
| `npm run dev` | 개발 서버 (localhost:4321) |
| `npm run build` | 빌드 + 타입 검사. **푸시 전에 반드시 통과시킬 것** |
| `scripts/post.mjs` | **볼트의** 글 생성·조회·수정·발행·첨부·삭제 |
| `scripts/publish.sh` | 커밋 + 푸시. 평소엔 데몬이 알아서 부른다 |
| `scripts/sync-obsidian.mjs` | 볼트 `Blog/` → `src/content/blog/` 동기화 |
| `scripts/export-to-vault.mjs` | 저장소 글 → 볼트 (이사용, 1회성) |
| `scripts/watch.sh` | 볼트 감시 데몬 (launchd 가 띄움) |
| `scripts/install-watcher.sh` | 감시 데몬 등록/해제/상태 |
| `scripts/migrate-quartz.mjs` | Quartz 글 이전 (1회성, 기록용으로 남김) |
| `scripts/make-thumbs.mjs` | 분류 썸네일 SVG 생성 |
| `scripts/fetch-pretendard.sh` | 폰트 버전 올릴 때만 |

`post.mjs` 는 커밋하지 않는다. 글을 만드는 일과 공개하는 일을 일부러 갈라놨다.

## 주의할 점

- **`src/content/blog/` 를 직접 고치지 말 것.** 볼트가 원본이라 다음 동기화에 덮어써진다.
  고칠 곳은 볼트, 또는 `scripts/post.mjs`.
- **옵시디언 감시 범위는 볼트의 `Blog/` 폴더 하나뿐이다.** 그 밖은 읽지 않는다.
  거기에 더해 `publish: true` 가 없는 글은 초안으로 남아 사이트에 뜨지 않는다.
- **제목이나 분류를 바꾸면 주소가 바뀐다.** 이미 공개한 글이면 기존 링크가 깨진다.
- 사이트가 안 바뀌면 `tail -20 .logs/watch.log`. 빌드가 깨지면 푸시하지 않고 이유를 남긴다.
- 요약(`description`)을 안 쓰면 본문 첫 문단을 가져다 쓰고, 그 문단은 본문에서 빠진다.
  첫 문단을 본문에 남기고 싶으면 `description` 을 직접 써두면 된다.

## 브랜치

- `v4` — 배포되는 브랜치. Cloudflare Pages 가 이걸 본다. (Quartz 시절 이름 그대로다)
- `quartz-archive` — 갈아엎기 전 Quartz 사이트 전체. 되돌릴 일이 있으면 여기.

## Cloudflare Pages 설정

| 항목 | 값 |
| --- | --- |
| 프로덕션 브랜치 | `v4` |
| 빌드 명령 | `npm run build` |
| 출력 디렉터리 | `dist` |
| 환경변수 | `NODE_VERSION=22` |

---

테마는 [astro-erudite](https://github.com/jktrn/astro-erudite) (MIT) 를 바탕으로 고쳤고,
본문 글꼴은 [Pretendard](https://github.com/orioncactus/pretendard) (SIL OFL 1.1) 다.

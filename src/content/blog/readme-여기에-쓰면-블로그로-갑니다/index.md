---
title: README - 여기에 쓰면 블로그로 갑니다
description: 이 폴더가 어떻게 동작하는지 적어둔 안내문이다. publish 가 없으니 사이트에는 안 뜬다.
date: 2026-09-08T11:49:15.149Z
source: obsidian
draft: true
---

이 폴더(`Blog/`)에 쓴 글만 블로그로 넘어간다. 볼트의 다른 폴더는 읽지 않는다.

## 사이트에 올리려면

맨 위에 `publish: true` 를 넣어야 한다. 없으면 초안으로만 남는다.

```
---
publish: true
title: 글 제목
description: 한 줄 요약
tags: [태그]
---
```

`title` 을 안 쓰면 파일 이름이, `description` 을 안 쓰면 첫 문단이 요약이 된다.
(요약으로 쓰인 첫 문단은 본문에서 빠진다. 남기고 싶으면 `description` 을 직접 쓸 것)

## 분류

이 폴더 안에 폴더를 만들면 그대로 블로그 분류가 된다.

```
Blog/Algorithm/Binary Search/1920.md  →  /blog/algorithm/binary-search/1920
```

목록에서는 최상위 폴더가 색 배지로, 그 아래 폴더가 옅은 배지로 나온다.

**새 폴더를 만들면 색과 썸네일이 없다.** 맥미니에서 한 번만 해주면 된다:

1. `~/openclaw/blog/categories.json` 에 한 줄 추가
2. `cd ~/openclaw/blog && node scripts/make-thumbs.mjs`

안 해도 글은 정상적으로 올라간다. 상위 분류의 색과 그림을 빌려 쓴다.

## 사진

노트 옆 `assets/` 폴더에 넣고 본문에서 `![설명](./assets/사진.png)` 로 부른다.

## 언제 올라가나

저장하고 20초쯤 조용하면 자동으로 커밋·배포된다. 사이트 반영까지 1~2분.
안 올라가면 `~/openclaw/blog/.logs/watch.log` 를 볼 것.

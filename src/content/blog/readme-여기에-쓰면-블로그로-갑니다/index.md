---
title: README - 여기에 쓰면 블로그로 갑니다
description: 이 폴더가 어떻게 동작하는지 적어둔 안내문이다. publish 가 없으니 사이트에는 안 뜬다.
date: 2026-09-08T11:49:15.149Z
source: obsidian
draft: true
---

이 폴더(`Blog/`)에 쓴 글만 블로그로 넘어간다. 볼트의 다른 폴더는 읽지 않는다.

## 사이트에 올리려면

frontmatter 에 `publish: true` 를 넣어야 한다. 없으면 초안으로만 남고 사이트에 안 뜬다.

```
---
publish: true
title: 글 제목
description: 한 줄 요약
tags: [태그]
---
```

`title` 을 안 쓰면 파일 이름이, `description` 을 안 쓰면 첫 문단이 요약이 된다.

## 분류

이 폴더 안에 폴더를 만들면 그대로 블로그 분류가 된다.
`Blog/알고리즘/DP/배낭.md` → `/blog/알고리즘/dp/배낭`

## 언제 올라가나

저장하고 20초쯤 지나 조용해지면 자동으로 커밋·배포된다. 사이트 반영까지 1~2분.

감시 유지 테스트 20:57:47

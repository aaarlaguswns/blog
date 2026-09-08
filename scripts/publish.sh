#!/usr/bin/env bash
#
# 바뀐 글을 커밋하고 푸시한다. 푸시가 곧 배포다 (Cloudflare Pages 가 물려 있다).
#
#   scripts/publish.sh                       자동 생성 메시지로 커밋
#   scripts/publish.sh "글 제목 고침"         메시지 지정
#   scripts/publish.sh --check               바뀐 게 있는지만 보고 종료
#
# 이 스크립트는 "공개" 를 실행하는 유일한 지점이다.
# 글을 만들고 고치는 일(post.mjs, sync-obsidian.mjs)과 일부러 갈라놨다.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# 블로그가 자체 저장소가 아니면 git 명령이 상위 디렉터리(OpenClaw 워크스페이스)의
# 저장소로 새어나간다. 남의 저장소에 글을 커밋하는 사고를 여기서 막는다.
TOPLEVEL="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ "$TOPLEVEL" != "$ROOT" ]]; then
  echo "✗ $ROOT 이 git 저장소의 최상단이 아니다 (현재: ${TOPLEVEL:-없음})." >&2
  echo "  블로그 저장소를 여기에 clone 하거나 git init 한 뒤 다시 실행할 것." >&2
  exit 1
fi

if [[ "${1:-}" == "--check" ]]; then
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "바뀐 것 있음:"
    git status --short
    exit 0
  fi
  echo "바뀐 것 없음"
  exit 0
fi

if [[ -z "$(git status --porcelain)" ]]; then
  echo "바뀐 것이 없어서 아무것도 안 했다."
  exit 0
fi

# 무엇이 바뀌었는지 먼저 보여준다 — 로그만 보고도 뭘 내보냈는지 알 수 있게.
echo "── 내보낼 변경 ──"
git status --short
echo

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
MESSAGE="${1:-}"

if [[ -z "$MESSAGE" ]]; then
  # 글 폴더 이름에서 메시지를 만든다
  CHANGED="$(git status --porcelain \
    | sed -n 's|.* src/content/blog/\([^/]*\)/.*|\1|p' \
    | sort -u | head -3 | paste -sd ', ' -)"
  if [[ -n "$CHANGED" ]]; then
    MESSAGE="글 업데이트: $CHANGED"
  else
    MESSAGE="사이트 업데이트"
  fi
fi

git add -A
git commit -q -m "$MESSAGE"
echo "커밋: $(git rev-parse --short HEAD) $MESSAGE"

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "원격(origin)이 없어서 푸시를 건너뛴다. 커밋은 남아 있다."
  exit 0
fi

git push -q origin "$BRANCH"
echo "푸시 완료 → $BRANCH"
echo "Cloudflare Pages 가 빌드를 시작한다. 보통 1~2분 뒤 반영:"
echo "  https://aaarlaguswns.pages.dev"

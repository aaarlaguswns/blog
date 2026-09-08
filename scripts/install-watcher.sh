#!/usr/bin/env bash
#
# 옵시디언 감시 데몬을 launchd 에 등록/해제한다.
#
#   scripts/install-watcher.sh            등록하고 바로 실행
#   scripts/install-watcher.sh --uninstall 해제
#   scripts/install-watcher.sh --status    상태 확인
#
# 등록 전에 기존 등록 상태를 먼저 확인하고, 있으면 갈아끼운다.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="dev.aaarlaguswns.blog-watch"
TEMPLATE="$ROOT/$LABEL.plist"
TARGET="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"

status() {
  if launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1; then
    echo "등록됨:"
    launchctl print "$DOMAIN/$LABEL" | grep -E "state|pid|last exit" | sed 's/^/  /'
    echo "로그: $ROOT/.logs/watch.log"
  else
    echo "등록되지 않음"
  fi
}

case "${1:-}" in
  --status) status; exit 0 ;;
  --uninstall)
    launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
    rm -f "$TARGET"
    echo "해제했다. 볼트 자동 배포가 멈춘다."
    exit 0
    ;;
esac

# 블로그가 제대로 된 저장소인지 먼저 본다. 아니면 감시해봐야 푸시를 못 한다.
if [[ "$(git -C "$ROOT" rev-parse --show-toplevel 2>/dev/null || true)" != "$ROOT" ]]; then
  echo "✗ $ROOT 이 git 저장소의 최상단이 아니다. 먼저 저장소를 준비할 것." >&2
  exit 1
fi

command -v fswatch >/dev/null 2>&1 || { echo "✗ fswatch 가 없다: brew install fswatch" >&2; exit 1; }

mkdir -p "$HOME/Library/LaunchAgents" "$ROOT/.logs"

# 템플릿의 자리표시자를 실제 경로로 바꿔 넣는다
sed -e "s|__BLOG_ROOT__|$ROOT|g" -e "s|__HOME__|$HOME|g" "$TEMPLATE" > "$TARGET"
plutil -lint "$TARGET" >/dev/null

# 이미 떠 있으면 내리고 다시 올린다
launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
launchctl bootstrap "$DOMAIN" "$TARGET"
launchctl enable "$DOMAIN/$LABEL"

echo "등록 완료: $TARGET"
echo
status

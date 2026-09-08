#!/usr/bin/env bash
#
# 옵시디언 볼트의 Blog/ 폴더를 감시하다가, 잠잠해지면 동기화 → 커밋 → 푸시.
# launchd (~/Library/LaunchAgents/dev.aaarlaguswns.blog-watch.plist) 가 상시 띄운다.
#
# 디바운스를 두는 이유: 옵시디언은 타이핑 중에도 수시로 저장한다.
# 저장할 때마다 배포하면 Cloudflare 무료 빌드 한도(월 500회)를 하루에 태운다.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEBOUNCE="${BLOG_WATCH_DEBOUNCE:-20}"   # 마지막 변경 후 이만큼 조용하면 실행 (초)
VAULT="${BLOG_VAULT_BLOG_DIR:-$HOME/Documents/Obsidian Vault/Blog}"
LOG_DIR="$ROOT/.logs"
mkdir -p "$LOG_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

if ! command -v fswatch >/dev/null 2>&1; then
  log "fswatch 가 없다. 'brew install fswatch' 후 다시 시작할 것."
  exit 1
fi

mkdir -p "$VAULT"
log "감시 시작: $VAULT (디바운스 ${DEBOUNCE}초)"

#
# 주의: 이 함수 안의 모든 외부 명령은 stdin 을 /dev/null 로 막아야 한다.
#
# 이 함수는 `fswatch | while read` 루프 안에서 불린다. 그 루프의 stdin 은
# fswatch 의 파이프인데, npm 이나 git 이 stdin 을 물려받으면 파이프를 빨아들여서
# 다음 read 가 EOF 를 받고 감시가 통째로 죽는다.
# (launchd 가 되살려주긴 하지만 그 사이 변경을 놓친다)
#
sync_and_publish() {
  log "── 동기화 시작 ──"
  local result
  if ! result="$(node scripts/sync-obsidian.mjs --json 2>&1 </dev/null)"; then
    log "동기화 실패: $result"
    return 1
  fi

  local changed
  changed="$(printf '%s' "$result" | node -e '
    let s = ""
    process.stdin.on("data", d => s += d)
    process.stdin.on("end", () => {
      try { process.stdout.write(String(JSON.parse(s).changed ?? 0)) }
      catch { process.stdout.write("0") }
    })
  ')"

  if [[ "$changed" == "0" ]]; then
    log "바뀐 글 없음"
    return 0
  fi

  log "바뀐 글 ${changed}개 — 발행한다"
  # 빌드가 깨지는 글을 사이트에 올리지 않는다. 실패하면 커밋도 안 한다.
  if ! npm run build >"$LOG_DIR/build.log" 2>&1 </dev/null; then
    log "빌드 실패 — 푸시하지 않는다. 자세한 내용: $LOG_DIR/build.log"
    tail -20 "$LOG_DIR/build.log"
    return 1
  fi

  scripts/publish.sh "옵시디언 동기화" </dev/null 2>&1 | while read -r l; do log "  $l"; done
}

# 시작할 때 한 번 맞춰둔다 (감시가 꺼져 있는 동안 바뀐 것 반영)
sync_and_publish </dev/null

#
# 디바운스: "마지막 변경 후 DEBOUNCE 초 동안 조용하면 그때 한 번 실행".
#
# read -t 의 반환값으로 타임아웃과 EOF 를 가르는 방법은 쓰지 않는다.
# macOS 기본 /bin/bash 는 3.2 라서 타임아웃에 1 을 돌려주는데, 이건 EOF 와
# 구분이 안 된다 (bash 4 부터 128 초과 값을 준다). 그걸 모르고 짜면
# 첫 타임아웃마다 감시가 죽는다.
#
# 그래서 감시와 판단을 갈라놓는다:
#   · fswatch 는 변경이 생길 때마다 표시 파일을 건드리기만 한다
#   · 본 루프는 그 파일이 마지막으로 바뀐 지 얼마나 됐는지만 본다
# bash 버전에 기대지 않고, "조용해졌는지"를 정확히 판단할 수 있다.
#
MARKER="$LOG_DIR/.dirty"
rm -f "$MARKER"

fswatch -0 -r --latency 2 -e '/\.' "$VAULT" \
  | while IFS= read -r -d "" path; do
      case "$path" in
        *.md|*.png|*.jpg|*.jpeg|*.gif|*.webp|*.avif|*.svg) touch "$MARKER" ;;
      esac
    done &
WATCHER_PID=$!

# 이 스크립트가 끝날 때 감시 파이프라인도 같이 정리한다
trap 'kill "$WATCHER_PID" 2>/dev/null; exit' TERM INT

while true; do
  sleep 5

  if ! kill -0 "$WATCHER_PID" 2>/dev/null; then
    log "fswatch 가 멈췄다. 감시를 끝낸다 — launchd 가 다시 띄운다."
    exit 1
  fi

  [ -e "$MARKER" ] || continue

  # 표시 파일이 마지막으로 건드려진 뒤 얼마나 지났나 (BSD stat)
  changed_at=$(stat -f %m "$MARKER" 2>/dev/null) || continue
  quiet=$(( $(date +%s) - changed_at ))
  [ "$quiet" -ge "$DEBOUNCE" ] || continue

  rm -f "$MARKER"
  sync_and_publish </dev/null
done

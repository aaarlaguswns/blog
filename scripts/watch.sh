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

sync_and_publish() {
  log "── 동기화 시작 ──"
  local result
  if ! result="$(node scripts/sync-obsidian.mjs --json 2>&1)"; then
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
  if ! npm run build >"$LOG_DIR/build.log" 2>&1; then
    log "빌드 실패 — 푸시하지 않는다. 자세한 내용: $LOG_DIR/build.log"
    tail -20 "$LOG_DIR/build.log"
    return 1
  fi

  scripts/publish.sh "옵시디언 동기화" 2>&1 | while read -r l; do log "  $l"; done
}

# 시작할 때 한 번 맞춰둔다 (감시가 꺼져 있는 동안 바뀐 것 반영)
sync_and_publish

# fswatch 가 변경 경로를 NUL 로 구분해 흘려보낸다.
# 마지막 이벤트 후 DEBOUNCE 초 동안 조용하면 그때 한 번 실행한다.
#
# read 의 반환값을 반드시 구분해야 한다:
#   0     → 경로를 읽었다
#   >128  → 타임아웃 = 조용해졌다
#   그 외 → EOF, 즉 fswatch 가 죽었다. 여기서 빠져나가지 않으면 무한루프가 된다.
fswatch -0 -r --latency 2 -e '/\.' "$VAULT" | {
  pending=0
  while true; do
    IFS= read -r -d "" -t "$DEBOUNCE" path
    rc=$?
    if [[ $rc -eq 0 ]]; then
      case "$path" in
        *.md|*.png|*.jpg|*.jpeg|*.gif|*.webp|*.avif|*.svg) pending=1 ;;
      esac
    elif [[ $rc -gt 128 ]]; then
      if [[ "$pending" == "1" ]]; then
        pending=0
        sync_and_publish
      fi
    else
      log "fswatch 가 종료됐다 (read rc=$rc). 감시를 끝낸다 — launchd 가 다시 띄운다."
      exit 1
    fi
  done
}

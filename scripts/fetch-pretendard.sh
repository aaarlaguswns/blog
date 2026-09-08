#!/usr/bin/env bash
# Pretendard Variable 동적 서브셋을 public/fonts/pretendard/ 로 내려받고
# src/styles/pretendard.css 를 생성한다. 폰트 버전 올릴 때만 실행하면 된다.
set -euo pipefail
VERSION="${1:-v1.3.9}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@${VERSION}/packages/pretendard/dist/web/variable"
DEST="$ROOT/public/fonts/pretendard"

mkdir -p "$DEST"
echo "→ 서브셋 woff2 92개 내려받는 중 ($VERSION)"
seq 0 91 | xargs -P 12 -I{} curl -sfS \
  -o "$DEST/PretendardVariable.subset.{}.woff2" \
  "$BASE/woff2-dynamic-subset/PretendardVariable.subset.{}.woff2"

echo "→ CSS 생성 중"
{
  cat <<'HDR'
/*
 * Pretendard Variable — 동적 서브셋 (92개 청크)
 * 브라우저가 페이지에 실제로 쓰인 글자 범위의 청크만 내려받는다.
 * 원본: https://github.com/orioncactus/pretendard (SIL OFL 1.1)
 * 이 파일은 scripts/fetch-pretendard.sh 가 생성한다 — 직접 수정하지 말 것.
 */
HDR
  curl -sfS "$BASE/pretendardvariable-dynamic-subset.css" \
    | sed 's|\./woff2-dynamic-subset/|/fonts/pretendard/|g'
} > "$ROOT/src/styles/pretendard.css"

echo "✓ 완료: $(ls "$DEST" | wc -l | tr -d ' ')개 폰트, $(du -sh "$DEST" | cut -f1)"

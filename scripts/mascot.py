"""
블로그 마스코트. 원본은 저장소 맨 위의 mascot.json 이다 (404 페이지도 같이 읽는다).

핑구 팬아트다. 공식 이미지를 가져온 게 아니라 16×16 도트로 직접 그렸다.
핑구는 저작권·상표가 살아있는 캐릭터라, 권리자가 내려달라고 하면 이 파일만 바꾸고
python3 scripts/make-icons.py 를 다시 돌리면 사이트 전체의 아이콘이 바뀐다.
"""

import json
from pathlib import Path

_data = json.loads((Path(__file__).resolve().parent.parent / "mascot.json").read_text(encoding="utf-8"))

PIXELS: list[str] = _data["pixels"]
COLORS: dict[str, tuple[int, int, int]] = {
    k: tuple(int(v[i : i + 2], 16) for i in (1, 3, 5)) for k, v in _data["colors"].items()
}

assert len(PIXELS) == 16 and all(len(r) == 16 for r in PIXELS), "16×16 이어야 한다"

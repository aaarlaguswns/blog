"""
블로그 마스코트 펭귄. 원본은 저장소 맨 위의 mascot.json 이다 (404 페이지도 같이 읽는다).

핑구에서 느낌만 빌린 오리지널 캐릭터다. 핑구는 저작권·상표가 살아있는 캐릭터라
사이트 얼굴로 그대로 쓰지 않는다. 구별점: 2등신 동글이, 머리 위 삐친 깃털 한 가닥,
분홍 볼, 짧은 부리.
"""

import json
from pathlib import Path

_data = json.loads((Path(__file__).resolve().parent.parent / "mascot.json").read_text(encoding="utf-8"))

PIXELS: list[str] = _data["pixels"]
COLORS: dict[str, tuple[int, int, int]] = {
    k: tuple(int(v[i : i + 2], 16) for i in (1, 3, 5)) for k, v in _data["colors"].items()
}

assert len(PIXELS) == 16 and all(len(r) == 16 for r in PIXELS), "16×16 이어야 한다"

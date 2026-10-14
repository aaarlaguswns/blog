#!/usr/bin/env python3
"""
마스코트(핑구 팬아트)로 사이트 아이콘 일체를 만든다.   python3 scripts/make-icons.py

만드는 것
  public/favicon.svg                    탭 아이콘 (도트 그대로, 벡터)
  public/favicon.ico                    오래된 브라우저용 (16·32·48)
  public/favicon-96x96.png
  public/apple-touch-icon.png           아이폰 홈 화면 (180, 배경 있음)
  public/web-app-manifest-192x192.png   안드로이드 홈 화면 (가장자리 잘려도 되게 여백)
  public/web-app-manifest-512x512.png
  public/static/og.png                  링크 공유 미리보기 (1200×630)
  src/assets/logo.svg                   사이드바 로고

필요한 것: Pillow, fontTools (+brotli). 모양은 저장소 맨 위 mascot.json 에서 고친다.

핑구는 몸이 까매서 어두운 배경(다크모드, 어두운 탭 바)에 묻힌다. 그래서
  · 탭 아이콘은 어두운 배경일 때만 얇은 밝은 테두리를 두르고
  · 사이드바 로고는 Sidebar.astro 의 CSS 가 다크일 때 같은 테두리를 그리고
  · 공유 미리보기·홈 화면 아이콘은 아예 밝은 배경 위에 둔다.
"""

import io
import math
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).parent))
from mascot import COLORS, PIXELS  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
N = len(PIXELS)
OUTLINE = (212, 212, 212)  # 어두운 배경에서 몸 윤곽을 잡아주는 테두리


def outline_cells() -> set[tuple[int, int]]:
    """
    그림 바깥에서 그림에 맞닿은 칸들(대각선 포함). 좌표는 사방에 한 칸씩 여백을 둔
    (N+2)×(N+2) 기준이다 — 핑구 몸이 그리드 가장자리까지 닿아서 여백 없이는 테두리를 못 두른다.
    """
    filled = {(x + 1, y + 1) for y, row in enumerate(PIXELS) for x, ch in enumerate(row) if ch in COLORS}
    cells = set()
    for (x, y) in filled:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                c = (x + dx, y + dy)
                if c not in filled:
                    cells.add(c)
    return cells


def penguin(scale: int, outlined: bool = False) -> Image.Image:
    """도트 하나를 scale×scale 정사각형으로 키운 투명 배경 그림. outlined 면 테두리 포함."""
    size = N + 2 if outlined else N
    off = 1 if outlined else 0
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if outlined:
        for (x, y) in outline_cells():
            im.putpixel((x, y), OUTLINE + (255,))
    for y, row in enumerate(PIXELS):
        for x, ch in enumerate(row):
            if ch in COLORS:
                im.putpixel((x + off, y + off), COLORS[ch] + (255,))
    # 도트 그림은 반드시 NEAREST 로 키운다. 다른 방식이면 가장자리가 뭉개진다.
    return im.resize((size * scale, size * scale), Image.NEAREST)


def on_background(size: int, scale: int, bg: tuple) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg + (255,))
    p = penguin(scale)
    canvas.alpha_composite(p, ((size - p.width) // 2, (size - p.height) // 2))
    return canvas


def _rects(offset: int = 0) -> list[str]:
    """도트를 rect 로. 같은 색이 가로로 이어지면 한 rect 로 묶는다."""
    rects = []
    for y, row in enumerate(PIXELS):
        x = 0
        while x < N:
            ch = row[x]
            if ch not in COLORS:
                x += 1
                continue
            start = x
            while x < N and row[x] == ch:
                x += 1
            r, g, b = COLORS[ch]
            rects.append(
                f'<rect x="{start + offset}" y="{y + offset}" width="{x - start}" height="1" '
                f'fill="#{r:02x}{g:02x}{b:02x}"/>'
            )
    return rects


def favicon_svg() -> str:
    """
    탭 아이콘. 테두리 칸은 평소엔 투명하고, 브라우저가 어두운 테마일 때만 칠해진다.
    (SVG 파비콘은 prefers-color-scheme 을 알아듣는다)
    """
    o = "#%02x%02x%02x" % OUTLINE
    ring = "".join(f'<rect x="{x}" y="{y}" width="1" height="1"/>' for (x, y) in sorted(outline_cells()))
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N + 2} {N + 2}" '
        f'width="{N + 2}" height="{N + 2}" shape-rendering="crispEdges">'
        f'<style>.ring{{fill:transparent}}@media (prefers-color-scheme:dark){{.ring{{fill:{o}}}}}</style>'
        f'<g class="ring">{ring}</g>'
        + "".join(_rects(offset=1))
        + "</svg>\n"
    )


def logo_svg() -> str:
    """사이드바 로고. 테두리는 페이지 CSS 가 사이트 테마(수동 전환 포함)를 보고 그린다."""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}" '
        f'width="100%" height="100%" shape-rendering="crispEdges">'
        + "".join(_rects())
        + "</svg>\n"
    )


def plex(size: int, weight: int) -> ImageFont.FreeTypeFont:
    """사이트와 같은 글꼴(IBM Plex Sans 가변)을 woff2 에서 풀어 쓴다"""
    font = TTFont(ROOT / "src/assets/fonts/IBMPlexSans-VariableFont_wdth,wght.woff2")
    font.flavor = None
    buf = io.BytesIO()
    font.save(buf)
    buf.seek(0)
    ft = ImageFont.truetype(buf, size)
    ft.set_variation_by_axes([weight, 100])  # 축 순서: 굵기, 폭
    return ft


def og_image() -> Image.Image:
    """
    링크 공유 미리보기. 홈 화면의 도트 제목과 같은 그림을 정지 화면으로.
    가운데쯤에 렌즈가 하나 걸려 있는 모습으로 그려서, 들어가면 움직인다는 걸 암시한다.
    """
    W, H = 1200, 630
    # 핑구 몸이 까매서 어두운 배경에선 묻힌다. 홈 화면 아이콘과 같은 하늘색 위에 둔다.
    bg = (224, 242, 254)
    im = Image.new("RGBA", (W, H), bg + (255,))

    # 왼쪽: 펭귄
    p = penguin(15)
    px, py = 110, (H - p.height) // 2 - 10
    im.alpha_composite(p, (px, py))

    # 오른쪽: 도트 제목
    text = "aaarlaguswns"
    left = px + p.width + 70
    target_w = W - left - 90
    probe = plex(100, 700)
    font_size = int(100 * target_w / probe.getlength(text))
    font = plex(font_size, 700)
    gap = max(6, font_size // 16)
    dot = gap * 0.8

    mask = Image.new("L", (target_w + 20, int(font_size * 1.3)), 0)
    ImageDraw.Draw(mask).text((0, 0), text, font=font, fill=255)
    top = (H - mask.height) // 2 - 30

    # 정지 화면이라 이름이 읽혀야 한다. 렌즈는 홈 화면보다 작고 약하게.
    lens_x, lens_y, lens_r = left + target_w * 0.6, top + font_size * 0.6, font_size * 0.55
    stops = [(4, 120, 87), (29, 78, 216), (109, 40, 217)]  # 초록 → 파랑 → 보라 (밝은 배경용)

    def gradient(t: float):
        t *= len(stops) - 1
        i = min(len(stops) - 2, int(t))
        f = t - i
        return tuple(round(stops[i][k] + (stops[i + 1][k] - stops[i][k]) * f) for k in range(3))

    draw = ImageDraw.Draw(im)
    for y in range(0, mask.height, gap):
        for x in range(0, mask.width, gap):
            if mask.getpixel((min(mask.width - 1, x + gap // 2), min(mask.height - 1, y + gap // 2))) < 110:
                continue
            hx, hy = left + x, top + y
            dx, dy = hx - lens_x, hy - lens_y
            d = math.hypot(dx, dy)
            size, color = dot, (31, 41, 55)
            if d < lens_r:
                f = 1 - d / lens_r
                push = f * f * lens_r * 0.3
                if d > 0.001:
                    hx += dx / d * push
                    hy += dy / d * push
                size = dot * (1 + f * 1.0)
                color = gradient((x / mask.width))
            draw.rectangle([hx - size / 2, hy - size / 2, hx + size / 2, hy + size / 2], fill=color)

    # 주소
    small = plex(30, 400)
    draw.text((left, top + mask.height + 18), "aaarlaguswns.pages.dev", font=small, fill=(100, 116, 139))
    return im.convert("RGB")


def main():
    # 탭 아이콘
    (PUBLIC / "favicon.svg").write_text(favicon_svg(), encoding="utf-8")
    # 도트 그림은 정수배로만 키운다. 테두리 포함 18칸짜리를 16·32·48 로 맞추면 칸이 찌그러진다.
    # ICO 는 옛 브라우저용 예비라 테두리 없이 정확한 배수로 (요즘 브라우저는 위의 SVG 를 쓴다).
    # 크기별 그림을 직접 넣어줘야 한다. 하나만 주면 Pillow 가 줄이면서 뭉갠다.
    penguin(3).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)],
                    append_images=[penguin(1), penguin(2)])
    # 96 은 테두리를 구워 넣는다: 18칸 × 5 = 90 을 96 한가운데에.
    fav96 = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    fav96.alpha_composite(penguin(5, True), (3, 3))
    fav96.save(PUBLIC / "favicon-96x96.png")

    # 홈 화면 아이콘. 아이폰은 투명 부분을 검게 칠하므로 배경을 깐다.
    sky = (224, 242, 254)
    on_background(180, 9, sky).convert("RGB").save(PUBLIC / "apple-touch-icon.png")
    # 안드로이드 maskable: 가운데 80% 원 밖은 잘릴 수 있으니 펭귄을 그 안에 둔다
    on_background(192, 7, sky).convert("RGB").save(PUBLIC / "web-app-manifest-192x192.png")
    on_background(512, 18, sky).convert("RGB").save(PUBLIC / "web-app-manifest-512x512.png")

    # 사이드바 로고 (크기는 CSS 가 정한다)
    (ROOT / "src/assets/logo.svg").write_text(logo_svg(), encoding="utf-8")

    # 링크 공유 미리보기
    (PUBLIC / "static").mkdir(exist_ok=True)
    og_image().save(PUBLIC / "static/og.png", optimize=True)

    for f in ["favicon.svg", "favicon.ico", "favicon-96x96.png", "apple-touch-icon.png",
              "web-app-manifest-192x192.png", "web-app-manifest-512x512.png", "static/og.png"]:
        print(f"  public/{f:<32} {(PUBLIC / f).stat().st_size:>7,}B")
    print(f"  src/assets/logo.svg")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
마스코트(핑구) 이미지로 사이트 아이콘 일체를 만든다.   python3 scripts/make-icons.py

원본은 저장소 맨 위의 mascot.png (배경이 투명한 핑구 이미지, 핑구 위키에서 받음).
핑구는 저작권·상표가 살아있는 캐릭터다. 블로그 주인이 알고 정한 것이며,
권리자가 내려달라고 하면 mascot.png 를 바꾸고 이 스크립트를 다시 돌리면 사이트 전체가 바뀐다.

만드는 것
  public/favicon.ico, favicon-16x16.png, favicon-32x32.png, favicon-96x96.png
                                        탭 아이콘 — 하늘색 동그라미 안의 얼굴
  public/apple-touch-icon.png           아이폰 홈 화면 (180) — 하늘색 위 전신
  public/web-app-manifest-192x192.png   안드로이드 홈 화면 — 가장자리가 잘려도 되게 여백
  public/web-app-manifest-512x512.png
  public/logo.png                       사이드바 로고 (24px 로 보이는 48px)
  public/static/og.png                  링크 공유 미리보기 (1200×630)
  src/assets/mascot-ascii.json          404 페이지 아스키아트

핑구는 몸이 까매서 어두운 배경(다크모드, 어두운 탭 바)에 그냥 두면 묻힌다.
그래서 작은 아이콘은 늘 하늘색 동그라미 안에, 큰 그림은 하늘색 바탕 위에 둔다.

필요한 것: Pillow, fontTools (+brotli)
"""

import io
import json
import math
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SOURCE = ROOT / "mascot.png"

SKY = (224, 242, 254)

# 원본 이미지 안에서 얼굴만 담긴 정사각형 (작은 아이콘용). 원본을 바꾸면 이 값도 다시 잡는다.
HEAD_BOX = (40, 10, 86, 56)

SS = 4  # 동그라미 가장자리를 매끈하게 하려고 크게 그렸다가 줄이는 배수


def source() -> Image.Image:
    im = Image.open(SOURCE).convert("RGBA")
    return im.crop(im.getchannel("A").getbbox())  # 투명한 여백은 잘라낸다


def avatar(size: int) -> Image.Image:
    """하늘색 동그라미 안의 핑구 얼굴. 동그라미 밖은 투명."""
    big = size * SS
    face = Image.open(SOURCE).convert("RGBA").crop(HEAD_BOX).resize((big, big), Image.LANCZOS)
    disc = Image.new("L", (big, big), 0)
    ImageDraw.Draw(disc).ellipse([0, 0, big - 1, big - 1], fill=255)
    bg = Image.new("RGBA", (big, big), SKY + (255,))
    bg.alpha_composite(face)
    canvas = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    canvas.paste(bg, (0, 0), disc)
    return canvas.resize((size, size), Image.LANCZOS)


def full_body_on_sky(size: int, fill: float) -> Image.Image:
    """하늘색 정사각형 위에 전신. fill = 핑구 키가 차지하는 비율."""
    body = source()
    h = round(size * fill)
    w = round(body.width * h / body.height)
    canvas = Image.new("RGBA", (size, size), SKY + (255,))
    canvas.alpha_composite(body.resize((w, h), Image.LANCZOS), ((size - w) // 2, (size - h) // 2))
    return canvas.convert("RGB")


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
    링크 공유 미리보기. 왼쪽에 핑구, 오른쪽에 홈 화면과 같은 도트 제목.
    가운데쯤에 렌즈가 하나 걸린 정지 화면으로 그려서, 들어가면 움직인다는 걸 암시한다.
    """
    W, H = 1200, 630
    im = Image.new("RGBA", (W, H), SKY + (255,))

    body = source()
    bh = 360
    bw = round(body.width * bh / body.height)
    px, py = 120, (H - bh) // 2
    im.alpha_composite(body.resize((bw, bh), Image.LANCZOS), (px, py))

    text = "aaarlaguswns"
    left = px + bw + 70
    target_w = W - left - 80
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
    stops = [(4, 120, 87), (29, 78, 216), (109, 40, 217)]  # 초록 → 파랑 → 보라

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
                color = gradient(x / mask.width)
            draw.rectangle([hx - size / 2, hy - size / 2, hx + size / 2, hy + size / 2], fill=color)

    small = plex(30, 400)
    draw.text((left, top + mask.height + 18), "aaarlaguswns.pages.dev", font=small, fill=(100, 116, 139))
    return im.convert("RGB")


# 404 아스키아트용 얼굴 영역. 전신은 몸을 기울인 자세라 얼굴이 몇 줄밖에 안 나와 알아보기 어렵다.
ASCII_BOX = (38, 6, 90, 58)


def ascii_rows(cols: int = 34) -> list[str]:
    """
    404 페이지용. 얼굴을 글자 칸으로 쪼개 칸마다 무슨 색인지만 남긴다.
      K = 까만 몸, W = 흰 눈, O = 부리, . = 비어 있음
    고정폭 글자는 세로로 길어서 칸 높이를 너비의 1.8배로 잡는다.
    """
    face = Image.open(SOURCE).convert("RGBA").crop(ASCII_BOX)
    cw = face.width / cols
    rows = round(face.height / (cw * 1.8))
    ch = face.height / rows
    px = face.load()
    out = []
    for r in range(rows):
        line = ""
        for c in range(cols):
            x0, x1 = int(c * cw), max(int(c * cw) + 1, int((c + 1) * cw))
            y0, y1 = int(r * ch), max(int(r * ch) + 1, int((r + 1) * ch))
            n = a = rs = gs = bs = 0
            for y in range(y0, min(y1, face.height)):
                for x in range(x0, min(x1, face.width)):
                    R, G, B, A = px[x, y]
                    n += 1
                    a += A
                    rs += R * A
                    gs += G * A
                    bs += B * A
            if not n or a / n < 110:
                line += "."
                continue
            R, G, B = rs / a, gs / a, bs / a
            lum = 0.299 * R + 0.587 * G + 0.114 * B
            if R > 150 and G < 140 and B < 150 and R - G > 70:
                line += "O"
            elif lum < 95:
                line += "K"
            else:
                line += "W"
        out.append(line)
    # 위아래 빈 줄은 덜어낸다
    while out and set(out[0]) == {"."}:
        out.pop(0)
    while out and set(out[-1]) == {"."}:
        out.pop()
    return out


def main():
    # 탭 아이콘: 하늘색 동그라미 속 얼굴
    avatar(32).save(PUBLIC / "favicon-32x32.png")
    avatar(16).save(PUBLIC / "favicon-16x16.png")
    avatar(96).save(PUBLIC / "favicon-96x96.png")
    avatar(48).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)],
                    append_images=[avatar(16), avatar(32)])

    # 홈 화면 아이콘: 하늘색 위 전신. 안드로이드 maskable 은 가운데 80% 원 안에 들어와야 한다.
    full_body_on_sky(180, 0.82).save(PUBLIC / "apple-touch-icon.png")
    full_body_on_sky(192, 0.62).save(PUBLIC / "web-app-manifest-192x192.png")
    full_body_on_sky(512, 0.62).save(PUBLIC / "web-app-manifest-512x512.png")

    # 사이드바 로고 (24px 로 보이니 레티나용으로 두 배)
    avatar(48).save(PUBLIC / "logo.png")

    # 링크 공유 미리보기
    (PUBLIC / "static").mkdir(exist_ok=True)
    og_image().save(PUBLIC / "static/og.png", optimize=True)

    # 404 아스키아트
    (ROOT / "src/assets/mascot-ascii.json").write_text(
        json.dumps({"rows": ascii_rows()}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    for f in ["favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "favicon-96x96.png",
              "apple-touch-icon.png", "web-app-manifest-192x192.png", "web-app-manifest-512x512.png",
              "logo.png", "static/og.png"]:
        print(f"  public/{f:<32} {(PUBLIC / f).stat().st_size:>7,}B")
    print("  src/assets/mascot-ascii.json")


if __name__ == "__main__":
    main()

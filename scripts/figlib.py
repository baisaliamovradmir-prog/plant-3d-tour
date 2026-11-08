# -*- coding: utf-8 -*-
"""Отрисовка диаграмм и макетов на Pillow (суперсэмплинг ×2, без внешних процессов)."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

INK = "#16233A"
INK2 = "#42536B"
MUTED = "#7C8CA1"
LINE = "#C7D3E2"
BLUE = "#1F4E8C"
BLUE2 = "#2E6FD0"
SKY = "#E8F1FB"
SKY2 = "#F4F8FD"
CYAN = "#0E93A8"
ORANGE = "#D9552B"
GREEN = "#1E8A5F"
RED = "#B5342B"
WHITE = "#FFFFFF"

FONTS = {
    (400, 0): r"C:\Windows\Fonts\segoeui.ttf",
    (400, 1): r"C:\Windows\Fonts\segoeuii.ttf",
    (600, 0): r"C:\Windows\Fonts\seguisb.ttf",
    (700, 0): r"C:\Windows\Fonts\segoeuib.ttf",
    (300, 0): r"C:\Windows\Fonts\segoeuil.ttf",
}
_cache = {}


def font(size, weight=400, italic=0):
    key = (int(size), weight, italic)
    if key not in _cache:
        path = FONTS.get((weight, italic)) or FONTS.get((400, italic)) or FONTS[(400, 0)]
        if not os.path.exists(path):
            path = FONTS[(400, 0)]
        _cache[key] = ImageFont.truetype(path, int(size))
    return _cache[key]


def hex2rgb(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


class Canvas:
    def __init__(self, w, h, bg=WHITE, ss=2):
        self.w, self.h, self.ss = w, h, ss
        self.img = Image.new("RGB", (w * ss, h * ss), hex2rgb(bg))
        self.d = ImageDraw.Draw(self.img, "RGBA")
        self._shadows = []

    # ---------- геометрия ----------
    def _s(self, v):
        return v * self.ss

    def rect(self, x, y, w, h, fill=WHITE, outline=LINE, radius=10, width=1.4, opacity=1.0,
             shadow=False, dash=None):
        box = [self._s(x), self._s(y), self._s(x + w), self._s(y + h)]
        fill_rgba = None
        if fill and fill != "none":
            r, g, b = hex2rgb(fill)
            fill_rgba = (r, g, b, int(255 * opacity))
        if shadow:
            self._shadows.append((box, radius))
        if dash:
            self._dash_rect(box, outline, width, radius, dash)
        else:
            self.d.rounded_rectangle(box, radius=self._s(radius), fill=fill_rgba,
                                     outline=hex2rgb(outline) if outline and outline != "none" else None,
                                     width=max(1, int(self._s(width))))
        return self

    @staticmethod
    def _parse_dash(dash):
        if isinstance(dash, str):
            parts = [float(p) for p in dash.replace(",", " ").split()]
        elif isinstance(dash, (tuple, list)):
            parts = [float(p) for p in dash]
        else:
            parts = [float(dash), float(dash) * 0.8]
        if len(parts) == 1:
            parts = [parts[0], parts[0] * 0.8]
        return parts[0], parts[1]

    def _dash_rect(self, box, color, width, radius, dash):
        # пунктир по периметру (упрощённо: прямые сегменты)
        x0, y0, x1, y1 = box
        w = self._s(width)
        on_, off_ = self._parse_dash(dash)
        on, off = self._s(on_), self._s(off_)
        self.d.rounded_rectangle(box, radius=self._s(radius),
                                 outline=None, fill=None)
        for (ax, ay, bx, by) in [(x0 + radius, y0, x1 - radius, y0), (x1, y0 + radius, x1, y1 - radius),
                                 (x1 - radius, y1, x0 + radius, y1), (x0, y1 - radius, x0, y0 + radius)]:
            self._dashed_line(ax, ay, bx, by, color, w, on, off)

    def _dashed_line(self, x1, y1, x2, y2, color, w, on, off):
        import math
        L = math.hypot(x2 - x1, y2 - y1)
        if L == 0:
            return
        n = L / (on + off)
        dx, dy = (x2 - x1) / L, (y2 - y1) / L
        t = 0.0
        while t < L:
            e = min(t + on, L)
            self.d.line([x1 + dx * t, y1 + dy * t, x1 + dx * e, y1 + dy * e], fill=hex2rgb(color), width=int(w))
            t += on + off

    def line(self, x1, y1, x2, y2, color=INK2, width=2, dash=None):
        if dash:
            on, off = self._parse_dash(dash)
            self._dashed_line(self._s(x1), self._s(y1), self._s(x2), self._s(y2),
                              color, self._s(width), self._s(on), self._s(off))
        else:
            self.d.line([self._s(x1), self._s(y1), self._s(x2), self._s(y2)],
                        fill=hex2rgb(color), width=max(1, int(self._s(width))))

    def circle(self, cx, cy, r, fill=None, outline=None, width=1.4):
        box = [self._s(cx - r), self._s(cy - r), self._s(cx + r), self._s(cy + r)]
        self.d.ellipse(box, fill=hex2rgb(fill) if fill else None,
                       outline=hex2rgb(outline) if outline else None,
                       width=max(1, int(self._s(width))))

    def poly(self, pts, fill=None, outline=INK2, width=2, close=False):
        p = [(self._s(x), self._s(y)) for x, y in pts]
        if outline in (None, "none"):
            outline = None
        if close:
            self.d.polygon(p, fill=hex2rgb(fill) if fill and fill != "none" else None,
                           outline=hex2rgb(outline) if outline else None)
        else:
            self.d.line(p + ([p[0]] if close else []), fill=hex2rgb(outline), width=max(1, int(self._s(width))),
                        joint="curve")

    # ---------- стрелки ----------
    def arrow(self, x1, y1, x2, y2, color=INK2, width=2, head=9, dash=None, shrink=0):
        import math
        L = math.hypot(x2 - x1, y2 - y1)
        if L < 1:
            return
        dx, dy = (x2 - x1) / L, (y2 - y1) / L
        hx, hy = x2 - dx * shrink, y2 - dy * shrink
        bx, by = hx - dx * head * 0.75, hy - dy * head * 0.75
        self.line(x1, y1, bx, by, color, width, dash)
        px, py = -dy, dx
        self.d.polygon([(self._s(hx), self._s(hy)),
                        (self._s(bx + px * head * 0.45), self._s(by + py * head * 0.45)),
                        (self._s(bx - px * head * 0.45), self._s(by - py * head * 0.45))],
                       fill=hex2rgb(color))

    def polyline(self, pts, color=INK2, width=2, dash=None, head=True, head_size=9):
        import math
        for i in range(len(pts) - 1):
            x1, y1 = pts[i]
            x2, y2 = pts[i + 1]
            if i == len(pts) - 2 and head:
                self.arrow(x1, y1, x2, y2, color, width, head_size, dash)
            else:
                self.line(x1, y1, x2, y2, color, width, dash)

    def elbow_arrow(self, pts, color=INK2, width=2, dash=None, head=9):
        self.polyline(pts, color, width, dash, head, head)

    # ---------- текст ----------
    def text(self, x, y, s, size=18, weight=400, color=INK, anchor="middle", opacity=1.0, italic=0):
        f = font(self._s(size), weight, italic)
        a = {"middle": "ms", "start": "ls", "end": "rs", "left": "ls", "right": "rs"}[anchor]
        col = hex2rgb(color) + (int(255 * opacity),)
        self.d.text((self._s(x), self._s(y)), s, font=f, fill=col, anchor=a)
        return self

    def text_w(self, s, size, weight=400):
        f = font(self._s(size), weight)
        b = self.d.textbbox((0, 0), s, font=f)
        return (b[2] - b[0]) / self.ss

    def wrap(self, s, size, maxw, weight=400):
        words = s.split()
        lines, cur = [], ""
        for wd in words:
            probe = (cur + " " + wd).strip()
            if self.text_w(probe, size, weight) <= maxw or not cur:
                cur = probe
            else:
                lines.append(cur)
                cur = wd
        if cur:
            lines.append(cur)
        return lines

    def para(self, x, y, s, size=16, maxw=400, lh=None, weight=400, color=INK2, anchor="middle"):
        lh = lh or size * 1.32
        for i, ln in enumerate(self.wrap(s, size, maxw, weight)):
            self.text(x, y + i * lh, ln, size, weight, color, anchor)
        return self

    def mtext(self, x, y, lines, size=16, lh=None, weight=400, color=INK2, anchor="middle"):
        lh = lh or size * 1.32
        for i, ln in enumerate(lines):
            self.text(x, y + i * lh, ln, size, weight, color, anchor)
        return self

    def pill(self, x, y, w, h, s, fill=SKY, outline=BLUE2, size=14, color=BLUE, weight=600):
        self.rect(x, y, w, h, fill, outline, h / 2, 1.2)
        self.text(x + w / 2, y + h / 2 + size * 0.36, s, size, weight, color)
        return self

    def chip(self, x, y, s, size=13, fill=SKY, color=BLUE, pad=10, weight=600, h=None):
        w = self.text_w(s, size, weight) + pad * 2
        h = h or size + 14
        self.rect(x, y, w, h, fill, "none", 6, 0)
        self.text(x + w / 2, y + h / 2 + size * 0.36, s, size, weight, color)
        return w

    # ---------- финал ----------
    def save(self, path, bg=WHITE):
        if self._shadows:
            sh = Image.new("RGBA", self.img.size, (0, 0, 0, 0))
            sd = ImageDraw.Draw(sh)
            for box, radius in self._shadows:
                sd.rounded_rectangle([box[0], box[1] + self._s(2), box[2], box[3] + self._s(3)],
                                     radius=self._s(radius), fill=(27, 59, 111, 38))
            sh = sh.filter(ImageFilter.GaussianBlur(self._s(4)))
            base = self.img.convert("RGBA")
            base.alpha_composite(sh)
            self.img = base.convert("RGB")
        out = self.img.resize((self.w, self.h), Image.LANCZOS)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        out.save(path, "PNG")
        return path


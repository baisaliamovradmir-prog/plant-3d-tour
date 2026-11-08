# -*- coding: utf-8 -*-
"""Общие элементы диаграмм: заголовки, дорожки, BPMN/UML-фигуры, легенды."""
import os
from figlib import *  # noqa


def header(c, title, subtitle=None, w=1440, x=48):
    c.text(x, 52, title, 26, 700, INK, "start")
    if subtitle:
        c.text(x, 82, subtitle, 14, 400, MUTED, "start")


def footer(c, text, w=1440, y=None, h=690):
    y = y if y is not None else h - 22
    c.line(48, y - 20, w - 48, y - 20, LINE, 1)
    c.text(48, y, text, 11.5, 400, MUTED, "start")


def lane(c, x, y, w, h, label, fill="#FBFCFE"):
    c.rect(x, y, w, h, fill, LINE, 8, 1.2)
    c.rect(x, y, 96, h, "#F1F5FA", LINE, 8, 1.2)
    c.rect(x + 84, y, 12, h, "#F1F5FA", "none", 0, 0)
    c.text(x + 48, y + h / 2, label, 13, 600, INK2)


def task(c, x, y, w, h, lines, kind="task", accent=BLUE2, fill=WHITE, size=12.5, stroke=None):
    stroke = stroke or LINE
    if isinstance(lines, str):
        lines = [lines]
    c.rect(x, y, w, h, fill, stroke, 9, 1.6, shadow=True)
    if kind == "sub":
        c.rect(x + w - 20, y + h - 16, 12, 10, "none", INK2, 2, 0)
        c.line(x + w - 11, y + h - 16, x + w - 11, y + h - 6, INK2, 1)
    lh = size * 1.3
    total = len(lines) * lh
    y0 = y + h / 2 - total / 2 + size * 0.95
    for i, ln in enumerate(lines):
        c.text(x + w / 2, y0 + i * lh, ln, size, 500, INK)
    return (x, y, w, h)


def start_event(c, cx, cy, label=None, r=16, color=INK):
    c.circle(cx, cy, r, WHITE, color, 2.4)
    if label:
        c.text(cx, cy - r - 10, label, 11.5, 600, MUTED)


def end_event(c, cx, cy, label=None, r=18, color=INK):
    c.circle(cx, cy, r, WHITE, color, 4.2)
    if label:
        c.text(cx, cy + r + 18, label, 11.5, 600, MUTED)


def gateway(c, cx, cy, s=62, label="?", color=INK2):
    h = s / 2
    c.poly([(cx, cy - h), (cx + h, cy), (cx, cy + h), (cx - h, cy)], fill=WHITE, outline=color, width=2, close=True)
    c.text(cx, cy + 6, label, 16, 700, color)


def flow(c, pts, color=INK2, width=1.9, dash=None):
    c.polyline(pts, color, width, dash, True, 8)


def flow_label(c, x, y, s, color=INK2, size=11.5, bg=WHITE):
    w = c.text_w(s, size, 600)
    c.rect(x - w / 2 - 5, y - size + 1, w + 10, size + 8, bg, "none", 3, 0)
    c.text(x, y + 1, s, size, 600, color)


def actor(c, cx, cy, label, size=12.5, h=44, color=INK):
    # стилизованный человечек
    c.circle(cx, cy - h / 2 + 8, 7.5, WHITE, color, 2)
    c.line(cx, cy - h / 2 + 16, cx, cy + 6, color, 2)
    c.line(cx - 11, cy - h / 2 + 25, cx + 11, cy - h / 2 + 25, color, 2)
    c.line(cx, cy + 6, cx - 10, cy + 22, color, 2)
    c.line(cx, cy + 6, cx + 10, cy + 22, color, 2)
    c.text(cx, cy + 40, label, size, 600, INK)


def usecase(c, cx, cy, w, h, lines, fill="#EFF6FD", stroke=BLUE2, size=12):
    c.rect(cx - w / 2, cy - h / 2, w, h, fill, stroke, h / 2, 1.5)
    if isinstance(lines, str):
        lines = [lines]
    lh = size * 1.28
    y0 = cy - len(lines) * lh / 2 + size * 0.95 - 2
    for i, ln in enumerate(lines):
        c.text(cx, y0 + i * lh, ln, size, 500, INK)


def note(c, x, y, w, text, size=12.5, fill="#FDF3EF", bar=ORANGE, color="#8A3B21", pad=14):
    lines = c.wrap(text, size, w - pad * 2 - 8, 600)
    h = len(lines) * size * 1.35 + pad * 2 - 4
    c.rect(x, y, w, h, fill, "none", 8, 0)
    c.rect(x, y, 4, h, bar, "none", 2, 0)
    for i, ln in enumerate(lines):
        c.text(x + pad + 4, y + pad + size * 0.9 + i * size * 1.35, ln, size, 600, color, "start")
    return h


def legend(c, x, y, items, size=12, gap=28):
    cx = x
    for kind, label in items:
        if kind == "line":
            c.line(cx, y, cx + 26, y, INK2, 2)
            c.arrow(cx, y, cx + 26, y, INK2, 2)
        elif kind == "dash":
            c.line(cx, y, cx + 26, y, MUTED, 2, "5 4")
        elif kind == "task":
            c.rect(cx, y - 8, 26, 16, WHITE, LINE, 4, 1.4)
        elif kind == "event":
            c.circle(cx + 13, y, 7, WHITE, INK, 2)
        elif kind == "gw":
            c.poly([(cx + 13, y - 8), (cx + 21, y), (cx + 13, y + 8), (cx + 5, y)], fill=WHITE, outline=INK2, width=1.6, close=True)
        elif kind == "bar":
            c.rect(cx, y - 6, 26, 12, label if label.startswith("#") else CYAN, "none", 2, 0)
            label = "" if label.startswith("#") else label
        else:
            c.rect(cx, y - 6, 12, 12, KIND_COLORS.get(kind, MUTED), "none", 3, 0)
        if label:
            c.text(cx + (32 if kind != "bar" else 32), y + 4, label, size, 400, INK2, "start")
            cx += 32 + c.text_w(label, size) + gap
        else:
            cx += 32 + gap


KIND_COLORS = {"blue": BLUE2, "red": RED, "cyan": CYAN, "orange": ORANGE, "green": GREEN, "muted": MUTED}


def save(c, name):
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "figures", name)
    c.save(out)
    print("ok", name)

# -*- coding: utf-8 -*-
"""F16 — графики: эффект сценария и кривая мощности."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from fig_kit import *  # noqa

HERE = os.path.dirname(os.path.abspath(__file__))
M = json.load(open(os.path.join(HERE, "metrics.json"), encoding="utf-8"))
S = {r["id"]: r["kpi"] for r in M["scenarios"]}
SW = M["demandSweep"]

W, H = 1440, 560
c = Canvas(W, H)

# ---------------------------------------------------------------- панель A
c.text(40, 52, "Что меняет сценарий C", 17, 700, INK, "start")
c.text(40, 74, "Сравнение с AS-IS по трём метрикам модели", 11, 400, MUTED, "start")

rows = [("Цикл изготовления", "мин", S["asis"]["leadTime"], S["c"]["leadTime"], 560),
        ("Заказы в срок", "%", S["asis"]["onTimeShare"], S["c"]["onTimeShare"], 100),
        ("Незавершённое производство", "шт", S["asis"]["wip"], S["c"]["wip"], 22)]
y0 = 118
for i, (name, unit, a, b, mx) in enumerate(rows):
    y = y0 + i * 132
    c.text(40, y + 18, name, 12, 600, INK, "start")
    c.rect(40, y + 30, 600, 20, "#F1F4F9", "none", 10, 0)
    c.rect(40, y + 30, 600 * a / mx, 20, "#C9D6E5", "none", 10, 0)
    c.rect(40, y + 56, 600, 20, "#F1F4F9", "none", 10, 0)
    c.rect(40, y + 56, 600 * b / mx, 20, GREEN, "none", 10, 0)
    fmt = (lambda v: f"{v:.1f}".replace(".", ",")) if unit == "шт" else (lambda v: f"{v:.0f}")
    c.text(40 + 600 * a / mx + 10, y + 46, f"{fmt(a)} {unit}", 11, 600, INK2, "start")
    c.text(40 + 600 * b / mx + 10, y + 72, f"{fmt(b)} {unit}", 11, 700, GREEN, "start")
    delta = (b - a) / a * 100
    label = f"+{b - a:.0f} п.п." if unit == "%" else (f"{delta:+.0f} %".replace("-", "−"))
    c.rect(676, y + 40, 104, 26, "#F1F7F3", "none", 6, 0)
    c.text(728, y + 58, label, 11.5, 700, GREEN)

c.text(40, 500, "Серая полоса — AS-IS, зелёная — сценарий C (второй станок + SMED).", 10.5, 400, MUTED, "start")

# ---------------------------------------------------------------- панель B
c.line(760, 96, 760, 500, LINE, 1.2)

px, py, pw, ph = 820, 140, 560, 340
c.text(820, 52, "Кривая мощности участка", 17, 700, INK, "start")
c.text(820, 74, "Выпуск при разном спросе: AS-IS упирается в 40,6 шт/сут", 11, 400, MUTED, "start")

xmin, xmax = 32, 56
ymin, ymax = 28, 56


def X(v):
    return px + (v - xmin) / (xmax - xmin) * pw


def Y(v):
    return py + ph - (v - ymin) / (ymax - ymin) * ph


# сетка
for gy in range(30, 57, 5):
    c.line(px, Y(gy), px + pw, Y(gy), "#EDF1F7", 1)
    c.text(px - 10, Y(gy) + 4, str(gy), 10, 400, MUTED, "end")
for gx in range(34, 55, 4):
    c.line(X(gx), py, X(gx), py + ph, "#EDF1F7", 1)
    c.text(X(gx), py + ph + 20, str(gx), 10, 400, MUTED)
c.text(px + pw / 2, py + ph + 44, "спрос, шт/сут", 11, 400, MUTED)
c.text(px - 46, py - 12, "выпуск, шт/сут", 10, 400, MUTED, "start")

# идеальная линия
c.line(X(xmin), Y(xmin), X(xmax), Y(xmax), "#B9C9DD", 1.4, "6 5")
c.text(X(52) + 6, Y(52) - 10, "идеал: выпуск = спрос", 9.5, 400, MUTED, "start")

c.polyline([(X(r["demand"]), Y(r["asis"])) for r in SW], "#B5342B", 2.4, None, False)
c.polyline([(X(r["demand"]), Y(r["c"])) for r in SW], GREEN, 2.4, None, False)
for r in SW:
    c.circle(X(r["demand"]), Y(r["asis"]), 4, fill="#B5342B", outline=WHITE, width=1.4)
    c.circle(X(r["demand"]), Y(r["c"]), 4, fill=GREEN, outline=WHITE, width=1.4)

c.text(X(54) - 4, Y(SW[-1]["asis"]) - 14, "AS-IS", 10.5, 700, "#B5342B", "end")
c.text(X(54) - 4, Y(SW[-1]["c"]) - 14, "C", 10.5, 700, GREEN, "end")
c.rect(X(40) + 4, Y(46) - 8, 168, 46, WHITE, LINE, 6, 1)
c.text(X(40) + 16, Y(46) + 8, "при спросе 50 шт/сут", 9.5, 600, INK2, "start")
c.text(X(40) + 16, Y(46) + 24, "AS-IS: 40,5 · C: 48,1", 9.5, 600, INK, "start")

save(c, "f16_charts.png")

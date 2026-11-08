# -*- coding: utf-8 -*-
"""F1 — мнемосхема участка механообработки."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from figlib import *  # noqa

HERE = os.path.dirname(os.path.abspath(__file__))
FIG = os.path.join(HERE, "..", "figures")
M = json.load(open(os.path.join(HERE, "metrics.json"), encoding="utf-8"))
asis = M["scenarios"][0]["kpi"]


def num(v, d=1):
    return f"{v:.{d}f}".replace(".", ",")


W, H = 1440, 690
c = Canvas(W, H)

c.text(48, 56, "Мнемосхема участка механообработки", 30, 700, INK, "start")
c.text(48, 90, "Пилот: ремонтно-механический цех, деталь «Фланец Ду100 PN16». Значения — расчёт модели AS-IS",
       15, 400, MUTED, "start")

kpis = [
    ("Выпуск", f"{num(asis['throughput'])} из 42 шт/сут", RED),
    ("Цикл изготовления", f"{asis['leadTime']:.0f} мин", INK),
    ("Заказы в срок", f"{asis['onTimeShare']:.0f} %", RED),
    ("В работе (WIP)", f"{num(asis['wip'])} шт", INK),
]
for i, (k, v, col) in enumerate(kpis):
    bx = 48 + i * 342
    c.rect(bx, 110, 312, 64, SKY2, LINE, 10, 1.2)
    c.text(bx + 16, 136, k, 13, 600, MUTED, "start")
    c.text(bx + 16, 162, v, 19, 700, col, "start")

stations = [
    ("Склад заготовок", "комплектация", "4 мин", "1 пост", 17),
    ("Токарная ЧПУ", "точение", "9 мин", "2 станка", 22),
    ("Фрезерная ЧПУ", "фрезеровка", "8 мин", "1 станок", 40),
    ("Сверлильная", "сверление", "6 мин", "1 станок", 29),
    ("Шлифовальная", "шлифовка", "21 мин", "1 станок", 97),
    ("Мойка", "промывка", "3 мин", "1 ванна", 13),
    ("ОТК", "контроль", "6 мин", "2 контролёра", 13),
    ("Упаковка", "упаковка", "4 мин", "на склад ГП", 17),
]
tw, th, gap = 140, 194, 32
sx = (W - (len(stations) * tw + (len(stations) - 1) * gap)) // 2
ty = 262

c.pill(sx + tw / 2 - 54, ty - 60, 108, 28, "Заказы", "#EAF1FB", BLUE2, 13, BLUE)
c.arrow(sx + tw / 2, ty - 30, sx + tw / 2, ty - 4, BLUE, 2)

for i, (name, op, t, units, util) in enumerate(stations):
    x = sx + i * (tw + gap)
    hot = util >= 90
    accent = RED if hot else BLUE2
    c.rect(x, ty, tw, th, WHITE, LINE, 12, 1.4, shadow=True)
    c.rect(x, ty + 18, 5, 26, accent, "none", 2.5, 0)

    c.text(x + 16, ty + 26, f"0{i + 1}", 12, 700, accent, "start")
    c.text(x + tw / 2, ty + 58, name, 16, 700, INK)
    c.text(x + tw / 2, ty + 80, op, 12, 400, MUTED)
    c.text(x + tw / 2, ty + 108, t + " / шт", 15, 600, INK2)
    c.text(x + tw / 2, ty + 130, units, 12, 400, MUTED)

    by = ty + 148
    c.rect(x + 18, by, tw - 36, 8, "#E7EEF7", "none", 4, 0)
    c.rect(x + 18, by, max(3, (tw - 36) * min(util, 100) / 100), 8, RED if hot else CYAN, "none", 4, 0)
    c.text(x + 18, by + 26, "загрузка", 11, 400, MUTED, "start")
    c.text(x + tw - 18, by + 26, f"{util} %", 12, 700, RED if hot else INK2, "end")

    if hot:
        c.rect(x - 6, ty - 30, tw + 12, 26, RED, RED, 6, 0)
        c.text(x + tw / 2, ty - 12, "УЗКОЕ МЕСТО", 12, 700, WHITE)

    if i < len(stations) - 1:
        ax = x + tw
        c.arrow(ax + 3, ty + th / 2, ax + gap - 4, ty + th / 2, INK2, 2)

# возвратные потоки
gy = ty + th + 86
x_otk = sx + 6 * (tw + gap) + tw / 2
x_shl = sx + 4 * (tw + gap) + tw / 2
c.elbow_arrow([(x_otk, ty + th + 4), (x_otk, gy), (x_shl, gy), (x_shl, ty + th + 8)], ORANGE, 2, "7 5")
c.rect((x_otk + x_shl) / 2 - 92, gy - 13, 184, 26, WHITE, "none", 4, 0)
c.text((x_otk + x_shl) / 2, gy - 6, "перешлифовка 4 % (возврат)", 12, 600, ORANGE, "middle")

xs = x_otk + 54
c.elbow_arrow([(xs, ty + th + 4), (xs, ty + th + 54)], RED, 1.8)
c.text(xs + 12, ty + th + 50, "изолятор брака 2,3 %", 12, 600, RED, "start")

# вывод
cy = H - 92
c.rect(48, cy, W - 96, 44, "#FDF3EF", "none", 8, 0)
c.rect(48, cy, 4, 44, ORANGE, "none", 2, 0)
c.text(70, cy + 28, "Узкое место — шлифовка: загрузка 97 %, очередь растёт, больше половины заказов выходит за обещанный срок.",
       13, 600, "#8A3B21", "start")

# легенда
ly = H - 26
lx = 48
legend = [(BLUE2, "операция"), (RED, "узкое место"), (CYAN, "загрузка ресурса"),
          (ORANGE, "возвратный поток")]
for col, lab in legend:
    c.rect(lx, ly - 12, 14, 14, col, "none", 4, 0)
    c.text(lx + 22, ly, lab, 13, 400, INK2, "start")
    lx += 34 + c.text_w(lab, 13) + 22
c.text(W - 48, ly, "Расчёт: 5 репликаций × 26 суток, прогрев 6 суток", 12, 400, MUTED, "end")

out = c.save(os.path.join(FIG, "f01_mnemo.png"))
print("ok", out)

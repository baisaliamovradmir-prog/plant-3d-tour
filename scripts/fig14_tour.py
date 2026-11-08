# -*- coding: utf-8 -*-
"""F14 — макет экрана 3D-тура, F15 — карта точек интереса (план участка)."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from fig_kit import *  # noqa

UI_BG = "#F3F6FB"
BORDER = "#E2E9F3"
TXT2 = "#65758B"
NAVY = "#14263F"
NAVY2 = "#1C3252"

# ---------------- изометрия ----------------
OX, OY = 556, 330
SX, SY, SZ = 19.2, 10.1, 19.2


def proj(x, y, z):
    return (OX + (x - z) * SX, OY + (x + z) * SY - y * SZ)


def face(c, pts, fill, outline=None, width=1.0):
    c.poly([proj(*p) for p in pts], fill=fill, outline=outline or fill, width=width, close=True)


def box3d(c, x, z, w, d, h, top="#DCE6F2", left="#B9C9DD", right="#A3B6CD", y0=0, edge=None):
    # верх
    face(c, [(x, y0 + h, z), (x + w, y0 + h, z), (x + w, y0 + h, z + d), (x, y0 + h, z + d)], top, edge)
    # грань по z (обращена к зрителю слева)
    face(c, [(x, y0, z + d), (x + w, y0, z + d), (x + w, y0 + h, z + d), (x, y0 + h, z + d)], left, edge)
    # грань по x (обращена вправо)
    face(c, [(x + w, y0, z), (x + w, y0, z + d), (x + w, y0 + h, z + d), (x + w, y0 + h, z)], right, edge)


def machine(c, x, z, w=3.2, d=2.2, h=2.4, accent="#8FA9C6"):
    box3d(c, x, z, w, d, h, "#D9E4F0", "#B7C8DB", "#A0B4CA")
    box3d(c, x + 0.25, z + 0.2, w - 0.5, d - 0.4, 0.35, "#E7EEF7", "#C6D4E4", "#B3C4D8", y0=h)
    # панель управления
    box3d(c, x + w - 0.9, z + d - 0.15, 0.9, 0.25, 0.9, "#5C7C9E", "#4A688A", "#3D5877", y0=h - 0.2)
    # окно
    face(c, [(x + 0.5, h + 0.35, z + d - 0.02), (x + w - 1.2, h + 0.35, z + d - 0.02),
             (x + w - 1.2, h + 0.95, z + d - 0.02), (x + 0.5, h + 0.95, z + d - 0.02)], "#7FB2DE")


def scene(c):
    # пол
    face(c, [(0, 0, 0), (26, 0, 0), (26, 0, 14), (0, 0, 14)], "#EDF2F8", "#DCE4EE", 1.2)
    # сетка
    for gx in range(2, 26, 2):
        c.line(*proj(gx, 0, 0), *proj(gx, 0, 14), "#E1E8F1", 0.8)
    for gz in range(2, 14, 2):
        c.line(*proj(0, 0, gz), *proj(26, 0, gz), "#E1E8F1", 0.8)
    # разметка
    face(c, [(1, 0.01, 5.2), (25, 0.01, 5.2), (25, 0.01, 5.5), (1, 0.01, 5.5)], "#EBD9A8")
    face(c, [(1, 0.01, 9.6), (25, 0.01, 9.6), (25, 0.01, 9.9), (1, 0.01, 9.9)], "#EBD9A8")

    # задние стены
    face(c, [(0, 0, 0), (26, 0, 0), (26, 6.2, 0), (0, 6.2, 0)], "#F6F9FC", "#E3EAF2", 1.2)
    face(c, [(0, 0, 0), (0, 0, 14), (0, 6.2, 14), (0, 6.2, 0)], "#EFF4F9", "#E3EAF2", 1.2)
    # окна на дальней стене
    for i in range(5):
        x0 = 3 + i * 4.4
        face(c, [(x0, 2.4, -0.05), (x0 + 3.0, 2.4, -0.05), (x0 + 3.0, 5.4, -0.05), (x0, 5.4, -0.05)], "#CFE4F7")
    # ферма крана
    box3d(c, 0.5, 1.2, 24.5, 0.35, 0.35, "#C9D5E3", "#AFBFD2", "#9BAEC4", y0=5.6)
    box3d(c, 0.5, 12.4, 24.5, 0.35, 0.35, "#C9D5E3", "#AFBFD2", "#9BAEC4", y0=5.6)

    # оборудование (дальние — первыми)
    # склад заготовок: стеллажи
    for i in range(3):
        box3d(c, 1.2, 1.4 + i * 1.4, 4.2, 1.0, 2.6, "#E3EAF3", "#C2D0E0", "#ADBED2")
        for j in range(3):
            box3d(c, 1.5, 1.55 + i * 1.4, 0.9, 0.7, 0.35, "#C9D8E7", "#B0C2D6", "#9DB1C8", y0=0.5 + j * 0.75)
    # токарные станки
    machine(c, 7.6, 1.6)
    machine(c, 11.6, 1.6)
    # фрезерный
    machine(c, 15.6, 1.6, w=3.6, h=2.6)
    # сверлильный
    machine(c, 20.0, 1.6, w=2.6, h=2.2)
    # шлифовальные
    machine(c, 8.4, 6.6, w=3.4, h=2.5)
    # мойка
    box3d(c, 12.6, 6.4, 2.4, 1.8, 1.4, "#DCE7F3", "#BACBDE", "#A6B9CF")
    # ОТК: стол и плита
    box3d(c, 16.2, 6.6, 3.0, 1.6, 1.0, "#E4EBF4", "#C4D2E2", "#AFC0D4")
    box3d(c, 16.6, 6.8, 1.2, 1.0, 0.2, "#B7C4D4", "#9FB0C4", "#8EA1B7", y0=1.0)
    # упаковка + паллеты
    box3d(c, 20.6, 6.6, 2.6, 1.8, 1.2, "#E7EDF5", "#C8D5E4", "#B3C4D8")
    for i in range(2):
        for j in range(2):
            box3d(c, 21.0 + j * 0.9, 9.2 + i * 0.9, 0.7, 0.7, 0.6, "#D8C9A8", "#BFAE8A", "#A99771", y0=0.0)
    # транспортёр
    box3d(c, 5.4, 5.0, 18.6, 0.7, 0.55, "#D5DFEA", "#B6C6D9", "#A2B4C9", y0=0.75)
    # оператор (стилизованно)
    for (px, pz) in [(13.4, 8.6), (19.2, 8.4)]:
        cx, cy = proj(px, 1.7, pz)
        c.circle(cx, cy - 11, 4.5, fill="#2F4A6B")
        c.rect(cx - 4, cy - 7, 8, 15, "#2F4A6B", "none", 3, 0)


def pin(c, x, y, z, n, active=False, label=None):
    px, py = proj(x, y, z)
    col = ORANGE if active else "#2E6FD0"
    c.line(px, py, px, py - 34, col, 1.6)
    c.circle(px, py - 44, active and 16 or 13, fill=col, outline="#FFFFFF", width=2.2)
    c.text(px, py - 39, str(n), 11, 700, WHITE)
    if label:
        w = c.text_w(label, 9.5, 600) + 16
        c.rect(px - w / 2, py - 74, w, 20, WHITE, BORDER, 6, 1)
        c.text(px, py - 59, label, 9.5, 600, INK)


def tour_screen():
    W, H = 1440, 900
    c = Canvas(W, H, UI_BG)
    # окно
    c.rect(16, 16, 1408, 868, "#FFFFFF", "#CBD6E4", 14, 1.6, shadow=True)
    c.rect(16, 16, 1408, 34, "#F1F4F9", "#E2E9F3", 14, 0)
    c.rect(16, 36, 1408, 14, "#F1F4F9", "none", 0, 0)
    for i, col in enumerate(["#E5705F", "#E8B44F", "#6FBF8B"]):
        c.circle(40 + i * 18, 33, 5.5, fill=col)
    c.rect(120, 24, 620, 18, "#FFFFFF", "#E2E9F3", 9, 1)
    c.text(136, 37, "dsh.local/tours/flange-line/location-3", 9.5, 400, TXT2, "start")

    # сцена
    c.rect(17, 51, 1406, 832, "#EAF0F7", "none", 0, 0)
    scene(c)

    # пины
    pin(c, 17.6, 2.4, 7.4, 10, False, "ОТК")
    pin(c, 10.6, 3.0, 2.6, 4, False, "наладка")
    pin(c, 5.4, 3.0, 2.0, 1, False, "склад")
    pin(c, 10.1, 3.2, 7.8, 7, True, "узкое место")

    # верхняя панель поверх сцены
    c.rect(17, 51, 1406, 64, "#FFFFFF", "none", 0, 0)
    c.text(40, 82, "←", 16, 700, INK, "start")
    c.text(74, 78, "3D-тур: изготовление фланца", 15, 700, INK, "start")
    c.text(74, 98, "РМЦ · участок механообработки · 4 локации · 8 точек интереса", 10.5, 400, TXT2, "start")

    steps = [("1", "Склад"), ("2", "Токарный"), ("3", "Шлифовка"), ("4", "ОТК")]
    x = 760
    for i, (n, name) in enumerate(steps):
        active = i == 2
        c.circle(x, 82, 12, fill="#2E6FD0" if active else "#E6EDF6", outline="#2E6FD0" if active else "#D5DFEA", width=1.4)
        c.text(x, 86, n, 10.5, 700, WHITE if active else TXT2)
        c.text(x + 18, 86, name, 11, 600 if active else 400, INK if active else TXT2, "start")
        x += 24 + c.text_w(name, 11) + 42

    # карточка POI
    cx0, cy0, cw_, ch_ = 1040, 132, 356, 338
    c.rect(cx0, cy0, cw_, ch_, "#FFFFFF", "none", 12, 1, shadow=True)
    c.rect(cx0, cy0, cw_, 6, ORANGE, "none", 3, 0)
    c.text(cx0 + 20, cy0 + 34, "POI-07 · Шлифовальная", 10, 700, ORANGE, "start")
    c.text(cx0 + 20, cy0 + 62, "Узкое место участка", 16, 700, INK, "start")
    c.text(cx0 + 20, cy0 + 84, "Локация 3 · узел «grind»", 10, 400, TXT2, "start")

    c.text(cx0 + 20, cy0 + 116, "Загрузка станка", 10, 400, TXT2, "start")
    c.text(cx0 + 20, cy0 + 142, "97 %", 22, 700, RED, "start")
    c.text(cx0 + 120, cy0 + 116, "Очередь", 10, 400, TXT2, "start")
    c.text(cx0 + 120, cy0 + 142, "14 шт", 22, 700, INK, "start")
    c.text(cx0 + 220, cy0 + 116, "Такт", 10, 400, TXT2, "start")
    c.text(cx0 + 220, cy0 + 142, "21 мин", 22, 700, INK, "start")

    c.rect(cx0 + 20, cy0 + 166, cw_ - 40, 1, "#EDF1F7", "none", 0, 0)
    c.text(cx0 + 20, cy0 + 192, "Что показывает точка", 10, 700, MUTED, "start")
    for i, ln in enumerate(["Операция ограничивает выпуск:",
                            "загрузка 97 %, очередь копится,",
                            "цикл участка растёт до 8,8 часа."]):
        c.text(cx0 + 20, cy0 + 214 + i * 18, ln, 10.5, 400, TXT2, "start")

    c.rect(cx0 + 20, cy0 + 268, 150, 32, "#2E6FD0", "#2E6FD0", 7, 0)
    c.text(cx0 + 95, cy0 + 289, "Открыть в двойнике", 9.5, 600, WHITE)
    c.rect(cx0 + 182, cy0 + 268, 130, 32, "#FFFFFF", BORDER, 7, 1.2)
    c.text(cx0 + 247, cy0 + 289, "Кейс и фото", 9.5, 600, TXT2)

    # мини-карта
    mx, my = 40, 640
    c.rect(mx, my, 220, 150, "#FFFFFF", "none", 10, 0, opacity=0.94)
    c.text(mx + 14, my + 24, "Маршрут", 9.5, 700, MUTED, "start")
    c.rect(mx + 14, my + 36, 192, 98, "#EAF0F7", "#DDE6F0", 6, 1)
    pts = [(mx + 30, my + 116), (mx + 70, my + 60), (mx + 130, my + 96), (mx + 176, my + 52)]
    c.polyline(pts, "#2E6FD0", 1.6, None, False)
    for i, (px, py) in enumerate(pts):
        c.circle(px, py, 7 if i != 2 else 9, fill=ORANGE if i == 2 else "#2E6FD0", outline=WHITE, width=1.6)
        c.text(px, py + 3.5, str(i + 1), 7.5, 700, WHITE)

    # нижняя лента локаций
    c.rect(300, 742, 1090, 120, "#FFFFFF", "none", 12, 0, opacity=0.96)
    thumbs = [("1", "Склад заготовок"), ("2", "Токарный участок"), ("3", "Шлифовка"), ("4", "ОТК")]
    for i, (n, name) in enumerate(thumbs):
        tx = 320 + i * 258
        active = i == 2
        c.rect(tx, 760, 232, 84, "#EDF2F8" if not active else "#E3EEFB", ORANGE if active else "#DDE6F0", 8, 2 if active else 1)
        # мини-превью сцены
        c.rect(tx + 8, 768, 80, 68, "#DCE6F2" if not active else "#CFE0F3", "none", 6, 0)
        c.poly([(tx + 14, 826), (tx + 40, 800), (tx + 74, 812), (tx + 74, 830), (tx + 14, 830)],
               fill="#B9C9DD" if not active else "#A7C2DE", outline="none", close=True)
        c.text(tx + 100, 792, f"{n}. {name}", 10.5, 700 if active else 600, INK if active else TXT2, "start")
        c.text(tx + 100, 812, "4 точки" if i else "3 точки", 9.5, 400, MUTED, "start")
        c.text(tx + 100, 830, "01:20" if i == 2 else "00:45", 9.5, 400, MUTED, "start")

    # нижняя полоса прогресса
    c.rect(300, 674, 700, 4, "#DCE5F0", "none", 2, 0)
    c.rect(300, 674, 420, 4, ORANGE, "none", 2, 0)
    c.text(300, 664, "Локация 3 из 4 · 2 мин 10 с", 9.5, 600, TXT2, "start")

    save(c, "f14_tour.png")


def poi_map():
    W, H = 1440, 780
    c = Canvas(W, H)
    header(c, "Карта точек интереса и маршрут экскурсии",
           "План участка сверху: 4 локации, 8 точек интереса, маршрут с привязкой к узлам процесса и метрикам")

    x0, y0, pw, ph = 60, 128, 900, 570
    c.rect(x0, y0, pw, ph, "#F7FAFE", "#C9D6E5", 12, 1.8)
    c.text(x0 + 24, y0 + 32, "Участок механообработки (план)", 12.5, 700, INK, "start")

    zones = [("Склад заготовок", 90, 170, 240, 190, "#EAF1FB"),
             ("Токарный участок", 350, 170, 260, 190, "#EAF1FB"),
             ("Шлифовка и мойка", 630, 170, 300, 190, "#FBEFED"),
             ("ОТК и упаковка", 90, 400, 840, 250, "#EAF1FB")]
    for name, zx, zy, zw, zh, fill in zones:
        c.rect(zx, zy, zw, zh, fill, "#CFDCEA", 8, 1.4)
        c.text(zx + 14, zy + 24, name, 10.5, 700, INK2, "start")

    for (ex, ey, ew, eh) in [(120, 230, 80, 46), (215, 230, 60, 46), (390, 230, 80, 50),
                             (485, 230, 80, 50), (680, 240, 100, 54), (800, 240, 80, 54),
                             (140, 470, 120, 64), (340, 470, 90, 56), (500, 470, 100, 56)]:
        c.rect(ex, ey, ew, eh, "#DCE6F2", "#B9C9DD", 4, 1.2)

    route = [(200, 330), (780, 330), (780, 505), (215, 505)]
    c.polyline(route, BLUE2, 3, None, False)

    stops = [(1, 200, 330, "Склад"), (2, 330, 330, "Комплектация"), (3, 470, 330, "Токарная"),
             (4, 620, 330, "Фрезеровка"), (5, 780, 330, "Шлифовка"),
             (6, 780, 505, "Мойка"), (7, 500, 505, "ОТК"), (8, 215, 505, "Упаковка")]
    for n, sx, sy, name in stops:
        hot = n == 5
        col = ORANGE if hot else BLUE2
        c.circle(sx, sy, 17, fill=col, outline=WHITE, width=2.5)
        c.text(sx, sy + 5, str(n), 11.5, 700, WHITE)
        dy = -28 if sy == 330 and n != 5 else 40
        c.text(sx, sy + dy, name, 9.5, 600, ORANGE if hot else INK2)

    c.text(96, 660, "Маршрут: 1 → 8, около 6 минут с переходами; локации 1–4 открываются по клику на номер.",
           10, 400, MUTED, "start")

    rx = 1000
    c.rect(rx, 128, 400, 250, "#FFFFFF", "#E2E9F3", 12, 1.2, shadow=True)
    c.text(rx + 20, 160, "Связка точки с двойником", 12.5, 700, INK, "start")
    rows = [("POI-04", "наладка", "21 мин", "SMED"),
            ("POI-05", "шлифовка", "97 %", "узкое место"),
            ("POI-07", "ОТК", "2,3 %", "брак")]
    for i, (pid, name, val, tag) in enumerate(rows):
        y = 196 + i * 56
        c.text(rx + 20, y, pid, 10.5, 700, ORANGE if pid == "POI-05" else BLUE2, "start")
        c.text(rx + 90, y, name, 10.5, 600, INK, "start")
        c.text(rx + 200, y, val, 10.5, 700, INK, "start")
        c.text(rx + 280, y, tag, 9.5, 600, MUTED, "start")

    c.rect(rx, 400, 400, 296, "#FFFFFF", "#E2E9F3", 12, 1.2, shadow=True)
    c.text(rx + 20, 432, "Как читать карту", 12.5, 700, INK, "start")
    lines = ["Номер — порядок остановки в туре.",
             "Оранжевая точка — узкое место, к ней",
             "привязаны метрики и рекомендация.",
             "Каждая точка ведёт в узел процесса",
             "и к метрике прогона.",
             "Переход между локациями — 3–5 с,",
             "сцена грузится по требованию."]
    for i, ln in enumerate(lines):
        c.text(rx + 20, 460 + i * 26, ln, 10.5, 400, TXT2, "start")

    save(c, "f15_poi_map.png")


tour_screen()
poi_map()

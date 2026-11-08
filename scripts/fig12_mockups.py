# -*- coding: utf-8 -*-
"""F12 — макет дашборда, F13 — сравнение сценариев."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from fig_kit import *  # noqa

HERE = os.path.dirname(os.path.abspath(__file__))
M = json.load(open(os.path.join(HERE, "metrics.json"), encoding="utf-8"))
S = {r["id"]: r["kpi"] for r in M["scenarios"]}

UI_BG = "#F3F6FB"
CARD = "#FFFFFF"
BORDER = "#E2E9F3"
TXT2 = "#65758B"
NAVY = "#14263F"
NAVY2 = "#1C3252"


def num(v, d=0):
    s = f"{v:,.{d}f}".replace(",", " ").replace(".", ",")
    return s


def window(c, url="dsh.local/processes/flange-line", h=868):
    c.rect(16, 16, 1408, h, "#FFFFFF", "#CBD6E4", 14, 1.6, shadow=True)
    c.rect(16, 16, 1408, 34, "#F1F4F9", "#E2E9F3", 14, 0)
    c.rect(16, 36, 1408, 14, "#F1F4F9", "none", 0, 0)
    for i, col in enumerate(["#E5705F", "#E8B44F", "#6FBF8B"]):
        c.circle(40 + i * 18, 33, 5.5, fill=col)
    c.rect(120, 24, 560, 18, "#FFFFFF", "#E2E9F3", 9, 1)
    c.text(136, 37, url, 9.5, 400, TXT2, "start")


def sidebar(c, active="Обзор", h=832):
    c.rect(17, 51, 236, h, NAVY, NAVY, 0, 0)
    c.rect(17, 51, 236, h, NAVY, "none", 0, 0)
    base = 51 + h
    c.rect(40, 76, 40, 40, "#2E6FD0", "#2E6FD0", 10, 0)
    c.text(60, 103, "ЦД", 15, 700, WHITE)
    c.text(94, 92, "Цифровой двойник", 12, 700, WHITE, "start")
    c.text(94, 110, "РМЦ · Уфа", 10, 400, "#93A7C4", "start")

    items = ["Обзор", "Процессы", "Сценарии", "3D-туры", "Данные", "Отчёты"]
    y = 150
    for it in items:
        if it == active:
            c.rect(30, y, 210, 36, NAVY2, NAVY2, 8, 0)
            c.rect(30, y, 4, 36, "#4C8DF0", "none", 2, 0)
        c.text(54, y + 24, it, 12, 600 if it == active else 400,
               WHITE if it == active else "#A9BCD6", "start")
        y += 44

    c.line(30, base - 250, 240, base - 250, "#2A4364", 1)
    c.text(40, base - 222, "Пилот", 9.5, 700, "#7F94B3", "start")
    c.text(40, base - 202, "РМЦ, участок механообработки", 10, 400, "#A9BCD6", "start")
    c.text(40, base - 184, "демо-данные, синтетика", 10, 400, "#7F94B3", "start")

    c.circle(58, base - 24, 15, fill="#2E6FD0")
    c.text(58, base - 19, "ИП", 10, 700, WHITE)
    c.text(82, base - 28, "И. Петров", 11, 600, WHITE, "start")
    c.text(82, base - 12, "инженер-технолог", 9.5, 400, "#93A7C4", "start")


def kpi_card(c, x, y, w, h, label, value, unit, delta, good=False, hint=None):
    c.rect(x, y, w, h, CARD, BORDER, 10, 1.2)
    c.text(x + 18, y + 30, label, 11.5, 400, TXT2, "start")
    c.text(x + 18, y + 74, value, 30, 700, INK, "start")
    vw = c.text_w(value, 30, 700)
    c.text(x + 18 + vw + 6, y + 74, unit, 12, 400, TXT2, "start")
    col = GREEN if good else RED
    c.rect(x + 18, y + 92, c.text_w(delta, 10.5, 600) + 16, 20, "#F1F7F3" if good else "#FBEFED",
           "none", 5, 0)
    c.text(x + 26, y + 106, delta, 10.5, 600, col, "start")
    if hint:
        c.text(x + w - 18, y + 106, hint, 10, 400, MUTED, "end")


def dashboard():
    W, H = 1440, 900
    c = Canvas(W, H, UI_BG)
    window(c)
    sidebar(c, "Обзор")

    # верхняя панель
    c.rect(253, 51, 1170, 56, "#FFFFFF", "#EDF1F7", 0, 0)
    c.text(276, 76, "ООО «Газпром нефть» / РМЦ / Изготовление фланца", 10.5, 400, TXT2, "start")
    c.text(276, 96, "Обзор процесса", 15, 700, INK, "start")

    c.rect(1080, 64, 132, 30, "#FFFFFF", BORDER, 7, 1.2)
    c.text(1094, 84, "Сценарий: AS-IS", 10.5, 600, INK, "start")
    c.text(1198, 84, "▾", 9, 600, TXT2, "start")
    c.rect(1222, 64, 126, 30, "#2E6FD0", "#2E6FD0", 7, 0)
    c.text(1285, 84, "+ Новый прогон", 10.5, 600, WHITE)

    # KPI
    k = S["asis"]
    cw = 276
    kpi_card(c, 276, 124, cw, 118, "Выпуск, шт/сут", "40,3", "из 42", "−4 % к плану", False, "план 42")
    kpi_card(c, 276 + 292, 124, cw, 118, "Цикл изготовления", "529", "мин", "+10 % к норме", False, "норма 480")
    kpi_card(c, 276 + 584, 124, cw, 118, "Заказы в срок", "47", "%", "−38 п.п.", False, "цель 95 %")
    kpi_card(c, 276 + 876, 124, cw, 118, "В работе (WIP)", "20,7", "шт", "рост за 2 нед.", False, "норма 12")

    # график загрузки
    c.rect(276, 262, 700, 330, CARD, BORDER, 10, 1.2)
    c.text(296, 292, "Загрузка операций, %", 13, 700, INK, "start")
    c.text(296, 312, "AS-IS · расчёт по 26 суткам модели", 10, 400, TXT2, "start")
    rows = [("Шлифовка", 97, True), ("Мойка", 13, False), ("ОТК", 13, False),
            ("Фрезеровка", 40, False), ("Сверловка", 29, False), ("Точение", 22, False)]
    rows = [("Шлифовка", 97, True), ("Фрезеровка", 40, False), ("Сверловка", 29, False),
            ("Точение", 22, False), ("Мойка", 13, False), ("ОТК", 13, False)]
    by = 340
    for i, (name, val, hot) in enumerate(rows):
        y = by + i * 38
        c.text(296, y + 14, name, 11, 600 if hot else 400, INK if hot else TXT2, "start")
        c.rect(400, y + 2, 400, 14, "#EEF2F8", "none", 7, 0)
        wbar = max(6, 400 * val / 100)
        c.rect(400, y + 2, wbar, 14, RED if hot else "#4C8DF0", "none", 7, 0)
        c.text(812, y + 14, f"{val} %", 10.5, 700 if hot else 600, RED if hot else TXT2, "start")
        if hot:
            c.rect(846, y, 62, 18, "#FBEFED", "none", 5, 0)
            c.text(877, y + 13, "узкое", 9.5, 700, RED)

    # карточка узкого места
    c.rect(992, 262, 428, 330, CARD, BORDER, 10, 1.2)
    c.rect(992, 262, 428, 4, RED, "none", 2, 0)
    c.text(1014, 296, "Узкое место", 13, 700, RED, "start")
    c.text(1014, 336, "Шлифовальная", 20, 700, INK, "start")
    c.text(1014, 358, "1 станок · 21 мин на деталь · загрузка 97 %", 10.5, 400, TXT2, "start")
    c.text(1014, 400, "Из-за очереди на шлифовке", 11, 400, TXT2, "start")
    c.text(1014, 418, "цикл растёт до 8,8 часа,", 11, 400, TXT2, "start")
    c.text(1014, 436, "53 % заказов выходят за срок.", 11, 400, TXT2, "start")
    c.rect(1014, 458, 384, 1, "#EDF1F7", "none", 0, 0)
    c.text(1014, 484, "Рекомендация модели", 10, 700, MUTED, "start")
    c.text(1014, 506, "Сценарий C: +1 станок и SMED", 11.5, 600, GREEN, "start")
    c.text(1014, 528, "цикл −83 %, в срок 100 %", 11, 400, TXT2, "start")
    c.rect(1014, 546, 150, 30, "#1E8A5F", "#1E8A5F", 7, 0)
    c.text(1089, 566, "Открыть сценарий", 10.5, 600, WHITE)

    # таблица сценариев
    c.rect(276, 608, 1144, 240, CARD, BORDER, 10, 1.2)
    c.text(296, 640, "Сценарии сравнения", 13, 700, INK, "start")
    c.text(1160, 640, "все расчёты воспроизводимы: seed + версия модели", 9.5, 400, MUTED, "end")
    heads = ["Сценарий", "Цикл, мин", "Выпуск, шт/сут", "В срок, %", "Себестоимость, ₽"]
    xs = [296, 620, 790, 960, 1120]
    c.rect(276, 656, 1144, 28, "#F7FAFE", "none", 0, 0)
    for h_, x in zip(heads, xs):
        c.text(x, 675, h_, 10, 600, TXT2, "start")
    table = [("AS-IS (как есть)", "529", "40,3", "47", "1 841", False),
             ("A · второй шлифовальный станок", "94", "40,9", "100", "1 842", False),
             ("B · быстрая переналадка (SMED)", "519", "40,2", "45", "1 834", False),
             ("C · A + B", "90", "41,2", "100", "1 831", True)]
    ty = 690
    for i, (name, cyc, thr, ot, cost, best) in enumerate(table):
        y = ty + i * 38
        if best:
            c.rect(276, y - 6, 1144, 36, "#F2F8F4", "none", 0, 0)
        c.text(296, y + 16, name, 10.5, 700 if best else 400, INK if best else TXT2, "start")
        c.text(xs[1], y + 16, cyc, 10.5, 600, INK, "start")
        c.text(xs[2], y + 16, thr, 10.5, 600, INK, "start")
        c.text(xs[3], y + 16, ot, 10.5, 600, GREEN if ot == "100" else INK, "start")
        c.text(xs[4], y + 16, cost, 10.5, 600, INK, "start")

    save(c, "f12_dashboard.png")


def scenarios():
    W, H = 1440, 820
    c = Canvas(W, H, UI_BG)
    window(c, "dsh.local/scenarios/compare", h=788)
    sidebar(c, "Сценарии", h=754)

    c.rect(253, 51, 1170, 56, "#FFFFFF", "#EDF1F7", 0, 0)
    c.text(276, 78, "Сценарии / Сравнение", 15, 700, INK, "start")
    c.text(276, 96, "база: AS-IS · модель v1.3 · 5 репликаций × 26 суток", 10, 400, TXT2, "start")
    c.rect(1222, 64, 126, 30, "#2E6FD0", "#2E6FD0", 7, 0)
    c.text(1285, 84, "Экспорт PDF", 10.5, 600, WHITE)

    # карточки сценариев
    cards = [("AS-IS", "1 841", "529 мин", "47 %", False),
             ("A · +шлифовка", "1 842", "94 мин", "100 %", False),
             ("B · SMED", "1 834", "519 мин", "45 %", False),
             ("C · A + B", "1 831", "90 мин", "100 %", True)]
    for i, (name, cost, cyc, ot, best) in enumerate(cards):
        x = 276 + i * 292
        c.rect(x, 124, 276, 150, "#F2F8F4" if best else CARD, "#BFDCCB" if best else BORDER, 10, 1.4 if best else 1.2)
        c.text(x + 16, 154, name, 12, 700, INK, "start")
        c.text(x + 16, 186, cyc, 24, 700, INK, "start")
        c.text(x + 16, 208, "время цикла", 10, 400, TXT2, "start")
        c.text(x + 150, 186, ot, 16, 700, GREEN if ot == "100" else RED, "start")
        c.text(x + 150, 208, "в срок", 10, 400, TXT2, "start")
        c.text(x + 16, 240, f"{cost} ₽ / шт обработки", 10.5, 400, TXT2, "start")
        if best:
            c.rect(x + 180, 144, 80, 18, "#1E8A5F", "#1E8A5F", 5, 0)
            c.text(x + 220, 157, "лучший", 9, 700, WHITE)

    # график сравнения
    c.rect(276, 292, 700, 380, CARD, BORDER, 10, 1.2)
    c.text(296, 322, "Цикл изготовления по сценариям, мин", 12.5, 700, INK, "start")
    base_y = 620
    vals = [529, 94, 519, 90]
    names = ["AS-IS", "A", "B", "C"]
    for i, (v, nm) in enumerate(zip(vals, names)):
        x = 340 + i * 150
        hgt = v / 560 * 250
        col = "#1E8A5F" if nm == "C" else ("#C9D6E5" if nm == "AS-IS" else "#8FB4E8")
        c.rect(x, base_y - hgt, 84, hgt, col, "none", 6, 0)
        c.text(x + 42, base_y - hgt - 12, str(v), 12, 700, INK)
        c.text(x + 42, base_y + 20, nm, 11, 600, TXT2)
    c.line(316, base_y, 936, base_y, BORDER, 1.2)
    c.rect(316, base_y - 250, 620, 250, "none", "#EEF2F8", 0, 1)
    c.text(736, base_y - 224, "норма 480 мин", 9.5, 600, MUTED, "start")
    c.line(316, base_y - 480 / 560 * 250, 936, base_y - 480 / 560 * 250, RED, 1.2, "6 5")

    # правая панель: что меняется
    c.rect(992, 292, 428, 380, CARD, BORDER, 10, 1.2)
    c.text(1014, 322, "C · второй станок + SMED", 12.5, 700, INK, "start")
    deltas = [("Цикл изготовления", "529 → 90 мин", "−83 %", True),
              ("Заказы в срок", "47 → 100 %", "+53 п.п.", True),
              ("Незавершённое произв.", "20,7 → 3,3 шт", "−84 %", True),
              ("Выпуск", "40,3 → 41,2 шт", "+2 %", True),
              ("Себестоимость обработки", "1 841 → 1 831 ₽", "−0,5 %", True)]
    for i, (lab, val, d, good) in enumerate(deltas):
        y = 360 + i * 56
        c.text(1014, y, lab, 10, 400, TXT2, "start")
        c.text(1014, y + 20, val, 12.5, 700, INK, "start")
        c.rect(1268, y + 2, 132, 24, "#F1F7F3", "none", 6, 0)
        c.text(1334, y + 19, d, 10.5, 700, GREEN)

    note_height = note(c, 276, 690, 1144,
                       "Вывод для руководства: второй шлифовальный станок снимает узкое место, но без быстрой переналадки "
                       "эффект по циклу теряется на переналадках партий. Совмещение даёт лучший результат при том же парке.",
                       size=11.5)
    save(c, "f13_scenarios.png")


dashboard()
scenarios()

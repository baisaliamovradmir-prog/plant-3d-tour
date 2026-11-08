# -*- coding: utf-8 -*-
"""F10 — компонентная архитектура, F11 — архитектура 3D-сцены."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from fig_kit import *  # noqa


def band(c, y, h, label, x=30, w=1380, fill="#F7FAFE"):
    c.rect(x, y, w, h, fill, LINE, 10, 1.3)
    c.text(x + 14, y + 22, label, 11, 700, MUTED, "start")


def arch():
    W, H = 1440, 880
    c = Canvas(W, H)
    header(c, "Компонентная архитектура решения",
           "Браузерный SPA, REST-API, дискретно-событийный симулятор и PostgreSQL; внешних интеграций нет")

    # уровень 1 — клиент
    band(c, 118, 132, "КЛИЕНТ · браузер (WebGL 2, без нативных клиентов)")
    c.rect(50, 146, 300, 92, WHITE, "#B9C9DD", 8, 1.5, shadow=True)
    c.text(66, 176, "SPA · React + TypeScript", 13, 700, INK, "start")
    c.text(66, 198, "маршруты, состояние, права", 11, 400, MUTED, "start")
    c.text(66, 222, "Three.js · WebGL 2", 11, 600, BLUE2, "start")

    chips = [("Дашборд", 380), ("Мнемосхема", 530), ("Сценарии", 680), ("3D-тур", 810), ("Админка", 930)]
    for name, x in chips:
        c.pill(x, 170, 120, 32, name, "#EAF1FB", BLUE2, 11.5, BLUE)

    c.text(1100, 178, "Адаптивная вёрстка:", 11, 600, INK2, "start")
    c.text(1100, 198, "desktop / tablet / phone", 11, 400, MUTED, "start")
    c.text(1100, 220, "WCAG 2.1 AA", 11, 600, GREEN, "start")

    # уровень 2 — API
    band(c, 290, 104, "API · HTTPS, JSON, JWT-авторизация")
    c.rect(50, 328, 1340, 52, "#EFF6FD", BLUE2, 8, 1.6)
    c.text(70, 360, "FastAPI · REST · /auth   /processes   /scenarios   /runs   /metrics   /tours   /pois   /export",
           12.5, 600, BLUE, "start")

    # уровень 3 — сервисы
    band(c, 426, 150, "СЕРВИСНЫЙ СЛОЙ")
    svc = [
        ("Сервис сценариев", "параметры, версии,\nвалидация", 50),
        ("Симулятор DES", "очереди, ресурсы,\n5 репликаций", 390),
        ("Сервис туров", "локации, POI,\nпубликация", 730),
        ("Отчёты и экспорт", "PDF, XLSX, CSV", 1070),
    ]
    for title, sub, x in svc:
        c.rect(x, 452, 300, 104, WHITE, "#B9C9DD", 8, 1.5, shadow=True)
        c.text(x + 16, 480, title, 13, 700, INK, "start")
        for i, ln in enumerate(sub.split("\n")):
            c.text(x + 16, 504 + i * 18, ln, 11, 400, MUTED, "start")

    # уровень 4 — данные
    band(c, 616, 140, "ХРАНЕНИЕ")
    data = [("PostgreSQL 16", "процессы, сценарии,\nпрогоны, метрики", 50, BLUE2),
            ("S3 / MinIO", "glTF, панорамы,\nмедиа карточек", 390, CYAN),
            ("Redis", "кэш метрик\nи сессий", 730, ORANGE),
            ("Очередь задач", "фоновые прогоны", 1070, MUTED)]
    for title, sub, x, col in data:
        c.rect(x, 642, 300, 100, WHITE, "#B9C9DD", 8, 1.5)
        c.rect(x, 642, 4, 100, col, "none", 2, 0)
        c.text(x + 16, 670, title, 12.5, 700, INK, "start")
        for i, ln in enumerate(sub.split("\n")):
            c.text(x + 16, 694 + i * 18, ln, 11, 400, MUTED, "start")

    # стрелки
    c.arrow(200, 250, 200, 326, INK2, 2)
    c.text(210, 286, "HTTPS / JSON, JWT", 10.5, 600, INK2, "start")
    c.arrow(700, 380, 700, 450, INK2, 2)
    c.text(710, 414, "внутренние вызовы", 10.5, 600, INK2, "start")
    c.arrow(200, 556, 200, 640, INK2, 2)
    c.text(210, 604, "SQL (asyncpg)", 10.5, 600, INK2, "start")
    c.arrow(540, 556, 540, 640, INK2, 2)
    c.text(550, 604, "S3 API", 10.5, 600, INK2, "start")
    c.arrow(880, 556, 880, 640, INK2, 2)
    c.text(890, 604, "кэш", 10.5, 600, INK2, "start")

    # вне границ
    c.rect(50, 776, 1340, 54, "#F5F5F5", "#DCDCDC", 8, 1.3, dash="7 5")
    c.text(70, 808, "ВНЕ ГРАНИЦ ПРОТОТИПА: интеграции с ERP, MES и 1С не выполняются — данные загружаются файлом "
                    "или генерируются синтетически", 11.5, 600, MUTED, "start")

    save(c, "f10_architecture.png")


def scene_arch():
    W, H = 1440, 660
    c = Canvas(W, H)
    header(c, "Архитектура 3D-сцены и карта точек интереса",
           "Как устроена сцена тура: локации, привязка POI к процессу и метрике, технический конвейер загрузки")

    # левая часть: дерево контента
    c.text(30, 122, "СТРУКТУРА КОНТЕНТА", 11, 700, MUTED, "start")
    c.rect(30, 140, 250, 70, "#EAF1FB", BLUE2, 8, 1.5)
    c.text(155, 168, "3D-тур", 13, 700, BLUE)
    c.text(155, 190, "tour: flange-line", 10.5, 400, MUTED)

    locs = [("Локация 1", "Склад заготовок", 200), ("Локация 2", "Токарный участок", 300),
            ("Локация 3", "Шлифовка", 400), ("Локация 4", "ОТК", 500)]
    for title, sub, y in locs:
        c.rect(330, y, 230, 66, WHITE, "#B9C9DD", 8, 1.4, shadow=True)
        c.text(348, y + 26, title, 12, 700, INK, "start")
        c.text(348, y + 46, sub, 10.5, 400, MUTED, "start")
        c.elbow_arrow([(280, 175), (305, 175), (305, y + 33), (328, y + 33)], BLUE2, 1.4)

    pois = [("POI-01 · склад", 200), ("POI-04 · наладка", 300), ("POI-07 · узкое место", 400), ("POI-10 · контроль", 500)]
    for label, y in pois:
        c.pill(600, y + 18, 190, 30, label, "#FDF3EF", "#EBC3B6", 10.5, "#8A3B21")
        c.arrow(560, y + 33, 596, y + 33, ORANGE, 1.4)

    c.text(600, 172, "точка интереса", 10, 600, ORANGE, "start")
    c.text(600, 190, "якорь x/y/z + карточка", 10, 400, MUTED, "start")

    # привязка
    c.rect(840, 140, 260, 150, "#F2F8F4", "#CBE2D5", 10, 1.4)
    c.text(856, 166, "Привязка к двойнику", 12, 700, GREEN, "start")
    for i, ln in enumerate(["узел процесса", "метрика прогона", "кейс с результатом"]):
        c.text(856, 190 + i * 24, "•  " + ln, 10.5, 400, INK2, "start")
    c.arrow(790, 415, 838, 300, GREEN, 1.5)
    c.arrow(790, 315, 838, 290, GREEN, 1.5)
    c.arrow(790, 215, 838, 250, GREEN, 1.5)

    # техническая часть
    c.text(30, 590, "", 10)
    c.text(1120, 122, "КОНВЕЙЕР ЗАГРУЗКИ", 11, 700, MUTED, "start")
    steps = [("Blender / glTF", 140), ("Draco + LOD", 210), ("CDN / S3", 280), ("Three.js", 350), ("WebGL 2", 420)]
    for name, y in steps:
        c.rect(1120, y, 250, 54, WHITE, "#B9C9DD", 8, 1.4)
        c.text(1245, y + 32, name, 11.5, 600, INK)
        if y < 420:
            c.arrow(1245, y + 54, 1245, y + 68, INK2, 1.6)

    note(c, 30, 586, 760,
         "Бюджет сцены: до 40 тыс. треугольников на локацию, текстуры 2K, не более 3 локаций в памяти "
         "одновременно; целевые 60 fps на ноутбуках с интегрированной графикой.", size=11.5)

    save(c, "f11_scene_arch.png")


arch()
scene_arch()

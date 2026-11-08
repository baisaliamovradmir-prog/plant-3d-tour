# -*- coding: utf-8 -*-
"""F8a/F8b — ER-диаграммы, F9 — карта сущностей предметной области."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from fig_kit import *  # noqa

CW = 300
COLS = [30, 390, 750, 1110]
R1, R2 = 130, 470


def entity(c, x, y, name, rows, accent=BLUE, note=None):
    h = 40 + len(rows) * 25 + 12
    c.rect(x, y, CW, h, WHITE, "#B9C9DD", 8, 1.5, shadow=True)
    # шапка
    c.d.rounded_rectangle([c._s(x), c._s(y), c._s(x + CW), c._s(y + 46)], radius=c._s(8), fill=hex2rgb(accent) + (255,))
    c.rect(x, y + 26, CW, 20, accent, "none", 0, 0)
    c.text(x + 14, y + 28, name, 15, 700, WHITE, "start")
    if note:
        c.text(x + CW - 12, y + 28, note, 10.5, 600, "#D8E6F7", "end")
    for i, (attr, typ, tag) in enumerate(rows):
        ry = y + 46 + i * 25
        if i % 2 == 0:
            c.rect(x + 1, ry, CW - 2, 25, "#F6F9FD", "none", 0, 0)
        col = INK2
        weight = 400
        if tag in ("PK", "FK"):
            weight = 700
            col = BLUE if tag == "PK" else CYAN
        c.text(x + 12, ry + 18, attr, 14, weight, col, "start")
        c.text(x + CW - 12, ry + 18, typ, 11.5, 400, MUTED, "end")
        if tag:
            c.text(x + CW - 12 - c.text_w(typ, 11.5) - 10, ry + 18, tag, 10.5, 700,
                   RED if tag == "PK" else CYAN, "end")
    return h


def many(c, x, y, ang):
    import math
    for a in (-0.45, 0, 0.45):
        c.line(x, y, x - 10 * math.cos(ang + a), y - 10 * math.sin(ang + a), BLUE2, 1.4)


def tick(c, x, y, ang):
    import math
    px, py = -math.sin(ang), math.cos(ang)
    c.line(x + px * 5, y + py * 5, x - px * 5, y - py * 5, BLUE2, 1.4)


def link(c, p1, p2, label=None, dash=None):
    import math
    x1, y1 = p1
    x2, y2 = p2
    c.line(x1, y1, x2, y2, BLUE2, 1.4, dash)
    ang = math.atan2(y2 - y1, x2 - x1)
    many(c, x2, y2, ang)
    tick(c, x1 + 12 * math.cos(ang), y1 + 12 * math.sin(ang), ang)
    if label:
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        w = c.text_w(label, 10, 600)
        c.rect(mx - w / 2 - 5, my - 11, w + 10, 20, WHITE, "none", 3, 0)
        c.text(mx, my + 4, label, 10, 600, BLUE2)


def er_core():
    W, H = 1440, 800
    c = Canvas(W, H)
    header(c, "ER-диаграмма: ядро цифрового двойника",
           "Нотация «воронья лапка»: 1 — N. Полный перечень атрибутов и ограничений — в таблицах раздела 6")

    entity(c, COLS[0], R1, "processes", [
        ("id", "uuid", "PK"), ("code", "varchar(32)", ""), ("name", "varchar(120)", ""),
        ("site", "varchar(80)", ""), ("owner_id", "uuid", "FK"), ("status", "enum", ""),
        ("model_version", "int", ""),
    ])
    entity(c, COLS[1], R1, "process_nodes", [
        ("id", "uuid", "PK"), ("process_id", "uuid", "FK"), ("code", "varchar(32)", ""),
        ("kind", "enum", ""), ("servers", "int", ""), ("mean_time", "numeric(7,2)", ""),
        ("cv", "numeric(4,3)", ""), ("setup_min", "numeric(6,2)", ""),
    ])
    entity(c, COLS[2], R1, "process_edges", [
        ("id", "uuid", "PK"), ("process_id", "uuid", "FK"), ("from_node", "uuid", "FK"),
        ("to_node", "uuid", "FK"), ("kind", "enum", ""), ("probability", "numeric(4,3)", ""),
    ])
    entity(c, COLS[3], R1, "run_metrics", [
        ("id", "bigserial", "PK"), ("run_id", "uuid", "FK"), ("metric_id", "int", "FK"),
        ("node_id", "uuid", "FK"), ("value", "numeric(12,4)", ""), ("unit", "varchar(16)", ""),
    ])

    entity(c, COLS[0], R2, "resources", [
        ("id", "uuid", "PK"), ("process_id", "uuid", "FK"), ("code", "varchar(32)", ""),
        ("kind", "enum", ""), ("cost_per_hour", "numeric(9,2)", ""), ("capacity", "int", ""),
    ])
    entity(c, COLS[1], R2, "scenarios", [
        ("id", "uuid", "PK"), ("process_id", "uuid", "FK"), ("name", "varchar(120)", ""),
        ("base_scenario_id", "uuid", "FK"), ("params", "jsonb", ""), ("status", "enum", ""),
        ("created_by", "uuid", "FK"), ("published_at", "timestamptz", ""),
    ])
    entity(c, COLS[2], R2, "runs", [
        ("id", "uuid", "PK"), ("scenario_id", "uuid", "FK"), ("seed", "int", ""),
        ("warmup_days", "int", ""), ("run_days", "int", ""), ("status", "enum", ""),
        ("started_at", "timestamptz", ""), ("finished_at", "timestamptz", ""),
    ])
    entity(c, COLS[3], R2, "metrics", [
        ("id", "serial", "PK"), ("code", "varchar(32)", ""), ("name", "varchar(80)", ""),
        ("unit", "varchar(16)", ""), ("kind", "enum", ""),
    ])

    link(c, (COLS[0] + CW, R1 + 100), (COLS[1], R1 + 100))
    link(c, (COLS[1] + CW, R1 + 100), (COLS[2], R1 + 100))
    link(c, (COLS[0] + 90, R1 + 40 + 7 * 25 + 12), (COLS[0] + 90, R2), "1 : N")
    link(c, (COLS[0] + CW, R1 + 230), (COLS[1] + 60, R2), "1 : N")
    link(c, (COLS[1] + CW, R2 + 115), (COLS[2], R2 + 115))
    link(c, (COLS[2] + 150, R2), (COLS[3] + 150, R1 + 40 + 7 * 25 + 12), "1 : N")
    link(c, (COLS[3] + 250, R2), (COLS[3] + 250, R1 + 40 + 7 * 25 + 12))

    c.text(30, H - 34, "PK — первичный ключ, FK — внешний ключ. Все таблицы содержат created_at / updated_at (не показаны).",
           11.5, 400, MUTED, "start")
    save(c, "f08a_er_core.png")


def er_tour():
    W, H = 1440, 800
    c = Canvas(W, H)
    header(c, "ER-диаграмма: 3D-тур, кейсы и доступ",
           "Связка «тур → локация → точка интереса → кейс → метрика» и базовая авторизация пользователей")

    entity(c, COLS[0], R1, "users", [
        ("id", "uuid", "PK"), ("email", "citext", ""), ("password_hash", "text", ""),
        ("full_name", "varchar(120)", ""), ("role_id", "int", "FK"), ("is_active", "bool", ""),
    ])
    entity(c, COLS[1], R1, "roles", [
        ("id", "serial", "PK"), ("code", "varchar(16)", ""), ("name", "varchar(40)", ""),
    ])
    entity(c, COLS[2], R1, "tours", [
        ("id", "uuid", "PK"), ("process_id", "uuid", "FK"), ("title", "varchar(160)", ""),
        ("status", "enum", ""), ("audience", "enum", ""), ("published_at", "timestamptz", ""),
    ])
    entity(c, COLS[3], R1, "locations", [
        ("id", "uuid", "PK"), ("tour_id", "uuid", "FK"), ("code", "varchar(32)", ""),
        ("name", "varchar(120)", ""), ("order_no", "int", ""), ("scene_url", "text", ""),
        ("node_id", "uuid", "FK"),
    ])

    entity(c, COLS[0], R2, "audit_log", [
        ("id", "bigserial", "PK"), ("user_id", "uuid", "FK"), ("entity", "varchar(40)", ""),
        ("entity_id", "text", ""), ("action", "varchar(24)", ""), ("payload", "jsonb", ""),
        ("created_at", "timestamptz", ""),
    ])
    entity(c, COLS[1], R2, "cases", [
        ("id", "uuid", "PK"), ("title", "varchar(160)", ""), ("summary", "text", ""),
        ("result_text", "varchar(200)", ""), ("metric_id", "int", "FK"),
        ("value", "numeric(12,2)", ""), ("unit", "varchar(16)", ""),
    ])
    entity(c, COLS[2], R2, "pois", [
        ("id", "uuid", "PK"), ("location_id", "uuid", "FK"), ("code", "varchar(32)", ""),
        ("title", "varchar(120)", ""), ("x / y / z", "real", ""), ("case_id", "uuid", "FK"),
        ("media_id", "uuid", "FK"),
    ])
    entity(c, COLS[3], R2, "media", [
        ("id", "uuid", "PK"), ("kind", "enum", ""), ("url", "text", ""),
        ("mime", "varchar(48)", ""), ("bytes", "int", ""), ("alt", "varchar(200)", ""),
    ])

    link(c, (COLS[1], R1 + 100), (COLS[0] + CW, R1 + 100))
    link(c, (COLS[0] + 90, R1 + 40 + 6 * 25 + 12), (COLS[0] + 90, R2), "1 : N")
    link(c, (COLS[2] + CW, R1 + 90), (COLS[3], R1 + 90))
    link(c, (COLS[3] + 90, R1 + 40 + 7 * 25 + 12), (COLS[2] + 200, R2), "1 : N")
    link(c, (COLS[2], R2 + 100), (COLS[1] + CW, R2 + 100))
    link(c, (COLS[2] + CW, R2 + 100), (COLS[3], R2 + 100))

    c.text(30, H - 34, "Медиа и журнал действий вынесены отдельно: удаление файла не ломает сценарий тура, "
                       "журнал не влияет на работу двойника.", 11.5, 400, MUTED, "start")
    save(c, "f08b_er_tour.png")


def domain_map():
    W, H = 1440, 660
    c = Canvas(W, H)
    header(c, "Карта сущностей предметной области",
           "Как связаны процесс, сценарий, метрика и тур: одна метрика объясняет и расчёт, и карточку в 3D-туре")

    def box(x, y, w, h, title, sub, accent=BLUE2):
        c.rect(x, y, w, h, WHITE, LINE, 10, 1.6, shadow=True)
        c.rect(x, y, 4, h, accent, "none", 2, 0)
        c.text(x + 18, y + 28, title, 14, 700, INK, "start")
        c.text(x + 18, y + 50, sub, 11, 400, MUTED, "start")

    box(30, 120, 236, 92, "Предприятие", "площадка, цех, участок")
    box(30, 290, 236, 92, "Процесс", "узлы, ресурсы, роли")
    box(30, 460, 236, 92, "Модель процесса", "время, стоимость, отказы", CYAN)

    box(340, 290, 236, 92, "Сценарий", "параметры и версия модели")
    box(340, 120, 236, 92, "Прогон", "seed, репликации, статус")
    box(340, 460, 236, 92, "Результат", "метрики и дельта")

    box(650, 120, 236, 92, "Метрика", "время, выпуск, загрузка, ₽")
    box(650, 290, 236, 92, "Кейс", "практика с числом")
    box(650, 460, 236, 92, "Точка интереса", "медиа, текст, метрика")

    box(960, 120, 236, 92, "Локация", "цех, участок, сцена")
    box(960, 290, 236, 92, "3D-тур", "маршрут и доступ", GREEN)
    box(960, 460, 236, 92, "Аудитория", "гость, партнёр, сотрудник")

    def rel(x1, y1, x2, y2, label, color=BLUE2, dash=None):
        c.arrow(x1, y1, x2, y2, color, 1.6, 9, dash)
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        w = c.text_w(label, 10, 600)
        c.rect(mx - w / 2 - 5, my - 12, w + 10, 20, WHITE, "none", 4, 0)
        c.text(mx, my + 4, label, 10, 600, color)

    rel(266, 166, 340, 166, "имеет")
    rel(266, 336, 340, 336, "описывает")
    rel(266, 506, 340, 506, "считает")
    rel(458, 290, 458, 212, "запускает")
    rel(458, 382, 458, 460, "даёт")
    rel(576, 166, 650, 166, "измеряет")
    rel(576, 336, 650, 336, "объясняет")
    rel(886, 506, 960, 506, "привязана")
    rel(576, 460, 386, 460, "берёт значение", ORANGE, "6 5")
    rel(886, 166, 960, 166, "входит в")
    rel(886, 336, 960, 336, "в тур")
    rel(1078, 212, 1078, 290, "для")
    rel(1030, 382, 1030, 460, "адресует")

    note(c, 30, 596, 1380,
         "Ключевая связь: карточка в 3D-туре ссылается на ту же метрику, что и расчёт сценария, — поэтому "
         "цифра на экскурсии проверяема и совпадает с дашбордом.", size=12)
    save(c, "f09_domain.png")


er_core()
er_tour()
domain_map()

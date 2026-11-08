# -*- coding: utf-8 -*-
"""Сборка презентации к защите 1 этапа (12 слайдов, 16:9).

Опирается на собранный пакет: figures/*.png, ТЗ, прототип. Все числа — из модели пакета.
Запуск: python scripts/build_deck.py
Выход: Презентация_Цифровой_двойник_и_3D-туры.pptx
"""
import os

from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt
from lxml import etree

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FIG = os.path.join(ROOT, "figures")
TMP = os.path.join(ROOT, "figures", "_slide")

NAVY = RGBColor(0x0F, 0x1B, 0x2D)
INK = RGBColor(0x18, 0x24, 0x37)
INK2 = RGBColor(0x3B, 0x4B, 0x62)
BLUE = RGBColor(0x1F, 0x4E, 0x8C)
ACCENT = RGBColor(0x2E, 0x6F, 0xD0)
LIGHT = RGBColor(0xF3, 0xF6, 0xFB)
LINE = RGBColor(0xE2, 0xE8, 0xF1)
MUTED = RGBColor(0x6B, 0x7B, 0x91)
MUTED2 = RGBColor(0x9A, 0xA8, 0xBC)
ORANGE = RGBColor(0xD9, 0x55, 0x2B)
TEAL = RGBColor(0x0E, 0x93, 0xA8)
GREEN = RGBColor(0x1E, 0x8A, 0x5F)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
DARK_TXT = RGBColor(0x7A, 0x2F, 0x14)

FONT = "Segoe UI"
W, H = 13.333, 7.5

prs = Presentation()
prs.slide_width = Inches(W)
prs.slide_height = Inches(H)
BLANK = prs.slide_layouts[6]


# ------------------------------------------------------------------ примитивы
def strip_style(shape):
    """Убирает тему (тень, заливку по умолчанию) у автофигуры."""
    sp = shape._element
    for el in sp.findall(qn("p:style")):
        sp.remove(el)


def rect(slide, x, y, w, h, fill=None, line=None, lw=1.0, shape=MSO_SHAPE.RECTANGLE, radius=0.06):
    s = slide.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    strip_style(s)
    if fill is None:
        s.fill.background()
    else:
        s.fill.solid()
        s.fill.fore_color.rgb = fill
    if line is None:
        s.line.fill.background()
    else:
        s.line.color.rgb = line
        s.line.width = Pt(lw)
    s.shadow.inherit = False
    if shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        s.adjustments[0] = radius
    return s


def textbox(slide, x, y, w, h, anchor=MSO_ANCHOR.TOP):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    return tf


def para(tf, s, size=14, bold=False, color=INK, align=PP_ALIGN.LEFT, space_before=0,
         space_after=0, line=1.15, first=False, italic=False):
    p = tf.paragraphs[0] if first else tf.add_paragraph()
    p.alignment = align
    p.space_before = Pt(space_before)
    p.space_after = Pt(space_after)
    p.line_spacing = line
    r = p.add_run()
    r.text = s
    f = r.font
    f.name = FONT
    f.size = Pt(size)
    f.bold = bold
    f.italic = italic
    f.color.rgb = color
    return p


def text(slide, x, y, w, h, s, size=14, bold=False, color=INK, align=PP_ALIGN.LEFT,
         line=1.15, anchor=MSO_ANCHOR.TOP):
    tf = textbox(slide, x, y, w, h, anchor)
    para(tf, s, size, bold, color, align, line=line, first=True)
    return tf


def set_bullet(p, char="•", color=ACCENT, indent=-0.22, level_indent=0.24):
    pPr = p._p.get_or_add_pPr()
    pPr.set("marL", str(int(Inches(level_indent))))
    pPr.set("indent", str(int(Inches(indent))))
    for tag in ("a:buNone", "a:buChar", "a:buAutoNum"):
        for el in pPr.findall(qn(tag)):
            pPr.remove(el)
    bu = etree.SubElement(pPr, qn("a:buChar"))
    bu.set("char", char)
    buClr = etree.SubElement(pPr, qn("a:buClr"))
    srgb = etree.SubElement(buClr, qn("a:srgbClr"))
    srgb.set("val", str(color))


def bullets(slide, x, y, w, h, items, size=13, color=INK2, bullet_color=ACCENT, gap=10, line=1.3):
    tf = textbox(slide, x, y, w, h)
    first = True
    for it in items:
        p = para(tf, it, size, False, color, first=first, space_after=gap, line=line)
        set_bullet(p, color=bullet_color)
        first = False
    return tf


def slide_base(title, kicker=None, number=None, note=None):
    s = prs.slides.add_slide(BLANK)
    rect(s, 0, 0, W, H, WHITE)
    rect(s, 0, 0, W, 0.055, NAVY)
    if kicker:
        text(s, 0.72, 0.40, 6.5, 0.25, kicker.upper(), 10.5, True, ACCENT)
    text(s, 0.72, 0.63 if kicker else 0.50, 11.7, 0.62, title, 24, True, INK, line=1.06)
    rect(s, 0.72, 1.24 if kicker else 1.10, 0.72, 0.045, ACCENT)
    text(s, 0.72, 7.08, 7.0, 0.24, "Цифровой двойник участка · I этап · 2026", 8.5, False, MUTED2)
    text(s, 11.0, 7.08, 0.9, 0.24, "КОНТУР", 8.5, True, MUTED2, align=PP_ALIGN.RIGHT)
    if number is not None:
        text(s, 12.0, 7.08, 0.6, 0.24, "%02d" % number, 8.5, True, MUTED2, align=PP_ALIGN.RIGHT)
    if note:
        s.notes_slide.notes_text_frame.text = note
    return s


def pic_fit(slide, name, x, y, max_w, max_h, crop_top=0, crop_bottom=0, center_x=False, border=True):
    path = os.path.join(FIG, name)
    im = Image.open(path)
    w, h = im.size
    if crop_top or crop_bottom:
        im = im.crop((0, crop_top, w, h - crop_bottom))
        w, h = im.size
        os.makedirs(TMP, exist_ok=True)
        path = os.path.join(TMP, "crop_%s" % name)
        im.save(path)
    ar = w / h
    width = min(max_w, max_h * ar)
    height = width / ar
    if center_x:
        x = (W - width) / 2
    p = slide.shapes.add_picture(path, Inches(x), Inches(y), width=Inches(width), height=Inches(height))
    if border:
        p.line.color.rgb = LINE
        p.line.width = Pt(0.75)
    return p, width, height


def stat_card(slide, x, y, w, h, value, unit, label, accent=ORANGE):
    rect(slide, x, y, w, h, WHITE, LINE, 1.0, MSO_SHAPE.ROUNDED_RECTANGLE, 0.08)
    rect(slide, x, y, 0.06, h, accent)
    tf = textbox(slide, x + 0.3, y + 0.26, w - 0.5, 0.6)
    p = tf.paragraphs[0]
    r = p.add_run()
    r.text = value
    r.font.name = FONT
    r.font.size = Pt(30)
    r.font.bold = True
    r.font.color.rgb = accent
    r2 = p.add_run()
    r2.text = " " + unit
    r2.font.name = FONT
    r2.font.size = Pt(12)
    r2.font.color.rgb = MUTED
    text(slide, x + 0.3, y + 0.98, w - 0.5, 0.55, label, 11.5, False, INK2, line=1.2)


def callout(slide, x, y, w, h, s, color=ACCENT, bg=LIGHT, size=12, txt=None):
    rect(slide, x, y, w, h, bg, None, 0, MSO_SHAPE.ROUNDED_RECTANGLE, 0.1)
    rect(slide, x, y, 0.05, h, color)
    tf = textbox(slide, x + 0.26, y, w - 0.45, h, MSO_ANCHOR.MIDDLE)
    para(tf, s, size, False, txt or (DARK_TXT if color == ORANGE else RGBColor(0x1B, 0x3F, 0x70)),
         line=1.3, first=True)


def rail(slide, x, y, w, h, title, items, color=ACCENT):
    """Правая колонка-пояснение к картинке."""
    rect(slide, x, y, w, h, LIGHT, None, 0, MSO_SHAPE.ROUNDED_RECTANGLE, 0.05)
    text(slide, x + 0.26, y + 0.24, w - 0.5, 0.24, title.upper(), 8.5, True, MUTED)
    yy = y + 0.56
    for h1, d1 in items:
        text(slide, x + 0.26, yy, w - 0.5, 0.26, h1, 11.5, True, color)
        tf = textbox(slide, x + 0.26, yy + 0.28, w - 0.5, 0.5)
        para(tf, d1, 9.8, False, INK2, line=1.26, first=True)
        yy += 1.05


# ================================================================== 1. ТИТУЛ
s = prs.slides.add_slide(BLANK)
rect(s, 0, 0, W, H, NAVY)
rect(s, 0, 0, W, 0.09, ACCENT)
for yy in (5.5, 5.68, 5.86):
    rect(s, 0.72, yy, 11.9, 0.01, RGBColor(0x33, 0x55, 0x80))

text(s, 0.72, 1.12, 9.4, 0.3, "ХАКАТОН · ТРЕК «ЦИФРОВОЙ ДВОЙНИК И 3D-ТУРЫ» · I ЭТАП",
     11, True, RGBColor(0x8F, 0xB3, 0xE4))
text(s, 0.72, 1.58, 10.8, 1.95, "Цифровой двойник\nучастка и 3D-тур по цеху",
     44, True, WHITE, line=1.06)
text(s, 0.72, 3.55, 9.8, 0.85,
     "Прототип, в котором каждая цифра экскурсии — это та же метрика,\n"
     "что в расчёте сценария: тур → процесс → метрика.",
     15.5, False, RGBColor(0xA9, 0xC6, 0xEE), line=1.4)

meta = [("Пилот", "РМЦ · фланец Ду100 PN16"), ("Срок сдачи", "09.11.2026"),
        ("Команда", "6 человек · 5 ролей")]
for i, (k, v) in enumerate(meta):
    x = 0.72 + i * 3.9
    text(s, x, 4.52, 3.5, 0.22, k.upper(), 9, True, RGBColor(0x6E, 0x86, 0xA6))
    text(s, x, 4.76, 3.6, 0.3, v, 13, True, WHITE)

text(s, 0.72, 6.62, 10.6, 0.3,
     "Заказчик: Газпром нефть · ТОП-ИТ   ·   Уфимский университет науки и технологий   ·   данные синтетические",
     9.5, False, RGBColor(0x6E, 0x86, 0xA6))
text(s, 11.9, 6.62, 0.7, 0.3, "01", 9, True, RGBColor(0x6E, 0x86, 0xA6), align=PP_ALIGN.RIGHT)
s.notes_slide.notes_text_frame.text = (
    "Здравствуйте. Мы показываем пилот на одном участке — изготовление фланца Ду100 в ремонтно-механическом цехе. "
    "Главная идея: связка «тур → процесс → метрика». Тур — не красивая картинка, а вход в модель: "
    "каждый объект на сцене подкреплён числом из расчёта."
)

# ================================================================== 2. ПРОБЛЕМА
s = slide_base("Участок не успевает: 40,3 из 42 в сутки", "01 · проблема", 2,
               "Проблема формулируется тремя проверяемыми фактами: выпуск, цикл, доля в срок. "
               "Дальше показываем, что средняя загрузка цеха эту проблему маскирует.")
stat_card(s, 0.72, 1.48, 3.85, 1.72, "40,3", "из 42 шт/сут", "Выпуск ниже плана на 4 %", ORANGE)
stat_card(s, 4.78, 1.48, 3.85, 1.72, "529", "мин", "Цикл при норме 480 минут — +10 %", ORANGE)
stat_card(s, 8.84, 1.48, 3.78, 1.72, "47", "%", "Заказов уходят в срок (цель — 95 %)", ORANGE)

text(s, 0.72, 3.55, 5.6, 0.26, "ЧТО ВИДИТ РУКОВОДСТВО", 9, True, MUTED)
text(s, 0.72, 3.84, 5.6, 1.1,
     "«Средняя загрузка цеха — 34 %».\nВ отчёте всё ровно, поводов для решения нет.",
     14.5, False, INK2, line=1.45)

text(s, 6.9, 3.55, 5.6, 0.26, "ЧТО ПРОИСХОДИТ НА САМОМ ДЕЛЕ", 9, True, ORANGE)
text(s, 6.9, 3.84, 5.6, 1.1,
     "Один этап — шлифование — загружен на 97 %.\nПеред ним стоит очередь 12–18 деталей.",
     14.5, False, DARK_TXT, line=1.45)

callout(s, 0.72, 5.2, 11.9, 1.15,
        "Средняя загрузка 34 % скрывает, что один этап загружен на 97 %: узкое место невидимо "
        "в усреднённой отчётности, поэтому деньги предлагают вкладывать в фрезерный центр с загрузкой 40 %.",
        ORANGE, RGBColor(0xFD, 0xF3, 0xEF), 12.5)
s.notes_slide.notes_text_frame.text = (
    "Три факта: выпуск 40,3 из 42, цикл 529 при норме 480, в срок уходит 47 %. "
    "Причина одна: шлифование загружено на 97 %, очередь перед ним растёт. "
    "В отчётности этого не видно, потому что загрузка усреднена по участку — 34 %."
)

# ================================================================== 3. ДЛЯ КОГО
s = slide_base("Четыре роли — четыре разных вопроса к системе", "02 · для кого", 3,
               "Руководству нужен ответ «где болит и что будет, если», аналитику — инструмент проверки гипотез, "
               "администратору — управление данными, внешней аудитории — экскурсия с цифрами.")
roles = [
    ("Руководитель", "Начальник участка,\nдиректор по производству",
     "Где узкое место и что даст второй станок?", "Дашборд, сценарии, кейсы", ACCENT),
    ("Аналитик", "Технолог,\nэкономист по труду",
     "Что изменится, если поменять норму, партию, спрос?", "Модель процесса, пересчёт, сравнение", TEAL),
    ("Администратор", "ИТ-служба\nпредприятия",
     "Кто менял модель и на каких данных она стоит?", "Пользователи, справочники, журнал", MUTED),
    ("Внешняя аудитория", "Клиент, вуз,\nучастник экскурсии",
     "Как устроен цех и сколько это стоит?", "3D-тур с точками интереса", GREEN),
]
for i, (name, who, q, feat, col) in enumerate(roles):
    x = 0.72 + i * 3.05
    rect(s, x, 1.48, 2.85, 3.6, WHITE, LINE, 1.0, MSO_SHAPE.ROUNDED_RECTANGLE, 0.05)
    rect(s, x, 1.48, 2.85, 0.055, col)
    text(s, x + 0.24, 1.72, 2.4, 0.3, name, 14.5, True, INK)
    text(s, x + 0.24, 2.04, 2.4, 0.7, who, 10.2, False, MUTED, line=1.3)
    text(s, x + 0.24, 2.74, 2.4, 1.1, "«" + q + "»", 11.5, False, INK2, line=1.38)
    rect(s, x + 0.24, 3.98, 2.38, 0.012, LINE)
    text(s, x + 0.24, 4.10, 2.4, 0.22, "ЧТО ПОЛУЧАЕТ", 8.2, True, MUTED)
    text(s, x + 0.24, 4.34, 2.4, 0.7, feat, 10.5, True, col, line=1.3)

callout(s, 0.72, 5.5, 11.9, 0.82,
        "Роли разграничены в прототипе: руководитель и гость видят модель, но не могут её менять — "
        "это проверено тест-кейсами Т-02 и Т-13.", ACCENT, LIGHT, 11)
s.notes_slide.notes_text_frame.text = (
    "Система отвечает на четыре разных вопроса. Руководителю — где болит и что даст второй станок. "
    "Аналитику — что изменится при новых нормах. Администратору — на каких данных всё стоит. "
    "Гостю — как устроен цех. Один и тот же расчёт обслуживает все четыре сценария использования."
)

# ================================================================== 4. РЕШЕНИЕ
s = slide_base("Одно предложение и одна связка", "03 · решение", 4,
               "Ключевой слайд: формулировка решения и схема связи. Дальше каждый блок раскрывается отдельно.")
tf = textbox(s, 0.72, 1.42, 11.9, 1.1)
para(tf, "Цифровой двойник участка, в котором 3D-экскурсия, граф процесса и расчёт сценариев — "
         "один и тот же объект, а не три отдельных демо.",
     18, True, INK, line=1.3, first=True)

p, iw, ih = pic_fit(s, "f09_domain.png", 0.72, 2.28, 11.7, 4.1, crop_top=118, center_x=True)
text(s, 0.72, 2.28 + ih + 0.16, 11.9, 0.3,
     "Схема из ТЗ, раздел 5: точка интереса ссылается на этап, этап входит в процесс, "
     "процесс даёт снимок метрик по сценарию.", 9.5, False, MUTED)
s.notes_slide.notes_text_frame.text = (
    "Решение в одном предложении: это не три демо, а один объект. Точка в 3D ссылается на этап, "
    "этап входит в процесс, процесс считается моделью. Поэтому цифра на экскурсии всегда совпадает "
    "с цифрой в расчёте — это и есть проверяемость."
)

# ================================================================== 5. КАК РАБОТАЕТ ДВОЙНИК
s = slide_base("Двойник: модель → прогон → узкое место → сценарий", "04 · как это работает", 5,
               "Четыре шага: дискретно-событийная модель, прогон при заданной нагрузке, поиск ограничения, "
               "сравнение сценариев по четырём метрикам.")
steps = [
    ("01", "Модель", "8 этапов, ресурсы,\nпереналадки, брак, возвраты", ACCENT),
    ("02", "Прогон", "5 репликаций × 26 дней,\nпрогрев 6 дней", ACCENT),
    ("03", "Узкое место", "максимум загрузки\nс учётом очередей", ORANGE),
    ("04", "Сценарий", "изменение параметров\nи сравнение «до/после»", GREEN),
]
for i, (n, name, desc, col) in enumerate(steps):
    x = 0.72 + i * 3.05
    rect(s, x, 1.42, 2.85, 1.08, WHITE, LINE, 1.0, MSO_SHAPE.ROUNDED_RECTANGLE, 0.07)
    text(s, x + 0.22, 1.52, 0.5, 0.28, n, 9.5, True, col)
    text(s, x + 0.22, 1.70, 2.4, 0.3, name, 13.5, True, INK)
    text(s, x + 0.22, 2.00, 2.45, 0.5, desc, 9.2, False, MUTED, line=1.22)
    if i < 3:
        text(s, x + 2.87, 1.83, 0.2, 0.3, "→", 13, True, MUTED2)

p, iw, ih = pic_fit(s, "f16_charts.png", 0, 2.72, 11.2, 3.75, center_x=True)
text(s, 0.72, 2.72 + ih + 0.14, 11.9, 0.3,
     "Слева — эффект сценария по трём метрикам, справа — кривая мощности: где участок перестаёт "
     "реагировать на рост спроса.", 9.5, False, MUTED)
s.notes_slide.notes_text_frame.text = (
    "Модель дискретно-событийная: длительности логнормальные, переналадка по достижении партии, "
    "транспорт 2 минуты, брак 2,3 %, возврат на перешлифовку 4 %. Прогоняем 5 репликаций по 26 дней "
    "с прогревом 6 дней. Узкое место — максимум загрузки с учётом очередей, а не просто максимум нормы. "
    "Справа видно, что AS-IS упирается в 40,6 шт/сут — дальше спрос расти может, а выпуск нет."
)

# ================================================================== 6. ДАШБОРД
s = slide_base("Дашборд отвечает на вопрос «где болит» за пять секунд", "05 · макет · дашборд", 6,
               "Один экран: четыре метрики, полосы загрузки по операциям, блок узкого места с рекомендацией "
               "и таблица сценариев.")
p, iw, ih = pic_fit(s, "f12_dashboard.png", 0.62, 1.38, 8.6, 5.55)
rail(s, 9.42, 1.38, 3.2, 5.55, "Что смотреть", [
    ("Метрики сверху", "40,3 из 42, цикл 529 против нормы 480, в срок 47 %"),
    ("Полоса 97 %", "Единственный этап, где загрузка выше 90 % — шлифование"),
    ("Рекомендация", "Модель сразу предлагает сценарий C: −83 % цикла"),
    ("Таблица", "Четыре сценария и цена решения в рублях"),
], ACCENT)
s.notes_slide.notes_text_frame.text = (
    "Слева сверху — четыре метрики с трендом. Слева внизу — загрузка операций: красная полоса шлифовки "
    "97 % видна сразу. Справа — блок узкого места с рекомендацией модели: сценарий C даёт −83 % цикла "
    "и 100 % в срок. Внизу — таблица сценариев, из которой руководитель выбирает решение."
)

# ================================================================== 7. СЦЕНАРИИ
s = slide_base("Сценарии: «до / после» по четырём метрикам", "06 · макет · сравнение", 7,
               "Четыре сценария в одной таблице и сравнение выбранного с базой. Ключевой вывод — "
               "SMED без снятия ограничения по мощности почти не работает.")
p, iw, ih = pic_fit(s, "f13_scenarios.png", 0.62, 1.38, 8.6, 5.55)
rail(s, 9.42, 1.38, 3.2, 5.55, "Как читать", [
    ("Четыре карточки", "База, второй станок, SMED и оба вместе — с ценой в рублях"),
    ("Столбики", "Цикл 529 → 94 → 519 → 90 минут, норма 480 — красный пунктир"),
    ("Разбор справа", "Цикл −83 %, в срок +53 п.п., WIP −84 %"),
    ("Вывод", "Эффект даёт снятие ограничения, а не ускорение переналадки"),
], GREEN)
s.notes_slide.notes_text_frame.text = (
    "Четыре сценария: база, второй станок, SMED, и оба вместе. Справа — разбор выбранного: цикл 529 → 90, "
    "в срок 47 → 100 %, WIP 20,7 → 3,3. Важно: SMED сам по себе даёт −2 % по циклу, потому что ограничение "
    "не в переналадке, а в мощности шлифовки. Модель это показывает, а интуиция — нет."
)

# ================================================================== 8. ЦИФРЫ
s = slide_base("Эффект в цифрах: +1 станок снимает ограничение", "07 · проверка на данных", 8,
               "Таблица — прямой ответ на вопрос «что будет, если». Главный вывод — про снятие ограничения.")
rows = [
    ("AS-IS · как есть", "529", "40,3", "47 %", "20,7", "1 841", MUTED, False),
    ("A · второй шлифовальный станок", "94", "40,9", "100 %", "3,4", "1 842", ACCENT, True),
    ("B · быстрая переналадка (SMED)", "519", "40,2", "45 %", "20,2", "1 834", MUTED, False),
    ("C · станок + SMED", "90", "41,2", "100 %", "3,3", "1 831", GREEN, True),
]
row_h = [0.40] + [0.50] * 4
gt = s.shapes.add_table(5, 6, Inches(0.72), Inches(1.45), Inches(11.9), Inches(sum(row_h)))
table = gt.table
for i, wd in enumerate([4.3, 1.4, 1.55, 1.4, 1.4, 1.45]):
    table.columns[i].width = Inches(wd)
for i, hh in enumerate(row_h):
    table.rows[i].height = Inches(hh)

headers = ["Сценарий", "Цикл, мин", "Выпуск, шт/сут", "В срок", "WIP, шт", "₽ / шт"]
for c, htxt in enumerate(headers):
    cell = table.cell(0, c)
    cell.fill.solid()
    cell.fill.fore_color.rgb = RGBColor(0x1F, 0x3B, 0x60)
    cell.margin_left = Inches(0.12)
    cell.margin_top = Inches(0.02)
    cell.margin_bottom = Inches(0.02)
    p = cell.text_frame.paragraphs[0]
    p.alignment = PP_ALIGN.RIGHT if c > 0 else PP_ALIGN.LEFT
    r = p.add_run()
    r.text = htxt
    r.font.name = FONT
    r.font.size = Pt(9.5)
    r.font.bold = True
    r.font.color.rgb = WHITE

for ri, (label, cyc, tp, ot, wip, cost, col, bold) in enumerate(rows, start=1):
    fill = RGBColor(0xFA, 0xFB, 0xFD) if ri % 2 == 1 else WHITE
    if label.startswith("C ·"):
        fill = RGBColor(0xF1, 0xF9, 0xF5)
    for c, val in enumerate([label, cyc, tp, ot, wip, cost]):
        cell = table.cell(ri, c)
        cell.fill.solid()
        cell.fill.fore_color.rgb = fill
        cell.margin_left = Inches(0.12)
        cell.margin_top = Inches(0.02)
        cell.margin_bottom = Inches(0.02)
        cell.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = cell.text_frame.paragraphs[0]
        p.alignment = PP_ALIGN.RIGHT if c > 0 else PP_ALIGN.LEFT
        r = p.add_run()
        r.text = val
        r.font.name = FONT
        r.font.size = Pt(11 if c == 0 else 11.5)
        r.font.bold = bool(bold) or c == 0
        r.font.color.rgb = INK if c == 0 else (col if bold else INK2)

tiles = [
    ("−82 %", "время цикла", "529 → 94 мин", ACCENT),
    ("+53 п.п.", "заказов в срок", "47 → 100 %", GREEN),
    ("−2 %", "цикла от SMED", "519 мин — почти без эффекта", MUTED),
]
for i, (v, k, sub, col) in enumerate(tiles):
    x = 0.72 + i * 4.02
    rect(s, x, 4.35, 3.8, 1.18, WHITE, LINE, 1.0, MSO_SHAPE.ROUNDED_RECTANGLE, 0.08)
    text(s, x + 0.24, 4.48, 1.8, 0.45, v, 19, True, col)
    text(s, x + 0.24, 4.90, 3.3, 0.28, k, 10.5, True, INK)
    text(s, x + 0.24, 5.18, 3.3, 0.28, sub, 9.5, False, MUTED)

callout(s, 0.72, 5.78, 11.9, 0.95,
        "Ограничение снято — но не «всем сразу»: SMED без второго станка даёт 2 %, а станок без смены "
        "переналадки упирается в рост программы. Модель показывает это до вложений.",
        ORANGE, RGBColor(0xFD, 0xF3, 0xEF), 11.5)
s.notes_slide.notes_text_frame.text = (
    "Прямой ответ на вопрос «что будет, если». Второй станок: цикл −82 %, в срок 100 %. "
    "SMED отдельно: −2 %, потому что ограничение не в переналадке. Вместе — лучший результат, "
    "и себестоимость даже падает на 0,5 %. Это и есть ценность модели: проверить дешёвый и дорогой "
    "вариант до закупки."
)

# ================================================================== 9. 3D-ТУР
s = slide_base("3D-тур: экскурсия, из которой видно производство", "08 · макет · 3D-тур", 9,
               "Четыре локации и восемь точек интереса. Клик по точке открывает карточку с метрикой "
               "и ведёт в двойник.")
p, iw, ih = pic_fit(s, "f14_tour.png", 0.62, 1.38, 8.6, 5.55)
rail(s, 9.42, 1.38, 3.2, 5.55, "Не панорама, а навигация", [
    ("4 локации", "Склад, токарный участок, шлифовка, ОТК — переход за 2–3 секунды"),
    ("8 точек", "Каждая привязана к этапу процесса и метрике"),
    ("Карточка точки", "Загрузка 97 %, очередь 14 деталей, такт 21 минута"),
    ("Кнопка в двойник", "Открывает этап на дашборде с подсветкой"),
], TEAL)
s.notes_slide.notes_text_frame.text = (
    "Тур — не панорама, а навигация по модели. Четыре локации: склад, токарный участок, шлифовка, ОТК. "
    "Восемь точек интереса. На скриншоте открыта точка узкого места: загрузка 97 %, очередь 14 деталей, "
    "такт 21 минута. Кнопка «Открыть в двойнике» переводит к этапу и его метрике."
)

# ================================================================== 10. КАРТА POI
s = slide_base("Карта точек: тур → процесс → метрика", "09 · связка", 10,
               "Каждая точка отвечает на вопрос «что это и сколько стоит процессу», и связана с этапом, "
               "метрикой и кейсом.")
p, iw, ih = pic_fit(s, "f15_poi_map.png", 0.62, 1.38, 8.4, 3.55, crop_top=100)
yy = 1.38 + ih + 0.28
mstats = [("4", "локации"), ("8", "точек интереса"), ("~6 мин", "маршрут с переходами")]
for i, (v, k) in enumerate(mstats):
    x = 0.62 + i * 2.86
    text(s, x, yy, 2.7, 0.4, v, 19, True, ACCENT)
    text(s, x, yy + 0.42, 2.7, 0.26, k, 10, False, MUTED)
callout(s, 0.62, yy + 0.86, 8.4, 0.62,
        "Маршрут 1 → 8: склад → токарный → фрезеровка → шлифовка → мойка → ОТК → упаковка.", ACCENT, LIGHT, 10)

rail(s, 9.42, 1.38, 3.2, 5.35, "Правило связи", [
    ("Точка → этап", "POI-05 — шлифование, этап 05 графа процесса"),
    ("Этап → метрика", "Загрузка 97 %, очередь 14 шт, такт 21 мин"),
    ("Метрика → кейс", "Кейс «второй станок»: −82 % цикла"),
], ORANGE)
s.notes_slide.notes_text_frame.text = (
    "Вот как устроена связка технически: у точки есть этап, метрика и, если повезло, кейс. "
    "Поэтому из экскурсии можно провалиться в цифру, а из цифры вернуться к объекту. "
    "Маршрут — 8 точек, около 6 минут с переходами между локациями."
)

# ================================================================== 11. АРХИТЕКТУРА
s = slide_base("Архитектура: браузер, сервис расчёта, БД", "10 · архитектура и стек", 11,
               "Клиент на React/Three.js, FastAPI, симулятор DES, PostgreSQL. Внешних интеграций нет — "
               "это осознанное ограничение 1 этапа.")
p, iw, ih = pic_fit(s, "f10_architecture.png", 0.55, 1.38, 8.5, 5.45, crop_top=110)
rail(s, 9.32, 1.38, 3.32, 5.45, "Стек", [
    ("Клиент", "React + TypeScript, Three.js / WebGL"),
    ("API", "FastAPI, JWT, REST / JSON"),
    ("Расчёт", "DES-симулятор, 5 репликаций"),
    ("Хранение", "PostgreSQL 16, S3/MinIO, Redis"),
    ("Граница", "Нет интеграций с ERP/MES/1С, ПДн нет"),
], ACCENT)
s.notes_slide.notes_text_frame.text = (
    "Стек намеренно скучный и проверяемый: React + TypeScript на клиенте, Three.js для сцены, "
    "FastAPI и DES-симулятор на сервере, PostgreSQL. Прототип 1 этапа работает без сервера — "
    "одним файлом, чтобы жюри открыло и потрогало. На 2 этапе тот же контракт API переезжает на сервер."
)

# ================================================================== 12. ЦЕННОСТЬ И ПЛАН
s = slide_base("Что это даёт предприятию и что дальше", "11 · ценность и план", 12,
               "Три эффекта для предприятия и четыре шага второго этапа.")
text(s, 0.72, 1.40, 5.7, 0.26, "ЭФФЕКТ ДЛЯ ПРЕДПРИЯТИЯ", 9, True, MUTED)
vals = [
    ("Решение за день, а не за две недели", "Сценарий проверяется прогоном, а не совещанием."),
    ("Деньги — в ограничение, а не в станок", "Модель показывает: фрезерный центр не влияет на выпуск."),
    ("Экскурсия с цифрами", "Клиент и вуз видят производство, а не презентацию."),
]
yy = 1.68
for h, d in vals:
    rect(s, 0.72, yy, 5.6, 1.05, WHITE, LINE, 1.0, MSO_SHAPE.ROUNDED_RECTANGLE, 0.08)
    rect(s, 0.72, yy, 0.05, 1.05, ACCENT)
    text(s, 1.0, yy + 0.15, 5.1, 0.3, h, 11.5, True, INK)
    text(s, 1.0, yy + 0.45, 5.1, 0.45, d, 9.8, False, MUTED, line=1.28)
    yy += 1.18

text(s, 6.85, 1.40, 5.7, 0.26, "ПЛАН II ЭТАПА · ДО 11.12.2026", 9, True, MUTED)
plan = [
    ("1–2 неделя", "Реальные данные из MES", "сверка с моделью на трёх контрольных неделях"),
    ("3–4 неделя", "Серверный расчёт и роли", "FastAPI, PostgreSQL, журнал изменений"),
    ("5–6 неделя", "3D по моделям оборудования", "glTF из CAD, панорамы цеха, точки интереса"),
    ("7 неделя", "Экономика решения", "окупаемость сценария, отчёт для инвесткомитета"),
]
yy = 1.68
for i, (period, name, desc) in enumerate(plan):
    text(s, 6.85, yy + 0.02, 1.15, 0.3, period, 8.8, True, ACCENT)
    text(s, 8.02, yy, 4.6, 0.3, name, 11.5, True, INK)
    text(s, 8.02, yy + 0.27, 4.6, 0.3, desc, 9.2, False, MUTED, line=1.25)
    if i < 3:
        rect(s, 8.0, yy + 0.66, 0.008, 0.26, LINE)
    yy += 1.12

rect(s, 0.72, 6.5, 11.9, 0.02, NAVY)
text(s, 0.72, 6.66, 8.4, 0.3, "Спасибо. Открытый вопрос: какой участок берём следующим?", 11.5, True, INK)
text(s, 9.3, 6.66, 3.3, 0.3, "КОНТУР · 6 человек", 9.5, True, MUTED, align=PP_ALIGN.RIGHT)
s.notes_slide.notes_text_frame.text = (
    "Три эффекта: скорость решения, правильное вложение денег и экскурсия с проверяемыми цифрами. "
    "На 2 этапе подключаем реальные данные из MES, переносим расчёт на сервер, делаем 3D по моделям "
    "оборудования и считаем окупаемость. Вопрос к залу: какой участок берём следующим?"
)

out = os.path.join(ROOT, "Презентация_Цифровой_двойник_и_3D-туры.pptx")
prs.save(out)
print("saved:", out)
print("slides:", len(prs.slides))

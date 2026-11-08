# -*- coding: utf-8 -*-
"""Проверка собранного DOCX: структура, таблицы, рисунки, оценка страниц."""
import io
import os
import sys

from docx import Document
from docx.shared import Emu

HERE = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(HERE, "..", "ТЗ_Цифровой_двойник_и_3D-туры.docx")

d = Document(PATH)

print("Секций:", len(d.sections))
for i, s in enumerate(d.sections):
    orient = "landscape" if s.page_width > s.page_height else "portrait"
    body = (s.page_width - s.left_margin - s.right_margin) / 360000
    print(f"  секция {i}: {orient}, тело {body:.1f} см, header={'да' if not s.header.is_linked_to_previous else 'наследуется'}")

# таблицы
bad = 0
for ti, t in enumerate(d.tables):
    widths = []
    for cell in t.rows[0].cells:
        widths.append(cell.width.cm if cell.width else 0)
    total = sum(widths)
    if total > 26.2:
        bad += 1
        print(f"  ! таблица {ti}: сумма ширин {total:.1f} см")
print("Таблиц:", len(d.tables), "проблемных:", bad)

# рисунки
print("Рисунков:", len(d.inline_shapes))
for sh in d.inline_shapes:
    w = sh.width / 360000
    h = sh.height / 360000
    print(f"  {w:.1f} x {h:.1f} см")

# текст
chars = 0
words = 0
paras = 0
lines = []
for p in d.paragraphs:
    txt = p.text.strip()
    if txt:
        paras += 1
        chars += len(txt)
        words += len(txt.split())
        lines.append(txt)
for t in d.tables:
    for row in t.rows:
        for cell in row.cells:
            txt = cell.text.strip()
            if txt:
                chars += len(txt)
                words += len(txt.split())

print(f"Абзацев: {paras}, символов: {chars}, слов: {words}")
# очень грубая оценка страниц: 2100 знаков на страницу + таблицы/рисунки
figs = len(d.inline_shapes)
est = chars / 1750 + figs * 1.0 + 2
print(f"Оценка объёма: ~{est:.0f} страниц")

with io.open(os.path.join(HERE, "..", "doc_text.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print("текст выгружен в doc_text.txt")

# -*- coding: utf-8 -*-
"""Быстрый разбор DOCX: структура, число рисунков и таблиц."""
import os
import sys

from docx import Document

p = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "ТЗ_Цифровой_двойник_и_3D-туры.docx")
d = Document(p)
heads = []
for para in d.paragraphs:
    if para.style.name.startswith("Heading") and para.text.strip():
        heads.append((para.style.name, para.text.strip()))
print("paragraphs:", len(d.paragraphs), "tables:", len(d.tables), "images:", len(d.inline_shapes))
print("headings:", len(heads))
for st, t in heads:
    lvl = st.split()[-1]
    print(("  " * (int(lvl) - 1)) + t)

# -*- coding: utf-8 -*-
"""Проверка порядка дочерних элементов OOXML (иначе Word просит «восстановить файл»)."""
import os
import sys
import zipfile

from lxml import etree

HERE = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(HERE, "..", "ТЗ_Цифровой_двойник_и_3D-туры.docx")
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

ORDER = {
    "tblPr": ["tblStyle", "tblpPr", "tblOverlap", "bidiVisual", "tblStyleRowBandSize",
              "tblStyleColBandSize", "tblW", "jc", "tblCellSpacing", "tblInd", "tblBorders",
              "shd", "tblLayout", "tblCellMar", "tblLook", "tblCaption", "tblDescription",
              "tblPrChange"],
    "trPr": ["cnfStyle", "divId", "gridBefore", "gridAfter", "wBefore", "wAfter", "cantSplit",
             "trHeight", "tblHeader", "tblCellSpacing", "jc", "hidden", "ins", "del", "trPrChange"],
    "tcPr": ["cnfStyle", "tcW", "gridSpan", "hMerge", "vMerge", "tcBorders", "shd", "noWrap",
             "tcMar", "textDirection", "tcFitText", "vAlign", "hideMark", "headers", "cellIns",
             "cellDel", "cellMerge", "tcPrChange"],
    "pPr": ["pStyle", "keepNext", "keepLines", "pageBreakBefore", "framePr", "widowControl",
            "numPr", "suppressLineNumbers", "pBdr", "shd", "tabs", "suppressAutoHyphens",
            "kinsoku", "wordWrap", "overflowPunct", "topLinePunct", "autoSpaceDE", "autoSpaceDN",
            "bidi", "adjustRightInd", "snapToGrid", "spacing", "ind", "contextualSpacing",
            "mirrorIndents", "suppressOverlap", "jc", "textDirection", "textAlignment",
            "textboxTightWrap", "outlineLvl", "divId", "cnfStyle", "rPr", "sectPr", "pPrChange"],
    "rPr": ["rStyle", "rFonts", "b", "bCs", "i", "iCs", "caps", "smallCaps", "strike", "dstrike",
            "outline", "shadow", "emboss", "imprint", "noProof", "snapToGrid", "vanish",
            "webHidden", "color", "spacing", "w", "kern", "position", "sz", "szCs", "highlight",
            "u", "effect", "bdr", "shd", "fitText", "vertAlign", "rtl", "cs", "em", "lang",
            "eastAsianLayout", "specVanish", "oMath"],
}

problems = []
with zipfile.ZipFile(PATH) as z:
    names = [n for n in z.namelist() if n.endswith(".xml") and ("document" in n or "header" in n or "footer" in n)]
    for name in names:
        root = etree.fromstring(z.read(name))
        for tag, order in ORDER.items():
            for el in root.iter(W + tag):
                idx = []
                for child in el:
                    if not isinstance(child.tag, str):
                        continue
                    local = etree.QName(child).localname
                    if local not in order:
                        problems.append((name, tag, "неизвестный элемент", local))
                        continue
                    idx.append((order.index(local), local))
                positions = [i for i, _ in idx]
                if positions != sorted(positions):
                    seq = [n for _, n in idx]
                    problems.append((name, tag, "порядок", " > ".join(seq)))

print("файлов проверено:", len(names))
print("нарушений:", len(problems))
seen = set()
for name, tag, kind, detail in problems:
    key = (tag, kind, detail)
    if key in seen:
        continue
    seen.add(key)
    print(f"  {name} [{tag}] {kind}: {detail}")

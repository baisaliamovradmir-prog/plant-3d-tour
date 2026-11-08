# -*- coding: utf-8 -*-
"""Сборка DOCX: стили, заголовки, таблицы, врезки, рисунки, колонтитулы."""
import os
import re

from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

INK = RGBColor(0x16, 0x23, 0x3A)
INK2 = RGBColor(0x42, 0x53, 0x6B)
MUTED = RGBColor(0x6B, 0x7C, 0x93)
BLUE = RGBColor(0x1F, 0x4E, 0x8C)
BLUE2 = RGBColor(0x2E, 0x6F, 0xD0)
ORANGE = RGBColor(0xD9, 0x55, 0x2B)
GREEN = RGBColor(0x1E, 0x8A, 0x5F)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
HDR_BG = "1F4E8C"
ZEBRA = "F4F7FB"
LIGHT = "EFF5FC"
BORDER = "D5DEEA"

BODY_W = 17.0      # см, ширина текста в портретной секции
LAND_W = 25.6      # см, ширина текста в альбомной секции
FONT = "Segoe UI"


def _set_font(run, name=FONT, size=None, bold=None, color=None, italic=None):
    run.font.name = name
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.append(rfonts)
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rfonts.set(qn(attr), name)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic
    if color is not None:
        run.font.color.rgb = color


def _shade(el, color):
    pr = el.get_or_add_tcPr() if el.tag.endswith("tc") else el.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color)
    pr.append(shd)


def _cell_shade(cell, color):
    tcPr = cell._tc.get_or_add_tcPr()
    for old in tcPr.findall(qn("w:shd")):
        tcPr.remove(old)
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color)
    tcPr.insert_element_before(shd, "w:noWrap", "w:tcMar", "w:textDirection",
                               "w:tcFitText", "w:vAlign", "w:hideMark", "w:headers",
                               "w:cellIns", "w:cellDel", "w:cellMerge", "w:tcPrChange")


def _cell_margins(table, top=60, bottom=60, left=90, right=90):
    tblPr = table._tbl.tblPr
    for old in tblPr.findall(qn("w:tblCellMar")):
        tblPr.remove(old)
    mar = OxmlElement("w:tblCellMar")
    for side, val in (("top", top), ("bottom", bottom), ("left", left), ("right", right)):
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:w"), str(val))
        el.set(qn("w:type"), "dxa")
        mar.append(el)
    tblPr.insert_element_before(mar, "w:tblLook", "w:tblCaption", "w:tblDescription")


def _table_borders(table, color=BORDER, sz=4):
    tblPr = table._tbl.tblPr
    for old in tblPr.findall(qn("w:tblBorders")):
        tblPr.remove(old)
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), str(sz))
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), color)
        borders.append(el)
    tblPr.insert_element_before(borders, "w:shd", "w:tblLayout", "w:tblCellMar",
                                "w:tblLook", "w:tblCaption", "w:tblDescription")


def _no_borders(table):
    tblPr = table._tbl.tblPr
    for old in tblPr.findall(qn("w:tblBorders")):
        tblPr.remove(old)
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "none")
        el.set(qn("w:sz"), "0")
        borders.append(el)
    tblPr.insert_element_before(borders, "w:shd", "w:tblLayout", "w:tblCellMar",
                                "w:tblLook", "w:tblCaption", "w:tblDescription")


def _repeat_header(row):
    trPr = row._tr.get_or_add_trPr()
    el = OxmlElement("w:tblHeader")
    el.set(qn("w:val"), "true")
    trPr.insert_element_before(el, "w:tblCellSpacing", "w:jc", "w:hidden",
                               "w:ins", "w:del", "w:trPrChange")


def _cant_split(row):
    trPr = row._tr.get_or_add_trPr()
    el = OxmlElement("w:cantSplit")
    el.set(qn("w:val"), "true")
    trPr.insert_element_before(el, "w:trHeight", "w:tblHeader", "w:tblCellSpacing",
                               "w:jc", "w:hidden", "w:ins", "w:del", "w:trPrChange")


def _field(paragraph, instr, placeholder="1", size=9, color=MUTED):
    run = paragraph.add_run()
    _set_font(run, size=size, color=color)
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), instr)
    r = OxmlElement("w:r")
    t = OxmlElement("w:t")
    t.text = placeholder
    r.append(t)
    fld.append(r)
    run._element.addnext(fld)


class Doc:
    def __init__(self):
        self.d = Document()
        self.fig_no = 0
        self.tab_no = 0
        self._setup()

    # ------------------------------------------------------------ setup
    def _setup(self):
        d = self.d
        st = d.styles["Normal"]
        st.font.name = FONT
        st.font.size = Pt(10)
        st.font.color.rgb = INK
        st.paragraph_format.space_after = Pt(6)
        st.paragraph_format.line_spacing = 1.28
        rpr = st.element.get_or_add_rPr()
        rfonts = rpr.find(qn("w:rFonts"))
        if rfonts is None:
            rfonts = OxmlElement("w:rFonts")
            rpr.append(rfonts)
        for attr in ("w:ascii", "w:hAnsi", "w:cs"):
            rfonts.set(qn(attr), FONT)
        for attr in ("w:asciiTheme", "w:hAnsiTheme", "w:cstheme"):
            if rfonts.get(qn(attr)) is not None:
                del rfonts.attrib[qn(attr)]

        sec = d.sections[0]
        sec.page_width = Cm(21.0)
        sec.page_height = Cm(29.7)
        sec.top_margin = Cm(2.0)
        sec.bottom_margin = Cm(1.9)
        sec.left_margin = Cm(2.0)
        sec.right_margin = Cm(2.0)
        sec.header_distance = Cm(1.0)
        sec.footer_distance = Cm(0.9)

    # ------------------------------------------------------------ base blocks
    def _add_par(self, text="", size=10, bold=False, color=INK, italic=False,
                 align="left", space_before=0, space_after=6, spacing=1.28, keep=False,
                 left_indent=None, first_line=None):
        p = self.d.add_paragraph()
        pf = p.paragraph_format
        pf.space_before = Pt(space_before)
        pf.space_after = Pt(space_after)
        pf.line_spacing = spacing
        pf.keep_with_next = keep
        if left_indent is not None:
            pf.left_indent = Cm(left_indent)
        if first_line is not None:
            pf.first_line_indent = Cm(first_line)
        pf.alignment = {"left": WD_ALIGN_PARAGRAPH.LEFT, "center": WD_ALIGN_PARAGRAPH.CENTER,
                        "right": WD_ALIGN_PARAGRAPH.RIGHT, "just": WD_ALIGN_PARAGRAPH.JUSTIFY}[align]
        for chunk, is_bold in self._parse_bold(text):
            r = p.add_run(chunk)
            _set_font(r, size=size, bold=(bold or is_bold), color=color, italic=italic)
        return p

    @staticmethod
    def _parse_bold(text):
        parts = re.split(r"(\*\*.+?\*\*)", text)
        out = []
        for part in parts:
            if not part:
                continue
            if part.startswith("**") and part.endswith("**"):
                out.append((part[2:-2], True))
            else:
                out.append((part, False))
        return out or [("", False)]

    def p(self, text, **kw):
        return self._add_par(text, **kw)

    def lead(self, text):
        return self._add_par(text, size=11, color=INK2, space_after=10, spacing=1.3)

    def h1(self, num, text):
        p = self.d.add_paragraph()
        pf = p.paragraph_format
        pf.space_before = Pt(16)
        pf.space_after = Pt(8)
        pf.keep_with_next = True
        r = p.add_run(f"{num}  ")
        _set_font(r, size=16, bold=True, color=BLUE2)
        r = p.add_run(text)
        _set_font(r, size=16, bold=True, color=INK)
        self._bottom_border(p, "2E6FD0", 8)
        return p

    def h2(self, num, text):
        p = self.d.add_paragraph()
        pf = p.paragraph_format
        pf.space_before = Pt(12)
        pf.space_after = Pt(4)
        pf.keep_with_next = True
        r = p.add_run(f"{num}  ")
        _set_font(r, size=12, bold=True, color=BLUE2)
        r = p.add_run(text)
        _set_font(r, size=12, bold=True, color=INK)
        return p

    def h3(self, text):
        p = self.d.add_paragraph()
        pf = p.paragraph_format
        pf.space_before = Pt(8)
        pf.space_after = Pt(2)
        pf.keep_with_next = True
        r = p.add_run(text)
        _set_font(r, size=10.5, bold=True, color=BLUE)
        return p

    def _bottom_border(self, p, color, sz):
        pPr = p._p.get_or_add_pPr()
        pbdr = OxmlElement("w:pBdr")
        bottom = OxmlElement("w:bottom")
        bottom.set(qn("w:val"), "single")
        bottom.set(qn("w:sz"), str(sz))
        bottom.set(qn("w:space"), "4")
        bottom.set(qn("w:color"), color)
        pbdr.append(bottom)
        pPr.insert_element_before(pbdr, "w:shd", "w:tabs", "w:suppressAutoHyphens",
                                  "w:kinsoku", "w:wordWrap", "w:overflowPunct", "w:topLinePunct",
                                  "w:autoSpaceDE", "w:autoSpaceDN", "w:bidi", "w:adjustRightInd",
                                  "w:snapToGrid", "w:spacing", "w:ind", "w:contextualSpacing",
                                  "w:mirrorIndents", "w:suppressOverlap", "w:jc", "w:textDirection",
                                  "w:textAlignment", "w:textboxTightWrap", "w:outlineLvl",
                                  "w:divId", "w:cnfStyle", "w:rPr", "w:sectPr", "w:pPrChange")

    def bullets(self, items, size=10, indent=0.5, space=3):
        for it in items:
            p = self.d.add_paragraph()
            pf = p.paragraph_format
            pf.left_indent = Cm(indent + 0.45)
            pf.first_line_indent = Cm(-0.45)
            pf.space_after = Pt(space)
            pf.line_spacing = 1.25
            r = p.add_run("•  ")
            _set_font(r, size=size, bold=True, color=BLUE2)
            for chunk, is_bold in self._parse_bold(it):
                r = p.add_run(chunk)
                _set_font(r, size=size, bold=is_bold, color=INK if not is_bold else INK)

    def numbered(self, items, size=10, indent=0.5, space=3, start=1):
        for i, it in enumerate(items, start):
            p = self.d.add_paragraph()
            pf = p.paragraph_format
            pf.left_indent = Cm(indent + 0.6)
            pf.first_line_indent = Cm(-0.6)
            pf.space_after = Pt(space)
            pf.line_spacing = 1.25
            r = p.add_run(f"{i}.  ")
            _set_font(r, size=size, bold=True, color=BLUE2)
            for chunk, is_bold in self._parse_bold(it):
                r = p.add_run(chunk)
                _set_font(r, size=size, bold=is_bold, color=INK)

    # ------------------------------------------------------------ tables
    def table(self, headers, rows, widths, size=8.6, header_size=8.6, caption=None,
              align=None, first_col_bold=False, zebra=True, keep_rows=False):
        if caption:
            self.tab_no += 1
            cp = self.d.add_paragraph()
            cp.paragraph_format.space_before = Pt(8)
            cp.paragraph_format.space_after = Pt(3)
            cp.paragraph_format.keep_with_next = True
            r = cp.add_run(f"Таблица {self.tab_no}. {caption}")
            _set_font(r, size=8.6, bold=True, color=BLUE)

        t = self.d.add_table(rows=1, cols=len(headers))
        t.alignment = WD_TABLE_ALIGNMENT.LEFT
        t.autofit = False
        _table_borders(t)
        _cell_margins(t)
        hdr = t.rows[0]
        _repeat_header(hdr)
        for i, h in enumerate(headers):
            cell = hdr.cells[i]
            cell.width = Cm(widths[i])
            _cell_shade(cell, HDR_BG)
            par = cell.paragraphs[0]
            par.paragraph_format.space_after = Pt(0)
            par.paragraph_format.line_spacing = 1.05
            r = par.add_run(h)
            _set_font(r, size=header_size, bold=True, color=WHITE)

        for ri, row in enumerate(rows):
            cells = t.add_row().cells
            if keep_rows:
                _cant_split(t.rows[-1])
            # строка-группа: одна подпись модуля на всю ширину
            is_group = bool(re.match(r"^M\d$", str(row[0]).strip())) or (
                len(row) > 1 and all(str(v).strip() == "" for v in row[1:]))
            if is_group:
                merged = cells[0]
                for c in cells[1:]:
                    merged = merged.merge(c)
                _cell_shade(merged, "EAF1FB")
                par = merged.paragraphs[0]
                par.paragraph_format.space_after = Pt(0)
                label = str(row[0])
                if len(row) > 1 and str(row[1]).strip():
                    label = label + " · " + str(row[1])
                for chunk, is_bold in self._parse_bold(label):
                    r = par.add_run(chunk)
                    _set_font(r, size=size, bold=True, color=BLUE)
                continue
            for ci, val in enumerate(row):
                cell = cells[ci]
                cell.width = Cm(widths[ci])
                if zebra and ri % 2 == 1:
                    _cell_shade(cell, ZEBRA)
                par = cell.paragraphs[0]
                par.paragraph_format.space_after = Pt(0)
                par.paragraph_format.line_spacing = 1.08
                bold = first_col_bold and ci == 0
                a = (align[ci] if align else "left")
                par.paragraph_format.alignment = {"left": WD_ALIGN_PARAGRAPH.LEFT,
                                                  "center": WD_ALIGN_PARAGRAPH.CENTER,
                                                  "right": WD_ALIGN_PARAGRAPH.RIGHT}[a]
                for chunk, is_bold in self._parse_bold(str(val)):
                    r = par.add_run(chunk)
                    _set_font(r, size=size, bold=(bold or is_bold), color=INK)
        # отступ после таблицы
        self.d.add_paragraph().paragraph_format.space_after = Pt(2)
        return t

    def callout(self, text, kind="info", title=None):
        colors = {"info": ("EFF5FC", "2E6FD0", BLUE),
                  "warn": ("FDF3EF", "D9552B", ORANGE),
                  "ok": ("F1F7F3", "1E8A5F", GREEN)}
        bg, bar, fg = colors[kind]
        t = self.d.add_table(rows=1, cols=1)
        _no_borders(t)
        _cell_margins(t, top=120, bottom=120, left=200, right=160)
        cell = t.rows[0].cells[0]
        cell.width = Cm(BODY_W)
        _cell_shade(cell, bg)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.25
        if title:
            r = p.add_run(title + "  ")
            _set_font(r, size=9.5, bold=True, color=fg)
        for chunk, is_bold in self._parse_bold(text):
            r = p.add_run(chunk)
            _set_font(r, size=9.5, bold=is_bold, color=fg if is_bold else INK2)
        self.d.add_paragraph().paragraph_format.space_after = Pt(2)

    def figure(self, path, caption, width_cm=None, source=None):
        self.fig_no += 1
        p = self.d.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.keep_with_next = True
        p.add_run().add_picture(path, width=Cm(width_cm or BODY_W))
        cp = self.d.add_paragraph()
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cp.paragraph_format.space_after = Pt(10)
        r = cp.add_run(f"Рисунок {self.fig_no}. {caption}")
        _set_font(r, size=8.4, italic=True, color=MUTED)
        if source:
            r = cp.add_run("  " + source)
            _set_font(r, size=8, italic=False, color=MUTED)

    def figure_page(self, path, caption, width_cm=24.2, source=None):
        """Рисунок на отдельной альбомной странице — чтобы подписи читались."""
        self.new_section(landscape=True)
        p = self.d.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(4)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run().add_picture(path, width=Cm(width_cm))
        self.fig_no += 1
        cp = self.d.add_paragraph()
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cp.paragraph_format.space_after = Pt(0)
        r = cp.add_run(f"Рисунок {self.fig_no}. {caption}")
        _set_font(r, size=9, italic=True, color=MUTED)
        if source:
            r = cp.add_run("  " + source)
            _set_font(r, size=8.5, color=MUTED)
        self.new_section(landscape=False)

    # ------------------------------------------------------------ sections
    def page_break(self):
        self.d.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    def new_section(self, landscape=False):
        sec = self.d.add_section(WD_SECTION.NEW_PAGE)
        if landscape:
            sec.orientation = WD_ORIENT.LANDSCAPE
            sec.page_width = Cm(29.7)
            sec.page_height = Cm(21.0)
            sec.left_margin = Cm(1.9)
            sec.right_margin = Cm(1.9)
            sec.top_margin = Cm(1.7)
            sec.bottom_margin = Cm(1.5)
        else:
            sec.orientation = WD_ORIENT.PORTRAIT
            sec.page_width = Cm(21.0)
            sec.page_height = Cm(29.7)
            sec.left_margin = Cm(2.0)
            sec.right_margin = Cm(2.0)
            sec.top_margin = Cm(2.0)
            sec.bottom_margin = Cm(1.9)
        sec.header_distance = Cm(1.0)
        sec.footer_distance = Cm(0.9)
        return sec

    def header_footer(self, doc_title, sec=None, first_page_blank=False):
        sec = sec or self.d.sections[0]
        sec.different_first_page_header_footer = first_page_blank
        hdr = sec.header
        hdr.is_linked_to_previous = False
        hp = hdr.paragraphs[0]
        hp.text = ""
        hp.paragraph_format.space_after = Pt(0)
        tabs = hp.paragraph_format.tab_stops
        from docx.enum.text import WD_TAB_ALIGNMENT
        width_cm = (sec.page_width - sec.left_margin - sec.right_margin) / 360000.0
        width = width_cm
        tabs.add_tab_stop(Cm(width), WD_TAB_ALIGNMENT.RIGHT)
        r = hp.add_run(doc_title)
        _set_font(r, size=8, color=MUTED)
        r = hp.add_run("\tТехническое задание · I этап")
        _set_font(r, size=8, color=MUTED)
        pPr = hp._p.get_or_add_pPr()
        pbdr = OxmlElement("w:pBdr")
        bottom = OxmlElement("w:bottom")
        bottom.set(qn("w:val"), "single")
        bottom.set(qn("w:sz"), "4")
        bottom.set(qn("w:space"), "4")
        bottom.set(qn("w:color"), "D5DEEA")
        pbdr.append(bottom)
        pPr.insert_element_before(pbdr, "w:shd", "w:tabs", "w:suppressAutoHyphens",
                                  "w:kinsoku", "w:wordWrap", "w:overflowPunct", "w:topLinePunct",
                                  "w:autoSpaceDE", "w:autoSpaceDN", "w:bidi", "w:adjustRightInd",
                                  "w:snapToGrid", "w:spacing", "w:ind", "w:contextualSpacing",
                                  "w:mirrorIndents", "w:suppressOverlap", "w:jc", "w:textDirection",
                                  "w:textAlignment", "w:textboxTightWrap", "w:outlineLvl",
                                  "w:divId", "w:cnfStyle", "w:rPr", "w:sectPr", "w:pPrChange")

        ftr = sec.footer
        ftr.is_linked_to_previous = False
        fp = ftr.paragraphs[0]
        fp.text = ""
        fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r = fp.add_run("стр. ")
        _set_font(r, size=8, color=MUTED)
        _field(fp, " PAGE ", "1")

    def save(self, path):
        self.d.save(path)
        return path

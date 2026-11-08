# -*- coding: utf-8 -*-
"""Сборка итогового документа ТЗ."""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.chdir(HERE)

from docx_lib import Doc  # noqa
import s01_intro  # noqa
import s02_req  # noqa
import s03_models  # noqa
import s04_data  # noqa
import s05_arch  # noqa
import s06_test  # noqa
import s07_final  # noqa

OUT = os.path.join(HERE, "..", "ТЗ_Цифровой_двойник_и_3D-туры.docx")


def main():
    d = Doc()
    d.header_footer("Цифровой двойник предприятия и 3D-туры", first_page_blank=True)
    s01_intro.cover(d)
    s01_intro.toc(d)
    s01_intro.section1(d)
    s01_intro.section2(d)
    s02_req.section3(d)
    s03_models.section4(d)
    s04_data.section5(d)
    s04_data.section6(d)
    s05_arch.section7(d)
    s05_arch.section8(d)
    s06_test.section9(d)
    s06_test.section10(d)
    s07_final.section11(d)
    s07_final.appendix(d)
    d.save(OUT)
    print("saved", OUT)
    print("figures:", d.fig_no, "tables:", d.tab_no)


if __name__ == "__main__":
    main()

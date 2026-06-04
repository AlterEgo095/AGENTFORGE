#!/usr/bin/env python3
"""Merge cover PDF + body PDF into final output with metadata."""

from pypdf import PdfReader, PdfWriter, Transformation

A4_W, A4_H = 595.28, 841.89

def normalize_page_to_a4(page):
    """Scale a page to A4 if its dimensions don't match."""
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 2 or abs(h - A4_H) > 2:
        sx, sy = A4_W / w, A4_H / h
        page.add_transformation(Transformation().scale(sx=sx, sy=sy))
        page.mediabox.lower_left = (0, 0)
        page.mediabox.upper_right = (A4_W, A4_H)
    return page

def insert_cover(cover_pdf, body_pdf, output_pdf):
    """Insert cover as first page of body PDF -> single output file."""
    writer = PdfWriter()
    # Cover as page 1
    cover_page = PdfReader(cover_pdf).pages[0]
    writer.add_page(normalize_page_to_a4(cover_page))
    # Body pages follow
    for page in PdfReader(body_pdf).pages:
        writer.add_page(normalize_page_to_a4(page))
    writer.add_metadata({
        '/Title': 'Programme de Remédiation Stratégique — AgentForge',
        '/Author': 'AgentForge Architecture Team',
        '/Creator': 'Z.ai',
        '/Subject': 'Architecture Enterprise Cloud Native - Vision Complète',
    })
    with open(output_pdf, 'wb') as f:
        writer.write(f)

if __name__ == '__main__':
    cover_path = '/home/z/my-project/download/cover.pdf'
    body_path = '/home/z/my-project/download/body.pdf'
    output_path = '/home/z/my-project/download/AgentForge_Remediaction_Strategique.pdf'

    insert_cover(cover_path, body_path, output_path)

    import os
    size = os.path.getsize(output_path)
    reader = PdfReader(output_path)
    pages = len(reader.pages)
    print(f"Final PDF: {output_path}")
    print(f"Pages: {pages}")
    print(f"Size: {size / 1024:.1f} KB")

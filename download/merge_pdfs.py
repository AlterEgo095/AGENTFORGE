#!/usr/bin/env python3
"""Merge cover + body PDFs into final document."""

from pypdf import PdfReader, PdfWriter

A4_W, A4_H = 595.28, 841.89

def normalize_page_to_a4(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 2 or abs(h - A4_H) > 2:
        from pypdf import Transformation
        sx, sy = A4_W / w, A4_H / h
        page.add_transformation(Transformation().scale(sx=sx, sy=sy))
        page.mediabox.lower_left = (0, 0)
        page.mediabox.upper_right = (A4_W, A4_H)
    return page

cover_path = '/home/z/my-project/download/cover_agent_architecture.pdf'
body_path = '/home/z/my-project/download/Architecture_Agents_IA_body.pdf'
output_path = '/home/z/my-project/download/Architecture_Agents_IA_Synthese.pdf'

writer = PdfWriter()

# Cover as page 1
cover_page = PdfReader(cover_path).pages[0]
writer.add_page(normalize_page_to_a4(cover_page))

# Body pages follow
for page in PdfReader(body_path).pages:
    writer.add_page(normalize_page_to_a4(page))

writer.add_metadata({
    '/Title': 'Architecture des Agents IA : Synthese Actionnable pour Agent Developpeur & Agent SLIDES',
    '/Author': 'Z.ai',
    '/Creator': 'Z.ai',
    '/Subject': 'Architecture IA, Agents, Orchestration, RAG, Memoire Persistante'
})

with open(output_path, 'wb') as f:
    writer.write(f)

print(f"Final PDF: {output_path}")

# Stats
import os
size_kb = os.path.getsize(output_path) / 1024
num_pages = len(PdfReader(output_path).pages)
print(f"Pages: {num_pages}, Size: {size_kb:.1f} KB")

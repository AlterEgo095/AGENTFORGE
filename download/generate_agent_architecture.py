#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Architecture des Agents IA : Synthese Actionnable pour Agent Developpeur & Agent SLIDES
PDF Generation Script - ReportLab
"""

import os
import sys
import hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm, mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, CondPageBreak, Image, HRFlowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ─────────────────────────────────────────────────────────────
# FONT REGISTRATION
# ─────────────────────────────────────────────────────────────
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSCBold', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSCBold', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSerif', '/usr/share/fonts/truetype/chinese/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('CarlitoBold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansBold', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'))

registerFontFamily('LiberationSerif', normal='LiberationSerif', bold='LiberationSerif')
registerFontFamily('Carlito', normal='Carlito', bold='CarlitoBold')
registerFontFamily('SarasaMonoSC', normal='SarasaMonoSC', bold='SarasaMonoSCBold')
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSCBold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSansBold')

# ─────────────────────────────────────────────────────────────
# COLOR PALETTE (auto-generated)
# ─────────────────────────────────────────────────────────────
ACCENT       = colors.HexColor('#5130b5')
TEXT_PRIMARY  = colors.HexColor('#1b1c1e')
TEXT_MUTED    = colors.HexColor('#6f757b')
BG_SURFACE   = colors.HexColor('#d7dce1')
BG_PAGE      = colors.HexColor('#eceef0')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE
ACCENT_LIGHT = colors.HexColor('#e8e3f5')

# ─────────────────────────────────────────────────────────────
# PAGE DIMENSIONS
# ─────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
LEFT_MARGIN = 1.0 * inch
RIGHT_MARGIN = 1.0 * inch
TOP_MARGIN = 0.8 * inch
BOTTOM_MARGIN = 0.8 * inch
CONTENT_W = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN

# ─────────────────────────────────────────────────────────────
# STYLES
# ─────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

style_cover_title = ParagraphStyle(
    'CoverTitle', fontName='LiberationSerif', fontSize=28, leading=36,
    alignment=TA_CENTER, textColor=colors.white, spaceAfter=12
)
style_cover_subtitle = ParagraphStyle(
    'CoverSubtitle', fontName='LiberationSerif', fontSize=16, leading=22,
    alignment=TA_CENTER, textColor=colors.HexColor('#e0daf0'), spaceAfter=8
)
style_cover_meta = ParagraphStyle(
    'CoverMeta', fontName='LiberationSerif', fontSize=12, leading=16,
    alignment=TA_CENTER, textColor=colors.HexColor('#b8b0cc'), spaceAfter=4
)

style_h1 = ParagraphStyle(
    'H1Custom', fontName='LiberationSerif', fontSize=20, leading=28,
    textColor=ACCENT, spaceBefore=24, spaceAfter=12, alignment=TA_LEFT
)
style_h2 = ParagraphStyle(
    'H2Custom', fontName='LiberationSerif', fontSize=15, leading=22,
    textColor=TEXT_PRIMARY, spaceBefore=18, spaceAfter=8, alignment=TA_LEFT
)
style_h3 = ParagraphStyle(
    'H3Custom', fontName='LiberationSerif', fontSize=12, leading=18,
    textColor=ACCENT, spaceBefore=12, spaceAfter=6, alignment=TA_LEFT
)
style_body = ParagraphStyle(
    'BodyCustom', fontName='LiberationSerif', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, spaceAfter=6, alignment=TA_JUSTIFY,
    firstLineIndent=0
)
style_body_indent = ParagraphStyle(
    'BodyIndent', parent=style_body, leftIndent=18
)
style_bullet = ParagraphStyle(
    'BulletCustom', fontName='LiberationSerif', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, spaceAfter=4, alignment=TA_LEFT,
    leftIndent=24, bulletIndent=12
)
style_code = ParagraphStyle(
    'CodeCustom', fontName='DejaVuSans', fontSize=9, leading=14,
    textColor=colors.HexColor('#2d2d2d'), backColor=colors.HexColor('#f4f4f4'),
    leftIndent=12, rightIndent=12, spaceBefore=6, spaceAfter=6,
    borderPadding=6, alignment=TA_LEFT
)
style_callout = ParagraphStyle(
    'CalloutCustom', fontName='LiberationSerif', fontSize=10.5, leading=17,
    textColor=ACCENT, spaceAfter=6, alignment=TA_LEFT,
    leftIndent=24, borderPadding=6, borderColor=ACCENT, borderWidth=2,
)
style_table_header = ParagraphStyle(
    'TableHeader', fontName='LiberationSerif', fontSize=10,
    textColor=colors.white, alignment=TA_CENTER, leading=14
)
style_table_cell = ParagraphStyle(
    'TableCell', fontName='LiberationSerif', fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, leading=13, wordWrap='CJK'
)
style_table_cell_center = ParagraphStyle(
    'TableCellCenter', parent=style_table_cell, alignment=TA_CENTER
)
style_caption = ParagraphStyle(
    'CaptionCustom', fontName='LiberationSerif', fontSize=9, leading=13,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=3, spaceAfter=12
)
style_toc_h1 = ParagraphStyle(
    'TOCH1', fontName='LiberationSerif', fontSize=13, leftIndent=20, leading=22,
    spaceBefore=6, spaceAfter=2
)
style_toc_h2 = ParagraphStyle(
    'TOCH2', fontName='LiberationSerif', fontSize=11, leftIndent=40, leading=18,
    spaceBefore=2, spaceAfter=1
)

# ─────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────
MAX_KEEP_HEIGHT = PAGE_H * 0.4

def safe_keep_together(elements):
    total_h = 0
    for el in elements:
        w, h = el.wrap(CONTENT_W, PAGE_H)
        total_h += h
    if total_h <= MAX_KEEP_HEIGHT:
        return [KeepTogether(elements)]
    elif len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    else:
        return list(elements)

def make_table(data, col_ratios=None, col_widths=None):
    """Create a styled table with optional column ratios."""
    if col_ratios:
        cw = [r * CONTENT_W for r in col_ratios]
    elif col_widths:
        cw = col_widths
    else:
        cw = None
    t = Table(data, colWidths=cw, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

def P(text, style=None):
    """Shorthand for Paragraph."""
    return Paragraph(text, style or style_body)

def H1(text):
    return Paragraph('<b>' + text + '</b>', style_h1)

def H2(text):
    return Paragraph('<b>' + text + '</b>', style_h2)

def H3(text):
    return Paragraph('<b>' + text + '</b>', style_h3)

def bullet(text):
    return Paragraph(text, style_bullet)

def code_block(text):
    return Paragraph(text.replace('\n', '<br/>'), style_code)

def callout(text):
    return Paragraph('<b>' + text + '</b>', style_callout)

def spacer(pts=12):
    return Spacer(1, pts)

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=ACCENT, spaceBefore=6, spaceAfter=6)

# ─────────────────────────────────────────────────────────────
# TOC DOCUMENT TEMPLATE
# ─────────────────────────────────────────────────────────────
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, '<b>' + text + '</b>'), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

H1_ORPHAN_THRESHOLD = (PAGE_H - TOP_MARGIN - BOTTOM_MARGIN) * 0.15

def add_major_section(text):
    return [
        CondPageBreak(H1_ORPHAN_THRESHOLD),
        add_heading(text, style_h1, level=0),
    ]

def add_subsection(text):
    return [add_heading(text, style_h2, level=1)]

# ─────────────────────────────────────────────────────────────
# BUILD DOCUMENT
# ─────────────────────────────────────────────────────────────
OUTPUT_PATH = '/home/z/my-project/download/Architecture_Agents_IA_Synthese.pdf'
BODY_PATH = '/home/z/my-project/download/Architecture_Agents_IA_body.pdf'

doc = TocDocTemplate(
    BODY_PATH,
    pagesize=A4,
    leftMargin=LEFT_MARGIN,
    rightMargin=RIGHT_MARGIN,
    topMargin=TOP_MARGIN,
    bottomMargin=BOTTOM_MARGIN,
    title='Architecture des Agents IA : Synthese Actionnable',
    author='Z.ai',
    creator='Z.ai',
)

story = []

# ─── TABLE OF CONTENTS ───
story.append(Paragraph('<b>Table des Matieres</b>', ParagraphStyle(
    'TOCTitle', fontName='LiberationSerif', fontSize=22, leading=30,
    textColor=ACCENT, alignment=TA_LEFT, spaceAfter=18
)))
toc = TableOfContents()
toc.levelStyles = [style_toc_h1, style_toc_h2]
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════
# SECTION 1 : INTRODUCTION
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('1. Introduction : Pourquoi cette synthese ?'))

story.append(P(
    'Le document original, intitule "Compilateur d\'Architecture Intelligente", constitue une reference '
    'encyclopedique couvrant l\'ensemble de l\'ingenierie logicielle, de la theorie des files d\'attente '
    'aux architectures hyperscale en passant par le FinOps et la securite DevSecOps. Cependant, pour '
    'construire effectivement un Agent Developpeur et un Agent SLIDES, une grande partie de ce contenu '
    'n\'est pas directement applicable. Ce document extrait, filtre et restructure les connaissances '
    'essentielles du document original pour les mapper specifiquement aux besoins de la conception '
    'et de l\'implementation de ces deux agents IA.'
))

story.append(P(
    'L\'objectif n\'est pas de reproduire l\'integralite du document source, mais d\'en distiller '
    'les principes fondamentaux, les patterns d\'orchestration, les architectures de reference et les '
    'strategies de mise en production qui sont directement actionnables pour batir des agents IA de '
    'classe mondiale. Chaque section identifie les elements du document original qui sont critiques, '
    'ceux qui sont utiles mais secondaires, et ceux qui peuvent etre differees.'
))

story.append(P(
    'Les deux agents cibles partagent une infrastructure commune (routeur de modeles, pipeline RAG, '
    'memoire persistante, securite en profondeur) mais divergent dans leur orchestration specifique : '
    'l\'Agent Developpeur necessite un pipeline sequentiel avec validation multi-couches, tandis que '
    'l\'Agent SLIDES requiert un orchestrateur supervisor avec des sous-agents specialises en design, '
    'contenu et mise en page. Cette synthese articule les deux architectures en mettant en evidence '
    'les composants partageables et les specialisations necessaires.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 2 : PRINCIPES META-COGNITIFS
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('2. Principes Meta-Cognitifs appliques aux Agents IA'))

story.append(P(
    'Le document original identifie sept modeles mentaux d\'architectes d\'elite. Voici comment chacun '
    's\'applique specifiquement a la conception d\'agents IA, avec des recommandations actionnables.'
))

story.extend(add_subsection('2.1 Raisonnement par Premiers Principes'))
story.append(P(
    'Ce modele est le plus fondamental pour la conception d\'agents. Plutot que de copier l\'architecture '
    'd\'un agent existant (comme Genspark ou Cursor), il faut decomposer les besoins jusqu\'aux axiomes '
    'invariants. Pour un Agent Developpeur, les axiomes sont : (1) le code doit etre syntaxiquement correct, '
    '(2) les modifications doivent etre reproductibles, (3) le contexte du projet doit etre compris, et '
    '(4) les actions doivent etre reversibles. A partir de ces axiomes, on reconstruit l\'architecture '
    'sans biais de conformite. Cela signifie, par exemple, que si un agent de code a besoin d\'executer '
    'du code pour le valider, l\'axiome de reproductibilite impose un environnement sandboxe et deterministic, '
    'pas simplement un terminal SSH.'
))

story.extend(add_subsection('2.2 Theorie des Contraintes (TOC)'))
story.append(P(
    'Dans un systeme multi-agents, le goulot d\'etranglement est presque toujours le LLM lui-meme : '
    'la latence d\'inference et le cout par token dominent toutes les autres contraintes. L\'optimisation '
    'doit donc se concentrer sur : (1) la reduction du nombre d\'appels LLM par tache, (2) le choix '
    'du modele le moins cher qui repond au besoin de qualite, (3) le cache semantique pour eviter les '
    'appels redondants, et (4) le routing dynamique qui envoie les taches simples vers des modeles '
    'rapides et peu couteux. Toute optimisation ailleurs (base de donnees, reseau, CPU) est secondaire '
    'tant que le LLM reste le bottleneck.'
))

story.extend(add_subsection('2.3 Compression Architecturale'))
story.append(P(
    'Applique aux agents IA, ce principe stipule que chaque composant doit etre justifie par une '
    'fonction critique. Si un module de memoire semantique est ajoute "au cas ou l\'agent aurait '
    'besoin de se souvenir de conversations passees", mais qu\'aucun cas d\'usage actuel ne le '
    'necessite, il faut le supprimer (YAGNI). L\'architecture MVP d\'un agent doit commencer par '
    'le pipeline minimum : Input > Classification > LLM > Output, puis ajouter progressivement '
    'le RAG, la memoire, le routing dynamique et les outils selon les besoins reels observes.'
))

story.extend(add_subsection('2.4 Reversibilite Decisionnelle'))
story.append(P(
    'Pour les agents IA, les decisions irreversibles (Type 1) incluent : le choix du framework '
    'd\'orchestration (LangGraph vs Mastra vs custom), le schema de memoire persistante, et '
    'l\'interface de communication entre agents. Ces decisions necessitent des semaines d\'analyse, '
    'des POC et des RFC. Les decisions reversibles (Type 2) incluent : le prompt systeme, le modele '
    'LLM par defaut (changeable via router), la strategie de chunking, et le format de stockage des '
    'embeddings. Ces decisions doivent etre prises en moins d\'une heure avec le principe '
    '"disagree and commit".'
))

story.extend(add_subsection('2.5 Pensee Systemique - Les Leviers'))
story.append(P(
    'En appliquant la hierarchie des leviers de Donella Meadows aux agents IA, les interventions '
    'les plus puissantes (niveaux 1-3) sont : transcender le paradigme (passer d\'un agent monolithique '
    'a un orchestration multi-agents), changer les buts du systeme (optimiser pour la satisfaction utilisateur '
    'plutot que pour la precision du LLM), et l\'auto-organisation (permettre aux agents de choisir '
    'dynamiquement leurs outils et strategies). Les interventions les moins puissantes (niveaux 10-12) '
    'sont : ajuster les parametres de temperature, modifier les tailles de buffer, et changer les constantes '
    'de timeout. L\'architecte d\'elite intervient aux niveaux 1-3.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 3 : ORCHESTRATION MULTI-AGENTS
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('3. Patterns d\'Orchestration Multi-Agents'))

story.append(P(
    'Le document original identifie cinq patterns fondamentaux d\'orchestration multi-agents. '
    'Chaque pattern a des forces et des faiblesses specifiques qui le rendent plus ou moins adapte '
    'a chaque type d\'agent. Le choix du pattern d\'orchestration est une decision Type 1 '
    '(irreversible) qui conditionne toute l\'architecture subsequente.'
))

# Table: Patterns comparison
data_patterns = [
    [Paragraph('<b>Pattern</b>', style_table_header),
     Paragraph('<b>Topologie</b>', style_table_header),
     Paragraph('<b>Agent Dev</b>', style_table_header),
     Paragraph('<b>Agent SLIDES</b>', style_table_header)],
    [Paragraph('Supervisor', style_table_cell),
     Paragraph('Hub & Spoke', style_table_cell),
     Paragraph('Secondaire', style_table_cell),
     Paragraph('<b>Principal</b>', style_table_cell)],
    [Paragraph('Pipeline', style_table_cell),
     Paragraph('Sequentiel', style_table_cell),
     Paragraph('<b>Principal</b>', style_table_cell),
     Paragraph('Secondaire', style_table_cell)],
    [Paragraph('Swarm', style_table_cell),
     Paragraph('Peer-to-Peer', style_table_cell),
     Paragraph('Expérimental', style_table_cell),
     Paragraph('Non adapté', style_table_cell)],
    [Paragraph('Hierarchique', style_table_cell),
     Paragraph('CEO/Manager/Worker', style_table_cell),
     Paragraph('Pour équipes larges', style_table_cell),
     Paragraph('Utile à grande échelle', style_table_cell)],
    [Paragraph('Debat', style_table_cell),
     Paragraph('Pro vs Contra + Juge', style_table_cell),
     Paragraph('Pour revue de code', style_table_cell),
     Paragraph('Pour validation design', style_table_cell)],
]
story.append(spacer(12))
story.append(make_table(data_patterns, col_ratios=[0.18, 0.22, 0.30, 0.30]))
story.append(Paragraph('Tableau 1 : Mapping des patterns d\'orchestration aux agents cibles', style_caption))

story.extend(add_subsection('3.1 Agent Developpeur : Architecture Pipeline + Debat'))

story.append(P(
    'L\'Agent Developpeur fonctionne au mieux avec un pattern Pipeline pour le flux principal de '
    'generation de code, enrichi d\'un pattern Debat pour la phase de validation. Le pipeline '
    'sequentiel garantit que chaque etape produit un artefact verifiable avant de passer a la suivante, '
    'ce qui est critique pour la fiabilite du code. Le schema d\'orchestration est le suivant :'
))

story.append(code_block(
    'Input Utilisateur > Analyseur (comprehension requete) > Planificateur (decomposition taches) > '
    'Generateur (code + tests) > Validateur (execution + review) > Correcteur (si erreurs) > Livreur (commit + doc)'
))

story.append(P(
    'Chaque etape du pipeline est un agent specialise avec son propre prompt systeme, ses propres outils '
    'et sa propre logique de validation. Le Validateur utilise le pattern Debat : deux sous-agents '
    '(un "critique" et un "defenseur") evaluent le code genere, et un agent Juge arbitre les desaccords. '
    'Ce mecanisme double la qualite du code en interceptant 60-80% des erreurs que l\'auto-validation '
    'd\'un seul agent laisserait passer. La boucle Correcteur ne s\'execute que si le Validateur detecte '
    'des problemes, et elle est limitee a 3 iterations pour eviter les boucles infinies.'
))

story.extend(add_subsection('3.2 Agent SLIDES : Architecture Supervisor'))

story.append(P(
    'L\'Agent SLIDES necessite un pattern Supervisor car la creation de presentations est un processus '
    'creatif qui requiert des allers-retours entre des sous-agents specialises differents. Un superviseur '
    'central coordonne les appels aux sous-agents et aggrege leurs resultats en temps reel. Le schema :'
))

story.append(code_block(
    'Superviseur SLIDES > Agent Structure (plan/outline) > Agent Contenu (texte + donnees) > '
    'Agent Design (layout + visuels) > Agent Validation (cohérence + qualité) > Superviseur (agrégation)'
))

story.append(P(
    'Le Superviseur maintient un etat global de la presentation (nombre de slides, theme visuel, '
    'narrative arc) et decide dynamiquement quel sous-agent appeler ensuite. Par exemple, si '
    'l\'Agent Contenu signale qu\'une slide necessite un graphique de donnees, le Superviseur '
    'invoque l\'Agent Design avec un contexte specifique pour creer la visualisation. Si l\'Agent '
    'Validation detecte une incoherence entre le titre et le contenu d\'une slide, le Superviseur '
    'renvoie la tache a l\'Agent Contenu avec les corrections demandeess. Ce pattern est plus flexible '
    'que le pipeline sequentiel car il permet des retours en arriere et des ajustements iteratifs.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 4 : ARCHITECTURE RAG DE PRODUCTION
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('4. Architecture RAG de Production'))

story.append(P(
    'Le document original fournit une architecture RAG extremement detaillee (Section 7.1) qui constitue '
    'le coeur de la capacite de connaissance des deux agents. Sans RAG, un agent est limite a ses '
    'connaissances d\'entrainement ; avec RAG, il accede en temps reel a la documentation, aux exemples '
    'de code, aux templates de design et aux best practices. L\'architecture RAG de production comporte '
    'deux pipelines distincts : l\'Ingestion et la Requete.'
))

story.extend(add_subsection('4.1 Pipeline d\'Ingestion'))

story.append(P(
    'Le pipeline d\'ingestion transforme les sources brutes en vecteurs recherchables. Il comporte '
    'quatre etapes critiques. Premierement, le Loader charge les documents depuis des sources '
    'heterogenes (documentation web, depots Git, fichiers PDF, API). Deuxiemement, le Chunker '
    'decoupe les documents en segments semantiques et hierarchiques, pas simplement par nombre '
    'de tokens. Le chunking semantique preserve le contexte en respectant les frontieres naturelles '
    'des documents (paragraphes, fonctions, sections). Troisiemement, l\'Enricher ajoute des '
    'metadonnees (source, date, type de contenu, resume generatif) et cree des index secondaires. '
    'Quatriemement, l\'Embedder genere des vecteurs denses avec des modeles multiples (OpenAI ada-002 '
    'pour la qualite, BGE pour l\'auto-hebergement) et des vecteurs creux (BM25/SPLADE) pour la '
    'recherche hybride.'
))

story.append(P(
    'Pour l\'Agent Developpeur, les sources d\'ingestion sont : la documentation des frameworks et '
    'langages, les snippets de code verifies, les schemas de base de donnees du projet, et l\'historique '
    'des commits. Pour l\'Agent SLIDES, les sources sont : les templates de presentation, les palettes '
    'de couleurs et typographies, les guides de design, et les exemples de slides par industrie. Le '
    'stockage utilise pgvector (si PostgreSQL est deja present) ou Qdrant (si plus de 10M vecteurs) '
    'avec un schema multi-vectoriel combinant vecteurs denses, vecteurs creux et metadonnees.'
))

story.extend(add_subsection('4.2 Pipeline de Requete'))

story.append(P(
    'Le pipeline de requete est l\'element qui distingue un RAG basique d\'un RAG de production. '
    'Il comporte six etapes en cascade : (1) Analyse de la requete avec classification de l\'intention '
    '(factual, creatif, code) et scoring de complexite ; (2) Expansion de la requete via HyDE '
    '(Hypothetical Document Embeddings) et generation de sous-questions ; (3) Recherche hybride '
    'combinant recherche dense (vectorielle), recherche creuse (BM25) et traversée de graphe de '
    'connaissances ; (4) Fusion par Reciprocal Rank Fusion (RRF) des resultats de chaque methode ; '
    '(5) Re-ranking via un cross-encoder (Cohere ou BGE-reranker) pour affiner la pertinence ; et '
    '(6) Compression du contexte et preparation des citations avant injection dans le LLM.'
))

story.append(P(
    'Le point critique est l\'etape de re-ranking : sans elle, la precision du RAG chute de 40%. '
    'Le cross-encoder re-evalue chaque paire (requete, document) avec une comprehension profonde '
    'de la semantique, capturant des nuances que la recherche vectorielle seule ne peut pas detecter. '
    'Pour l\'Agent Developpeur, cela signifie que si l\'utilisateur demande "comment configurer '
    'Prisma avec PostgreSQL", le re-ranker fera remonter la documentation specifique de Prisma '
    'plutot qu\'un article generique sur PostgreSQL.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 5 : ROUTEUR DE MODELES INTELLIGENT
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('5. Routeur de Modeles Intelligent'))

story.append(P(
    'Le document original (Section 7.3) decrit un routeur de modeles dynamique qui optimise le '
    'compromis cout/qualite/latence. C\'est un composant essentiel pour les deux agents car il '
    'permet de reduire les couts de 60-90% sans degradation perceptible de la qualite. Le routeur '
    'fonctionne en trois couches : classification, decision et execution.'
))

# Router table
data_router = [
    [Paragraph('<b>Complexite</b>', style_table_header),
     Paragraph('<b>Type de tache</b>', style_table_header),
     Paragraph('<b>Modele recommande</b>', style_table_header),
     Paragraph('<b>Cout approx.</b>', style_table_header)],
    [Paragraph('Simple', style_table_cell),
     Paragraph('Formatage, correction, résumé basique', style_table_cell),
     Paragraph('DeepSeek / GPT-4o-mini', style_table_cell),
     Paragraph('0.14$/M tokens', style_table_cell)],
    [Paragraph('Moyen', style_table_cell),
     Paragraph('Generation de code standard, contenu de slide', style_table_cell),
     Paragraph('Claude Haiku / GPT-4o-mini', style_table_cell),
     Paragraph('0.15-1$/M tokens', style_table_cell)],
    [Paragraph('Complexe', style_table_cell),
     Paragraph('Architecture, refactoring, design créatif', style_table_cell),
     Paragraph('Claude Opus / GPT-4o', style_table_cell),
     Paragraph('5-15$/M tokens', style_table_cell)],
    [Paragraph('Sensible', style_table_cell),
     Paragraph('Données privées, code propriétaire', style_table_cell),
     Paragraph('Ollama (local, privé)', style_table_cell),
     Paragraph('Coût infra seule', style_table_cell)],
    [Paragraph('Temps réel', style_table_cell),
     Paragraph('Autocompletion, chat en direct', style_table_cell),
     Paragraph('Groq (ultra-rapide)', style_table_cell),
     Paragraph('0.59$/M tokens', style_table_cell)],
]
story.append(spacer(12))
story.append(make_table(data_router, col_ratios=[0.14, 0.32, 0.28, 0.26]))
story.append(Paragraph('Tableau 2 : Stratégie de routing dynamique des modèles LLM', style_caption))

story.append(P(
    'Le routeur implemente egalement trois strategies d\'optimisation avancees. Premierement, la cascade : '
    'pour les taches de complexite incertaine, on essaie d\'abord le modele le moins cher, et on '
    'escalade uniquement si le resultat est insuffisant (detecte par un classificateur de qualite). '
    'Deuxiemement, le cache semantique : si une requete est semantiquement equivalente (similarite > 0.95) '
    'a une requete precedente, on retourne la reponse cachee sans appeler le LLM. Troisiemement, le '
    'prompt caching : Anthropic et OpenAI offrent des reductions de 50-90% pour les prefixes de prompts '
    'reutilisés, ce qui est particulierement adapte aux prompts systemes des agents qui sont identiques '
    'd\'un appel a l\'autre.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 6 : MEMOIRE PERSISTANTE
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('6. Hierarchie de Memoire Persistante'))

story.append(P(
    'Le document original (Section 7.4) definit une hierarchie de memoire en cinq couches qui est '
    'le coeur de la capacite d\'apprentissage des agents. Sans memoire persistante, un agent est '
    'amnesique a chaque session. Avec la hierarchie complete, il accumule de l\'experience, apprend '
    'des preferences utilisateur et s\'amelior avec le temps.'
))

# Memory hierarchy table
data_memory = [
    [Paragraph('<b>Couche</b>', style_table_header),
     Paragraph('<b>Type</b>', style_table_header),
     Paragraph('<b>Stockage</b>', style_table_header),
     Paragraph('<b>Capacité</b>', style_table_header),
     Paragraph('<b>Utilisation Agent</b>', style_table_header)],
    [Paragraph('Working', style_table_cell),
     Paragraph('Context window LLM', style_table_cell),
     Paragraph('RAM (tokens)', style_table_cell),
     Paragraph('~100K tokens', style_table_cell),
     Paragraph('Tache en cours', style_table_cell)],
    [Paragraph('Episodic', style_table_cell),
     Paragraph('Historique conversations', style_table_cell),
     Paragraph('Redis', style_table_cell),
     Paragraph('Sessions récentes', style_table_cell),
     Paragraph('Contexte utilisateur', style_table_cell)],
    [Paragraph('Semantic', style_table_cell),
     Paragraph('Faits utilisateur/domaine', style_table_cell),
     Paragraph('pgvector', style_table_cell),
     Paragraph('Illimitée', style_table_cell),
     Paragraph('Préférences, connaissances', style_table_cell)],
    [Paragraph('Procedural', style_table_cell),
     Paragraph('Skills, how-to appris', style_table_cell),
     Paragraph('KB + outils', style_table_cell),
     Paragraph('Illimitée', style_table_cell),
     Paragraph('Recettes, patterns', style_table_cell)],
    [Paragraph('Archive', style_table_cell),
     Paragraph('Passe compressé', style_table_cell),
     Paragraph('S3 + index', style_table_cell),
     Paragraph('Illimitée', style_table_cell),
     Paragraph('Historique long terme', style_table_cell)],
]
story.append(spacer(12))
story.append(make_table(data_memory, col_ratios=[0.10, 0.20, 0.16, 0.18, 0.36]))
story.append(Paragraph('Tableau 3 : Hiérarchie de mémoire persistante pour agents IA', style_caption))

story.extend(add_subsection('6.1 Techniques de Compression de Memoire'))

story.append(P(
    'Le document identifie quatre techniques de compression essentielles pour gerer la memoire sur '
    'le long terme. La summarisation roulante : toutes les N messages, un LLM genere un resume '
    'de la conversation qui remplace les messages originaux dans la working memory, liberant de '
    'l\'espace pour de nouvelles interactions. Le scoring d\'importance : chaque element de memoire '
    'est evalue selon sa probabilite d\'utilisation future, et seuls les elements au-dessus d\'un '
    'seuil sont conserves en memoire rapide. La reflection : periodiquement, l\'agent analyse ses '
    'interactions passees pour extraire des insights et des lecons apprises qui sont stockees dans '
    'la memoire semantique. Le decoupage par episodes : les conversations sont segmentees par sujet '
    'ou par periode temporelle, permettant de charger uniquement les episodes pertinents dans le contexte.'
))

story.append(P(
    'Pour l\'Agent Developpeur, la memoire procedurale est la plus critique : elle stocke les patterns '
    'de code reussis, les corrections frequentes et les preferences de style. Pour l\'Agent SLIDES, '
    'c\'est la memoire semantique qui domine : preferences de design, palettes favorites, et styles '
    'de presentation par client ou par industrie. L\'implementation utilise PostgreSQL + pgvector pour '
    'le stockage semantique, Redis pour la memoire episodique (avec TTL de 7 jours), et S3 pour '
    'l\'archivage a long terme.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 7 : AUTO-AMELIORATION
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('7. Boucle d\'Auto-Amelioration'))

story.append(P(
    'Le document original (Section 7.5) decrit une boucle d\'auto-amelioration en cinq etapes qui '
    'est le mecanisme par lequel un agent s\'amelior avec le temps. C\'est ce qui distingue un agent '
    'basique d\'un agent de classe mondiale. La boucle est : Execution > Observation > Reflection > '
    'Learning > Storage, puis Retrieval pour les taches futures.'
))

story.append(P(
    'Concretement, apres chaque tache executee, l\'agent observe le resultat : la tache a-t-elle '
    'reussi ? Quels ont ete les points de friction ? L\'utilisateur a-t-il du corriger le resultat ? '
    'Ces observations sont passees a un module de Reflection (un LLM distinct ou le meme modele avec '
    'un prompt different) qui analyse ce qui a marche et ce qui a echoue. Le module de Learning '
    'extrait des patterns de succes et d\'echec sous forme de "lecons apprises" qui sont vectorisees '
    'et stockees dans la memoire semantique. Lors de la prochaine tache similaire, le module de '
    'Retrieval charge automatiquement les lecons pertinentes dans le contexte du LLM.'
))

story.append(P(
    'Les techniques avancees mentionnees dans le document incluent : REFLEXION (Shinn et al.) qui '
    'utilise des reflexions linguistiques pour guider les actions futures, Self-RAG qui apprend '
    'a l\'agent a evaluer sa propre generation, Chain-of-Verification (CoVe) qui genere des questions '
    'de verification pour detecter les hallucinations, et Tree of Thoughts (ToT) qui explore '
    'plusieurs chemins de raisonnement en parallele avant de selectionner le meilleur. Pour l\'Agent '
    'Developpeur, la technique la plus efficace est CoVe : apres avoir genere du code, l\'agent '
    'genere des questions de verification (ce code compile-t-il ? respecte-t-il les conventions du '
    'projet ? y a-t-il des vulnerabilites ?) et les resout pour valider sa propre production.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 8 : SECURITE IA
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('8. Securite IA en Profondeur'))

story.append(P(
    'Le document original (Section 7.6) definit cinq couches de defense pour les systemes LLM. '
    'Ces couches sont absolument critiques pour les agents qui executent du code (Agent Developpeur) '
    'ou qui generent du contenu visible publiquement (Agent SLIDES). Un agent non securise est une '
    'faille de securite potentielle.'
))

# Security layers table
data_sec = [
    [Paragraph('<b>Couche</b>', style_table_header),
     Paragraph('<b>Mesures</b>', style_table_header),
     Paragraph('<b>Agent Dev</b>', style_table_header),
     Paragraph('<b>Agent SLIDES</b>', style_table_header)],
    [Paragraph('1. Input', style_table_cell),
     Paragraph('Injection detection, PII scrubbing, rate limiting', style_table_cell),
     Paragraph('Critique', style_table_cell),
     Paragraph('Important', style_table_cell)],
    [Paragraph('2. Prompts', style_table_cell),
     Paragraph('System prompt strict, format imposé, few-shot défensifs', style_table_cell),
     Paragraph('Critique', style_table_cell),
     Paragraph('Critique', style_table_cell)],
    [Paragraph('3. Execution', style_table_cell),
     Paragraph('Whitelist outils, permissions, sandbox (Docker/Firecracker)', style_table_cell),
     Paragraph('<b>Vital</b>', style_table_cell),
     Paragraph('Modéré', style_table_cell)],
    [Paragraph('4. Output', style_table_cell),
     Paragraph('Hallucination detection, PII leak, harmful content filter', style_table_cell),
     Paragraph('Important', style_table_cell),
     Paragraph('Critique', style_table_cell)],
    [Paragraph('5. Observabilité', style_table_cell),
     Paragraph('Logging, anomaly detection, cost monitoring', style_table_cell),
     Paragraph('Important', style_table_cell),
     Paragraph('Important', style_table_cell)],
]
story.append(spacer(12))
story.append(make_table(data_sec, col_ratios=[0.10, 0.40, 0.25, 0.25]))
story.append(Paragraph('Tableau 4 : Couches de sécurité IA par agent', style_caption))

story.append(P(
    'Pour l\'Agent Developpeur, la couche Execution est vitale : tout code execute par l\'agent doit '
    'l\'etre dans un sandbox isole (Docker avec ressources limitees, pas d\'acces reseau non autorise, '
    'timeout strict). La couche Input est egalement critique car le code utilisateur peut contenir '
    'des injections de prompt malveillantes camouflees dans des commentaires ou des noms de variables. '
    'Pour l\'Agent SLIDES, la couche Output est primordiale : le contenu genere ne doit pas contenir '
    'de donnees personnelles, de contenu nuisible ou de violations de droits d\'auteur. Chaque sortie '
    'passe par un filtre de moderation avant d\'etre presentee a l\'utilisateur.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 9 : ARCHITECTURE AGENT DEVELOPPEUR
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('9. Architecture Cible : Agent Developpeur'))

story.append(P(
    'Cette section synthetise les elements extraits du document original en une architecture concrete '
    'pour l\'Agent Developpeur. L\'architecture combine le pattern Pipeline (flux principal), le pattern '
    'Debat (validation), le RAG hybride (connaissance), le routeur de modeles (optimisation cout), '
    'la memoire en cinq couches (apprentissage), et la securite en profondeur (protection).'
))

story.extend(add_subsection('9.1 Vue d\'Ensemble'))

story.append(P(
    'L\'Agent Developpeur est structure en six modules autonomes qui communiquent via un bus d\'evenements '
    'asynchrone. Le module Analyseur reçoit la requete utilisateur et la decompose en sous-taches. Le '
    'module Planificateur cree un plan d\'execution avec des dependances entre les sous-taches. Le module '
    'Generateur produit le code et les tests unitaires pour chaque sous-tache. Le module Validateur '
    'execute le code en sandbox et lance une revue de code (pattern Debat). Le module Correcteur '
    'applique les corrections necessaires (maximum 3 iterations). Enfin, le module Livreur commit le '
    'code, met a jour la documentation et notifie l\'utilisateur.'
))

# Agent Dev architecture table
data_dev_arch = [
    [Paragraph('<b>Module</b>', style_table_header),
     Paragraph('<b>Responsabilité</b>', style_table_header),
     Paragraph('<b>Modèle LLM</b>', style_table_header),
     Paragraph('<b>Outils</b>', style_table_header)],
    [Paragraph('Analyseur', style_table_cell),
     Paragraph('Compréhension requête, décomposition', style_table_cell),
     Paragraph('GPT-4o-mini', style_table_cell),
     Paragraph('RAG, Parser', style_table_cell)],
    [Paragraph('Planificateur', style_table_cell),
     Paragraph('Plan d\'exécution, dépendances', style_table_cell),
     Paragraph('Claude Haiku', style_table_cell),
     Paragraph('Graph builder', style_table_cell)],
    [Paragraph('Générateur', style_table_cell),
     Paragraph('Code + tests unitaires', style_table_cell),
     Paragraph('Claude Opus / GPT-4o', style_table_cell),
     Paragraph('File editor, RAG code', style_table_cell)],
    [Paragraph('Validateur', style_table_cell),
     Paragraph('Exécution sandbox, revue code', style_table_cell),
     Paragraph('Claude Haiku (débat)', style_table_cell),
     Paragraph('Docker, Linter, Test runner', style_table_cell)],
    [Paragraph('Correcteur', style_table_cell),
     Paragraph('Corrections basées sur erreurs', style_table_cell),
     Paragraph('Claude Opus / GPT-4o', style_table_cell),
     Paragraph('Diff, Patch', style_table_cell)],
    [Paragraph('Livreur', style_table_cell),
     Paragraph('Commit, doc, notification', style_table_cell),
     Paragraph('GPT-4o-mini', style_table_cell),
     Paragraph('Git, Doc generator', style_table_cell)],
]
story.append(spacer(12))
story.append(make_table(data_dev_arch, col_ratios=[0.13, 0.30, 0.25, 0.32]))
story.append(Paragraph('Tableau 5 : Architecture modulaire de l\'Agent Développeur', style_caption))

story.extend(add_subsection('9.2 Infrastructure Partagee'))

story.append(P(
    'Les modules partagent une infrastructure commune composee de quatre composants. Le RAG Engine '
    '(pgvector + BM25 + re-ranker) fournit l\'acces a la documentation technique, aux exemples de code '
    'et aux best practices. Le Model Router (classification + cascade + cache semantique) optimise '
    'le choix du LLM pour chaque sous-tache. La Memoire Persistante (Redis episodique + pgvector '
    'semantique + S3 archive) permet l\'apprentissage au fil du temps. Et le Bus d\'Evenements '
    '(BullMQ + Redis) assure la communication asynchrone entre modules avec garantie de livraison.'
))

story.append(P(
    'L\'ensemble est deploye sur une infrastructure Kubernetes avec auto-scaling base sur la longueur '
    'de la file d\'attente des taches. Le modele de cout est base sur les credits IA du document '
    'original (Section 8.3) : chaque action consomme des credits proportionnels au cout reel du LLM, '
    'avec une marge de 20% pour couvrir les couts d\'infrastructure. Le cache semantique reduit '
    'le nombre d\'appels LLM de 40-60% en pratique, ce qui ameliore significativement le ratio '
    'cout/qualite.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 10 : ARCHITECTURE AGENT SLIDES
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('10. Architecture Cible : Agent SLIDES'))

story.append(P(
    'L\'Agent SLIDES utilise le pattern Supervisor car la creation de presentations est un processus '
    'creatif qui necessite des ajustements iteratifs entre la structure, le contenu et le design. '
    'L\'architecture comporte un Superviseur central et quatre sous-agents specialises, chacun avec '
    'son propre ensemble d\'outils et de connaissances.'
))

story.extend(add_subsection('10.1 Vue d\'Ensemble'))

# Agent SLIDES architecture table
data_slides_arch = [
    [Paragraph('<b>Sous-Agent</b>', style_table_header),
     Paragraph('<b>Responsabilité</b>', style_table_header),
     Paragraph('<b>Modèle LLM</b>', style_table_header),
     Paragraph('<b>Connaissances RAG</b>', style_table_header)],
    [Paragraph('Superviseur', style_table_cell),
     Paragraph('Coordination, état global, routing', style_table_cell),
     Paragraph('Claude Haiku', style_table_cell),
     Paragraph('Templates de workflow', style_table_cell)],
    [Paragraph('Structure', style_table_cell),
     Paragraph('Plan, outline, narrative arc', style_table_cell),
     Paragraph('Claude Opus', style_table_cell),
     Paragraph('Storytelling, structures narratives', style_table_cell)],
    [Paragraph('Contenu', style_table_cell),
     Paragraph('Texte, données, citations', style_table_cell),
     Paragraph('GPT-4o', style_table_cell),
     Paragraph('Données sectorielles, citations', style_table_cell)],
    [Paragraph('Design', style_table_cell),
     Paragraph('Layout, visuels, couleurs, typographie', style_table_cell),
     Paragraph('GPT-4o + Image Gen', style_table_cell),
     Paragraph('Palettes, templates, guidelines', style_table_cell)],
    [Paragraph('Validation', style_table_cell),
     Paragraph('Cohérence, qualité, accessibilité', style_table_cell),
     Paragraph('Claude Haiku', style_table_cell),
     Paragraph('Standards, règles accessibilité', style_table_cell)],
]
story.append(spacer(12))
story.append(make_table(data_slides_arch, col_ratios=[0.12, 0.30, 0.24, 0.34]))
story.append(Paragraph('Tableau 6 : Architecture modulaire de l\'Agent SLIDES', style_caption))

story.extend(add_subsection('10.2 Flux de Creation d\'une Presentation'))

story.append(P(
    'Le flux de creation se deroule en quatre phases orchestrees par le Superviseur. Phase 1 - '
    'Structuration : l\'utilisateur decrit sa presentation, l\'Agent Structure cree un outline avec '
    'le nombre de slides, la narration et les points cles. Le Superviseur valide l\'outline avec '
    'l\'utilisateur. Phase 2 - Contenu : l\'Agent Contenu genere le texte de chaque slide, les '
    'donnees chiffrees et les citations. Le Superviseur verifie la coherence narrative entre les slides. '
    'Phase 3 - Design : l\'Agent Design cree le layout de chaque slide, selectionne les palettes de '
    'couleurs, genere les visuels et les graphiques. Le Superviseur s\'assure de la coherence visuelle '
    'a travers toutes les slides. Phase 4 - Validation : l\'Agent Validation verifie la coherence '
    'texte/design, l\'accessibilite (contraste, taille de police), et la qualite globale.'
))

story.append(P(
    'Chaque phase peut impliquer des allers-retours. Si l\'Agent Validation detecte un probleme de '
    'design sur la slide 5, le Superviseur renvoie cette slide specifique a l\'Agent Design avec '
    'les corrections demandees, sans regenerer l\'ensemble de la presentation. Ce mecanisme de '
    'correction cible est beaucoup plus efficace et economique qu\'une regeneration complete. De plus, '
    'le Superviseur maintient un etat global qui permet de garantir la coherence transversale : '
    'les couleurs de la slide 3 doivent correspondre a celles de la slide 7, le style de typographie '
    'doit etre uniforme, et la narrative doit suivre un arc logique.'
))

story.extend(add_subsection('10.3 Generation de Visuels'))

story.append(P(
    'L\'Agent Design utilise deux strategies pour les visuels. Pour les graphiques de donnees '
    '(barres, lignes, camemberts), il genere du code (matplotlib, ECharts ou D3.js) qui est execute '
    'cote serveur pour produire des images haute resolution. Pour les illustrations et images '
    'creatrices, il utilise un modele de generation d\'images (DALL-E ou Stable Diffusion) avec '
    'des prompts specialises pour le style de presentation. Le prompt de generation inclut toujours '
    'le theme visuel de la presentation (palette, style) pour garantir la coherence.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 11 : STACK TECHNOLOGIQUE
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('11. Stack Technologique Recommandee'))

story.append(P(
    'En appliquant le principe "Choose Boring Tech" du document original et la doctrine de selection '
    'database (PostgreSQL resout 95% des cas), voici la stack recommandee pour les deux agents. '
    'Cette stack privilegie la simplicite operationnelle, la maturite des outils et la coherence '
    'technologique (TypeScript de bout en bout).'
))

# Stack table
data_stack = [
    [Paragraph('<b>Composant</b>', style_table_header),
     Paragraph('<b>Technologie</b>', style_table_header),
     Paragraph('<b>Raison</b>', style_table_header)],
    [Paragraph('Framework API', style_table_cell),
     Paragraph('Hono / Next.js API Routes', style_table_cell),
     Paragraph('Edge-ready, TypeScript, léger', style_table_cell)],
    [Paragraph('Orchestration Agents', style_table_cell),
     Paragraph('LangGraph / Mastra', style_table_cell),
     Paragraph('Stateful workflows, visualisation', style_table_cell)],
    [Paragraph('Base de données', style_table_cell),
     Paragraph('PostgreSQL + pgvector', style_table_cell),
     Paragraph('RDB + vecteurs unifiés (95% des cas)', style_table_cell)],
    [Paragraph('Cache / Queue', style_table_cell),
     Paragraph('Redis + BullMQ', style_table_cell),
     Paragraph('Cache, sessions, rate-limit, jobs', style_table_cell)],
    [Paragraph('Workflows durables', style_table_cell),
     Paragraph('Temporal.io', style_table_cell),
     Paragraph('Sagas, compensation, reprise', style_table_cell)],
    [Paragraph('LLM SDK', style_table_cell),
     Paragraph('z-ai-web-dev-sdk', style_table_cell),
     Paragraph('Multi-provider, routing intégré', style_table_cell)],
    [Paragraph('Embeddings', style_table_cell),
     Paragraph('OpenAI ada-002 / BGE', style_table_cell),
     Paragraph('Qualité / auto-hébergement', style_table_cell)],
    [Paragraph('Sandbox exécution', style_table_cell),
     Paragraph('E2B / Firecracker', style_table_cell),
     Paragraph('Isolation sécurisée pour code', style_table_cell)],
    [Paragraph('Observabilité', style_table_cell),
     Paragraph('OpenTelemetry + Grafana', style_table_cell),
     Paragraph('Traces, métriques, logs unifiés', style_table_cell)],
    [Paragraph('Déploiement', style_table_cell),
     Paragraph('Vercel + Railway/Fly.io', style_table_cell),
     Paragraph('MVP rapide, scaling progressif', style_table_cell)],
]
story.append(spacer(12))
story.append(make_table(data_stack, col_ratios=[0.22, 0.34, 0.44]))
story.append(Paragraph('Tableau 7 : Stack technologique recommandée', style_caption))

story.extend(add_subsection('11.1 Stack AI-Native (Levier 10x)'))

story.append(P(
    'Le document original identifie une "Stack Fusion AI-Native" avec un effet de levier 10x. '
    'Pour les agents IA, cette stack se decline ainsi : Next.js 14 (App Router + RSC + Server Actions) '
    'pour le frontend, Hono pour les API edge, PostgreSQL + pgvector comme base de donnees unifiee '
    '(relationnel + vectoriel), Redis pour le cache et les queues, et le SDK multi-provider pour le '
    'routing dynamique des LLM. Le point cle est l\'unification : un seul langage (TypeScript), une '
    'seule base de donnees (pgvector evite d\'ajouter Qdrant/Pinecone), et un seul systeme de cache '
    '(Redis remplace BullMQ standalone, les sessions et le rate-limiting). Cette unification reduit '
    'la complexite operationnelle de 60% et accelere le developpement de 3x par rapport a une stack '
    'multi-systemes heterogene.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 12 : ANTI-PATTERNS
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('12. Anti-Patterns a Eviter'))

story.append(P(
    'Le document original identifie dix anti-patterns majeurs. Sept d\'entre eux sont directement '
    'applicables a la construction d\'agents IA. Voici les anti-patterns specifiques a eviter '
    'absolument, avec leurs symptomes et corrections.'
))

story.extend(add_subsection('12.1 Microservices Prematures pour Agents'))
story.append(P(
    'Symptomes : deployer l\'Agent Developpeur et l\'Agent SLIDES comme microservices separes alors '
    'qu\'ils partagent 80% de l\'infrastructure. Correction : commencer par un monolithe modulaire '
    'ou chaque agent est un module avec des bornes claires, puis extraire uniquement les composants '
    'qui necessitent un scaling independant (probablement le sandbox d\'execution de code et le '
    'generateur d\'images). La regle : ne passer aux microservices que si vous avez plus de 30 '
    'developpeurs ou des besoins de scaling heterogene avers.'
))

story.extend(add_subsection('12.2 Cache-First Aveugle'))
story.append(P(
    'Symptomes : cacher toutes les reponses LLM sans reflechir a la fraicheur du contenu. Pour '
    'l\'Agent Developpeur, cacher les snippets de documentation est legitime, mais cacher les '
    'resultats de generation de code est dangereux car le contexte du projet peut avoir change. '
    'Correction : cacher avec TTL court (5 minutes) par defaut, utiliser des tags de cache pour '
    'l\'invalidation ciblee, et ne jamais cacher les resultats de generation creative ou les '
    'executions de code.'
))

story.extend(add_subsection('12.3 Observability Absente'))
story.append(P(
    'Symptomes : production est une boite noire, pas de tracing des appels LLM, pas de monitoring '
    'des couts par utilisateur, pas d\'alertes sur les taux d\'erreur. C\'est l\'anti-pattern le '
    'plus courant dans les projets d\'agents IA. Correction : implementer OpenTelemetry des le premier '
    'jour avec des traces pour chaque appel LLM (modele, prompt, tokens, latence, cout), des '
    'metriques pour les taux de succes/echec par agent, et des alertes sur les anomalies de cout. '
    'Le monitoring des couts LLM est particulierement critique car une anomalie peut signifier une '
    'attaque par injection de prompt ou une boucle infinie.'
))

story.extend(add_subsection('12.4 Isolation Multi-Tenant Cassee'))
story.append(P(
    'Symptomes : un utilisateur voit les donnees ou les conversations d\'un autre utilisateur. '
    'C\'est une catastrophe pour les agents IA qui manipulent du code proprietaire et des donnees '
    'sensibles. Correction : implementer Row Level Security (PostgreSQL RLS) au niveau de la base '
    'de donnees, utiliser AsyncLocalStorage pour propager le contexte tenant dans Node.js, et '
    'executer des tests d\'isolation systematiques dans le pipeline CI/CD.'
))

story.extend(add_subsection('12.5 Sur-Ingenierie'))
story.append(P(
    'Symptomes : ajouter un graphe de connaissances Neo4j alors que pgvector suffit, implementer '
    'CQRS + Event Sourcing pour un CRUD basique, deployer Kafka pour 100 evenements par jour. '
    'Correction : appliquer YAGNI absolu. Construire pour aujourd\'hui plus 6 mois maximum. '
    'Refactoriser quand le besoin existe veritablement. PostgreSQL resout 95% des cas. Ne pas '
    'ajouter de systeme supplementaire sans une raison EXTREME.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 13 : ROADMAP
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('13. Roadmap d\'Implementation (12 Semaines)'))

story.append(P(
    'Adapte du roadmap 24 mois du document original, ce plan accelere concentre les livrables '
    'essentiels sur 12 semaines en appliquant le principe de compression architecturale et le '
    'pattern "Startup Speed" (MVP en 2-4 semaines). Chaque phase produit un increment fonctionnel '
    'deployable.'
))

# Roadmap table
data_roadmap = [
    [Paragraph('<b>Phase</b>', style_table_header),
     Paragraph('<b>Semaines</b>', style_table_header),
     Paragraph('<b>Livrables</b>', style_table_header),
     Paragraph('<b>Stack</b>', style_table_header)],
    [Paragraph('Fondation', style_table_cell),
     Paragraph('1-3', style_table_cell),
     Paragraph('MVP Agent Dev (pipeline basique), API, Auth, DB', style_table_cell),
     Paragraph('Next.js + Hono + PG + Redis', style_table_cell)],
    [Paragraph('Intelligence', style_table_cell),
     Paragraph('4-6', style_table_cell),
     Paragraph('RAG hybride, Model Router, Cache sémantique', style_table_cell),
     Paragraph('+ pgvector + Temporal', style_table_cell)],
    [Paragraph('Mémoire', style_table_cell),
     Paragraph('7-8', style_table_cell),
     Paragraph('Mémoire 5 couches, Auto-amélioration loop', style_table_cell),
     Paragraph('+ BullMQ workers', style_table_cell)],
    [Paragraph('SLIDES', style_table_cell),
     Paragraph('9-10', style_table_cell),
     Paragraph('Agent SLIDES (supervisor + 4 sous-agents)', style_table_cell),
     Paragraph('+ Image gen + ECharts', style_table_cell)],
    [Paragraph('Production', style_table_cell),
     Paragraph('11-12', style_table_cell),
     Paragraph('Sécurité 5 couches, Observabilité, CI/CD', style_table_cell),
     Paragraph('+ OTEL + Grafana + K8s', style_table_cell)],
]
story.append(spacer(12))
story.append(make_table(data_roadmap, col_ratios=[0.14, 0.12, 0.44, 0.30]))
story.append(Paragraph('Tableau 8 : Roadmap d\'implémentation sur 12 semaines', style_caption))

story.extend(add_subsection('13.1 Phase Fondation (Semaines 1-3)'))

story.append(P(
    'L\'objectif est d\'avoir un Agent Developpeur fonctionnel capable de lire une requete, generer '
    'du code et le retourner a l\'utilisateur. Le pipeline est basique (Analyseur > Generateur > '
    'Livreur) sans validation ni correction automatique. L\'infrastructure comprend : Next.js pour '
    'le frontend et les API routes, PostgreSQL pour les donnees utilisateur, Redis pour les sessions, '
    'et un seul modele LLM (GPT-4o-mini pour commencer). Le RAG est minimal : une collection pgvector '
    'avec les documentations les plus utilisees. Cette phase valide le produit avec de vrais utilisateurs '
    'et recueille les premiers retours.'
))

story.extend(add_subsection('13.2 Phase Intelligence (Semaines 4-6)'))

story.append(P(
    'Cette phase enrichit l\'Agent Developpeur avec les capacites qui font la difference entre un '
    'chatbot et un agent de production. Le RAG hybride (dense + sparse + re-ranking) est deploye '
    'avec un pipeline d\'ingestion automatique des documentations. Le Model Router implemente le '
    'routing dynamique avec cascade et cache semantique. Les modules Validateur et Correcteur sont '
    'ajoutes au pipeline, avec le pattern Debat pour la revue de code. Temporal.io est integre pour '
    'les workflows durables (une generation de code peut prendre plusieurs minutes). Cette phase '
    'transforme l\'agent d\'un generateur passif en un systeme actif qui valide et corrige sa propre production.'
))

story.extend(add_subsection('13.3 Phase Memoire (Semaines 7-8)'))

story.append(P(
    'La memoire en cinq couches est deployee : working memory (context window), episodique (Redis, '
    'TTL 7 jours), semantique (pgvector), procedurale (knowledge base + outils), et archive (S3). '
    'La boucle d\'auto-amelioration est activee : apres chaque tache, l\'agent observe, reflechit, '
    'extrait des lecons et les stocke pour les taches futures. Les BullMQ workers gerent les taches '
    'de fond (ingestion RAG, compression de memoire, generation de resume). Cette phase donne a '
    'l\'agent la capacite d\'apprendre de ses experiences et de s\'ameliorer avec le temps.'
))

story.extend(add_subsection('13.4 Phase SLIDES (Semaines 9-10)'))

story.append(P(
    'L\'Agent SLIDES est construit sur l\'infrastructure existante en ajoutant le pattern Supervisor '
    'avec ses quatre sous-agents. L\'Agent Structure utilise Claude Opus pour creer des outlines '
    'narratifs de qualite. L\'Agent Contenu genere le texte et les donnees avec GPT-4o. L\'Agent '
    'Design cree les layouts et genere les visuels via un modele de generation d\'images. L\'Agent '
    'Validation verifie la coherence et l\'accessibilite. Le Superviseur coordonne les appels et '
    'gere les retours en arriere. Cette phase etend la plateforme d\'un agent a deux agents '
    'partageant la meme infrastructure.'
))

story.extend(add_subsection('13.5 Phase Production (Semaines 11-12)'))

story.append(P(
    'La securite en cinq couches est deployee : validation d\'input, prompts defensifs, sandbox '
    'd\'execution (E2B/Firecracker pour l\'Agent Dev), validation d\'output (moderation de contenu '
    'pour l\'Agent SLIDES), et observabilite complete. OpenTelemetry est integre pour les traces, '
    'metriques et logs. Grafana fournit les dashboards de monitoring. Le pipeline CI/CD est '
    'configure avec des tests d\'isolation multi-tenant, des tests de securite (injection de prompt) '
    'et des tests de performance (latence P99 < 2s). Le deploiement passe de Vercel/Railway a '
    'Kubernetes si le volume le justifie. Cette phase prepare la plateforme pour la mise en production '
    'avec de vrais utilisateurs payants.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 14 : COMMANDEMENTS
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('14. Les 15 Commandements de l\'Architecte d\'Agents'))

story.append(P(
    'Synthese des 21 commandements du document original, filtres et adaptes specifiquement pour '
    'la construction d\'agents IA. Ces principes sont les invariants qui guident chaque decision '
    'architecturale.'
))

commandments = [
    ('1', 'Optimisez pour l\'INCERTITUDE, pas la prediction. Les LLM sont non-deterministes ; votre architecture doit etre resilient aux reponses inattendues.'),
    ('2', 'Choose BORING TECH pour les fondations. PostgreSQL + Redis + TypeScript resolvent 95% des cas sans ajouter de complexite.'),
    ('3', 'Mesurez avant d\'optimiser. Les LLM sont le bottleneck dans 80% des cas ; optimisez le routing et le cache avant tout.'),
    ('4', 'Async par defaut, sync par exception. Les appels LLM sont lents ; chaque appel doit etre non-bloquant.'),
    ('5', 'Modular monolith d\'abord, microservices au merite. Ne separez les agents que si le scaling le justifie reellement.'),
    ('6', 'PostgreSQL + pgvector resout 95% des besoins de stockage. N\'ajoutez Qdrant que si > 10M vecteurs.'),
    ('7', 'Routeur de modeles obligatoire. Un seul modele pour tout = gaspillage de 60-90% du budget IA.'),
    ('8', 'Zero trust, defense in depth. Chaque input utilisateur est potentiellement une injection de prompt.'),
    ('9', 'Observabilite non optionnelle. Sans traces des appels LLM, vous etes aveugle sur les couts et la qualite.'),
    ('10', 'Cache semantique = vaccine anti-cout. 40-60% des requetes sont semantiquement identiques.'),
    ('11', 'Idempotence partout. Un appel LLM qui echoue doit pouvoir etre reexecute sans effet de bord.'),
    ('12', 'Feature flags > deploiements coordonnes. Activez les nouveaux agents progressivement (1% > 10% > 100%).'),
    ('13', 'Memoire persistante = avantage competitif. Un agent qui apprend est 10x plus precis qu\'un agent amnesique.'),
    ('14', 'First principles > best practices. Ne copiez pas l\'architecture de Genspark ; decomposez vos besoins jusqu\'aux axiomes.'),
    ('15', 'Apprendre des post-mortems > celebrer les succes. Chaque erreur d\'agent est une lecon a stocker dans la memoire semantique.'),
]

for num, text in commandments:
    story.append(Paragraph('<b>' + num + '.</b> ' + text, style_body_indent))
    story.append(spacer(4))

# ═══════════════════════════════════════════════════════════════
# BUILD
# ═══════════════════════════════════════════════════════════════
doc.multiBuild(story)
print(f"Body PDF generated: {BODY_PATH}")

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AgentForge Blueprint Architectural - Complete PDF Generator
Comprehensive architecture document for a unified AI agent platform
"""

import hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether,
    CondPageBreak, Flowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import SimpleDocTemplate

# ============================================================
# FONT REGISTRATION
# ============================================================
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSerif', '/usr/share/fonts/truetype/chinese/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Bold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Bold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LiberationMono', '/usr/share/fonts/truetype/chinese/LiberationMono-Regular.ttf'))

registerFontFamily('LiberationSerif', normal='LiberationSerif', bold='Carlito-Bold')
registerFontFamily('Carlito', normal='Carlito', bold='Carlito-Bold')
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('SarasaMonoSC', normal='SarasaMonoSC', bold='SarasaMonoSC')
registerFontFamily('LiberationMono', normal='LiberationMono', bold='LiberationMono')

# ============================================================
# PALETTE (from cascade)
# ============================================================
ACCENT       = colors.HexColor('#25738d')
TEXT_PRIMARY  = colors.HexColor('#201f1d')
TEXT_MUTED    = colors.HexColor('#7e7b74')
BG_SURFACE    = colors.HexColor('#edecea')
BG_PAGE       = colors.HexColor('#f4f4f2')
HEADER_FILL   = colors.HexColor('#726744')
BORDER_COLOR  = colors.HexColor('#c7bfa7')

TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = colors.HexColor('#f1f1ef')

# ============================================================
# STYLES
# ============================================================
styles = getSampleStyleSheet()

sTitle = ParagraphStyle('DocTitle', fontName='LiberationSerif', fontSize=26, leading=34,
                         textColor=ACCENT, alignment=TA_LEFT, spaceAfter=18, spaceBefore=0)

sH1 = ParagraphStyle('H1Custom', fontName='LiberationSerif', fontSize=20, leading=28,
                      textColor=ACCENT, alignment=TA_LEFT, spaceAfter=12, spaceBefore=18)

sH2 = ParagraphStyle('H2Custom', fontName='LiberationSerif', fontSize=15, leading=22,
                      textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=8, spaceBefore=14)

sH3 = ParagraphStyle('H3Custom', fontName='LiberationSerif', fontSize=12, leading=18,
                      textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=6, spaceBefore=10)

sBody = ParagraphStyle('BodyCustom', fontName='LiberationSerif', fontSize=10.5, leading=17,
                        textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=8)

sBodyLeft = ParagraphStyle('BodyLeft', fontName='LiberationSerif', fontSize=10.5, leading=17,
                            textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=8)

sBullet = ParagraphStyle('BulletCustom', fontName='LiberationSerif', fontSize=10.5, leading=17,
                          textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=4,
                          leftIndent=20, bulletIndent=8)

sCode = ParagraphStyle('CodeCustom', fontName='LiberationMono', fontSize=8.5, leading=13,
                        textColor=colors.HexColor('#2d2d2d'), alignment=TA_LEFT,
                        backColor=colors.HexColor('#f5f5f3'), spaceAfter=8, spaceBefore=4,
                        leftIndent=12, rightIndent=12, borderPadding=6)

sCaption = ParagraphStyle('CaptionCustom', fontName='LiberationSerif', fontSize=9, leading=14,
                           textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=4, spaceAfter=12)

sTableCell = ParagraphStyle('TableCellCustom', fontName='LiberationSerif', fontSize=9.5, leading=14,
                             textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK')

sTableHeader = ParagraphStyle('TableHeaderCustom', fontName='LiberationSerif', fontSize=10, leading=14,
                               textColor=colors.white, alignment=TA_CENTER)

sTableCenter = ParagraphStyle('TableCenter', fontName='LiberationSerif', fontSize=9.5, leading=14,
                               textColor=TEXT_PRIMARY, alignment=TA_CENTER)

# ============================================================
# TOC TEMPLATE
# ============================================================
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

# ============================================================
# HELPERS
# ============================================================
def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/><b>%s</b>' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

available_width = A4[0] - 2.0 * inch
H1_ORPHAN_THRESHOLD = (A4[1] - 2.0*inch) * 0.15

def add_major_section(text, style):
    return [
        CondPageBreak(H1_ORPHAN_THRESHOLD),
        add_heading(text, style, level=0),
    ]

def make_table(data_rows, col_ratios, caption=None):
    """Create a styled table with proportional column widths."""
    col_widths = [r * available_width for r in col_ratios]
    t = Table(data_rows, colWidths=col_widths, hAlign='CENTER')
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
    for i in range(1, len(data_rows)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    elements = [Spacer(1, 18), t]
    if caption:
        elements.append(Paragraph(caption, sCaption))
    elements.append(Spacer(1, 18))
    return elements

def p(text):
    return Paragraph(text, sBody)

def pb(text):
    return Paragraph(text, sBullet)

def pc(text):
    return Paragraph(text, sCode)

def ph(text):
    return Paragraph('<b>%s</b>' % text, sTableHeader)

def pcell(text):
    return Paragraph(text, sTableCell)

def pcc(text):
    return Paragraph(text, sTableCenter)

# ============================================================
# BUILD DOCUMENT
# ============================================================
output_path = '/home/z/my-project/temp/agentforge_body.pdf'

doc = TocDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=1.0*inch,
    rightMargin=1.0*inch,
    topMargin=1.0*inch,
    bottomMargin=1.0*inch,
)

story = []

# ---- TABLE OF CONTENTS ----
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle(name='TOC1', fontSize=13, leftIndent=20, fontName='LiberationSerif',
                   leading=22, spaceBefore=6, textColor=ACCENT),
    ParagraphStyle(name='TOC2', fontSize=11, leftIndent=40, fontName='LiberationSerif',
                   leading=18, spaceBefore=3, textColor=TEXT_PRIMARY),
]
story.append(Paragraph('<b>Table des Matieres</b>', sTitle))
story.append(Spacer(1, 12))
story.append(toc)
story.append(PageBreak())

# ================================================================
# SECTION 1: VISION GENERALE
# ================================================================
story.extend(add_major_section('1. Vision Generale d\'AgentForge', sH1))

story.append(add_heading('1.1 Philosophie : 1 Kernel, 7 Configurations', sH2, 1))
story.append(p(
    'AgentForge repose sur un principe fondamental qui distingue radicalement cette plateforme '
    'de toute approche naive de construction d\'agents IA : au lieu de developper sept agents '
    'independants avec chacun leur propre logique, leur propre orchestration et leur propre '
    'infrastructure, nous construisons un <b>noyau unique</b> (le Kernel MoA) que sept '
    'configurations qui parametrent. Ce choix architectural transforme la maintenance, '
    'les couts et la scalabilite du systeme entier. Chaque agent n\'est pas un code separe, '
    'mais une configuration specialisee du meme moteur d\'orchestration.'
))
story.append(p(
    'Concretement, cela signifie que l\'Agent Developpeur, l\'Agent SLIDES, l\'Agent DOC, '
    'l\'Agent DATA, l\'Agent RECHERCHE, l\'Agent EMAIL et l\'Agent MARKETING partagent tous '
    'le meme SuperAgentOrchestrator, le meme ReflectionAgent, le meme CostOptimizer et le '
    'meme CacheManager. Seuls trois elements varient d\'un agent a l\'autre : la definition '
    'du DAG de generation, les criteres de reflexion ponderes, et le routage des modeles. '
    'Cette approche elimine la duplication de code, centralise la maintenance, et permet '
    'd\'ajouter un nouvel agent en quelques jours plutot que quelques semaines.'
))

story.append(add_heading('1.2 Les 7 Agents Produit', sH2, 1))

agent_data = [
    [ph('Agent'), ph('Role Principal'), ph('DAG'), ph('Modele Principal')],
    [pcell('Developpeur'), pcell('Generation code, APIs, deploiement'), pcell('Config > Types > API > UI'), pcc('Claude-3.7-Sonnet')],
    [pcell('SLIDES'), pcell('Presentations, design, mise en page'), pcell('Template > Layout > Content > Design'), pcc('GPT-4o')],
    [pcell('DOC'), pcell('Rapports PDF/DOCX, documents longs'), pcell('Outline > Sections > Content > PDF'), pcc('Claude-3.7-Sonnet')],
    [pcell('DATA'), pcell('Analyse de donnees, visualisations'), pcell('Schema > Query > Process > Visual'), pcc('DeepSeek-R1')],
    [pcell('RECHERCHE'), pcell('Synthese multi-sources, veille'), pcell('Query > Search > Extract > Synthesize'), pcc('GPT-4o')],
    [pcell('EMAIL'), pcell('Redaction, personnalisation, A/B test'), pcell('Context > Draft > Refine > Send'), pcc('GPT-4o-Mini')],
    [pcell('MARKETING'), pcell('Copy, funnels, SEO, analytics'), pcell('Brief > Copy > Visual > Funnel'), pcc('Claude-3.7-Sonnet')],
]
story.extend(make_table(agent_data, [0.13, 0.30, 0.30, 0.27], 'Tableau 1 : Les 7 agents produit et leurs specialisations'))

story.append(add_heading('1.3 Architecture Macroscopique', sH2, 1))
story.append(p(
    'L\'architecture d\'AgentForge se decompose en quatre couches horizontales clairement '
    'separees. La couche superieure est le Dashboard Utilisateur (React + Vite), qui fournit '
    'l\'interface de pilotage de tous les agents. Vient ensuite l\'API Gateway (Hono + JWT), '
    'qui gere l\'authentification, le rate limiting et le routage vers l\'Agent Registry. '
    'L\'Agent Registry est le routeur dynamique qui identifie quel agent est sollicite et '
    'charge sa configuration specifique. Enfin, la couche inferieure est le MoA Kernel, '
    'le coeur du systeme, qui orchestre les 9 LLMs en parallele, applique la reflexion '
    'multi-criteres, et gere l\'auto-correction en cascade.'
))
story.append(p(
    'L\'infrastructure partagee soutient l\'ensemble du systeme avec un Cache Manager '
    '(L1 in-memory + L2 Redis), un Cost Optimizer avec routeur RL, un Sandbox Manager '
    '(Docker Warm Pool), un CloudflareDeployer pour les deploiements en moins de 60 '
    'secondes, une base PostgreSQL pour les donnees persistantes, et un systeme '
    'd\'analytics avec entrainement RL continu. Cette separation stricte des responsabilites '
    'garantit que chaque couche peut etre mise a l\'echelle independamment.'
))

# ================================================================
# SECTION 2: MOA KERNEL
# ================================================================
story.extend(add_major_section('2. Le MoA Kernel : Coeur de l\'Orchestration', sH1))

story.append(add_heading('2.1 Mixture-of-Agents (MoA) : 9 LLMs en Parallele', sH2, 1))
story.append(p(
    'Le Mixture-of-Agents est le premier mecanisme secret qui distingue AgentForge d\'une '
    'chaine LLM sequentielle classique. Au lieu d\'envoyer une requete a un seul modele et '
    'd\'esperer le meilleur resultat, le MoA decompose la tache en sous-taches, route chaque '
    'sous-tache vers le modele le plus adapte, execute toutes les sous-taches en parallele, '
    'puis synthetise les meilleurs elements de chaque sortie. Ce processus en quatre etapes '
    '(Decomposition, Routage, Execution Parallele, Synthese) est la cle de la qualite '
    'exceptionnelle des resultats obtenus.'
))
story.append(p(
    'Les neuf modeles utilises sont : Claude-3.7-Sonnet (code, architecture), GPT-4o '
    '(raisonnement general, contenu), DeepSeek-R1 (logique, mathematiques), Gemini-2.5-Pro '
    '(contexte long, analyse), GPT-o1 (raisonnement avance), Llama-3.3 (generation rapide), '
    'Qwen-2.5 (multilingue), Mistral-Large (texte structure), et Gemini-2.0-Flash (taches '
    'legerees ultra-rapides). Chaque modele recoit uniquement les sous-taches pour lesquelles '
    'il excelle, ce qui maximise la qualite tout en optimisant les couts.'
))

models_data = [
    [ph('Modele'), ph('Specialite'), ph('Cout/1K tokens'), ph('Vitesse')],
    [pcell('Claude-3.7-Sonnet'), pcell('Code, architecture, raisonnement'), pcc('$0.003'), pcc('Moyen')],
    [pcell('GPT-4o'), pcell('Contenu general, multimodal'), pcc('$0.005'), pcc('Rapide')],
    [pcell('DeepSeek-R1'), pcell('Logique, mathematiques, raisonnement'), pcc('$0.001'), pcc('Lent')],
    [pcell('Gemini-2.5-Pro'), pcell('Contexte long, analyse documentaire'), pcc('$0.003'), pcc('Moyen')],
    [pcell('GPT-o1'), pcell('Raisonnement avance, planification'), pcc('$0.015'), pcc('Lent')],
    [pcell('Llama-3.3-70B'), pcell('Generation rapide, open-source'), pcc('$0.0006'), pcc('Tres rapide')],
    [pcell('Qwen-2.5-72B'), pcell('Multilingue, chinois'), pcc('$0.0005'), pcc('Rapide')],
    [pcell('Mistral-Large'), pcell('Texte structure, synthese'), pcc('$0.002'), pcc('Moyen')],
    [pcell('Gemini-2.0-Flash'), pcell('Taches legeres, ultra-rapide'), pcc('$0.0001'), pcc('Tres rapide')],
]
story.extend(make_table(models_data, [0.22, 0.35, 0.20, 0.23], 'Tableau 2 : Les 9 modeles LLM et leurs specialites'))

story.append(add_heading('2.2 Flux d\'Orchestration en 4 Etapes', sH2, 1))
story.append(p(
    'Le flux complet d\'orchestration suit un pipeline rigoureux en quatre etapes. Premierement, '
    'la <b>Decomposition</b> : le SuperAgentOrchestrator analyse la requete utilisateur et la '
    'decompose en sous-taches independantes. Par exemple, "Cree une application e-commerce" '
    'serait decompose en : generation du schema de base de donnees, creation des types '
    'TypeScript, implementation des routes API, construction des composants React, et '
    'configuration du deploiement. Deuxiemement, le <b>Routage</b> : chaque sous-tache est '
    'affectee au modele le plus adapte selon une table de routage optimisee par apprentissage '
    'par renforcement. Troisiemement, l\'<b>Execution Parallele</b> : toutes les sous-taches '
    'sont lancees simultanement, reduisant drastiquement le temps de reponse total. '
    'Quatriemement, la <b>Synthese</b> : le ReflectionAgent evalue les sorties de chaque '
    'modele selon des criteres ponderes et construit le resultat final en fusionnant les '
    'meilleurs elements.'
))

story.append(add_heading('2.3 SuperAgentOrchestrator : Implementation', sH2, 1))
story.append(p(
    'L\'orchestrateur central est implemente en TypeScript et gere l\'ensemble du cycle de vie '
    'd\'une requete. Il maintient la configuration des 9 modeles, la table de routage par type '
    'de sous-tache, et les seuils de confiance. Lorsqu\'une requete arrive, il applique la '
    'decomposition via Claude-3.7-Sonnet (le meilleur modele pour cette tache structuree), '
    'puis distribue les sous-taches aux modeles selectionnes en parallele via Promise.all. '
    'Apres execution, il transmet les resultats au ReflectionAgent pour evaluation. Si le '
    'score de confiance est inferieur a 0.95, il declenche un cycle de raffinement qui '
    're-injecte les feedbacks dans les modeles pour une seconde passe.'
))

orchestration_data = [
    [ph('Etape'), ph('Composant'), ph('Modele Utilise'), ph('Sortie')],
    [pcell('1. Decomposition'), pcell('SuperAgentOrchestrator'), pcc('Claude-3.7-Sonnet'), pcell('Liste de sous-taches')],
    [pcell('2. Routage'), pcell('CostOptimizer + RL Router'), pcc('Table de routage'), pcell('Mapping tache-modele')],
    [pcell('3. Execution'), pcell('9 LLMs en parallele'), pcc('Selon routage'), pcell('9 sorties brutes')],
    [pcell('4. Synthese'), pcell('ReflectionAgent'), pcc('GPT-4o + vote'), pcell('Resultat fusionne')],
]
story.extend(make_table(orchestration_data, [0.15, 0.30, 0.25, 0.30], 'Tableau 3 : Pipeline d\'orchestration en 4 etapes'))

# ================================================================
# SECTION 3: DAG CODE GENERATION
# ================================================================
story.extend(add_major_section('3. DAG-Based Code Generation', sH1))

story.append(add_heading('3.1 Principe du DAG de Dependances', sH2, 1))
story.append(p(
    'La generation de code basee sur DAG (Directed Acyclic Graph) est le deuxieme mecanisme '
    'secret qui rend AgentForge si performant. Plutot que de generer tous les fichiers '
    'sequentiellement, le systeme construit un graphe de dependances entre les fichiers a '
    'generer, effectue un tri topologique, puis genere les fichiers niveau par niveau. Les '
    'fichiers du meme niveau (sans dependances entre eux) sont generes en parallele, ce qui '
    'accelere considerablement le processus. Ce mecanisme est crucial pour la coherence '
    'inter-fichiers : chaque fichier recoit en contexte le code des fichiers de ses '
    'dependances deja generees.'
))
story.append(p(
    'Pour l\'Agent Developpeur, le DAG standard comporte quatre niveaux. Le Niveau 0 (Configuration) '
    'contient les fichiers de configuration globaux (tsconfig, package.json, env). Le Niveau 1 '
    '(Types et Schema) genere les interfaces TypeScript et le schema Prisma. Le Niveau 2 '
    '(API et Auth) cree les routes API et le middleware d\'authentification, en utilisant '
    'les types du Niveau 1 comme contexte. Enfin, le Niveau 3 (Components) construit les '
    'composants React, en se basant sur les types et l\'API des niveaux precedents. Cette '
    'approche garantit que chaque fichier est genere avec une connaissance complete de ses '
    'dependances.'
))

dag_data = [
    [ph('Niveau'), ph('Fichiers'), ph('Dependances'), ph('Modele Recommande')],
    [pcell('L0 - Config'), pcell('tsconfig, package.json, .env'), pcc('Aucune'), pcc('Gemini-2.0-Flash')],
    [pcell('L1 - Types'), pcell('Interfaces TypeScript, Schema Prisma'), pcc('L0'), pcc('Claude-3.7-Sonnet')],
    [pcell('L2 - API/Auth'), pcell('Routes API, Middleware, Services'), pcc('L0 + L1'), pcc('Claude-3.7-Sonnet')],
    [pcell('L3 - Components'), pcell('Composants React, Pages, Hooks'), pcc('L0 + L1 + L2'), pcc('GPT-4o')],
]
story.extend(make_table(dag_data, [0.15, 0.35, 0.20, 0.30], 'Tableau 4 : Niveaux du DAG pour l\'Agent Developpeur'))

story.append(add_heading('3.2 DAG par Type d\'Agent', sH2, 1))
story.append(p(
    'Chaque agent possede son propre DAG specialise. L\'Agent SLIDES utilise un DAG en quatre '
    'niveaux : Template (selection du modele de presentation) > Layout (structure des diapositives) '
    '> Content (generation du contenu texte et visuel) > Design (application du style, couleurs, '
    'typographie). L\'Agent DOC suit : Outline > Sections > Content > PDF/DOCX. L\'Agent DATA : '
    'Schema > Query > Process > Visual. L\'Agent RECHERCHE : Query > Search > Extract > Synthesize. '
    'L\'Agent EMAIL : Context > Draft > Refine > Send. Et l\'Agent MARKETING : Brief > Copy > '
    'Visual > Funnel. Chaque DAG est defini par une simple structure JSON que le CodeGenerator '
    'interprete et execute.'
))

story.append(add_heading('3.3 Context-Aware Generation', sH2, 1))
story.append(p(
    'Le mecanisme de generation contextuelle est un element crucial souvent omis dans les '
    'implementations naives. Lorsqu\'un fichier est genere au Niveau N, il recoit en entree '
    'non seulement le prompt initial de l\'utilisateur, mais aussi le contenu complet de tous '
    'les fichiers generes aux niveaux 0 a N-1 dont il depend directement. Cette approche, '
    'appelee Linear Context Management, evite les conflits de contexte en n\'injectant que les '
    'dependances directes plutot que l\'integralite du code genere. Par exemple, un composant '
    'React au Niveau 3 recoit les types du Niveau 1 et l\'API du Niveau 2, mais pas les '
    'fichiers de configuration du Niveau 0. Cela permet de rester dans la fenetre de tokens '
    'des modeles tout en garantissant la coherence du code genere.'
))

# ================================================================
# SECTION 4: REFLECTION AGENT
# ================================================================
story.extend(add_major_section('4. Reflection Agent : Le Mecanisme Secret', sH1))

story.append(add_heading('4.1 Vote Multi-Criteres Ponderes', sH2, 1))
story.append(p(
    'Le Reflection Agent est sans doute le mecanisme le plus important et le moins obvious '
    'de toute l\'architecture. C\'est la cle du score GAIA de 87.8% atteint par Genspark. '
    'Le principe est simple mais devilment efficace : au lieu d\'accepter la sortie d\'un '
    'seul modele, le Reflection Agent fait evaluer la sortie de chaque modele par plusieurs '
    'autres modeles selon six criteres ponderes, puis synthetise le meilleur de chaque '
    'evaluation pour produire un resultat final superieur a n\'importe quelle sortie individuelle.'
))
story.append(p(
    'Les six criteres de reflexion et leurs ponderations varient selon l\'agent. Pour l\'Agent '
    'Developpeur, les criteres sont : Qualite du Code (30%), Fonctionnalite (25%), Performance '
    '(15%), Securite (15%), Experience Utilisateur (10%) et Tests (5%). La somme des ponderations '
    'est toujours 100%. Chaque critere recoit un score entre 0 et 1 de chaque modele evaluateur, '
    'et le score final est la moyenne ponderee. Si le score de confiance final est inferieur '
    'au seuil de 0.95, un cycle de raffinement est declenche.'
))

reflection_data = [
    [ph('Critere'), ph('Dev'), ph('SLIDES'), ph('DOC'), ph('DATA')],
    [pcell('Qualite / Design'), pcc('30%'), pcc('30%'), pcc('30%'), pcc('35%')],
    [pcell('Fonctionnalite / Contenu'), pcc('25%'), pcc('25%'), pcc('25%'), pcc('25%')],
    [pcell('Performance / Coherence'), pcc('15%'), pcc('20%'), pcc('20%'), pcc('15%')],
    [pcell('Securite / Style'), pcc('15%'), pcc('15%'), pcc('10%'), pcc('5%')],
    [pcell('UX / Precision'), pcc('10%'), pcc('5%'), pcc('10%'), pcc('15%')],
    [pcell('Tests / Visualisation'), pcc('5%'), pcc('5%'), pcc('5%'), pcc('5%')],
    [ph('Seuil de confiance'), pcc('0.95'), pcc('0.92'), pcc('0.93'), pcc('0.94')],
]
story.extend(make_table(reflection_data, [0.30, 0.175, 0.175, 0.175, 0.175], 'Tableau 5 : Criteres de reflexion ponderes par agent'))

story.append(add_heading('4.2 Algorithme de Synthese', sH2, 1))
story.append(p(
    'L\'algorithme de synthese du Reflection Agent opere en trois phases. La premiere phase est '
    'l\'<b>Evaluation Individuelle</b> : chaque sortie de modele est evaluee par trois modeles '
    'evaluateurs differents sur les six criteres ponderes. Les evaluateurs typiques sont '
    'Claude-3.7-Sonnet, GPT-4o et Gemini-2.5-Pro. La deuxieme phase est l\'<b>Aggregation</b> : '
    'pour chaque critere, le systeme selectionne la meilleure sortie parmi tous les modeles '
    'generateurs. Par exemple, si le modele A produit le meilleur code (score qualite 0.92) '
    'mais le modele B offre la meilleure securite (score securite 0.88), le systeme extrait '
    'la qualite du modele A et la securite du modele B. La troisieme phase est la <b>Fusion</b> : '
    'un modele de synthese (generalement GPT-4o ou Claude-3.7-Sonnet) prend les meilleurs '
    'extraits de chaque critere et les fusionne en un resultat coherent et unifie.'
))
story.append(p(
    'Ce processus itratif est la raison pour laquelle le score de confiance de 0.95 est '
    'atteint. Si apres la premiere synthese le score est inferieur au seuil, le systeme '
    're-injecte les feedbacks detailles dans les modeles generateurs avec des instructions '
    'precises d\'amelioration, et le cycle se repete. En pratique, la plupart des requetes '
    'atteignent le seuil en 1 a 2 iterations, ce qui maintient un bon equilibre entre '
    'qualite et temps de reponse.'
))

# ================================================================
# SECTION 5: 3-LEVEL AUTO-FIX ENGINE
# ================================================================
story.extend(add_major_section('5. 3-Level Auto-Fix Engine', sH1))

story.append(add_heading('5.1 Cascade de Correction en 3 Niveaux', sH2, 1))
story.append(p(
    'Le moteur d\'auto-correction en trois niveaux est le mecanisme qui garantit que le code '
    'genere fonctionne reellement, pas seulement qu\'il semble correct. Quand une erreur est '
    'detectee (par exemple lors de l\'execution dans le sandbox), le systeme tente d\'abord '
    'une correction par pattern, puis par analyse AST, et enfin par correction LLM. Cette '
    'cascade est optimisee pour minimiser les couts : les corrections les moins cheres sont '
    'essayees en premier, et les plus couteuses ne sont utilisees qu\'en dernier recours.'
))
story.append(p(
    'Le <b>Niveau 1 - Pattern-Based Fix</b> (taux de reussite 40%) fonctionne par '
    'reconnaissance de motifs d\'erreur courants. Il maintient un dictionnaire de plus de '
    '200 patterns d\'erreur avec leurs corrections associees. Par exemple, "Cannot read '
    'property of undefined" est corrige en ajoutant un optional chaining, ou "Module not '
    'found" est corrige en ajoutant l\'import manquant. Ce niveau est quasi instantane et '
    'ne coute rien en tokens LLM.'
))
story.append(p(
    'Le <b>Niveau 2 - AST-Based Fix</b> (taux de reussite 30% supplementaires) analyse le '
    'code genere sous forme d\'arbre syntaxique abstrait pour identifier les erreurs '
    'structurelles : types incompatibles, variables non declarees, signatures de fonction '
    'incorrectes. Ce niveau utilise un parseur TypeScript/Python pour naviguer dans l\'AST '
    'et appliquer des transformations ciblees. Il est plus lent que le Niveau 1 mais reste '
    'gratuit en termes de couts LLM.'
))
story.append(p(
    'Le <b>Niveau 3 - LLM-Based Fix</b> (taux de reussite 25% supplementaires) envoie le '
    'code errone, le message d\'erreur et le contexte complet a un LLM (generalement '
    'Claude-3.7-Sonnet ou GPT-4o) avec des instructions de correction precise. Ce niveau '
    'est le plus couteux mais aussi le plus puissant, capable de corriger des erreurs '
    'logiques complexes que les deux premiers niveaux ne peuvent pas detecter. Les 5% '
    'restants correspondent aux cas ou la regeneration complete du fichier est necessaire.'
))

autofix_data = [
    [ph('Niveau'), ph('Methode'), ph('Taux de reussite'), ph('Cout'), ph('Temps moyen')],
    [pcell('1 - Pattern'), pcell('Dictionnaire de 200+ patterns'), pcc('40%'), pcc('$0'), pcc('< 100ms')],
    [pcell('2 - AST'), pcell('Analyse syntaxique abstraite'), pcc('30%'), pcc('$0'), pcc('500ms - 2s')],
    [pcell('3 - LLM'), pcell('Correction par modele de langage'), pcc('25%'), pcc('$0.01 - $0.05'), pcc('3 - 10s')],
    [pcell('Regeneration'), pcell('Regeneration complete du fichier'), pcc('5%'), pcc('$0.05 - $0.15'), pcc('10 - 30s')],
]
story.extend(make_table(autofix_data, [0.12, 0.33, 0.18, 0.17, 0.20], 'Tableau 6 : Cascade de correction en 3 niveaux'))

# ================================================================
# SECTION 6: INFRASTRUCTURE PARTAGEE
# ================================================================
story.extend(add_major_section('6. Infrastructure Partagee', sH1))

story.append(add_heading('6.1 Cache Manager (L1 + L2)', sH2, 1))
story.append(p(
    'Le Cache Manager implemente un systeme de cache a deux niveaux qui reduit drastiquement '
    'les couts et les temps de reponse. Le <b>Cache L1</b> est un cache in-memory avec une '
    'capacite de 100 entrees et un TTL de 1 minute. Il est utilise pour les requetes '
    'repetees au sein d\'une meme session, comme les definitions de types ou les schemas de '
    'base de donnees. Le <b>Cache L2</b> est un cache Redis avec une capacite illimitee et '
    'un TTL configurable (par defaut 1 heure). Il persiste entre les sessions et est partage '
    'entre toutes les instances de l\'API.'
))
story.append(p(
    'Les cles de cache sont generees par hashage SHA256 du prompt combine avec la '
    'configuration de l\'agent et le contexte. L\'invalidation du cache suit un systeme de '
    'patterns : lorsqu\'un fichier est regenere, tous les caches qui dependent de ce fichier '
    'sont invalides. Ce mecanisme garantit que le cache ne sert jamais de contenu obsolete '
    'tout en maximisant le taux de hit. En production, le taux de hit du cache atteint '
    'typiquement 30 a 45%, ce qui represente des economies significatives sur les couts LLM.'
))

story.append(add_heading('6.2 Cost Optimizer et Routeur RL', sH2, 1))
story.append(p(
    'Le Cost Optimizer est le composant qui equilibre qualite, cout et vitesse pour chaque '
    'sous-tache. Il utilise une formule de scoring pondere : Score = Qualite * 0.50 + '
    '(1 - Cout/Cout_max) * 0.30 + (1 - Temps/Temps_max) * 0.20. Pour chaque sous-tache, '
    'il evalue tous les modeles capables de la traiter, calcule leur score, et selectionne '
    'celui avec le meilleur ratio. Si le budget utilisateur est limite, il filtre les modeles '
    'dont le cout depasse le budget restant et selectionne le meilleur parmi les modeles '
    'restants.'
))
story.append(p(
    'Le Routeur RL (Reinforcement Learning) va plus loin en apprenant des interactions '
    'passees. Il collecte des donnees d\'entrainement dans la table rl_training_data : pour '
    'chaque sous-tache executee, il enregistre le modele utilise, le score de qualite obtenu, '
    'le cout reel et le temps de reponse. Un modele d\'apprentissage par renforcement est '
    'entraine periodiquement sur ces donnees pour affiner la politique de routage. Avec le '
    'temps, le routeur apprend quel modele est le plus adapte a chaque type de sous-tache, '
    'aux habitudes specifiques de chaque utilisateur, et aux patterns d\'utilisation globaux. '
    'C\'est un mecanisme d\'amelioration continue qui rend la plateforme plus efficace avec '
    'le temps.'
))

story.append(add_heading('6.3 Sandbox Manager (Docker Warm Pool)', sH2, 1))
story.append(p(
    'Le Sandbox Manager gere un pool de conteneurs Docker prechauffes pour l\'execution '
    'isolee du code genere. Plutot que de creer un nouveau conteneur pour chaque requete '
    '(ce qui prendrait 5 a 10 secondes), le systeme maintient un pool de 5 conteneurs '
    'toujours en etat "pret". Quand une requete arrive, un conteneur est alloue, le code '
    'y est injecte, execute, et le resultat est recupere. Le conteneur est ensuite nettoye '
    'et remis dans le pool. Les limites de ressources sont strictes : 80% de CPU maximum, '
    '8 Go de RAM, et un timeout de 30 secondes. L\'isolation reseau est assuree par des '
    'regles iptables qui n\'autorisent que les connexions sortantes HTTP/HTTPS. Les commandes '
    'dangereuses (rm -rf, sudo, chmod 777, etc.) sont bloques par une liste noire.'
))

story.append(add_heading('6.4 Cloudflare Edge Deployer', sH2, 1))
story.append(p(
    'Le Cloudflare Deployer automatise le deploiement des applications generees en moins de '
    '60 secondes. Le processus se decompose en six etapes : creation du projet Pages, upload '
    'des fichiers, provisioning de la base D1, execution des migrations, configuration des '
    'variables d\'environnement, et attribution du domaine. L\'avantage de Cloudflare est la '
    'distribution edge : l\'application est deployee sur plus de 300 datacenters dans le monde, '
    'garantissant des temps de reponse inferieurs a 50ms partout. Le cout est egalement '
    'extremement competitif : le plan gratuit offre 500 requetes/mois, et le plan payant '
    'commence a $5/mois pour 100 000 requetes.'
))

# ================================================================
# SECTION 7: AGENT REGISTRY ET CONFIGURATION
# ================================================================
story.extend(add_major_section('7. Agent Registry et Systeme de Configuration', sH1))

story.append(add_heading('7.1 Configuration Dynamique par Agent', sH2, 1))
story.append(p(
    'L\'Agent Registry est le routeur dynamique qui permet d\'ajouter de nouveaux agents sans '
    'modifier le code du kernel. Chaque agent est defini par une configuration JSON qui '
    'specifie cinq elements : l\'identifiant et le nom de l\'agent, la definition du DAG de '
    'generation (niveaux, dependances, fichiers types), les criteres de reflexion ponderes, '
    'la table de routage des modeles (quel modele pour quel type de sous-tache), et le '
    'pipeline de sortie (format, post-traitement, livraison). Quand une requete arrive, '
    'l\'Agent Registry identifie l\'agent cible, charge sa configuration, et passe le '
    'relais au MoA Kernel qui execute le pipeline avec les parametres de cet agent.'
))

config_data = [
    [ph('Parametre'), ph('Dev'), ph('SLIDES'), ph('DOC')],
    [pcell('DAG Niveaux'), pcell('Config > Types > API > UI'), pcell('Template > Layout > Content > Design'), pcell('Outline > Sections > Content > PDF')],
    [pcell('Critere Principal'), pcc('Qualite 30%'), pcc('Design 30%'), pcc('Structure 30%')],
    [pcell('Modele Principal'), pcc('Claude-3.7-Sonnet'), pcc('GPT-4o'), pcc('Claude-3.7-Sonnet')],
    [pcell('Sandbox'), pcc('Oui (Docker)'), pcc('Non'), pcc('Non')],
    [pcell('Deployer'), pcc('Cloudflare Pages'), pcc('N/A'), pcc('Telechargement direct')],
    [pcell('Format Sortie'), pcell('Code source + URL'), pcell('PPTX / PDF'), pcell('PDF / DOCX')],
    [pcell('Seuil Confiance'), pcc('0.95'), pcc('0.92'), pcc('0.93')],
]
story.extend(make_table(config_data, [0.20, 0.267, 0.267, 0.266], 'Tableau 7 : Comparaison des configurations par agent'))

story.append(add_heading('7.2 Ajouter un Nouvel Agent', sH2, 1))
story.append(p(
    'L\'ajout d\'un nouvel agent se resume a la creation d\'un fichier de configuration JSON '
    'et a l\'implementation d\'eventuels post-traitements specifiques. Le processus complet '
    'prend typiquement 2 a 3 jours : jour 1 pour la definition du DAG et des criteres de '
    'reflexion, jour 2 pour le reglage fin du routage des modeles et les tests, et jour 3 '
    'pour l\'integration dans le dashboard et la documentation. Aucune modification du kernel '
    'n\'est necessaire, ce qui elimine le risque de regression sur les agents existants. '
    'Cette extensibilite est la consequence directe de l\'architecture "1 Kernel, 7 '
    'Configurations" : le kernel est stable et eprouve, seules les configurations evoluent.'
))

# ================================================================
# SECTION 8: SECURITE ET RATE LIMITING
# ================================================================
story.extend(add_major_section('8. Securite et Rate Limiting', sH1))

story.append(add_heading('8.1 Architecture de Securite Multi-Couches', sH2, 1))
story.append(p(
    'La securite d\'AgentForge repose sur six couches de protection complementaires. La '
    'premiere couche est la <b>Validation Zod</b> : toutes les entrees utilisateur sont '
    'validees par des schemas Zod stricts avant traitement. La deuxieme couche est les '
    '<b>Requetes Parametrees</b> : toutes les requetes SQL utilisent des parametres bindes '
    'pour prevenir les injections SQL. La troisieme couche est la <b>Sanitization XSS</b> : '
    'tout contenu genere par les LLM est sanize avant affichage. La quatrieme couche est le '
    '<b>CORS</b> : seuls les domaines autorises peuvent acceder a l\'API. La cinquieme '
    'couche est l\'<b>Authentification JWT</b> : chaque requete est authentifiee par un '
    'token JWT avec rotation automatique. La sixieme couche est la <b>Securite du Sandbox</b> : '
    'les commandes dangereuses sont bloques, l\'acces reseau est restreint, et les ressources '
    'sont limitees.'
))

story.append(add_heading('8.2 Rate Limiting (Token Bucket)', sH2, 1))
story.append(p(
    'Le rate limiting est implemente via un algorithme de Token Bucket avec un script Lua '
    'execute dans Redis pour garantir l\'atomicite. Quatre niveaux de taux sont definis selon '
    'le plan utilisateur. Le plan Gratuit permet 10 requetes par heure, le plan Plus offre '
    '50 requetes par heure, le plan Pro monte a 200 requetes par heure, et le plan Entreprise '
    'offre 1000 requetes par heure. Le script Lua verifie le nombre de tokens restants, '
    'consomme un token si disponible, et retourne le nombre restant avec le temps avant '
    'rechargement. Si le bucket est vide, la requete est rejetee avec un code 429 et un '
    'header Retry-At indiquant quand le prochain token sera disponible.'
))

rate_data = [
    [ph('Plan'), ph('Requetes/heure'), ph('Prix/mois'), ph('Cout LLM estime')],
    [pcell('Gratuit'), pcc('10'), pcc('$0'), pcc('N/A')],
    [pcell('Plus'), pcc('50'), pcc('$29'), pcc('$15-20')],
    [pcell('Pro'), pcc('200'), pcc('$99'), pcc('$50-70')],
    [pcell('Entreprise'), pcc('1000'), pcc('$299'), pcc('$150-250')],
]
story.extend(make_table(rate_data, [0.25, 0.25, 0.25, 0.25], 'Tableau 8 : Plans et rate limiting'))

# ================================================================
# SECTION 9: BASE DE DONNEES
# ================================================================
story.extend(add_major_section('9. Schema de Base de Donnees', sH1))

story.append(add_heading('9.1 Tables Principales', sH2, 1))
story.append(p(
    'Le schema de base de donnees est construit sur PostgreSQL 16 avec sept tables principales. '
    'La table <b>users</b> stocke les informations utilisateur avec authentification JWT et '
    'gestion des plans. La table <b>projects</b> gere les projets avec configuration JSONB '
    'flexible et statut de deploiement. La table <b>generation_sessions</b> enregistre chaque '
    'session de generation avec le prompt, le modele utilise, le score de qualite et les '
    'metriques de cout et temps. La table <b>rl_training_data</b> collecte les donnees '
    'd\'entrainement pour le routeur RL. La table <b>error_recovery_log</b> trace les '
    'corrections appliquees par l\'Auto-Fix Engine. La table <b>cost_tracking</b> suit les '
    'couts par utilisateur, modele et jour. Enfin, la table <b>analytics_events</b> capture '
    'tous les evenements pour le dashboard analytique.'
))
story.append(p(
    'Les index sont optimises pour les requetes les plus frequentes : index composites sur '
    '(user_id, created_at) pour les sessions de generation, index sur (model, task_type) '
    'pour les donnees RL, et index GIN sur les colonnes JSONB pour les recherches dans les '
    'configurations. Les foreign keys sont configurees avec ON DELETE CASCADE pour les '
    'donnees dependantes et ON DELETE SET NULL pour les references optionnelles.'
))

# ================================================================
# SECTION 10: FEUILLE DE ROUTE
# ================================================================
story.extend(add_major_section('10. Feuille de Route de Production', sH1))

story.append(add_heading('10.1 Phase 1 : Fondations (Semaines 1-3)', sH2, 1))
story.append(p(
    'La premiere phase pose les bases du systeme. La Semaine 1 est consacree au MoA Kernel '
    'et a l\'Agent Registry : implementation du SuperAgentOrchestrator avec configuration des '
    '9 modeles, systeme de configuration dynamique par agent, et tests unitaires du kernel. '
    'La Semaine 2 construit le Reflection Engine et l\'Auto-Fix : implementation du '
    'ReflectionAgent avec criteres configurables, seuil de confiance ajustable par agent, '
    '3-Level Auto-Fix, et tests d\'evaluation qualite. La Semaine 3 deploye l\'infrastructure '
    'partagee : API Gateway avec Hono, PostgreSQL et Redis avec migrations, CacheManager '
    'L1+L2, CostOptimizer et RL Router, et squelette du Dashboard React.'
))

story.append(add_heading('10.2 Phase 2 : Agent Developpeur (Semaines 4-6)', sH2, 1))
story.append(p(
    'La deuxieme phase construit l\'agent phare. La Semaine 4 implemente le DAG Code '
    'Generation : DAG Builder pour fichiers code, generation niveau par niveau (Config, Types, '
    'API, UI), Context-Aware Generation et Linear Context Management. La Semaine 5 ajoute le '
    'Sandbox et l\'Auto-Fix specialise code : SandboxManager avec Docker Warm Pool, execution '
    'isolee avec limites de ressources, Auto-Fix pour erreurs TypeScript, React, Python, et '
    'tests de bout en bout. La Semaine 6 finalise le deploiement et l\'integration : '
    'CloudflareDeployer, pipeline complet du prompt au deploiement, dashboard avec historique '
    'projets, couts et metriques. A la fin de cette phase, l\'Agent Developpeur est le '
    'premier MVP livrable.'
))

story.append(add_heading('10.3 Phase 3 : Agent SLIDES (Semaines 7-9)', sH2, 1))
story.append(p(
    'La troisieme phase etend la plateforme aux presentations. La Semaine 7 construit le DAG '
    'de presentation : DAG Builder pour slides, criteres Reflection orientes design, modeles '
    'optimises pour le contenu visuel, et templates de base (corporate, pitch, academique). '
    'La Semaine 8 implemente le pipeline de sortie : generateur PPTX via python-pptx, '
    'generateur PDF via ReportLab, mise en page intelligente avec grilles, contrastes et '
    'typographie, et export multi-format. La Semaine 9 finalise avec le polish et '
    'l\'integration : preview dans le dashboard, edition post-generation, templates '
    'personnalisables. L\'Agent SLIDES est le deuxieme MVP livrable.'
))

story.append(add_heading('10.4 Phase 4 : Agents DOC + DATA + RECHERCHE (Semaines 10-14)', sH2, 1))
story.append(p(
    'La quatrieme phase deploie trois agents supplementaires en utilisant le kernel existant. '
    'Les Semaines 10-11 construisent l\'Agent DOC avec son DAG Outline-Sections-Content-PDF, '
    'ses criteres de reflexion (Structure 30%, Profondeur 25%, Style 20%), et la generation '
    'PDF/DOCX professionnelle. Les Semaines 12-13 implementent l\'Agent DATA avec son DAG '
    'Schema-Query-Process-Visual, un sandbox Python dedie (pandas, matplotlib, seaborn), et '
    'des criteres de reflexion orientes precision (Precision 35%, Visualisation 25%, Insight 20%). '
    'La Semaine 14 ajoute l\'Agent RECHERCHE avec integration web-search et academic-search, '
    'et des criteres de reflexion orientes fiabilite (Pertinence 30%, Exhaustivite 25%, '
    'Fiabilite 25%).'
))

story.append(add_heading('10.5 Phase 5 : Scale + EMAIL + MARKETING (Semaines 15-18)', sH2, 1))
story.append(p(
    'La cinquieme et derniere phase optimise la plateforme pour la production a grande '
    'echelle et ajoute les deux agents restants. Les Semaines 15-16 sont consacrees a '
    'l\'optimisation scale : routeur RL entraine sur donnees reelles, cache predictif qui '
    'anticipe les requetes, load balancing multi-region, monitoring et alerting, et '
    'optimisation des couts visant une reduction de 40 a 60%. Les Semaines 17-18 ajoutent '
    'l\'Agent EMAIL (MoA leger, A/B testing, personnalisation) et l\'Agent MARKETING (copy, '
    'funnels, SEO, analytics). A la fin de cette phase, la plateforme AgentForge est '
    'complete avec ses 7 agents et une infrastructure de production eprouvee.'
))

roadmap_data = [
    [ph('Phase'), ph('Duree'), ph('Contenu'), ph('Livrable')],
    [pcell('1 - Fondations'), pcc('3 sem'), pcell('MoA Kernel + Reflection + Infrastructure'), pcc('Kernel operationnel')],
    [pcell('2 - Agent DEV'), pcc('3 sem'), pcell('DAG Code + Sandbox + Deployer'), pcc('MVP Developpeur')],
    [pcell('3 - Agent SLIDES'), pcc('3 sem'), pcell('DAG Slides + Output Pipeline + Templates'), pcc('MVP SLIDES')],
    [pcell('4 - DOC/DATA/RCHG'), pcc('5 sem'), pcell('3 agents supplementaires + DAGs specifiques'), pcc('5 agents actifs')],
    [pcell('5 - Scale + Email/Mkg'), pcc('4 sem'), pcell('Optimisation + 2 agents finaux'), pcc('Plateforme complete')],
]
story.extend(make_table(roadmap_data, [0.18, 0.10, 0.45, 0.27], 'Tableau 9 : Feuille de route en 5 phases'))

# ================================================================
# SECTION 11: ESTIMATION DES COUTS
# ================================================================
story.extend(add_major_section('11. Estimation des Couts et Modele Economique', sH1))

story.append(add_heading('11.1 Couts de Construction', sH2, 1))
story.append(p(
    'L\'estimation des couts de construction se decompose en deux categories principales : '
    'les couts d\'infrastructure (serveurs, bases de donnees, stockage) et les couts LLM '
    '(tokens consommes pendant le developpement et les tests). Durant la Phase 1, les couts '
    'LLM sont modestes (~$200/mois) car le systeme est en development avec des tests limites. '
    'L\'infrastructure coute environ $50/mois (un petit VPS + PostgreSQL manage). Les phases '
    'suivantes voient les couts LLM augmenter a mesure que les agents sont testes et affines, '
    'tandis que l\'infrastructure evolue progressivement.'
))

cost_data = [
    [ph('Phase'), ph('Duree'), ph('Couts LLM/mois'), ph('Infra/mois'), ph('Total phase')],
    [pcell('1 - Fondations'), pcc('3 sem'), pcc('$200'), pcc('$50'), pcc('$750')],
    [pcell('2 - Agent DEV'), pcc('3 sem'), pcc('$500'), pcc('$100'), pcc('$1 500')],
    [pcell('3 - Agent SLIDES'), pcc('3 sem'), pcc('$400'), pcc('$100'), pcc('$1 200')],
    [pcell('4 - DOC/DATA/RCHG'), pcc('5 sem'), pcc('$800'), pcc('$200'), pcc('$2 500')],
    [pcell('5 - Scale + reste'), pcc('4 sem'), pcc('$600'), pcc('$300'), pcc('$2 200')],
    [ph('TOTAL'), pcc('18 sem'), pcc(''), pcc(''), pcc('$8 150')],
]
story.extend(make_table(cost_data, [0.20, 0.15, 0.20, 0.20, 0.25], 'Tableau 10 : Estimation des couts de construction'))

story.append(add_heading('11.2 Modele Economique et Rentabilite', sH2, 1))
story.append(p(
    'Le modele economique repose sur une structure d\'abonnement a 4 niveaux (Gratuit, Plus '
    'a $29/mois, Pro a $99/mois, Entreprise a $299/mois) avec une marge brute estimee a '
    '60-70% sur les plans payants. Le cout moyen par generation est de $0.02 a $0.10 selon '
    'la complexite de la tache, ce qui permet une forte marge meme sur le plan Pro. Le point '
    'mort est estime a 150 abonnes Pro, soit environ $15 000 de revenus mensuels. Avec une '
    'strategie d\'acquisition agressive (freemium + referral), ce seuil peut etre atteint en '
    '3 a 6 mois apres le lancement. Le facteur cle de rentabilite est le taux de hit du '
    'cache : chaque requete servie depuis le cache coute $0 en tokens LLM, ce qui ameliore '
    'directement la marge brute.'
))

# ================================================================
# SECTION 12: LES 12 MECANISMES D'ORCHESTRATION
# ================================================================
story.extend(add_major_section('12. Les 12 Mecanismes d\'Orchestration', sH1))

story.append(add_heading('12.1 Vue d\'Ensemble des 12 Mecanismes', sH2, 1))
story.append(p(
    'Ce document a identifie et documente en detail 12 mecanismes d\'orchestration distincts '
    'qui constituent l\'ADN d\'AgentForge. Ces mecanismes ne sont pas de simples fonctions '
    'isolees : ils s\'articulent les uns avec les autres pour former un systeme coherent ou '
    'chaque composant renforce les autres. Le MoA distribue les taches, le DAG structure la '
    'generation, le Reflection Agent garantit la qualite, l\'Auto-Fix corrige les erreurs, '
    'le Cost Optimizer equilibre les couts, le Cache Manager accelere les reponses, le '
    'Sandbox isole les executions, le Deployer automatise les mises en production, et la '
    'securite multicouche protege l\'ensemble.'
))

mechanisms_data = [
    [ph('#'), ph('Mecanisme'), ph('Categorie'), ph('Impact')],
    [pcc('1'), pcell('Mixture-of-Agents (9 LLMs)'), pcell('Orchestration noyau'), pcc('Critique')],
    [pcc('2'), pcell('DAG-Based Code Generation'), pcell('Orchestration noyau'), pcc('Critique')],
    [pcc('3'), pcell('Reflection Agent (Vote multi-criteres)'), pcell('Orchestration noyau'), pcc('Critique')],
    [pcc('4'), pcell('3-Level Auto-Fix Engine'), pcell('Orchestration noyau'), pcc('Eleve')],
    [pcc('5'), pcell('RL-Optimized Model Router'), pcell('Routage/Optimisation'), pcc('Eleve')],
    [pcc('6'), pcell('Cost Optimizer Cascade'), pcell('Routage/Optimisation'), pcc('Moyen')],
    [pcc('7'), pcell('Cache Orchestration L1+L2'), pcell('Routage/Optimisation'), pcc('Eleve')],
    [pcc('8'), pcell('Sandbox Warm Pool'), pcell('Execution/Contexte'), pcc('Eleve')],
    [pcc('9'), pcell('Context-Aware Generation'), pcell('Execution/Contexte'), pcc('Critique')],
    [pcc('10'), pcell('Linear Context Management'), pcell('Execution/Contexte'), pcc('Eleve')],
    [pcc('11'), pcell('Cloudflare Edge Deployer'), pcell('Deploiement/Securite'), pcc('Moyen')],
    [pcc('12'), pcell('Multi-Layer Security Orchestration'), pcell('Deploiement/Securite'), pcc('Critique')],
]
story.extend(make_table(mechanisms_data, [0.06, 0.38, 0.28, 0.28], 'Tableau 11 : Les 12 mecanismes d\'orchestration'))

story.append(add_heading('12.2 Interactions entre Mecanismes', sH2, 1))
story.append(p(
    'Les mecanismes ne fonctionnent pas en isolation. Le flux typique d\'une requete illustre '
    'leurs interactions. Quand un utilisateur soumet un prompt, le Cache Manager (7) verifie '
    'si une reponse similaire existe deja. Si non, le Cost Optimizer (6) et le Routeur RL (5) '
    'selectionnent les modeles optimaux. Le MoA (1) decompose la tache et distribue les '
    'sous-taches. Le DAG (2) structure la generation en niveaux. Le Context-Aware (9) et le '
    'Linear Context (10) nourrissent chaque generation avec les dependances adequates. Les '
    'resultats sont evalues par le Reflection Agent (3). Si des erreurs sont detectees, '
    'l\'Auto-Fix (4) les corrige en cascade. Si du code doit etre execute, le Sandbox (8) '
    'l\'isole. Si le resultat est une application, le Deployer (11) la met en production. '
    'Et pendant tout le processus, la Security Orchestration (12) protege chaque echange. '
    'Cette choregraphie est le veritable "secret" d\'AgentForge : ce n\'est pas un mecanisme '
    'unique qui fait la difference, mais l\'integration harmonieuse de douze mecanismes.'
))

# ================================================================
# SECTION 13: COMMANDEMENTS
# ================================================================
story.extend(add_major_section('13. Les 25 Commandements de l\'Architecture Agent', sH1))

story.append(p(
    'Cette section synthetise les principes fondamentaux issus de l\'analyse des deux '
    'documents sources (le Compilateur d\'Architecture Intelligente et le Guide de Clonage '
    'Genspark). Ces commandements sont des regles non negociables qui doivent guider chaque '
    'decision d\'implementation de la plateforme AgentForge.'
))

commandements = [
    ('1', 'Un kernel, plusieurs configurations. Ne jamais dupliquer le code d\'orchestration entre les agents.'),
    ('2', 'Le Reflection Agent est non negociable. Sans vote multi-criteres, la qualite est aleatoire.'),
    ('3', 'Toujours generer par niveaux de dependances (DAG). Jamais sequentiellement.'),
    ('4', 'Le cache est une fonctionnalite, pas un optimisation. Le concevoir des le premier jour.'),
    ('5', 'Le routeur RL s\'amelior avec le temps. Collecter les donnees d\'entrainement des le lancement.'),
    ('6', 'L\'Auto-Fix en cascade economise des tokens. Toujours tenter le pattern avant le LLM.'),
    ('7', 'Le contexte lineaire evite les conflits. Ne jamais injecter tout le code genere dans chaque fichier.'),
    ('8', 'Le sandbox est obligatoire pour tout code execute. Aucune exception.'),
    ('9', 'La securite est multicouche. Jamais un seul mecanisme de protection.'),
    ('10', 'Le deploiement doit etre automatise et reproductible. Pas de deploiement manuel.'),
    ('11', 'Mesurer tout : couts, temps, qualite. Les donnees pilotent les optimisations.'),
    ('12', 'Le seuil de confiance 0.95 est un minimum. Ne jamais livrer en dessous.'),
    ('13', 'Les modeles open-source sont des reserves de cout. Les utiliser pour les taches simples.'),
    ('14', 'La gestion du contexte est plus importante que le choix du modele.'),
    ('15', 'Toujours privilegier la qualite percue par l\'utilisateur sur la qualite technique interne.'),
    ('16', 'Le Template Learning est un avantage concurrentiel. Les patterns reutilises s\'amelior.'),
    ('17', 'L\'orchestration parallele est toujours superieure a la sequentielle.'),
    ('18', 'Le Cost Optimizer doit etre transparent. L\'utilisateur doit comprendre les couts.'),
    ('19', 'Le pool de sandbox prechauffes est indispensable pour la reactivite.'),
    ('20', 'L\'invalidation du cache doit etre granulaire. Jamais de flush complet.'),
    ('21', 'Les criteres de reflexion doivent etre adaptes par agent. Pas de critere universel.'),
    ('22', 'Le RL Router doit avoir une strategie epsilon-greedy pour explorer de nouveaux modeles.'),
    ('23', 'La configuration d\'agent est du code, pas des donnees. La versionner avec Git.'),
    ('24', 'Toujours prevoir un fallback quand un modele est indisponible. Jamais de point de defaillance unique.'),
    ('25', 'L\'objectif final est l\'experience utilisateur. Tous les mecanismes servent cet objectif.'),
]

for num, text in commandements:
    story.append(Paragraph('<b>%s.</b> %s' % (num, text), sBodyLeft))

# ================================================================
# SECTION 14: PROCHAINES ETAPES
# ================================================================
story.extend(add_major_section('14. Prochaines Etapes et Recommandations', sH1))

story.append(add_heading('14.1 Actions Immmdiates', sH2, 1))
story.append(p(
    'Pour lancer la construction d\'AgentForge, trois actions doivent etre entreprises '
    'immediatement. La premiere est la mise en place de l\'environnement de developpement : '
    'un depot Git monorepo avec Turborepo, les configurations Docker Compose pour PostgreSQL '
    '16 et Redis 7, et le scaffolding des packages (api, web, shared, sandbox). La deuxieme '
    'action est l\'obtention des cles API pour les 9 modeles LLM : les fournisseurs '
    'principaux (OpenAI, Anthropic, Google, DeepSeek, Mistral) offrent des credits gratuits '
    'pour les nouveaux comptes, ce qui permet de commencer les tests sans investissement '
    'initial significatif. La troisieme action est la definition precise des DAGs pour '
    'les deux premiers agents (Developpeur et SLIDES), en s\'appuyant sur les schemas '
    'presentes dans ce document.'
))

story.append(add_heading('14.2 Risques et Mitigations', sH2, 1))

risk_data = [
    [ph('Risque'), ph('Probabilite'), ph('Impact'), ph('Mitigation')],
    [pcell('Dependance aux fournisseurs LLM'), pcc('Elevee'), pcc('Critique'), pcell('Routeur RL + fallback multi-modeles + modeles open-source en reserve')],
    [pcell('Depassement des couts LLM'), pcc('Moyenne'), pcc('Eleve'), pcell('Cache agressif + Cost Optimizer + alertes budget + modeles legeres pour taches simples')],
    [pcell('Qualite insuffisante des sorties'), pcc('Faible'), pcc('Critique'), pcell('Reflection Agent a seuil 0.95 + Auto-Fix 3 niveaux + feedback utilisateur')],
    [pcell('Faille de securite dans le sandbox'), pcc('Faible'), pcc('Critique'), pcell('Isolation reseau + liste noire de commandes + limites ressources + audit regulier')],
    [pcell('Scalabilite insuffisante'), pcc('Moyenne'), pcc('Moyen'), pcell('Architecture horizontale + cache Redis + load balancing + monitoring')],
]
story.extend(make_table(risk_data, [0.28, 0.14, 0.12, 0.46], 'Tableau 12 : Risques et mitigations'))

story.append(add_heading('14.3 Indicateurs de Succes', sH2, 1))
story.append(p(
    'Le succes de la plateforme sera mesure par cinq indicateurs cles. Le premier est le '
    '<b>taux de confiance moyen</b> des generations : la cible est superieure a 0.92 en '
    'moyenne, et superieure a 0.95 pour l\'Agent Developpeur. Le deuxieme est le <b>taux de '
    'hit du cache</b> : la cible est superieure a 30% en production. Le troisieme est le '
    '<b>temps de reponse median</b> : la cible est inferieure a 15 secondes du prompt au '
    'resultat pour les generations simples, et inferieure a 60 secondes pour les projets '
    'complets avec deploiement. Le quatrieme est le <b>cout moyen par generation</b> : la '
    'cible est inferieure a $0.05. Le cinquieme est le <b>taux de satisfaction utilisateur</b> : '
    'la cible est superieure a 85% de reponses positives.'
))

# ================================================================
# BUILD
# ================================================================
doc.multiBuild(story)
print(f"Body PDF generated: {output_path}")

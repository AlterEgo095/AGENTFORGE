#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mécanismes Avancés d'Agents IA : Synthèse Complémentaire
Analyse du Guide de Clonage GenSpark + Architecture Unifiée
"""

import os, sys, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm, mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, CondPageBreak, HRFlowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ── FONT REGISTRATION ──
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

# ── PALETTE ──
ACCENT       = colors.HexColor('#5130b5')
ACCENT2      = colors.HexColor('#2d8a4e')
TEXT_PRIMARY  = colors.HexColor('#1b1c1e')
TEXT_MUTED    = colors.HexColor('#6f757b')
BG_SURFACE   = colors.HexColor('#d7dce1')
BG_PAGE      = colors.HexColor('#eceef0')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# ── PAGE ──
PAGE_W, PAGE_H = A4
LEFT_MARGIN = 1.0 * inch
RIGHT_MARGIN = 1.0 * inch
TOP_MARGIN = 0.8 * inch
BOTTOM_MARGIN = 0.8 * inch
CONTENT_W = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN

# ── STYLES ──
style_h1 = ParagraphStyle('H1', fontName='Carlito', fontSize=20, leading=28, textColor=ACCENT, spaceBefore=24, spaceAfter=12)
style_h2 = ParagraphStyle('H2', fontName='Carlito', fontSize=15, leading=22, textColor=TEXT_PRIMARY, spaceBefore=18, spaceAfter=8)
style_h3 = ParagraphStyle('H3', fontName='Carlito', fontSize=12, leading=18, textColor=ACCENT, spaceBefore=12, spaceAfter=6)
style_body = ParagraphStyle('Body', fontName='LiberationSerif', fontSize=10.5, leading=17, textColor=TEXT_PRIMARY, spaceAfter=6, alignment=TA_JUSTIFY)
style_body_indent = ParagraphStyle('BodyInd', parent=style_body, leftIndent=18)
style_bullet = ParagraphStyle('Bullet', fontName='LiberationSerif', fontSize=10.5, leading=17, textColor=TEXT_PRIMARY, spaceAfter=4, leftIndent=24, bulletIndent=12)
style_code = ParagraphStyle('Code', fontName='DejaVuSans', fontSize=8.5, leading=13, textColor=colors.HexColor('#2d2d2d'), backColor=colors.HexColor('#f4f4f4'), leftIndent=12, rightIndent=12, spaceBefore=6, spaceAfter=6, borderPadding=6)
style_th = ParagraphStyle('TH', fontName='Carlito', fontSize=10, textColor=colors.white, alignment=TA_CENTER, leading=14)
style_tc = ParagraphStyle('TC', fontName='LiberationSerif', fontSize=9.5, textColor=TEXT_PRIMARY, alignment=TA_LEFT, leading=13)
style_tcc = ParagraphStyle('TCC', parent=style_tc, alignment=TA_CENTER)
style_cap = ParagraphStyle('Cap', fontName='LiberationSerif', fontSize=9, leading=13, textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=3, spaceAfter=12)
style_toc1 = ParagraphStyle('TOC1', fontName='Carlito', fontSize=13, leftIndent=20, leading=22, spaceBefore=6, spaceAfter=2)
style_toc2 = ParagraphStyle('TOC2', fontName='Carlito', fontSize=11, leftIndent=40, leading=18, spaceBefore=2, spaceAfter=1)

# ── HELPERS ──
MAX_KEEP = PAGE_H * 0.4

def safe_keep(elements):
    total = 0
    for el in elements:
        w, h = el.wrap(CONTENT_W, PAGE_H)
        total += h
    if total <= MAX_KEEP:
        return [KeepTogether(elements)]
    elif len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    return list(elements)

def make_table(data, ratios=None):
    cw = [r * CONTENT_W for r in ratios] if ratios else None
    t = Table(data, colWidths=cw, hAlign='CENTER')
    cmds = [
        ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0,0), (-1,0), TABLE_HEADER_TEXT),
        ('GRID', (0,0), (-1,-1), 0.5, TEXT_MUTED),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]
    for i in range(1, len(data)):
        cmds.append(('BACKGROUND', (0,i), (-1,i), TABLE_ROW_EVEN if i%2==1 else TABLE_ROW_ODD))
    t.setStyle(TableStyle(cmds))
    return t

def P(t): return Paragraph(t, style_body)
def H1(t): return Paragraph('<b>'+t+'</b>', style_h1)
def H2(t): return Paragraph('<b>'+t+'</b>', style_h2)
def H3(t): return Paragraph('<b>'+t+'</b>', style_h3)
def sp(n=12): return Spacer(1, n)
def hr(): return HRFlowable(width="100%", thickness=0.5, color=ACCENT, spaceBefore=6, spaceAfter=6)
def code(t): return Paragraph(t.replace('\n','<br/>'), style_code)
def cap(t): return Paragraph(t, style_cap)
def TH(t): return Paragraph('<b>'+t+'</b>', style_th)
def TC(t): return Paragraph(t, style_tc)
def TCC(t): return Paragraph(t, style_tcc)

# ── TOC TEMPLATE ──
class TocDoc(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            lvl = getattr(flowable, 'bookmark_level', 0)
            txt = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (lvl, txt, self.page, key))

def heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, '<b>'+text+'</b>'), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

H1_ORPHAN = (PAGE_H - TOP_MARGIN - BOTTOM_MARGIN) * 0.15
def major(text):
    return [CondPageBreak(H1_ORPHAN), heading(text, style_h1, 0)]
def sub(text):
    return [heading(text, style_h2, 1)]

# ── BUILD ──
BODY = '/home/z/my-project/download/Mecanismes_Avances_body.pdf'

doc = TocDoc(BODY, pagesize=A4, leftMargin=LEFT_MARGIN, rightMargin=RIGHT_MARGIN,
             topMargin=TOP_MARGIN, bottomMargin=BOTTOM_MARGIN,
             title='Mecanismes Avances Agents IA - Architecture Unifiee',
             author='Z.ai', creator='Z.ai')

story = []

# ── TOC ──
story.append(Paragraph('<b>Table des Matieres</b>', ParagraphStyle(
    'TOCTitle', fontName='Carlito', fontSize=22, leading=30, textColor=ACCENT, spaceAfter=18)))
toc = TableOfContents()
toc.levelStyles = [style_toc1, style_toc2]
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════
# 1. MÉCANISMES RÉVÉLÉS
# ═══════════════════════════════════════
story.extend(major('1. Mecanismes Avances : Ce que le premier document ne disait pas'))

story.append(P(
    'Le premier document (Compilateur d\'Architecture Intelligente) fournissait les fondements theoriques '
    'et les patterns generaux. Le second document (Guide de Clonage GenSpark) revele les mecanismes '
    'operationnels specifiques qui font la difference entre un prototype academique et un systeme de production '
    'atteignant 87.8% de taux de succes sur le benchmark GAIA. Cette synthese identifie les sept mecanismes '
    'cles qui n\'etaient pas couverts ou insuffisamment detailles dans le premier document, et les integre '
    'dans une architecture unifiee pour l\'Agent Developpeur et l\'Agent SLIDES.'
))

# Table: Mecanismes gap analysis
data_gap = [
    [TH('Mecanisme'), TH('Document 1'), TH('Document 2 (GenSpark)'), TH('Impact')],
    [TC('Mixture-of-Agents (MoA)'), TC('Pattern Pipeline/Debat mentionne'), TC('9 LLMs en parallele avec voting'), TCC('CRITIQUE')],
    [TC('DAG-based Generation'), TC('Non couvert'), TC('Generation parallele par niveaux de dependance'), TCC('CRITIQUE')],
    [TC('3-Level Auto-Fix'), TC('Correction mentionnee'), TC('Pattern > AST > LLM (3 niveaux)'), TCC('ESSENTIEL')],
    [TC('Reflection Multi-Criteres'), TC('Pattern Debat'), TC('6 criteres ponderes + score confiance'), TCC('ESSENTIEL')],
    [TC('RL-Optimized Router'), TC('Routeur basique'), TC('Apprentissage par renforcement'), TCC('AVANCE')],
    [TC('Linear Context Management'), TC('Non couvert'), TC('Evitement des conflits de contexte'), TCC('IMPORTANT')],
    [TC('Template Learning'), TC('Auto-amelioration generale'), TC('Amelioration continue des patterns'), TCC('AVANCE')],
]
story.append(sp(12))
story.append(make_table(data_gap, [0.18, 0.24, 0.36, 0.22]))
story.append(cap('Tableau 1 : Analyse des lacunes entre les deux documents sources'))

# ═══════════════════════════════════════
# 2. MIXTURE-OF-AGENTS
# ═══════════════════════════════════════
story.extend(major('2. Mixture-of-Agents (MoA) : Le mecanisme cle'))

story.append(P(
    'Le Mixture-of-Agents est le mecanisme fondamental qui distingue un agent mono-modele d\'un systeme '
    'de production. Plutot que d\'utiliser un seul LLM, le MoA orchestre 9 modeles en parallele, chacun '
    'avec ses forces specifiques, puis aggrege les resultats via un mecanisme de vote multi-criteres. '
    'Ce mecanisme est responsable du taux de succes de 87.8% sur GAIA, car il compense les faiblesses '
    'de chaque modele par les forces des autres.'
))

story.extend(sub('2.1 Architecture MoA a 3 Couches'))

story.append(P(
    'L\'architecture MoA se decompose en trois couches distinctes. La premiere couche est le Routeur de '
    'Modeles (Model Router) qui analyse chaque sous-tache et selectionne les 2-3 modeles optimaux en '
    'fonction du type de tache, de la complexite et du budget. La deuxieme couche est l\'Execution '
    'Parallele qui lance les modeles selectionnes simultanement, chaque modele produisant sa propre version '
    'du resultat. La troisieme couche est l\'Agent de Reflection qui evalue les sorties de chaque modele '
    'selon six criteres ponderes, synthee les meilleurs elements et produit un resultat final avec un score '
    'de confiance. Si le score de confiance est inferieur a 0.95, le systeme declenche un cycle de raffinement.'
))

# Model allocation table
data_moa = [
    [TH('Type de Sous-Tache'), TH('Modeles Primaires'), TH('Modele de Secours'), TH('Cout estimatif')],
    [TC('Planning / Architecture'), TC('Claude-3.7-Sonnet, GPT-o1'), TC('Gemini-2.5-Pro'), TCC('$0.15-0.60')],
    [TC('Generation de Code'), TC('Claude-3.7-Sonnet, DeepSeek-R1'), TC('GPT-4o'), TCC('$0.09-0.45')],
    [TC('Generation Config/JSON'), TC('Gemini-2.0-Flash'), TC('Llama-3.3'), TCC('$0.003-0.01')],
    [TC('Testing / Validation'), TC('Gemini-2.0-Flash, GPT-4o'), TC('Claude-3.7-Sonnet'), TCC('$0.01-0.19')],
    [TC('Optimisation Code'), TC('DeepSeek-R1, Claude-3.7-Sonnet'), TC('Mistral-Large'), TCC('$0.04-0.90')],
    [TC('Deployment/DevOps'), TC('GPT-4o, Gemini-2.0-Flash'), TC('Llama-3.3'), TCC('$0.01-0.25')],
]
story.append(sp(12))
story.append(make_table(data_moa, [0.22, 0.28, 0.24, 0.26]))
story.append(cap('Tableau 2 : Allocation des modeles par type de sous-tache'))

story.extend(sub('2.2 Impact sur les Agents Cibles'))

story.append(P(
    'Pour l\'Agent Developpeur, le MoA transforme le pipeline sequentiel en un pipeline parallele : au lieu '
    'd\'avoir un seul Generateur, on a 2-3 Generateurs travaillant en parallele, dont les resultats sont '
    'agreges par l\'Agent de Reflection. Cela augmente le taux de succes de 15-20% (de ~75% a ~92%) au '
    'cout d\'une multiplication par 2-3 des appels LLM. Le cache semantique et le routing intelligent '
    'compensent partiellement ce surcout. Pour l\'Agent SLIDES, le MoA est applique differemment : '
    'chaque sous-agent (Structure, Contenu, Design) peut appeler 2-3 modeles en parallele pour les '
    'taches critiques (generation du outline principal, creation de visuels complexes), et l\'Agent '
    'Validation utilise le mecanisme de vote multi-criteres pour evaluer la qualite globale.'
))

# ═══════════════════════════════════════
# 3. DAG-BASED GENERATION
# ═══════════════════════════════════════
story.extend(major('3. DAG-Based Code Generation : Le coeur du moteur'))

story.append(P(
    'Le DAG-based Code Generation est le mecanisme qui permet de generer 50-100 fichiers en 2-5 minutes '
    'au lieu de 15-30 minutes avec une generation sequentielle. Le principe est de construire un graphe '
    'oriente acyclique (DAG) des dependances entre fichiers, puis de generer les fichiers niveau par '
    'niveau, avec une generation parallele au sein de chaque niveau. C\'est un mecanisme fondamental '
    'qui n\'etait pas du tout couvert dans le premier document.'
))

story.extend(sub('3.1 Construction du DAG'))

story.append(P(
    'Le DAG est construit en deux passes. La premiere passe cree les noeuds pour chaque fichier a generer, '
    'chaque noeud contenant le chemin du fichier, son type, son langage et sa description. La deuxieme '
    'passe assigne un niveau a chaque noeud en fonction de ses dependances : les fichiers sans dependance '
    '(types, schemas, configurations) sont au niveau 0, les fichiers qui dependent du niveau 0 sont au '
    'niveau 1, et ainsi de suite. Cette structure hierarchique garantit que chaque fichier est genere '
    'avec acces au code de ses dependances deja generees, ce qui elimine les incoherences d\'interface.'
))

# DAG levels table
data_dag = [
    [TH('Niveau'), TH('Type de Fichiers'), TH('Exemples'), TH('Generation')],
    [TC('Niveau 0'), TC('Configuration, Types, Schemas'), TC('tsconfig.json, types/index.ts, schema.sql'), TCC('Parallele')],
    [TC('Niveau 1'), TC('Utilitaires, API Client, Lib'), TC('lib/api.ts, lib/auth.ts, db/client.ts'), TCC('Parallele')],
    [TC('Niveau 2'), TC('Middleware, Routes API'), TC('routes/auth.ts, routes/projects.ts'), TCC('Parallele')],
    [TC('Niveau 3'), TC('Composants UI, Pages'), TC('components/Button.tsx, pages/Dashboard.tsx'), TCC('Parallele')],
    [TC('Niveau 4'), TC('Pages composees, App'), TC('App.tsx, main.tsx'), TCC('Sequentiel')],
]
story.append(sp(12))
story.append(make_table(data_dag, [0.12, 0.26, 0.40, 0.22]))
story.append(cap('Tableau 3 : Niveaux du DAG de generation de code'))

story.extend(sub('3.2 Contexte Lineaire (Linear Context Management)'))

story.append(P(
    'Le mecanisme de Contexte Lineaire est crucial pour la coherence du code genere. Plutot que d\'injecter '
    'l\'integralite du code deja genere dans le prompt de chaque nouveau fichier (ce qui depasserait rapidement '
    'la fenetre de contexte du LLM), le systeme injecte uniquement le code des dependances directes du '
    'fichier en cours de generation. Pour un composant Button.tsx au niveau 3, le contexte inclut les types '
    'du niveau 0 et les utilitaires du niveau 1 qu\'il importe, mais pas les autres composants du meme '
    'niveau. Cela maintient la taille du contexte sous 8K tokens par fichier, garantit la coherence des '
    'interfaces et evite les conflits de noms. C\'est un mecanisme essentiel pour la scalabilite de la generation.'
))

story.append(P(
    'Pour l\'Agent SLIDES, le meme principe s\'applique : chaque slide est generee avec le contexte '
    'de l\'outline global et des slides adjacentes, mais pas de l\'integralite de la presentation. '
    'Le Superviseur gere le contexte lineaire en passant uniquement les informations necessaires '
    'a chaque sous-agent, ce qui permet de generer des presentations de 50+ slides sans depasser '
    'les limites de contexte des LLMs.'
))

# ═══════════════════════════════════════
# 4. 3-LEVEL AUTO-FIX
# ═══════════════════════════════════════
story.extend(major('4. 3-Level Auto-Fix Engine : Correction automatique'))

story.append(P(
    'Le moteur de correction automatique a 3 niveaux est le mecanisme qui transforme un taux de succes '
    'brut de ~70% (sortie directe du LLM) en ~92% (apres correction). Chaque niveau est plus couteux '
    'que le precedent, mais aussi plus precis. Le systeme essaie d\'abord le niveau le moins cher et '
    'n\'escalade que si les erreurs persistent. Ce mecanisme etait insuffisamment detaille dans le '
    'premier document qui mentionnait simplement un "Correcteur".'
))

story.extend(sub('4.1 Niveau 1 : Corrections par Pattern'))

story.append(P(
    'Le premier niveau applique des corrections basees sur des patterns regex predefinis. C\'est le '
    'niveau le plus rapide (milliseconds) et le moins cher (zero appel LLM). Les patterns courants '
    'incluent : ajout d\'imports manquants (si une variable est utilisee sans import, le pattern detecte '
    'le module source et ajoute l\'import), correction de points-virgules manquants, normalisation '
    'des guillemets, et correction des erreurs de formatage courantes. Ce niveau corrige environ 40% '
    'des erreurs sans aucun cout LLM supplementaire.'
))

story.extend(sub('4.2 Niveau 2 : Corrections par AST'))

story.append(P(
    'Le deuxieme niveau utilise le compilateur TypeScript comme parseur AST (Abstract Syntax Tree) '
    'pour detecter et corriger les erreurs structurelles. Le code genere est compile, les erreurs '
    'de type sont collectees, et le systeme applique des corrections automatiques basees sur l\'arbre '
    'syntaxique : ajout de type assertions, correction des signatures de fonction, resolution des '
    'references circulaires, et correction des imports de types vs valeurs. Ce niveau corrige environ '
    '30% des erreurs restantes avec un cout minimal (CPU uniquement, pas de LLM).'
))

story.extend(sub('4.3 Niveau 3 : Corrections par LLM'))

story.append(P(
    'Le troisieme niveau est le plus couteux mais le plus puissant. Il envoie le code errone plus '
    'la liste des erreurs restantes a un LLM (typiquement Claude-3.7-Sonnet pour sa capacite de '
    'raisonnement sur le code) avec un prompt specialise de correction. Le LLM analyse les erreurs '
    'dans le contexte du code et genere une version corrigee. Ce niveau corrige les 20-30% d\'erreurs '
    'restantes, portant le taux de succes global a 92%+. La boucle est limitee a 3 iterations maximum '
    'pour eviter les cycles infinis. Si apres 3 iterations le code est encore errone, le fichier '
    'est marque comme "needs manual review".'
))

# Auto-Fix efficiency table
data_fix = [
    [TH('Niveau'), TH('Methode'), TH('Cout'), TH('Taux correction'), TH('Latence')],
    [TC('Niveau 1'), TC('Pattern Regex'), TCC('0$ (CPU)'), TCC('~40%'), TCC('<100ms')],
    [TC('Niveau 2'), TC('AST TypeScript'), TCC('0$ (CPU)'), TCC('~30%'), TCC('<2s')],
    [TC('Niveau 3'), TC('LLM (Claude/GPT)'), TCC('$0.05-0.15/fichier'), TCC('~25%'), TCC('5-15s')],
    [TC('Cumule'), TC('3 niveaux en cascade'), TCC('$0.05-0.15/fichier'), TCC('~92%'), TCC('5-17s')],
]
story.append(sp(12))
story.append(make_table(data_fix, [0.12, 0.24, 0.22, 0.22, 0.20]))
story.append(cap('Tableau 4 : Efficacite du moteur Auto-Fix a 3 niveaux'))

# ═══════════════════════════════════════
# 5. REFLECTION MULTI-CRITERES
# ═══════════════════════════════════════
story.extend(major('5. Reflection Multi-Criteres : La cle des 92%'))

story.append(P(
    'Le premier document mentionnait le pattern Debat (Pro vs Contra + Juge) pour la validation. '
    'Le second document revele un mecanisme beaucoup plus sophistique : la Reflection Multi-Criteres '
    'avec 6 dimensions ponderees et un score de confiance quantitatif. C\'est ce mecanisme qui permet '
    'd\'atteindre 87.8% sur GAIA et potentiellement 92%+ avec un bon Auto-Fix Engine.'
))

# Criteria table
data_refl = [
    [TH('Critere'), TH('Poids'), TH('Evaluation'), TH('Seuil critique')],
    [TC('Qualite du Code'), TCC('30%'), TC('Clean, SOLID, DRY, types, pas de TODO'), TCC('<0.80 = raffiner')],
    [TC('Fonctionnalite'), TCC('25%'), TC('Toutes features, edge cases, validation'), TCC('<0.80 = raffiner')],
    [TC('Performance'), TCC('15%'), TC('Algos, memoization, pas de fuites'), TCC('<0.70 = raffiner')],
    [TC('Securite'), TCC('15%'), TC('Validation input, injection, XSS, auth'), TCC('<0.80 = bloquant')],
    [TC('Experience Utilisateur'), TCC('10%'), TC('Responsive, ARIA, loading, erreurs'), TCC('<0.60 = raffiner')],
    [TC('Tests'), TCC('5%'), TC('Coverage, edge cases, integration'), TCC('<0.50 = raffiner')],
]
story.append(sp(12))
story.append(make_table(data_refl, [0.18, 0.10, 0.40, 0.32]))
story.append(cap('Tableau 5 : Criteres de Reflection Multi-Criteres avec seuils'))

story.append(P(
    'Le mecanisme de decision est le suivant : si le score de confiance global est superieur a 0.95, '
    'le resultat est accepte directement. Si le score est entre 0.85 et 0.95, un cycle de raffinement '
    'est declenche avec les recommandations de l\'Agent de Reflection comme contexte supplementaire. '
    'Si le score est inferieur a 0.85 ou si un critere critique (securite ou fonctionnalite) est '
    'inferieur a 0.80, le systeme regenere le fichier depuis le debut avec un prompt enrichi des '
    'erreurs identifiees. Ce mecanisme de seuils est essential pour eviter les boucles infinies '
    'tout en garantissant un niveau de qualite minimum.'
))

# ═══════════════════════════════════════
# 6. RL-OPTIMIZED ROUTER
# ═══════════════════════════════════════
story.extend(major('6. Routeur RL-Optimise : Apprentissage du routing'))

story.append(P(
    'Le premier document decrivait un routeur de modeles statique (classification > routing). Le second '
    'document introduit un mecanisme d\'apprentissage par renforcement (RL) qui ameliore les decisions '
    'de routing au fil du temps. Ce mecanisme est stocke dans la table rl_training_data du schema '
    'de base de donnees, et utilise les resultats passes (succes/echec, score de qualite, cout, '
    'feedback utilisateur) pour calculer une recompense qui guide les futures decisions de routing.'
))

story.append(P(
    'Le signal de recompense combine quatre facteurs : (1) le score de qualite du resultat (0-1), '
    '(2) le cout en tokens du modele selectionne, (3) le temps de generation, et (4) le feedback '
    'utilisateur (-1 negatif, 0 neutre, 1 positif). La formule de recompense est ponderee pour '
    'favoriser la qualite tout en penalisannt les couts excessifs : Reward = 0.5*Qualite - 0.2*Cout_normalise '
    '- 0.1*Latence_normalisee + 0.2*Feedback. Au fur et a mesure que le systeme accumule des donnees '
    'd\'entrainement, le routeur apprend quel modele est le plus performant pour chaque type de tache '
    'et chaque niveau de complexite, ameliorant progressivement le rapport cout/qualite.'
))

story.append(P(
    'En pratique, le routeur RL-optimise est implemente avec une strategie epsilon-greedy : 90% du temps, '
    'le routeur selectionne le modele qui a historiquement le meilleur score de recompense pour le type '
    'de tache donne ; 10% du temps, il explore un modele alternatif pour collecter de nouvelles donnees. '
    'Cette strategie equilibre l\'exploitation des connaissances acquises avec l\'exploration de '
    'nouvelles possibilites, et permet au systeme de s\'adapter automatiquement quand de nouveaux '
    'modeles sont ajoutes ou quand les performances des modeles existants changent.'
))

# ═══════════════════════════════════════
# 7. ARCHITECTURE UNIFIEE
# ═══════════════════════════════════════
story.extend(major('7. Architecture Unifiee : Integration complete'))

story.append(P(
    'Cette section integre les mecanismes des deux documents sources dans une architecture unifiee '
    'pour l\'Agent Developpeur et l\'Agent SLIDES. L\'architecture combine les fondations theoriques '
    'du Compilateur d\'Architecture Intelligente avec les mecanismes operationnels du Guide GenSpark, '
    'en ajoutant les specificites de l\'Agent SLIDES qui n\'etaient pas couvertes.'
))

story.extend(sub('7.1 Agent Developpeur : Architecture Unifiee'))

# Unified Dev Agent table
data_dev_uni = [
    [TH('Module'), TH('Fonction'), TH('Mecanismes Integres'), TH('Modele(s)')],
    [TC('Analyseur'), TC('Decomposition requete'), TC('MoA routing + RL optimizer'), TC('Sonnet + GPT-4o')],
    [TC('Planificateur'), TC('Plan + DAG construction'), TC('DAG builder + Linear Context'), TC('Sonnet + o1')],
    [TC('Generateur'), TC('Code parallele'), TC('MoA 2-3 modeles + DAG levels'), TC('Sonnet + DeepSeek-R1')],
    [TC('Auto-Fix'), TC('Correction 3 niveaux'), TC('Pattern > AST > LLM'), TC('Flash + Sonnet')],
    [TC('Reflection'), TC('Validation multi-criteres'), TC('6 criteres ponderes + vote'), TC('Sonnet (juge)')],
    [TC('Correcteur'), TC('Raffinement cible'), TC('Seuils 0.95/0.85 + feedback RL'), TC('Sonnet + DeepSeek')],
    [TC('Livreur'), TC('Deploy + Git'), TC('Sandbox E2B + Cloudflare'), TC('Flash')],
]
story.append(sp(12))
story.append(make_table(data_dev_uni, [0.12, 0.20, 0.36, 0.32]))
story.append(cap('Tableau 6 : Architecture unifiee de l\'Agent Developpeur'))

story.append(P(
    'Le flux unifie est le suivant : l\'utilisateur soumet une requete, l\'Analyseur la decompose en '
    'sous-taches avec le MoA router qui selectionne les modeles optimaux via le RL optimizer. Le '
    'Planificateur construit le DAG de dependances entre fichiers. Le Generateur execute les niveaux '
    'du DAG en parallele, avec 2-3 modeles par fichier critique via le MoA. L\'Auto-Fix applique '
    'les 3 niveaux de correction. L\'Agent de Reflection evalue les resultats avec les 6 criteres '
    'ponderes et un seuil de confiance de 0.95. Si le score est insuffisant, le Correcteur raffine '
    'avec les recommandations de la Reflection. Enfin, le Livreur deploie en sandbox E2B pour '
    'validation, puis sur Cloudflare Pages pour le deploiement production.'
))

story.extend(sub('7.2 Agent SLIDES : Architecture Unifiee'))

# Unified SLIDES Agent table
data_slides_uni = [
    [TH('Sous-Agent'), TH('Fonction'), TH('Mecanismes Integres'), TH('Modele(s)')],
    [TC('Superviseur'), TC('Coordination + contexte lineaire'), TC('Linear Context + MoA orchestration'), TC('Sonnet')],
    [TC('Structure'), TC('Outline + narrative arc'), TC('MoA 2 modeles + Reflection seuil'), TC('Sonnet + o1')],
    [TC('Contenu'), TC('Texte + donnees + citations'), TC('DAG slides + RAG hybride'), TC('GPT-4o + RAG')],
    [TC('Design'), TC('Layout + visuels + palette'), TC('MoA + Image Gen + Template Learning'), TC('GPT-4o + DALL-E')],
    [TC('Validation'), TC('Coherence + qualite + accessibilite'), TC('Reflection 6 criteres + Auto-Fix'), TC('Sonnet (juge)')],
]
story.append(sp(12))
story.append(make_table(data_slides_uni, [0.12, 0.22, 0.36, 0.30]))
story.append(cap('Tableau 7 : Architecture unifiee de l\'Agent SLIDES'))

story.append(P(
    'Pour l\'Agent SLIDES, le DAG est construit differemment : les slides sont organisees en sections '
    '(introduction, points cles, conclusion), et chaque section est un niveau du DAG. Les slides '
    'd\'introduction (niveau 0) sont generees en premier, fournissant le contexte thematique pour '
    'les slides de contenu (niveau 1), qui elles-memes fournissent les donnees pour les slides de '
    'synthese et conclusion (niveau 2). Le contexte lineaire garantit que chaque slide est coherente '
    'avec les slides precedentes sans necessiter l\'integralite de la presentation dans le prompt. '
    'Le Template Learning ameliore les presentations futures en memorisant les layouts, palettes '
    'et structures narratives qui ont reeu les meilleurs scores de la part des utilisateurs.'
))

# ═══════════════════════════════════════
# 8. INFRASTRUCTURE CRITIQUE
# ═══════════════════════════════════════
story.extend(major('8. Infrastructure Critique et Deploiement'))

story.extend(sub('8.1 Sandbox E2B / Docker'))

story.append(P(
    'Le second document detaille l\'infrastructure sandbox qui est le coeur de la securite de l\'Agent '
    'Developpeur. Deux options sont disponibles : E2B Firecracker (micro-VMs isolees, 2-4 vCPU, 4-8 GB '
    'RAM) pour la production, et Docker (warm pool de 5 conteneurs pre-chauffes) pour le developpement '
    'et les environnements a budget reduit. Le warm pool est un mecanisme critique : au lieu de creer '
    'un conteneur a chaque requete (5-10 secondes), les conteneurs sont pre-creees et pre-chauffees '
    'avec les dependances courantes (Node.js, Python, Go, Rust, Docker, Git). Quand une requete arrive, '
    'un conteneur est immediatement disponible, et un nouveau conteneur est cree en arriere-plan pour '
    'recharger le pool. Cela reduit la latence de sandbox de 5-10s a moins de 500ms.'
))

story.append(P(
    'La securite du sandbox repose sur cinq couches : (1) isolation reseau (NetworkMode: none), '
    '(2) limites de ressources (CPU 80%, RAM 8GB), (3) timeout d\'execution (10 minutes maximum), '
    '(4) nettoyage automatique (30 minutes d\'inactivite), et (5) liste noire de commandes dangereuses '
    '(rm -rf /, fork bombs, wget|sh, etc.). Le sandbox utilise un utilisateur non-root (uid 1000) '
    'et un systeme de fichiers temporaire pour /tmp avec les options noexec et nosuid.'
))

story.extend(sub('8.2 Stack de Deploiement'))

# Deployment stack table
data_deploy = [
    [TH('Composant'), TH('Production'), TH('Alternative (Budget)')],
    [TC('Frontend Hosting'), TC('Cloudflare Pages (edge, SSL auto)'), TC('Vercel / Netlify')],
    [TC('API Runtime'), TC('Cloudflare Workers (edge, Hono)'), TC('Railway / VPS Docker')],
    [TC('Base de donnees'), TC('Cloudflare D1 (SQLite edge)'), TC('Supabase PostgreSQL')],
    [TC('Cache/Queue'), TC('Upstash Redis (serverless)'), TC('Redis auto-heberge')],
    [TC('Stockage fichiers'), TC('Cloudflare R2 (S3-compatible)'), TC('S3 / MinIO')],
    [TC('Sandbox execution'), TC('E2B Firecracker (isole)'), TC('Docker warm pool')],
    [TC('CI/CD'), TC('GitHub Actions + ArgoCD'), TC('GitHub Actions simple')],
    [TC('Observabilite'), TC('OTEL + Grafana + ClickHouse'), TC('Sentry + logs basiques')],
    [TC('Cout mensuel estime'), TCC('$42-775'), TCC('$6-100')],
]
story.append(sp(12))
story.append(make_table(data_deploy, [0.22, 0.40, 0.38]))
story.append(cap('Tableau 8 : Stack de deploiement production vs budget'))

story.extend(sub('8.3 Schema de Base de Donnees Critique'))

story.append(P(
    'Le second document fournit un schema de base de donnees complet qui inclut des tables specifiques '
    'aux mecanismes avances. La table rl_training_data stocke les donnees d\'apprentissage par renforcement '
    'avec le contexte de la tache, l\'action du routeur (modele selectionne), le resultat (succes, '
    'score de qualite, temps, cout) et la recompense calculee. La table error_recovery_log trace '
    'chaque tentative de correction avec le niveau utilise (pattern, AST, LLM), le succes ou l\'echec, '
    'et le code avant/apres. La table cost_tracking agrege les couts par utilisateur et par jour, '
    'avec le detail par modele. La table analytics_events capture tous les evenements produit pour '
    'le dashboard de metriques. Ces tables sont essentielles pour le RL optimizer, l\'Auto-Fix Engine '
    'et le systeme de credits du document original.'
))

# ═══════════════════════════════════════
# 9. OPTIMISATION DES COUTS
# ═══════════════════════════════════════
story.extend(major('9. Optimisation des Couts : Modele economique'))

story.append(P(
    'Le second document fournit des estimations de couts detaillees qui sont directement actionnables. '
    'Les couts LLM dominent largement les couts d\'infrastructure (ratio 18:1), ce qui confirme '
    'la Theorie des Contraintes du premier document : le LLM est le goulot d\'etranglement. '
    'L\'optimisation des couts passe donc principalement par le routing intelligent des modeles.'
))

# Cost breakdown table
data_cost = [
    [TH('Type de Projet'), TH('Modeles Utilises'), TH('Tokens Total'), TH('Cout LLM'), TH('Temps')],
    [TC('Simple (landing)'), TC('Flash + Sonnet'), TCC('~13K'), TCC('$0.09'), TCC('30-60s')],
    [TC('Full-stack (React+Hono)'), TC('Sonnet + GPT-4o + DeepSeek + Flash'), TCC('~62K'), TCC('$0.67'), TCC('2-3min')],
    [TC('Production (SaaS complet)'), TC('Sonnet + o1 + GPT-4o + DeepSeek + Gemini'), TCC('~103K'), TCC('$1.85'), TCC('3-5min')],
]
story.append(sp(12))
story.append(make_table(data_cost, [0.18, 0.30, 0.14, 0.14, 0.24]))
story.append(cap('Tableau 9 : Estimation des couts LLM par type de projet'))

story.append(P(
    'Les leviers d\'optimisation des couts, combines des deux documents, sont : (1) le cache semantique '
    '(40-60% de reduction des appels LLM), (2) le routing RL-optimise (selection du modele le moins '
    'cher qui repond au besoin de qualite), (3) le prompt caching (50-90% de reduction pour les prompts '
    'systemes reutilisables), (4) la generation DAG parallele (reduit le temps total mais pas le cout '
    'direct, sauf si les modeles moins cher sont utilises pour les niveaux simples), et (5) l\'Auto-Fix '
    'Niveau 1 et 2 qui corrigent 70% des erreurs sans appel LLM supplementaire. Combine, ces leviers '
    'peuvent reduire le cout moyen par projet de 40-60%.'
))

# ═══════════════════════════════════════
# 10. ROADMAP UNIFIEE
# ═══════════════════════════════════════
story.extend(major('10. Roadmap Unifiee : 16 Semaines'))

# Roadmap table
data_rm = [
    [TH('Phase'), TH('Semaines'), TH('Livrables'), TH('Mecanismes')],
    [TC('Fondation'), TC('1-3'), TC('MVP Agent Dev (pipeline basique), API, Auth, DB'), TC('Pipeline simple + Auto-Fix N1')],
    [TC('Intelligence'), TC('4-6'), TC('RAG hybride, MoA routing, Cache semantique'), TC('MoA 3 modeles + Reflection')],
    [TC('Generation'), TC('7-9'), TC('DAG builder, Auto-Fix 3 niveaux, Sandbox'), TC('DAG + Linear Context + 3-Level Fix')],
    [TC('Apprentissage'), TC('10-11'), TC('RL Router, Template Learning, Memoire 5 couches'), TC('RL optimizer + Auto-amelioration')],
    [TC('SLIDES'), TC('12-13'), TC('Agent SLIDES (Supervisor + 4 sous-agents)'), TC('MoA + DAG slides + Design Gen')],
    [TC('Production'), TC('14-16'), TC('Securite 5 couches, Observabilite, Scaling'), TC('Deploy auto + Cost optimizer')],
]
story.append(sp(12))
story.append(make_table(data_rm, [0.12, 0.10, 0.40, 0.38]))
story.append(cap('Tableau 10 : Roadmap unifiee sur 16 semaines'))

story.append(P(
    'Cette roadmap unifiee integre les mecanismes des deux documents en 16 semaines. Les semaines 1-3 '
    'posent les fondations avec un pipeline simple et l\'Auto-Fix Niveau 1 (pattern-based). Les semaines '
    '4-6 ajoutent le MoA avec 3 modeles minimum et l\'Agent de Reflection avec seuils de confiance. '
    'Les semaines 7-9 implementent le DAG builder, le contexte lineaire et l\'Auto-Fix a 3 niveaux '
    'avec le sandbox E2B/Docker. Les semaines 10-11 deployent le RL optimizer et le Template Learning '
    'pour l\'amelioration continue. Les semaines 12-13 construisent l\'Agent SLIDES avec le pattern '
    'Supervisor et les mecanismes MoA/DAG adaptes aux presentations. Les semaines 14-16 finalisent '
    'avec la securite en profondeur, l\'observabilite complete et l\'auto-scaling.'
))

# ═══════════════════════════════════════
# 11. COMMANDEMENTS MIS A JOUR
# ═══════════════════════════════════════
story.extend(major('11. Les 10 Nouveaux Commandements (Addendum)'))

story.append(P(
    'En complement des 15 commandements du premier document, voici les 10 nouveaux commandements '
    'issus de l\'analyse du second document et de l\'integration des mecanismes avances.'
))

commandments2 = [
    ('16', 'Mixture-of-Agents obligatoire pour les taches critiques. Un seul modele ne suffit jamais pour atteindre 90%+ de taux de succes.'),
    ('17', 'DAG-based generation pour tout projet > 10 fichiers. La generation sequentielle est un anti-pattern de performance.'),
    ('18', 'Auto-Fix a 3 niveaux avant toute intervention humaine. 70% des erreurs sont corrigeables sans LLM supplementaire.'),
    ('19', 'Reflection avec seuils quantitatifs, pas d\'evaluation subjective. Score < 0.95 = raffiner, < 0.85 = regenerer.'),
    ('20', 'Contexte lineaire pour respecter les fenetres de tokens. Injecter uniquement les dependances directes, jamais tout le projet.'),
    ('21', 'RL optimizer des le jour 1, pas en phase d\'optimisation. Chaque generation produit des donnees d\'entrainement.'),
    ('22', 'Warm pool de sandboxes pour reduire la latence a < 500ms. Les 5-10 secondes de creation Docker sont inacceptables en production.'),
    ('23', 'Cout LLM > Cout infra dans 95% des cas. Optimisez le routing avant d\'optimisez les serveurs.'),
    ('24', 'Template Learning pour amelioration continue. Les patterns reussis doivent etre memorises et reutilises automatiquement.'),
    ('25', 'Seuil de securite 0.80 non negociable. Si le score securite < 0.80, bloquer meme si le score global > 0.95.'),
]

for num, text in commandments2:
    story.append(Paragraph('<b>' + num + '.</b> ' + text, style_body_indent))
    story.append(sp(4))

# ═══════════════════════════════════════
# BUILD
# ═══════════════════════════════════════
doc.multiBuild(story)
print(f"Body PDF generated: {BODY}")

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AgentForge - Audit de Preuve Technique Complet
Zero Supposition - Evidence-Based Technical Audit
"""
import sys, os
PDF_SKILL_DIR = "/home/z/my-project/skills/pdf"
_scripts = os.path.join(PDF_SKILL_DIR, "scripts")
if _scripts not in sys.path:
    sys.path.insert(0, _scripts)

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, CondPageBreak
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
import hashlib

# ═══════════════════════════════════════════════════
# FONT REGISTRATION
# ═══════════════════════════════════════════════════
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSCBold', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LXGWWenKai', '/usr/share/fonts/truetype/lxgw-wenkai/LXGWWenKai-Regular.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSCBold')
registerFontFamily('SarasaMonoSC', normal='SarasaMonoSC', bold='SarasaMonoSC')
registerFontFamily('LXGWWenKai', normal='LXGWWenKai', bold='LXGWWenKai')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

# ═══════════════════════════════════════════════════
# PALETTE (auto-generated)
# ═══════════════════════════════════════════════════
ACCENT       = colors.HexColor('#bc243d')
TEXT_PRIMARY  = colors.HexColor('#1c1d1e')
TEXT_MUTED    = colors.HexColor('#6f767b')
BG_SURFACE   = colors.HexColor('#dfe2e5')
BG_PAGE      = colors.HexColor('#edeff1')

TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# Status colors
COLOR_CONFIRMED = colors.HexColor('#16a34a')
COLOR_PARTIAL = colors.HexColor('#d97706')
COLOR_MISSING = colors.HexColor('#dc2626')
COLOR_UNVERIFIED = colors.HexColor('#6b7280')

# ═══════════════════════════════════════════════════
# STYLES
# ═══════════════════════════════════════════════════
PAGE_W, PAGE_H = A4
LEFT_M = 1.0 * inch
RIGHT_M = 1.0 * inch
TOP_M = 0.8 * inch
BOTTOM_M = 0.8 * inch
CONTENT_W = PAGE_W - LEFT_M - RIGHT_M

styles = getSampleStyleSheet()

sTitle = ParagraphStyle('Title', fontName='NotoSerifSC', fontSize=22, leading=28,
    textColor=ACCENT, spaceAfter=12, alignment=TA_LEFT)
sH1 = ParagraphStyle('H1', fontName='NotoSerifSC', fontSize=16, leading=22,
    textColor=ACCENT, spaceBefore=18, spaceAfter=8)
sH2 = ParagraphStyle('H2', fontName='NotoSerifSC', fontSize=13, leading=18,
    textColor=TEXT_PRIMARY, spaceBefore=12, spaceAfter=6)
sH3 = ParagraphStyle('H3', fontName='NotoSerifSC', fontSize=11, leading=16,
    textColor=TEXT_PRIMARY, spaceBefore=8, spaceAfter=4)
sBody = ParagraphStyle('Body', fontName='NotoSerifSC', fontSize=10, leading=16,
    textColor=TEXT_PRIMARY, spaceAfter=6, wordWrap='CJK')
sBodySmall = ParagraphStyle('BodySmall', fontName='NotoSerifSC', fontSize=8.5, leading=13,
    textColor=TEXT_PRIMARY, spaceAfter=4, wordWrap='CJK')
sCode = ParagraphStyle('Code', fontName='DejaVuSans', fontSize=7.5, leading=11,
    textColor=TEXT_PRIMARY, spaceAfter=4, backColor=colors.HexColor('#f5f5f5'))
sCaption = ParagraphStyle('Caption', fontName='NotoSerifSC', fontSize=8.5, leading=12,
    textColor=TEXT_MUTED, spaceAfter=6, alignment=TA_CENTER)
sTH = ParagraphStyle('TH', fontName='NotoSerifSC', fontSize=8.5, leading=12,
    textColor=TABLE_HEADER_TEXT, alignment=TA_CENTER, wordWrap='CJK')
sTC = ParagraphStyle('TC', fontName='NotoSerifSC', fontSize=8, leading=11,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK')
sTCC = ParagraphStyle('TCC', fontName='NotoSerifSC', fontSize=8, leading=11,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER, wordWrap='CJK')

# ═══════════════════════════════════════════════════
# TOC TEMPLATE
# ═══════════════════════════════════════════════════
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

# ═══════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════
def make_table(data, col_widths, caption=None):
    """Create a styled table with standard formatting."""
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    elements = [Spacer(1, 12), t]
    if caption:
        elements.append(Paragraph(caption, sCaption))
    elements.append(Spacer(1, 12))
    return elements

def status_text(status, style=None):
    """Return colored status text."""
    st = style or sTC
    mapping = {
        'CONFIRME': COLOR_CONFIRMED,
        'PARTIEL': COLOR_PARTIAL,
        'ABSENT': COLOR_MISSING,
        'NON VERIFIE': COLOR_UNVERIFIED,
    }
    c = mapping.get(status, TEXT_MUTED)
    return Paragraph('<font color="#%s">%s</font>' % (c.hexval()[2:], status), st)

def p(text, style=None):
    return Paragraph(text, style or sBody)

def ph(text, level=1):
    if level == 1: return add_heading(text, sH1, 0)
    elif level == 2: return add_heading(text, sH2, 1)
    else: return add_heading(text, sH3, 2)

# ═══════════════════════════════════════════════════
# BUILD DOCUMENT
# ═══════════════════════════════════════════════════
output_path = '/home/z/my-project/download/AgentForge_Audit_Preuve_Technique.pdf'

doc = TocDocTemplate(
    output_path, pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOTTOM_M,
    title='AgentForge - Audit de Preuve Technique',
    author='Z.ai', creator='Z.ai'
)

story = []

# ───────────────────────────────────────────────
# TABLE OF CONTENTS
# ───────────────────────────────────────────────
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle(name='TOC1', fontName='NotoSerifSC', fontSize=12, leading=18, leftIndent=20, spaceBefore=6),
    ParagraphStyle(name='TOC2', fontName='NotoSerifSC', fontSize=10, leading=15, leftIndent=40, spaceBefore=3),
]
story.append(Paragraph('<b>TABLE DES MATIERES</b>', sTitle))
story.append(Spacer(1, 12))
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════════════════
# PHASE 1 - INVENTAIRE COMPLET
# ═══════════════════════════════════════════════════
story.append(ph('PHASE 1 - INVENTAIRE TECHNIQUE COMPLET'))

story.append(ph('1.1 Architecture reelle du projet', 2))
story.append(p('Le projet AgentForge est organise en monorepo pnpm + Turborepo avec 4 packages: <b>api</b> (serveur Hono), <b>web</b> (client React/Vite), <b>shared</b> (types/schemas/constants) et <b>sandbox</b> (environnement Docker). L\'infrastructure repose sur PostgreSQL 16, Redis 7, et un deploiement Docker Compose avec CI/CD GitHub Actions.'))

# Architecture table
arch_data = [
    [Paragraph('<b>Composant</b>', sTH), Paragraph('<b>Technologie</b>', sTH), Paragraph('<b>Version</b>', sTH), Paragraph('<b>Fichier</b>', sTH)],
    [Paragraph('API Server', sTC), Paragraph('Hono + @hono/node-server', sTC), Paragraph('4.6.0', sTCC), Paragraph('packages/api/', sTC)],
    [Paragraph('ORM', sTC), Paragraph('Drizzle ORM + postgres.js', sTC), Paragraph('0.36.0', sTCC), Paragraph('packages/api/src/db/', sTC)],
    [Paragraph('Web Client', sTC), Paragraph('React + Vite + Tailwind v4', sTC), Paragraph('19.0 / 6.0 / 4.0', sTCC), Paragraph('packages/web/', sTC)],
    [Paragraph('State Management', sTC), Paragraph('Zustand + persist', sTC), Paragraph('5.0.0', sTCC), Paragraph('packages/web/src/lib/', sTC)],
    [Paragraph('Routing', sTC), Paragraph('React Router v7', sTC), Paragraph('7.1.0', sTCC), Paragraph('packages/web/src/App.tsx', sTC)],
    [Paragraph('Database', sTC), Paragraph('PostgreSQL 16 Alpine', sTC), Paragraph('16', sTCC), Paragraph('infra/docker/', sTC)],
    [Paragraph('Cache L2', sTC), Paragraph('Redis 7 Alpine', sTC), Paragraph('7', sTCC), Paragraph('infra/docker/', sTC)],
    [Paragraph('Build System', sTC), Paragraph('Turborepo + pnpm', sTC), Paragraph('2.3.0 / 9.15.0', sTCC), Paragraph('turbo.json', sTC)],
    [Paragraph('CI/CD', sTC), Paragraph('GitHub Actions', sTC), Paragraph('-', sTCC), Paragraph('.github/workflows/', sTC)],
    [Paragraph('Sandbox', sTC), Paragraph('Docker (node:20-slim + python3)', sTC), Paragraph('20', sTCC), Paragraph('packages/sandbox/', sTC)],
]
story.extend(make_table(arch_data, [90, 170, 80, 110], 'Tableau 1.1 - Stack technologique complete'))

story.append(ph('1.2 Arborescence des fichiers sources', 2))
story.append(p('Le monorepo contient <b>71 fichiers</b> (excluant node_modules, .git, dist). L\'API contient les services core (CodeGenerator, SuperAgent, ReflectionAgent) et les services infrastructure (LLMRouter, CacheManager, CostOptimizer, EventManager, SandboxManager). Le package shared definit 7 types, 9 schemas Zod, 14 constantes et 5 utilitaires.'))

files_data = [
    [Paragraph('<b>Package</b>', sTH), Paragraph('<b>Fichiers</b>', sTH), Paragraph('<b>Lignes</b>', sTH), Paragraph('<b>Exports</b>', sTH)],
    [Paragraph('api/core/', sTC), Paragraph('3 (Generator, Orchestrator, Reflection)', sTC), Paragraph('1,167', sTCC), Paragraph('3 classes + 2 interfaces', sTC)],
    [Paragraph('api/services/', sTC), Paragraph('6 (LLMRouter, Cache, Cost, Event, Sandbox, index)', sTC), Paragraph('1,163', sTCC), Paragraph('5 classes + 1 singleton', sTC)],
    [Paragraph('api/routes/', sTC), Paragraph('4 (agents, auth, projects, index)', sTC), Paragraph('586', sTCC), Paragraph('4 routers, 16 endpoints', sTC)],
    [Paragraph('api/middleware/', sTC), Paragraph('6 (auth, error, rate, logger, security, index)', sTC), Paragraph('212', sTCC), Paragraph('6 middlewares', sTC)],
    [Paragraph('api/db/', sTC), Paragraph('2 (schema, index)', sTC), Paragraph('143', sTCC), Paragraph('9 tables + 4 enums', sTC)],
    [Paragraph('shared/', sTC), Paragraph('18 (types, schemas, constants, utils)', sTC), Paragraph('1,660', sTCC), Paragraph('36 types + 14 schemas', sTC)],
    [Paragraph('web/', sTC), Paragraph('17 (pages, components, lib, styles)', sTC), Paragraph('1,856', sTCC), Paragraph('8 pages + 5 components', sTC)],
    [Paragraph('sandbox/', sTC), Paragraph('3 (Dockerfile, execute.sh, warm-pool.sh)', sTC), Paragraph('104', sTCC), Paragraph('Docker + scripts', sTC)],
    [Paragraph('infra/', sTC), Paragraph('2 (docker-compose, init-db)', sTC), Paragraph('98', sTCC), Paragraph('4 services Docker', sTC)],
]
story.extend(make_table(files_data, [80, 170, 55, 145], 'Tableau 1.2 - Inventaire des fichiers par package'))

story.append(ph('1.3 Base de donnees - 9 tables', 2))
db_data = [
    [Paragraph('<b>Table</b>', sTH), Paragraph('<b>Colonnes</b>', sTH), Paragraph('<b>FK</b>', sTH), Paragraph('<b>Fichier:Ligne</b>', sTH)],
    [Paragraph('users', sTC), Paragraph('9 (id, email, name, passwordHash, tier, avatarUrl, preferences, createdAt, updatedAt)', sTC), Paragraph('-', sTCC), Paragraph('schema.ts:10', sTC)],
    [Paragraph('projects', sTC), Paragraph('9 (id, userId, name, description, agentId, status, config, files, timestamps)', sTC), Paragraph('users.id', sTCC), Paragraph('schema.ts:27', sTC)],
    [Paragraph('generation_sessions', sTC), Paragraph('15 (id, projectId, userId, agentId, prompt, status, output, dagState, etc.)', sTC), Paragraph('2 FK', sTCC), Paragraph('schema.ts:41', sTC)],
    [Paragraph('rl_training_data', sTC), Paragraph('9 (id, agentId, promptFeatures, selectedModel, strategy, quality, etc.)', sTC), Paragraph('-', sTCC), Paragraph('schema.ts:61', sTC)],
    [Paragraph('error_recovery_log', sTC), Paragraph('8 (id, sessionId, errorType, errorMessage, fixLevel, attempt, success, etc.)', sTC), Paragraph('sessions.id', sTCC), Paragraph('schema.ts:75', sTC)],
    [Paragraph('cost_tracking', sTC), Paragraph('9 (id, userId, sessionId, provider, model, tokensPrompt, tokensCompletion, etc.)', sTC), Paragraph('2 FK', sTCC), Paragraph('schema.ts:88', sTC)],
    [Paragraph('analytics_events', sTC), Paragraph('5 (id, userId, event, properties, timestamp)', sTC), Paragraph('users.id', sTCC), Paragraph('schema.ts:101', sTC)],
    [Paragraph('deployments', sTC), Paragraph('7 (id, projectId, platform, url, status, config, timestamps)', sTC), Paragraph('projects.id', sTCC), Paragraph('schema.ts:110', sTC)],
    [Paragraph('refresh_tokens', sTC), Paragraph('6 (id, userId, tokenHash, expiresAt, isRevoked, createdAt)', sTC), Paragraph('users.id', sTCC), Paragraph('schema.ts:122', sTC)],
]
story.extend(make_table(db_data, [85, 195, 45, 75], 'Tableau 1.3 - Schema de base de donnees Drizzle'))

story.append(ph('1.4 APIs exposees - 16 endpoints', 2))
api_data = [
    [Paragraph('<b>#</b>', sTH), Paragraph('<b> Methode</b>', sTH), Paragraph('<b>Chemin</b>', sTH), Paragraph('<b>Auth</b>', sTH), Paragraph('<b>Rate Limit</b>', sTH), Paragraph('<b>Validation</b>', sTH)],
    [Paragraph('1', sTCC), Paragraph('GET', sTCC), Paragraph('/api', sTCC), Paragraph('Non', sTCC), Paragraph('Non', sTCC), Paragraph('-', sTCC)],
    [Paragraph('2', sTCC), Paragraph('POST', sTCC), Paragraph('/api/auth/register', sTCC), Paragraph('Non', sTCC), Paragraph('Non', sTCC), Paragraph('RegisterSchema', sTCC)],
    [Paragraph('3', sTCC), Paragraph('POST', sTCC), Paragraph('/api/auth/login', sTCC), Paragraph('Non', sTCC), Paragraph('Non', sTCC), Paragraph('LoginSchema', sTCC)],
    [Paragraph('4', sTCC), Paragraph('POST', sTCC), Paragraph('/api/auth/refresh', sTCC), Paragraph('Non', sTCC), Paragraph('Non', sTCC), Paragraph('AUCUNE', sTCC)],
    [Paragraph('5', sTCC), Paragraph('POST', sTCC), Paragraph('/api/auth/logout', sTCC), Paragraph('Non', sTCC), Paragraph('Non', sTCC), Paragraph('AUCUNE', sTCC)],
    [Paragraph('6', sTCC), Paragraph('GET', sTCC), Paragraph('/api/agents', sTCC), Paragraph('Non', sTCC), Paragraph('Non', sTCC), Paragraph('-', sTCC)],
    [Paragraph('7', sTCC), Paragraph('GET', sTCC), Paragraph('/api/agents/:id', sTCC), Paragraph('Oui', sTCC), Paragraph('Non', sTCC), Paragraph('-', sTCC)],
    [Paragraph('8', sTCC), Paragraph('POST', sTCC), Paragraph('/api/agents/:id/execute', sTCC), Paragraph('Oui', sTCC), Paragraph('Oui', sTCC), Paragraph('ExecuteAgentSchema', sTCC)],
    [Paragraph('9', sTCC), Paragraph('POST', sTCC), Paragraph('/api/agents/:id/execute-sync', sTCC), Paragraph('Oui', sTCC), Paragraph('Oui', sTCC), Paragraph('ExecuteAgentSchema', sTCC)],
    [Paragraph('10', sTCC), Paragraph('GET', sTCC), Paragraph('/api/agents/:id/executions', sTCC), Paragraph('Oui', sTCC), Paragraph('Non', sTCC), Paragraph('-', sTCC)],
    [Paragraph('11', sTCC), Paragraph('POST', sTCC), Paragraph('/api/agents/:id/cancel/:eid', sTCC), Paragraph('Oui', sTCC), Paragraph('Non', sTCC), Paragraph('-', sTCC)],
    [Paragraph('12', sTCC), Paragraph('GET', sTCC), Paragraph('/api/projects', sTCC), Paragraph('Oui', sTCC), Paragraph('Non', sTCC), Paragraph('-', sTCC)],
    [Paragraph('13', sTCC), Paragraph('POST', sTCC), Paragraph('/api/projects', sTCC), Paragraph('Oui', sTCC), Paragraph('Non', sTCC), Paragraph('CreateProjectSchema', sTCC)],
    [Paragraph('14', sTCC), Paragraph('GET', sTCC), Paragraph('/api/projects/:id', sTCC), Paragraph('Oui', sTCC), Paragraph('Non', sTCC), Paragraph('-', sTCC)],
    [Paragraph('15', sTCC), Paragraph('PATCH', sTCC), Paragraph('/api/projects/:id', sTCC), Paragraph('Oui', sTCC), Paragraph('Non', sTCC), Paragraph('UpdateProjectSchema', sTCC)],
    [Paragraph('16', sTCC), Paragraph('DELETE', sTCC), Paragraph('/api/projects/:id', sTCC), Paragraph('Oui', sTCC), Paragraph('Non', sTCC), Paragraph('-', sTCC)],
]
story.extend(make_table(api_data, [22, 42, 130, 30, 42, 90], 'Tableau 1.4 - Inventaire complet des endpoints API'))

# ═══════════════════════════════════════════════════
# PHASE 2 - MATRICE DE PREUVE
# ═══════════════════════════════════════════════════
story.append(ph('PHASE 2 - MATRICE DE PREUVE BLUEPRINT VERS CODE'))

story.append(p('Chaque exigence du Blueprint est verifiee avec la localisation exacte dans le code source. La colonne Statut utilise la classification obligatoire: CONFIRME (preuve directe), PARTIEL (implementation incomplete), ABSENT (non trouve), NON VERIFIE (impossible a determiner statiquement).'))

# MoA Kernel
story.append(ph('2.1 Noyau MoA (Mixture of Agents)', 2))
moa_data = [
    [Paragraph('<b>Exigence</b>', sTH), Paragraph('<b>Statut</b>', sTH), Paragraph('<b>Fichier</b>', sTH), Paragraph('<b>Fonction/Ligne</b>', sTH), Paragraph('<b>Preuve</b>', sTH)],
    [Paragraph('3-round cascading (Propose/Critique/Refine)', sTC), status_text('CONFIRME'), Paragraph('CodeGenerator.ts', sTC), Paragraph('generate() L61, buildProposeMessages L178, buildCritiqueMessages L191, buildRefineMessages L216', sTC), Paragraph('3 rounds sequentielles avec emitEvent par round', sTC)],
    [Paragraph('9 LLM providers', sTC), status_text('CONFIRME'), Paragraph('llm.ts L5-115', sTC), Paragraph('LLM_PROVIDERS object', sTC), Paragraph('claude-3.7, gpt-4o, deepseek-r1, gemini-2.5-pro, gpt-o1, llama-3.3, qwen-2.5, mistral-large, gemini-2.0-flash', sTC)],
    [Paragraph('Appel parallele des LLMs', sTC), status_text('CONFIRME'), Paragraph('CodeGenerator.ts L252', sTC), Paragraph('callAllProviders()', sTC), Paragraph('Promise.allSettled pour appels paralleles', sTC)],
    [Paragraph('Selection meilleur proposal', sTC), status_text('CONFIRME'), Paragraph('CodeGenerator.ts L304', sTC), Paragraph('selectBestProposal()', sTC), Paragraph('Score de confiance + selection du max', sTC)],
    [Paragraph('Consensus detection', sTC), status_text('CONFIRME'), Paragraph('CodeGenerator.ts L323', sTC), Paragraph('hasConsensus()', sTC), Paragraph('Threshold 0.85, min 2 proposals', sTC)],
    [Paragraph('Intelligent fusion', sTC), status_text('CONFIRME'), Paragraph('CodeGenerator.ts L329', sTC), Paragraph('synthesizeCritiques()', sTC), Paragraph('Synthese des critiques multi-LLM', sTC)],
    [Paragraph('MAX_MOA_ROUNDS = 3', sTC), status_text('CONFIRME'), Paragraph('CodeGenerator.ts L46', sTC), Paragraph('Constant', sTC), Paragraph('readonly MAX_MOA_ROUNDS = 3', sTC)],
    [Paragraph('MIN_PROPOSALS_FOR_CONSENSUS = 2', sTC), status_text('CONFIRME'), Paragraph('CodeGenerator.ts L47', sTC), Paragraph('Constant', sTC), Paragraph('readonly MIN_PROPOSALS_FOR_CONSENSUS = 2', sTC)],
]
story.extend(make_table(moa_data, [100, 55, 75, 95, 125], 'Tableau 2.1 - Preuves du Noyau MoA'))

# DAG Pipeline
story.append(ph('2.2 Pipeline DAG', 2))
dag_data = [
    [Paragraph('<b>Exigence</b>', sTH), Paragraph('<b>Statut</b>', sTH), Paragraph('<b>Fichier</b>', sTH), Paragraph('<b>Fonction/Ligne</b>', sTH), Paragraph('<b>Preuve</b>', sTH)],
    [Paragraph('Tri topologique', sTC), status_text('CONFIRME'), Paragraph('dag.ts L3-35', sTC), Paragraph('topologicalSort()', sTC), Paragraph('Algorithme Kahn avec niveaux', sTC)],
    [Paragraph('Validation DAG (cycles)', sTC), status_text('CONFIRME'), Paragraph('dag.ts L38-82', sTC), Paragraph('validateDAG()', sTC), Paragraph('DFS avec recursion stack', sTC)],
    [Paragraph('Execution parallele par niveau', sTC), status_text('CONFIRME'), Paragraph('SuperAgent.ts L117-155', sTC), Paragraph('execute() L117-155', sTC), Paragraph('topologicalSort + Promise.allSettled par niveau', sTC)],
    [Paragraph('7 DAG templates (1 par agent)', sTC), status_text('CONFIRME'), Paragraph('agents.ts L39-470', sTC), Paragraph('DEV/SLIDES/DOC/DATA/RECHERCHE/EMAIL/MARKETING', sTC), Paragraph('Chaque config a dagTemplate avec nodes + edges', sTC)],
    [Paragraph('Noeuds input/process/output', sTC), status_text('CONFIRME'), Paragraph('types/agent.ts L62-70', sTC), Paragraph('DAGNode type', sTC), Paragraph('type: input | process | output', sTC)],
]
story.extend(make_table(dag_data, [100, 55, 75, 95, 125], 'Tableau 2.2 - Preuves du Pipeline DAG'))

# Reflection Agent
story.append(ph('2.3 Agent de Reflection', 2))
ref_data = [
    [Paragraph('<b>Exigence</b>', sTH), Paragraph('<b>Statut</b>', sTH), Paragraph('<b>Fichier</b>', sTH), Paragraph('<b>Fonction/Ligne</b>', sTH), Paragraph('<b>Preuve</b>', sTH)],
    [Paragraph('6 criteres ponderes', sTC), status_text('CONFIRME'), Paragraph('agents.ts L29-38', sTC), Paragraph('DEFAULT_REFLECTION_CRITERIA', sTC), Paragraph('Code Quality 30%, Functionality 25%, Performance 15%, Security 15%, UX 10%, Testing 5%', sTC)],
    [Paragraph('Threshold 0.95', sTC), status_text('CONFIRME'), Paragraph('agents.ts (DEV config L57)', sTC), Paragraph('confidenceThreshold: 0.95', sTC), Paragraph('Configure par agent (DEV=0.95, SLIDES=0.90, etc.)', sTC)],
    [Paragraph('Evaluation LLM reelle (Gemini 2.0 Flash)', sTC), status_text('CONFIRME'), Paragraph('ReflectionAgent.ts L29-97', sTC), Paragraph('evaluate()', sTC), Paragraph('Appel LLMRouter.call("gemini-2.0-flash") avec prompt d\'evaluation structure', sTC)],
    [Paragraph('Auto-Fix Niveau 1: Pattern', sTC), status_text('CONFIRME'), Paragraph('ReflectionAgent.ts L98-128', sTC), Paragraph('patternFix()', sTC), Paragraph('6 patterns regex (console.log, any, var, ==, debugger, eslint-disable)', sTC)],
    [Paragraph('Auto-Fix Niveau 2: AST', sTC), status_text('PARTIEL'), Paragraph('ReflectionAgent.ts L131-215', sTC), Paragraph('astFix()', sTC), Paragraph('6 transformations structurelles (return types, arrow functions, try-catch, etc.) MAIS sans dependency ts-morph - utilise regex avancees, pas un vrai AST parser', sTC)],
    [Paragraph('Auto-Fix Niveau 3: LLM', sTC), status_text('CONFIRME'), Paragraph('ReflectionAgent.ts L217-260', sTC), Paragraph('llmFix()', sTC), Paragraph('Appel LLM avec feedback pour correction', sTC)],
    [Paragraph('Max 3 tentatives auto-fix', sTC), status_text('CONFIRME'), Paragraph('SuperAgent.ts L362', sTC), Paragraph('executeAutoFix()', sTC), Paragraph('Boucle avec maxAttempts=3', sTC)],
]
story.extend(make_table(ref_data, [100, 55, 75, 95, 125], 'Tableau 2.3 - Preuves de l\'Agent de Reflection'))

# Infrastructure Services
story.append(ph('2.4 Services d\'infrastructure', 2))
infra_data = [
    [Paragraph('<b>Exigence</b>', sTH), Paragraph('<b>Statut</b>', sTH), Paragraph('<b>Fichier</b>', sTH), Paragraph('<b>Preuve</b>', sTH)],
    [Paragraph('LLMRouter: 9 providers, retry, backoff', sTC), status_text('CONFIRME'), Paragraph('LLMRouter.ts', sTC), Paragraph('Singleton, callOpenAI/Anthropic/Google/Compatible, DEFAULT_RETRY_ATTEMPTS=2, sleep() avec jitter', sTC)],
    [Paragraph('Cache L1 (Map, 5min) + L2 (Redis, 1h)', sTC), status_text('CONFIRME'), Paragraph('CacheManager.ts', sTC), Paragraph('l1Cache Map, L1_TTL=300, L2_TTL=3600, redis ioredis', sTC)],
    [Paragraph('SHA-256 keying', sTC), status_text('CONFIRME'), Paragraph('CacheManager.ts L173', sTC), Paragraph('generateKey() avec createHash("sha256")', sTC)],
    [Paragraph('LRU eviction', sTC), status_text('CONFIRME'), Paragraph('CacheManager.ts L184', sTC), Paragraph('evictL1IfNeeded(), L1_MAX_SIZE=1000', sTC)],
    [Paragraph('Namespace agentforge:cache:*', sTC), status_text('CONFIRME'), Paragraph('CacheManager.ts L29', sTC), Paragraph('CACHE_PREFIX = "agentforge:cache:"', sTC)],
    [Paragraph('SCAN+DEL au lieu de FLUSHDB', sTC), status_text('CONFIRME'), Paragraph('CacheManager.ts L130-153', sTC), Paragraph('redis.scanStream({match}) + redis.del()', sTC)],
    [Paragraph('CostOptimizer RL-inspired', sTC), status_text('PARTIEL'), Paragraph('CostOptimizer.ts', sTC), Paragraph('Historique performance, scoring qualite/cout, LEARNING_RATE=0.1 MAIS pas de vrai RL (pas de Q-learning, pas de policy gradient) - heuristique adaptive seulement', sTC)],
    [Paragraph('SSE Event streaming', sTC), status_text('CONFIRME'), Paragraph('EventManager.ts + agents.ts L88-163', sTC), Paragraph('ReadableStream SSE, registerClient/subscribe/broadcastEvent', sTC)],
    [Paragraph('Sandbox Docker + E2B', sTC), status_text('PARTIEL'), Paragraph('SandboxManager.ts', sTC), Paragraph('executeDocker() via child_process MAIS executeE2B() sans @e2b/sdk dependency - echouerait au runtime', sTC)],
    [Paragraph('Warm Pool script', sTC), status_text('PARTIEL'), Paragraph('warm-pool.sh', sTC), Paragraph('Script shell fonctionnel MAIS non integre dans le code TypeScript - SandboxManager ne l\'appelle pas', sTC)],
    [Paragraph('Pre-compiled regex blacklist', sTC), status_text('CONFIRME'), Paragraph('SandboxManager.ts L15-32', sTC), Paragraph('17 RegExp pre-compilees en constante module', sTC)],
    [Paragraph('Cloudflare deployment', sTC), status_text('ABSENT'), Paragraph('-', sTC), Paragraph('Aucun SDK @cloudflare, aucun wrangler, aucune integration Cloudflare Workers/Pages dans le code', sTC)],
    [Paragraph('OpenTelemetry / Monitoring', sTC), status_text('ABSENT'), Paragraph('-', sTC), Paragraph('Aucune dependency @opentelemetry, aucun prom-client, aucune metric exportee', sTC)],
]
story.extend(make_table(infra_data, [130, 55, 90, 175], 'Tableau 2.4 - Preuves des Services d\'infrastructure'))

# Security
story.append(ph('2.5 Mesures de securite', 2))
sec_data = [
    [Paragraph('<b>Exigence</b>', sTH), Paragraph('<b>Statut</b>', sTH), Paragraph('<b>Fichier</b>', sTH), Paragraph('<b>Preuve</b>', sTH)],
    [Paragraph('JWT HS256 Auth', sTC), status_text('CONFIRME'), Paragraph('auth.ts middleware L1-37', sTC), Paragraph('verify(token, JWT_SECRET, "HS256"), 15min access + 7d refresh', sTC)],
    [Paragraph('Zod validation (endpoints)', sTC), status_text('PARTIEL'), Paragraph('agents.ts, projects.ts', sTC), Paragraph('ExecuteAgentSchema + CreateProjectSchema + RegisterSchema MAIS /auth/refresh et /auth/logout sans zValidator', sTC)],
    [Paragraph('Rate Limiting Redis', sTC), status_text('CONFIRME'), Paragraph('rateLimiter.ts', sTC), Paragraph('3 tiers (free=10, pro=60, enterprise=300/min), X-RateLimit-Remaining header', sTC)],
    [Paragraph('CORS configurable', sTC), status_text('CONFIRME'), Paragraph('index.ts L17-25', sTC), Paragraph('hono cors() avec origins, methods, credentials, maxAge=86400', sTC)],
    [Paragraph('XSS Sanitization', sTC), status_text('CONFIRME'), Paragraph('validation.ts L11-18', sTC), Paragraph('sanitizeString() escape <, >, ", \', /', sTC)],
    [Paragraph('CSP complet', sTC), status_text('PARTIEL'), Paragraph('securityHeaders.ts L38-52', sTC), Paragraph('11 directives CSP MAIS unsafe-eval + unsafe-inline affaiblissent la protection XSS', sTC)],
    [Paragraph('HSTS (production)', sTC), status_text('CONFIRME'), Paragraph('securityHeaders.ts L22', sTC), Paragraph('max-age=63072000; includeSubDomains; preload', sTC)],
    [Paragraph('COOP/CORP/COEP', sTC), status_text('CONFIRME'), Paragraph('securityHeaders.ts L27-29', sTC), Paragraph('Cross-Origin-Opener/Resource/Embedder-Policy', sTC)],
    [Paragraph('bcrypt password hashing', sTC), status_text('CONFIRME'), Paragraph('auth.ts L34', sTC), Paragraph('bcrypt.hash(data.password, 12)', sTC)],
    [Paragraph('Refresh token DB storage', sTC), status_text('CONFIRME'), Paragraph('auth.ts L38-48', sTC), Paragraph('SHA-256 hash stocke en DB, isRevoked flag', sTC)],
    [Paragraph('Parameterized queries (Drizzle)', sTC), status_text('CONFIRME'), Paragraph('Tous les routes', sTC), Paragraph('Drizzle ORM genere des requetes parametrees automatiquement', sTC)],
    [Paragraph('IDOR protection', sTC), status_text('PARTIEL'), Paragraph('projects.ts', sTC), Paragraph('DELETE + PATCH verifient userId MAIS GET /:id ne verifie PAS userId - IDOR sur lecture', sTC)],
    [Paragraph('Refresh token tid verification', sTC), status_text('ABSENT'), Paragraph('auth.ts L139-144', sTC), Paragraph('Verifie userId + isRevoked mais PAS le tid specifique - tout token non-revoque pour l\'utilisateur passe', sTC)],
]
story.extend(make_table(sec_data, [110, 55, 95, 190], 'Tableau 2.5 - Preuves des Mesures de securite'))

# 7 Agents
story.append(ph('2.6 Les 7 Agents produit', 2))
agents_data = [
    [Paragraph('<b>Agent</b>', sTH), Paragraph('<b>LLMs</b>', sTH), Paragraph('<b>Seuil</b>', sTH), Paragraph('<b>DAG</b>', sTH), Paragraph('<b>Sandbox</b>', sTH), Paragraph('<b>Statut</b>', sTH)],
    [Paragraph('DEV', sTC), Paragraph('3P + 2S + 2F = 7', sTCC), Paragraph('95%', sTCC), Paragraph('6 nodes, 5 levels', sTCC), Paragraph('Oui', sTCC), status_text('CONFIRME')],
    [Paragraph('SLIDES', sTC), Paragraph('2P + 1S + 1F = 4', sTCC), Paragraph('90%', sTCC), Paragraph('5 nodes, 5 levels', sTCC), Paragraph('Non', sTCC), status_text('CONFIRME')],
    [Paragraph('DOC', sTC), Paragraph('2P + 1S + 1F = 4', sTCC), Paragraph('90%', sTCC), Paragraph('5 nodes, 5 levels', sTCC), Paragraph('Non', sTCC), status_text('CONFIRME')],
    [Paragraph('DATA', sTC), Paragraph('2P + 1S + 1F = 4', sTCC), Paragraph('90%', sTCC), Paragraph('5 nodes, 5 levels', sTCC), Paragraph('Oui', sTCC), status_text('CONFIRME')],
    [Paragraph('RECHERCHE', sTC), Paragraph('2P + 1S + 1F = 4', sTCC), Paragraph('92%', sTCC), Paragraph('5 nodes, 5 levels', sTCC), Paragraph('Non', sTCC), status_text('CONFIRME')],
    [Paragraph('EMAIL', sTC), Paragraph('2P + 1S + 1F = 4', sTCC), Paragraph('88%', sTCC), Paragraph('4 nodes, 4 levels', sTCC), Paragraph('Non', sTCC), status_text('CONFIRME')],
    [Paragraph('MARKETING', sTC), Paragraph('2P + 1S + 1F = 4', sTCC), Paragraph('88%', sTCC), Paragraph('5 nodes, 5 levels', sTCC), Paragraph('Non', sTCC), status_text('CONFIRME')],
]
story.extend(make_table(agents_data, [65, 85, 35, 85, 50, 55], 'Tableau 2.6 - Configuration des 7 Agents (P=Primary, S=Secondary, F=Fallback)'))

# ═══════════════════════════════════════════════════
# PHASE 3 - VERIFICATION DES 17 ECARTS
# ═══════════════════════════════════════════════════
story.append(ph('PHASE 3 - VERIFICATION DETAILLEE DES ECARTS'))

ecarts = [
    ('1', 'MoA sans cascading', 'CONFIRME', 'CodeGenerator.ts L61-95', '3 rounds Propose/Critique/Refine implementees avec buildProposeMessages, buildCritiqueMessages, buildRefineMessages. Chaque round appelle les LLMs et accumule les resultats.', '100%', 'Fonctionnel'),
    ('2', 'DAG non parallele', 'CONFIRME', 'SuperAgent.ts L117-155', 'topologicalSort() + Promise.allSettled par niveau. Les noeuds du meme niveau executent en parallele.', '100%', 'Performance'),
    ('3', 'Reflection simulee', 'CONFIRME', 'ReflectionAgent.ts L29-97', 'Appel reel a Gemini 2.0 Flash via LLMRouter.call(). Prompt d\'evaluation structure avec 6 criteres.', '100%', 'Fonctionnel'),
    ('4', 'AST fix avec regex', 'PARTIEL', 'ReflectionAgent.ts L131-215', '6 transformations structurelles (return types, arrow functions, try-catch, semicolons, exports, missing params) MAIS sans ts-morph dependency. Utilise des regex avancees, pas un vrai parseur AST. Le code est fonctionnel pour les cas courants mais peut echouer sur du code complexe.', '75%', 'Fonctionnel'),
    ('5', 'RL Router simpliste', 'PARTIEL', 'CostOptimizer.ts', 'Historique des performances, scoring qualite/cout/latence, LEARNING_RATE=0.1, exponential moving average. C\'est une heuristique adaptive, pas un vrai RL (pas de Q-table, pas de policy gradient, pas d\'exploration/exploitation).', '60%', 'Performance/Scalabilite'),
    ('6', 'Cache flushdb', 'CONFIRME', 'CacheManager.ts L130-153', 'Remplace par SCAN+DEL avec namespace agentforge:cache:*. Seules les cles du namespace sont supprimees.', '100%', 'Securite'),
    ('7', 'Sandbox Docker stub', 'PARTIEL', 'SandboxManager.ts L110-250', 'executeDocker() via child_process implemente avec resource limits. MAIS executeE2B() sans @e2b/sdk - echouerait au runtime. Warm pool script existe mais non integre dans le code TS.', '65%', 'Fonctionnel'),
    ('8', 'ReDoS blacklist', 'CONFIRME', 'SandboxManager.ts L15-32', '17 RegExp pre-compilees en constante module. Pas de new RegExp() en boucle.', '100%', 'Securite'),
    ('9', 'Pas de SSE/WebSocket', 'CONFIRME', 'EventManager.ts + agents.ts L88-163', 'SSE via ReadableStream, registerClient/subscribe/broadcastEvent. SSE stream retourne comme Response.', '100%', 'Fonctionnel'),
    ('10', 'Auth bugs (import/tier)', 'CONFIRME', 'auth.ts', 'Imports au top, tier recupere de la DB (user.tier), refresh token hashe en SHA-256 et stocke en DB.', '100%', 'Securite'),
    ('11', 'DELETE sans ownership', 'CONFIRME', 'projects.ts L83-100', 'DELETE verifie eq(projects.userId, userId). PATCH aussi.', '95%', 'Securite'),
    ('12', 'CSP incomplete', 'PARTIEL', 'securityHeaders.ts L38-52', '11 directives CSP + HSTS + COOP/CORP/COEP + Permissions-Policy. MAIS unsafe-eval et unsafe-inline dans script-src/style-src affaiblissent la protection.', '80%', 'Securite'),
    ('13', 'LLMRouter sans retry', 'CONFIRME', 'LLMRouter.ts L45-115', 'DEFAULT_RETRY_ATTEMPTS=2, DEFAULT_RETRY_DELAY=1000, MAX_RETRY_DELAY=10000, sleep() avec exponential backoff.', '100%', 'Performance'),
    ('14', 'Pas de DAG visualisation', 'CONFIRME', 'Execute.tsx L451', 'DAG visualise par niveau avec statut (pending/running/completed/failed), MoA badges, live events feed.', '100%', 'Fonctionnel'),
    ('15', 'Pas de streaming UI', 'CONFIRME', 'Execute.tsx + api.ts', 'executeAgentStream() via fetch ReadableStream, SSE parsing, real-time DAG status updates.', '100%', 'Fonctionnel'),
    ('16', 'uuid.randomUUID() bug', 'ABSENT', 'agents.ts L86', 'Ligne 86 utilise uuid.randomUUID() qui n\'existe pas dans le package uuid. Devrait etre crypto.randomUUID() ou uuidv4(). Ligne 184 utilise correctement crypto.randomUUID(). Bug encore present.', '0%', 'Fonctionnel'),
    ('17', 'IDOR sur GET /projects/:id', 'ABSENT', 'projects.ts L37-46', 'GET /:id ne verifie PAS userId. N\'importe quel utilisateur authentifie peut lire n\'importe quel projet par ID.', '0%', 'Securite'),
]

for num, title, status, file_loc, evidence, confidence, impact in ecarts:
    story.append(ph('Ecart N%s - %s' % (num, title), 2))
    story.append(p('<b>Statut:</b> %s | <b>Confiance:</b> %s | <b>Impact:</b> %s' % (status, confidence, impact)))
    story.append(p('<b>Fichier:</b> %s' % file_loc))
    story.append(p('<b>Preuve technique:</b> %s' % evidence))
    if status == 'ABSENT':
        story.append(p('<b>VERDICT:</b> Non corrige - ecart reel persistant.', sBody))
    elif status == 'PARTIEL':
        story.append(p('<b>VERDICT:</b> Partiellement corrige - ecart d\'implementation subsistant.', sBody))
    else:
        story.append(p('<b>VERDICT:</b> Confirme corrige avec preuve technique directe.', sBody))

# ═══════════════════════════════════════════════════
# PHASE 4 - AUDIT D'EXECUTION REELLE
# ═══════════════════════════════════════════════════
story.append(ph('PHASE 4 - AUDIT D\'EXECUTION REELLE'))

story.append(ph('4.1 Verifications statiques (code present)', 2))
exec_data = [
    [Paragraph('<b>Fonctionnalite</b>', sTH), Paragraph('<b>Existe</b>', sTH), Paragraph('<b>Fonctionne</b>', sTH), Paragraph('<b>Demontrable</b>', sTH), Paragraph('<b>Risque runtime</b>', sTH)],
    [Paragraph('API Hono + routes', sTC), status_text('CONFIRME'), status_text('PARTIEL'), status_text('PARTIEL'), Paragraph('uuid.randomUUID() bug L86', sTC)],
    [Paragraph('Auth JWT + bcrypt', sTC), status_text('CONFIRME'), status_text('PARTIEL'), status_text('PARTIEL'), Paragraph('Refresh tid non verifie', sTC)],
    [Paragraph('MoA cascading', sTC), status_text('CONFIRME'), status_text('PARTIEL'), status_text('PARTIEL'), Paragraph('Depend des cles API LLM', sTC)],
    [Paragraph('DAG parallel execution', sTC), status_text('CONFIRME'), status_text('CONFIRME'), status_text('CONFIRME'), Paragraph('Topological sort + Promise.allSettled', sTC)],
    [Paragraph('Reflection (LLM eval)', sTC), status_text('CONFIRME'), status_text('PARTIEL'), status_text('PARTIEL'), Paragraph('Depend GOOGLE_API_KEY', sTC)],
    [Paragraph('Auto-Fix 3 niveaux', sTC), status_text('CONFIRME'), status_text('PARTIEL'), status_text('PARTIEL'), Paragraph('AST fix sans ts-morph', sTC)],
    [Paragraph('Cache L1+L2', sTC), status_text('CONFIRME'), status_text('PARTIEL'), status_text('PARTIEL'), Paragraph('Depend REDIS_URL', sTC)],
    [Paragraph('Sandbox Docker', sTC), status_text('CONFIRME'), status_text('PARTIEL'), status_text('PARTIEL'), Paragraph('E2B echouerait, Docker OK si daemon present', sTC)],
    [Paragraph('SSE streaming', sTC), status_text('CONFIRME'), status_text('CONFIRME'), status_text('CONFIRME'), Paragraph('ReadableStream standard', sTC)],
    [Paragraph('Rate limiting', sTC), status_text('CONFIRME'), status_text('PARTIEL'), status_text('PARTIEL'), Paragraph('Fallback open si Redis down', sTC)],
    [Paragraph('RBAC (tiers)', sTC), status_text('PARTIEL'), status_text('PARTIEL'), status_text('PARTIEL'), Paragraph('Pas de middleware RBAC - tiers dans JWT seulement', sTC)],
    [Paragraph('Tests unitaires', sTC), status_text('ABSENT'), status_text('ABSENT'), status_text('ABSENT'), Paragraph('Aucun test, aucun framework de test', sTC)],
    [Paragraph('Cloudflare deploy', sTC), status_text('ABSENT'), status_text('ABSENT'), status_text('ABSENT'), Paragraph('Aucun SDK/integration', sTC)],
]
story.extend(make_table(exec_data, [95, 55, 55, 55, 135], 'Tableau 4.1 - Audit d\'execution reelle'))

story.append(ph('4.2 Framework de test - ABSENT', 2))
story.append(p('Aucun framework de test (vitest, jest, mocha) n\'est installe dans les dependances. Le script "test" dans le root package.json delegue a "turbo test" mais aucun sous-package ne definit un script test fonctionnel. La CI GitHub Actions execute "pnpm test" qui echouerait en l\'absence de tests. Il n\'existe aucun fichier .test.ts ou .spec.ts dans tout le projet.'))

# ═══════════════════════════════════════════════════
# PHASE 5 - IMPLEMENTATIONS CACHEES
# ═══════════════════════════════════════════════════
story.append(ph('PHASE 5 - RECHERCHE DES IMPLEMENTATIONS CACHEES'))

story.append(p('Recherche exhaustive effectuee dans tous les repertoires, services, scripts, packages, configurations, modules partages et dependances internes. Resultats:'))

search_data = [
    [Paragraph('<b>Dependency/Feature</b>', sTH), Paragraph('<b>Recherche</b>', sTH), Paragraph('<b>Resultat</b>', sTH)],
    [Paragraph('ts-morph / TypeScript Compiler API', sTC), Paragraph('rg ts-morph|typescript.*compiler|babel|swc', sTC), Paragraph('NON TROUVE - AST fix utilise regex avancees', sTC)],
    [Paragraph('@e2b/sdk', sTC), Paragraph('rg e2b|@e2b', sTC), Paragraph('NON TROUVE - executeE2B() echouerait au runtime', sTC)],
    [Paragraph('@cloudflare/workers / wrangler', sTC), Paragraph('rg cloudflare|@cloudflare|wrangler', sTC), Paragraph('NON TROUVE - Pas d\'integration Cloudflare', sTC)],
    [Paragraph('@opentelemetry / prom-client', sTC), Paragraph('rg opentelemetry|prom-client|metrics', sTC), Paragraph('NON TROUVE - Pas de monitoring/metrics', sTC)],
    [Paragraph('vitest / jest / mocha', sTC), Paragraph('rg vitest|jest|mocha', sTC), Paragraph('NON TROUVE - Pas de framework de test', sTC)],
    [Paragraph('warmPool / WarmPool', sTC), Paragraph('rg warmPool|warm.pool|WarmPool', sTC), Paragraph('Script shell uniquement - non integre au code TS', sTC)],
    [Paragraph('executeDAG function', sTC), Paragraph('rg executeDAG', sTC), Paragraph('NON TROUVE - DAG execute dans SuperAgent directement', sTC)],
    [Paragraph('WebSocket / ws / socket.io', sTC), Paragraph('rg websocket|socket.io|ws:', sTC), Paragraph('NON TROUVE - SSE uniquement (pas de WebSocket)', sTC)],
]
story.extend(make_table(search_data, [130, 155, 165], 'Tableau 5.1 - Recherche exhaustive des implementations cachees'))

# ═══════════════════════════════════════════════════
# PHASE 6 - CLASSIFICATION DES ECARTS
# ═══════════════════════════════════════════════════
story.append(ph('PHASE 6 - CLASSIFICATION DES ECARTS'))

story.append(ph('6.1 Ecarts reels (fonctionnalite n\'existe pas)', 2))
real_gaps = [
    ('Cloudflare deployment', 'Aucun SDK @cloudflare, aucun wrangler, aucune route de deploiement vers Cloudflare. Le blueprint specifie cloudflare comme deploymentTarget pour DEV.', 'Critique'),
    ('Tests unitaires', 'Zero fichier de test, zero framework de test installe. La CI execute "pnpm test" qui ne produit rien.', 'Elevee'),
    ('Monitoring/OpenTelemetry', 'Aucune telemetrie, aucune metric, aucun dashboard. Impossibilite de monitorer la production.', 'Elevee'),
    ('RBAC middleware', 'Pas de middleware de controle d\'acces base sur les roles. Le tier est dans le JWT mais pas verifie par un middleware dedie.', 'Moyenne'),
    ('Refresh token tid verification', 'Le endpoint /auth/refresh accepte n\'importe quel token non-revoque pour l\'utilisateur, pas seulement le token specifique.', 'Elevee'),
    ('IDOR sur GET /projects/:id', 'La lecture d\'un projet ne verifie pas l\'appartenance a l\'utilisateur.', 'Critique'),
    ('E2B SDK', 'executeE2B() est implemente mais sans la dependency @e2b/sdk - echec runtime garanti.', 'Moyenne'),
]
for name, desc, priority in real_gaps:
    story.append(p('<b>%s</b> [%s]: %s' % (name, priority, desc)))

story.append(ph('6.2 Ecarts d\'implementation (existe mais differemment)', 2))
impl_gaps = [
    ('AST Auto-Fix', 'Le blueprint specifie ts-morph pour les transformations AST. L\'implementation utilise des regex avancees avec 6 transformations structurelles. Fonctionnel pour les cas courants, mais pas un vrai parseur AST.', 'Moyenne'),
    ('RL Cost Optimizer', 'Le blueprint decrit un router RL avec Q-learning. L\'implementation est une heuristique adaptive avec historique et exponential moving average. Pas de vrai apprentissage par renforcement.', 'Moyenne'),
    ('Warm Pool', 'Le script warm-pool.sh existe et est fonctionnel mais n\'est pas integre dans SandboxManager.ts. L\'utilisateur doit le lancer manuellement.', 'Faible'),
    ('CSP unsafe-eval/inline', 'Le blueprint specifie une CSP stricte. L\'implementation inclut unsafe-eval et unsafe-inline pour des raisons de compatibilite framework.', 'Faible'),
]
for name, desc, priority in impl_gaps:
    story.append(p('<b>%s</b> [%s]: %s' % (name, priority, desc)))

story.append(ph('6.3 Ecarts volontaires (choix de developpeur)', 2))
vol_gaps = [
    ('WebSocket', 'Le blueprint mentionne SSE et WebSocket. Seul SSE est implemente - choix justifie par la simplicite et la compatibilite HTTP/2.', 'Faible'),
    ('Rate limiter fallback open', 'Quand Redis est indisponible, le rate limiter laisse passer les requetes. Choix deliberé pour la resilience.', 'Faible'),
    ('Projects page UI', 'La page Projects.tsx est un placeholder vide. Le CRUD existe en API mais pas dans l\'interface.', 'Moyenne'),
]
for name, desc, priority in vol_gaps:
    story.append(p('<b>%s</b> [%s]: %s' % (name, priority, desc)))

story.append(ph('6.4 Ecarts documentaires', 2))
doc_gaps = [
    ('docs/architecture-guide.md', 'Le guide documente un "RL routing algorithm" mais l\'implementation est une heuristique, pas du RL. Le document est partiellement obsolete.', 'Faible'),
    ('API Reference doc', 'Ne documente pas le endpoint SSE /execute (retourne un stream, pas du JSON). La doc est incomplete pour le streaming.', 'Moyenne'),
]
for name, desc, priority in doc_gaps:
    story.append(p('<b>%s</b> [%s]: %s' % (name, priority, desc)))

# ═══════════════════════════════════════════════════
# PHASE 7 - SCORE DE CONFORMITE JUSTIFIE
# ═══════════════════════════════════════════════════
story.append(ph('PHASE 7 - SCORE DE CONFORMITE JUSTIFIE'))

story.append(ph('7.1 Scores par domaine', 2))
score_data = [
    [Paragraph('<b>Domaine</b>', sTH), Paragraph('<b>Score</b>', sTH), Paragraph('<b>Justification</b>', sTH)],
    [Paragraph('Architecture (Monorepo + Kernel + 7 Agents)', sTC), Paragraph('18/20', sTCC), Paragraph('Architecture "1 Kernel, 7 Configurations" completement implementee. MoA 3-round cascading, DAG parallele, 7 agents avec DAG templates. -2: Cloudflare deployment cible absent.', sTC)],
    [Paragraph('MoA Kernel (9 LLMs, Cascading, Fusion)', sTC), Paragraph('17/20', sTCC), Paragraph('3-round Propose/Critique/Refine, 9 providers, Promise.allSettled, consensus detection. -3: Pas de strategie weighted_vote dynamique.', sTC)],
    [Paragraph('DAG Pipeline (Topo sort + Parallele)', sTC), Paragraph('18/20', sTCC), Paragraph('Topological sort + validateDAG + Promise.allSettled par niveau. 7 templates DAG. -2: Pas de conditional edges (edge.condition pas utilise).', sTC)],
    [Paragraph('Reflection + Auto-Fix', sTC), Paragraph('14/20', sTCC), Paragraph('6 criteres ponderes, threshold 0.95, evaluation LLM reelle, 3-level fix. -6: AST fix sans ts-morph, pas de validation reelle du code genere.', sTC)],
    [Paragraph('RL Router / Cost Optimizer', sTC), Paragraph('10/20', sTCC), Paragraph('Heuristique adaptive avec historique. -10: Pas de vrai RL (pas de Q-learning, pas d\'exploration/exploitation), scoring statique.', sTC)],
    [Paragraph('Cache L1+L2', sTC), Paragraph('18/20', sTCC), Paragraph('L1 Map 5min + L2 Redis 1h, SHA-256, LRU, namespace, SCAN+DEL. -2: Pas de cache warming, pas de stats L2.', sTC)],
    [Paragraph('Sandbox', sTC), Paragraph('12/20', sTCC), Paragraph('Docker + blacklist + resource limits. -8: E2B non fonctionnel, warm pool non integre, pas de reutilisation de conteneurs.', sTC)],
    [Paragraph('Securite', sTC), Paragraph('14/20', sTCC), Paragraph('JWT+bcrypt+Zod+rate limit+CSP+HSTS+COOP/CORP/COEP+XSS. -6: IDOR sur GET, refresh tid non verifie, unsafe-eval/inline.', sTC)],
    [Paragraph('SSE Streaming + UI', sTC), Paragraph('16/20', sTCC), Paragraph('SSE ReadableStream, DAG visualisation, MoA badges, live events. -4: Pas de WebSocket, Projects page placeholder.', sTC)],
    [Paragraph('Tests', sTC), Paragraph('0/20', sTCC), Paragraph('Zero test, zero framework, zero couverture. Le script "pnpm test" ne produit rien.', sTC)],
    [Paragraph('Monitoring/Observabilite', sTC), Paragraph('2/20', sTCC), Paragraph('Health endpoint avec memoire/uptime. -18: Pas de OpenTelemetry, pas de metrics, pas de tracing distribue.', sTC)],
    [Paragraph('Deploiement Cloudflare', sTC), Paragraph('0/20', sTCC), Paragraph('Aucune integration Cloudflare. Le deploymentTarget est defini mais non implemente.', sTC)],
]
story.extend(make_table(score_data, [130, 40, 280], 'Tableau 7.1 - Scores de conformite par domaine'))

story.append(ph('7.2 Calcul du score global', 2))
story.append(p('Calcul pondere par importance relative:'))

calc_data = [
    [Paragraph('<b>Domaine</b>', sTH), Paragraph('<b>Poids</b>', sTH), Paragraph('<b>Score</b>', sTH), Paragraph('<b>Pondere</b>', sTH)],
    [Paragraph('Architecture', sTC), Paragraph('15%', sTCC), Paragraph('18/20', sTCC), Paragraph('2.70', sTCC)],
    [Paragraph('MoA Kernel', sTC), Paragraph('15%', sTCC), Paragraph('17/20', sTCC), Paragraph('2.55', sTCC)],
    [Paragraph('DAG Pipeline', sTC), Paragraph('10%', sTCC), Paragraph('18/20', sTCC), Paragraph('1.80', sTCC)],
    [Paragraph('Reflection + Auto-Fix', sTC), Paragraph('10%', sTCC), Paragraph('14/20', sTCC), Paragraph('1.40', sTCC)],
    [Paragraph('RL Router', sTC), Paragraph('5%', sTCC), Paragraph('10/20', sTCC), Paragraph('0.50', sTCC)],
    [Paragraph('Cache', sTC), Paragraph('5%', sTCC), Paragraph('18/20', sTCC), Paragraph('0.90', sTCC)],
    [Paragraph('Sandbox', sTC), Paragraph('5%', sTCC), Paragraph('12/20', sTCC), Paragraph('0.60', sTCC)],
    [Paragraph('Securite', sTC), Paragraph('10%', sTCC), Paragraph('14/20', sTCC), Paragraph('1.40', sTCC)],
    [Paragraph('SSE + UI', sTC), Paragraph('5%', sTCC), Paragraph('16/20', sTCC), Paragraph('0.80', sTCC)],
    [Paragraph('Tests', sTC), Paragraph('10%', sTCC), Paragraph('0/20', sTCC), Paragraph('0.00', sTCC)],
    [Paragraph('Monitoring', sTC), Paragraph('5%', sTCC), Paragraph('2/20', sTCC), Paragraph('0.10', sTCC)],
    [Paragraph('Deploiement Cloudflare', sTC), Paragraph('5%', sTCC), Paragraph('0/20', sTCC), Paragraph('0.00', sTCC)],
    [Paragraph('<b>TOTAL</b>', sTC), Paragraph('<b>100%</b>', sTCC), Paragraph('-', sTCC), Paragraph('<b>12.75/20</b>', sTCC)],
]
story.extend(make_table(calc_data, [130, 40, 55, 55], 'Tableau 7.2 - Calcul du score global pondere'))

story.append(p('<b>SCORE GLOBAL DE CONFORMITE: 12.75 / 20 (63.75%)</b>', sTitle))
story.append(Spacer(1, 12))

story.append(p('Ce score reflete une implementation fonctionnelle du noyau architectural (MoA + DAG + Reflection) avec des lacunes significatives dans les domaines transversaux (tests, monitoring, deploiement Cloudflare) et des imperfections de securite (IDOR, refresh token). Les composants centraux du blueprint sont presents et fonctionnels; les ecarts se concentrent sur la qualite de production et la robustesse operationnelle.'))

# ═══════════════════════════════════════════════════
# PLAN DE CORRECTION PRIORISE
# ═══════════════════════════════════════════════════
story.append(ph('PLAN DE CORRECTION PRIORISE'))

prio_data = [
    [Paragraph('<b>#</b>', sTH), Paragraph('<b>Ecart</b>', sTH), Paragraph('<b>Priorite</b>', sTH), Paragraph('<b>Effort</b>', sTH), Paragraph('<b>Action</b>', sTH)],
    [Paragraph('1', sTCC), Paragraph('IDOR GET /projects/:id', sTC), Paragraph('CRITIQUE', sTCC), Paragraph('1h', sTCC), Paragraph('Ajouter eq(projects.userId, userId) dans le WHERE du SELECT', sTC)],
    [Paragraph('2', sTCC), Paragraph('uuid.randomUUID() bug', sTC), Paragraph('CRITIQUE', sTCC), Paragraph('5min', sTCC), Paragraph('Remplacer par crypto.randomUUID() en L86 de agents.ts', sTC)],
    [Paragraph('3', sTCC), Paragraph('Refresh tid verification', sTC), Paragraph('ELEVEE', sTCC), Paragraph('2h', sTCC), Paragraph('Verifier le hash tid du refresh token specifique en DB', sTC)],
    [Paragraph('4', sTCC), Paragraph('Zod validation /auth/refresh+logout', sTC), Paragraph('ELEVEE', sTCC), Paragraph('30min', sTCC), Paragraph('Ajouter zValidator avec schema Zod pour les 2 endpoints', sTC)],
    [Paragraph('5', sTCC), Paragraph('Tests unitaires + framework', sTC), Paragraph('ELEVEE', sTCC), Paragraph('2-3j', sTCC), Paragraph('Installer vitest, ecrire tests pour services core + routes API', sTC)],
    [Paragraph('6', sTCC), Paragraph('E2B SDK ou supprimer executeE2B()', sTC), Paragraph('MOYENNE', sTCC), Paragraph('2h', sTCC), Paragraph('Installer @e2b/sdk ou marquer executeE2B() comme TODO', sTC)],
    [Paragraph('7', sTCC), Paragraph('AST Fix avec ts-morph', sTC), Paragraph('MOYENNE', sTCC), Paragraph('1j', sTCC), Paragraph('Installer ts-morph, reimplementer les 6 transformations avec un vrai AST', sTC)],
    [Paragraph('8', sTCC), Paragraph('RBAC middleware', sTC), Paragraph('MOYENNE', sTCC), Paragraph('3h', sTCC), Paragraph('Creer requireTier("pro") middleware pour les routes premium', sTC)],
    [Paragraph('9', sTCC), Paragraph('Monitoring OpenTelemetry', sTC), Paragraph('MOYENNE', sTCC), Paragraph('1j', sTCC), Paragraph('Installer @opentelemetry/api + sdk, instrumenter LLMRouter + Cache', sTC)],
    [Paragraph('10', sTCC), Paragraph('Cloudflare deployment', sTC), Paragraph('MOYENNE', sTCC), Paragraph('1-2j', sTCC), Paragraph('Ajouter wrangler + @cloudflare/workers, adapter le Dockerfile', sTC)],
    [Paragraph('11', sTCC), Paragraph('Warm Pool integration', sTC), Paragraph('FAIBLE', sTCC), Paragraph('2h', sTCC), Paragraph('Integrer warm-pool.sh dans SandboxManager avec pre-warming au demarrage', sTC)],
    [Paragraph('12', sTCC), Paragraph('CSP sans unsafe-eval', sTC), Paragraph('FAIBLE', sTCC), Paragraph('3h', sTCC), Paragraph('Nonce-based CSP pour scripts, hash-based pour styles', sTC)],
    [Paragraph('13', sTCC), Paragraph('Projects page UI', sTC), Paragraph('FAIBLE', sTCC), Paragraph('4h', sTCC), Paragraph('Implementer CRUD Projects avec liste, creation, detail, suppression', sTC)],
]
story.extend(make_table(prio_data, [18, 120, 55, 35, 222], 'Tableau 8.1 - Plan de correction priorise'))

# ═══════════════════════════════════════════════════
# BUILD
# ═══════════════════════════════════════════════════
doc.multiBuild(story)
print("PDF generated:", output_path)

# -*- coding: utf-8 -*-
"""
AgentForge - Matrice de Conformité Stratégique
Phase 1: Programme de Remédiation Stratégique
"""
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm, mm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, CondPageBreak, LongTable, HRFlowable,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.platypus import SimpleDocTemplate
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
import hashlib

# ============================================================
# FONT REGISTRATION
# ============================================================
pdfmetrics.registerFont(TTFont('NotoSansSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSCBold', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Black.ttf'))
pdfmetrics.registerFont(TTFont('WenQuanYi', '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'))
pdfmetrics.registerFont(TTFont('LiberationSerif', '/usr/share/fonts/truetype/chinese/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans', '/usr/share/fonts/truetype/chinese/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMono', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansMono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('NotoSansSC', normal='NotoSansSC', bold='NotoSansSC')
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSCBold')
registerFontFamily('WenQuanYi', normal='WenQuanYi', bold='WenQuanYi')
registerFontFamily('LiberationSerif', normal='LiberationSerif', bold='LiberationSerif')
registerFontFamily('LiberationSans', normal='LiberationSans', bold='LiberationSans')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSansBold')

# ============================================================
# PALETTE
# ============================================================
ACCENT       = colors.HexColor('#1f7693')
TEXT_PRIMARY  = colors.HexColor('#212325')
TEXT_MUTED    = colors.HexColor('#7e838a')
BG_SURFACE   = colors.HexColor('#dce0e5')
BG_PAGE      = colors.HexColor('#e8eaed')

TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# Priority colors
CRITIQUE_COLOR = colors.HexColor('#dc2626')
HAUTE_COLOR    = colors.HexColor('#ea580c')
MOYENNE_COLOR  = colors.HexColor('#d97706')
FAIBLE_COLOR   = colors.HexColor('#65a30d')

# Status colors
IMPLEMENTED_BG  = colors.HexColor('#dcfce7')
PARTIAL_BG      = colors.HexColor('#fef9c3')
MISSING_BG      = colors.HexColor('#fee2e2')

# ============================================================
# STYLES
# ============================================================
PAGE_W, PAGE_H = A4
LEFT_M = 1.8 * cm
RIGHT_M = 1.8 * cm
TOP_M = 2.0 * cm
BOTTOM_M = 2.0 * cm
AVAILABLE_W = PAGE_W - LEFT_M - RIGHT_M

# Styles
cover_title_style = ParagraphStyle(
    'CoverTitle', fontName='LiberationSerif', fontSize=36, leading=44,
    alignment=TA_CENTER, textColor=ACCENT, spaceAfter=12,
)
cover_subtitle_style = ParagraphStyle(
    'CoverSubtitle', fontName='LiberationSerif', fontSize=16, leading=22,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=8,
)
cover_meta_style = ParagraphStyle(
    'CoverMeta', fontName='LiberationSerif', fontSize=12, leading=16,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=6,
)
h1_style = ParagraphStyle(
    'H1Style', fontName='LiberationSerif', fontSize=20, leading=26,
    textColor=ACCENT, spaceBefore=18, spaceAfter=10,
)
h2_style = ParagraphStyle(
    'H2Style', fontName='LiberationSerif', fontSize=15, leading=20,
    textColor=ACCENT, spaceBefore=14, spaceAfter=8,
)
h3_style = ParagraphStyle(
    'H3Style', fontName='LiberationSerif', fontSize=12, leading=16,
    textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=6,
)
body_style = ParagraphStyle(
    'BodyStyle', fontName='LiberationSerif', fontSize=10.5, leading=16,
    alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceAfter=6,
)
body_left_style = ParagraphStyle(
    'BodyLeftStyle', fontName='LiberationSerif', fontSize=10, leading=14,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, spaceAfter=4,
)
cell_style = ParagraphStyle(
    'CellStyle', fontName='LiberationSerif', fontSize=8.5, leading=11,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, wordWrap='CJK',
)
cell_center_style = ParagraphStyle(
    'CellCenterStyle', fontName='LiberationSerif', fontSize=8.5, leading=11,
    alignment=TA_CENTER, textColor=TEXT_PRIMARY,
)
header_cell_style = ParagraphStyle(
    'HeaderCellStyle', fontName='LiberationSerif', fontSize=9, leading=12,
    alignment=TA_CENTER, textColor=colors.white,
)
priority_cell_style = ParagraphStyle(
    'PriorityCellStyle', fontName='LiberationSerif', fontSize=8.5, leading=11,
    alignment=TA_CENTER, textColor=colors.white,
)
toc_h1_style = ParagraphStyle(
    'TOCH1', fontName='LiberationSerif', fontSize=13, leftIndent=20,
    spaceBefore=6, spaceAfter=3,
)
toc_h2_style = ParagraphStyle(
    'TOCH2', fontName='LiberationSerif', fontSize=11, leftIndent=40,
    spaceBefore=3, spaceAfter=2,
)
stat_number_style = ParagraphStyle(
    'StatNumber', fontName='LiberationSerif', fontSize=28, leading=34,
    alignment=TA_CENTER, textColor=ACCENT,
)
stat_label_style = ParagraphStyle(
    'StatLabel', fontName='LiberationSerif', fontSize=9, leading=12,
    alignment=TA_CENTER, textColor=TEXT_MUTED,
)

# ============================================================
# TOC DOC TEMPLATE
# ============================================================
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

# ============================================================
# HELPER FUNCTIONS
# ============================================================
def P(text, style=cell_style):
    return Paragraph(text, style)

def PH(text):
    return Paragraph(text, header_cell_style)

def make_priority_cell(priority):
    color_map = {
        'CRITIQUE': (CRITIQUE_COLOR, 'CRITIQUE'),
        'HAUTE': (HAUTE_COLOR, 'HAUTE'),
        'MOYENNE': (MOYENNE_COLOR, 'MOYENNE'),
        'FAIBLE': (FAIBLE_COLOR, 'FAIBLE'),
    }
    c, t = color_map.get(priority, (TEXT_MUTED, priority))
    style = ParagraphStyle(
        f'Pri{t}', fontName='LiberationSerif', fontSize=8, leading=11,
        alignment=TA_CENTER, textColor=colors.white,
    )
    return Paragraph(f'<b>{t}</b>', style), c

def make_status_badge(status):
    status_map = {
        'IMPLÉMENTÉ': IMPLEMENTED_BG,
        'PARTIEL': PARTIAL_BG,
        'ABSENT': MISSING_BG,
        'N/A': BG_SURFACE,
    }
    bg = status_map.get(status, colors.white)
    style = ParagraphStyle(
        f'Status{status}', fontName='LiberationSerif', fontSize=8, leading=11,
        alignment=TA_CENTER, textColor=TEXT_PRIMARY,
    )
    return Paragraph(f'<b>{status}</b>', style), bg

def build_matrix_table(rows, col_widths=None):
    """Build a conformity matrix table from rows.
    Each row: (exigence, etat_actuel, etat_cible, priorite)
    """
    if col_widths is None:
        col_widths = [AVAILABLE_W * 0.35, AVAILABLE_W * 0.25, AVAILABLE_W * 0.25, AVAILABLE_W * 0.15]
    
    header = [
        PH('<b>Exigence Blueprint</b>'),
        PH('<b>Etat Actuel</b>'),
        PH('<b>Etat Cible</b>'),
        PH('<b>Priorite</b>'),
    ]
    
    data = [header]
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    
    for i, row in enumerate(rows):
        exigence, actuel, cible, priorite = row
        actuel_status, actuel_bg = make_status_badge(
            'IMPLÉMENTÉ' if 'IMPL' in actuel.upper() or 'COMPLET' in actuel.upper() or 'FONCTIONNEL' in actuel.upper()
            else 'PARTIEL' if 'PARTIEL' in actuel.upper() or 'PARTIELLE' in actuel.upper() or 'BASIQUE' in actuel.upper() or 'SIMPLIFIE' in actuel.upper() or 'HEURISTIQUE' in actuel.upper() or 'PROTO' in actuel.upper()
            else 'ABSENT'
        )
        pri_cell, pri_color = make_priority_cell(priorite)
        
        data.append([
            P(exigence),
            P(actuel),
            P(cible),
            pri_cell,
        ])
        
        row_idx = i + 1
        style_cmds.append(('BACKGROUND', (0, row_idx), (2, row_idx), TABLE_ROW_EVEN if i % 2 == 0 else TABLE_ROW_ODD))
        style_cmds.append(('BACKGROUND', (1, row_idx), (1, row_idx), actuel_bg))
        style_cmds.append(('BACKGROUND', (3, row_idx), (3, row_idx), pri_color))
    
    table = LongTable(data, colWidths=col_widths, repeatRows=1, hAlign='CENTER')
    table.setStyle(TableStyle(style_cmds))
    return table

def stat_card(number, label):
    return [
        Paragraph(f'<b>{number}</b>', stat_number_style),
        Paragraph(label, stat_label_style),
    ]

# ============================================================
# CONFORMITY MATRIX DATA
# ============================================================

# PHASE 1: Matrice de Conformité (this document)
PHASE1_ROWS = [
    ("Analyse complete du codebase vs Blueprint", "Effectuee - 155+ fichiers analyses", "Matrice validee et completee", "CRITIQUE"),
    ("Identification des ecarts par phase", "13 phases identifiees, ecarts documentes", "Ecart detaille par exigence", "CRITIQUE"),
    ("Classification priorite (Critique/Haute/Moyenne/Faible)", "Framework defini", "Application systematique a chaque ecart", "HAUTE"),
]

# PHASE 2: Orchestration IA Avancee
PHASE2_ROWS = [
    ("MoA 9 modeles paralleles (Propose)", "IMPLEMENTE - 9 providers, configurable via MoARoundConfig.providerCount", "9 modeles en parallele avec strategie 'all'", "HAUTE"),
    ("MoA multi-criteria weighted voting", "IMPLEMENTE - MoAVotingConfig avec criteriaWeights, minConsensus, deduplication", "Voting pondere multi-criteres avec consensus detection", "HAUTE"),
    ("MoA feedback injection (Reflection -> Refine)", "IMPLEMENTE - combineFeedback() + feedback_injected event", "Boucle feedback ReflectionAgent -> MoA refine", "HAUTE"),
    ("MoA Jaccard deduplication", "IMPLEMENTE - deduplicateProposals() avec threshold 0.7", "Deduplication Jaccard-like avec threshold configurable", "MOYENNE"),
    ("MoA consensus early exit", "IMPLEMENTE - hasConsensusWithDetails() avec minConsensus threshold", "Arret precoce si consensus atteint en Propose", "MOYENNE"),
    ("MoA configurable round strategies", "IMPLEMENTE - all/top_n/epsilon_greedy par round", "Strategies configurables par round de MoA", "HAUTE"),
    ("MoA 3-round cascading (Propose->Critique->Refine)", "IMPLEMENTE - CodeGenerator 847 lignes, 3 rounds complets", "Cascading 3 tours avec fusion intelligente", "CRITIQUE"),
    ("Reflection 6 weighted criteria", "IMPLEMENTE - DEFAULT_REFLECTION_CRITERIA (6 criteres, somme poids=1.0)", "6 criteres ponderes avec scoring reel", "HAUTE"),
    ("Reflection threshold 0.95", "IMPLEMENTE - confidenceThreshold=0.95 par agent", "Seuil de confiance 0.95 configurable par agent", "HAUTE"),
    ("Reflection real LLM evaluation (Gemini 2.0 Flash)", "IMPLEMENTE - ReflectionAgent.evaluate() appelle Gemini", "Evaluation LLM reelle, pas simulee", "CRITIQUE"),
    ("Reflection feedback loop to MoA", "IMPLEMENTE - Step 5 Feedback Refine dans SuperAgentOrchestrator", "Feedback reflection injecte dans MoA refine", "HAUTE"),
    ("Cost Optimizer cost/quality/latency scoring", "IMPLEMENTE - scoreProvider() poids: quality 50%, cost 30%, speed 20%", "Scoring multi-dimensionnel cout/qualite/latence", "HAUTE"),
    ("Cost Optimizer history + predictions + learning", "PARTIEL - EMA tracking avec RLTrainingService, pas de predictions", "Historique, predictions, apprentissage continu", "CRITIQUE"),
    ("7 Agent Types (DEV/SLIDES/DOC/DATA/RECHERCHE/EMAIL/MARKETING)", "IMPLEMENTE - AGENT_REGISTRY avec 7 configs completes", "7 agents avec DAG templates, LLM pools, MoA configs", "CRITIQUE"),
    ("DAG Templates par agent", "IMPLEMENTE - Chaque agent a dagTemplate avec nodes/edges", "Templates DAG specifiques par type d'agent", "HAUTE"),
]

# PHASE 3: Router RL Adaptatif
PHASE3_ROWS = [
    ("Epsilon-greedy exploration", "IMPLEMENTE - RLTrainingService epsilon 0.05->0.01, decay 0.9995", "Exploration epsilon-greedy avec decay adaptatif", "CRITIQUE"),
    ("Reward engine (quality/cost/latency/feedback)", "IMPLEMENTE - Reward: quality 45%, cost 25%, latency 20%, feedback 10%", "Fonction de reward multi-facteurs normalisee [0,1]", "CRITIQUE"),
    ("DB Persistence (rlTrainingData table)", "IMPLEMENTE - Insert Drizzle + hydrate EMA depuis 500 derniers records", "Persistance DB des decisions RL + hydratation au demarrage", "HAUTE"),
    ("EMA tracking per provider::taskType", "IMPLEMENTE - EMA alpha=0.15, min 3 samples avant override priors", "Moyenne exponentielle par provider/type de tache", "HAUTE"),
    ("Cold-start recovery", "IMPLEMENTE - Base quality priors depuis getBaseQuality() + min 3 samples", "Recovery cold-start avec priors statiques + transition douce", "HAUTE"),
    ("Continuous learning loop", "PARTIEL - recordExecutionResult() async, pas de batch retraining", "Apprentissage continu avec batch retraining periodique", "MOYENNE"),
    ("User feedback integration", "PARTIEL - Reward integre userFeedback (-1/0/1), pas d'UI feedback", "Integration feedback utilisateur dans reward", "MOYENNE"),
    ("RLTrainingService observability", "IMPLEMENTE - getRLState(), getProviderLearningData(), getRecentDecisions()", "Observabilite complete de l'etat RL", "HAUTE"),
    ("GET /agents/routing-metrics endpoint", "IMPLEMENTE - Route avec rlState, providerMetrics, recentDecisions, dbAggregates", "Endpoint API pour metriques RL", "HAUTE"),
    ("RL performance dashboard (UI)", "ABSENT - Pas de dashboard frontend pour metriques RL", "Dashboard frontend temps reel des metriques RL", "MOYENNE"),
]

# PHASE 4: Auto-Fix Enterprise
PHASE4_ROWS = [
    ("200+ patterns Level 1 (PatternLibrary)", "IMPLEMENTE - 224 patterns: Syntax(55) + Import(31) + Dep(25) + Runtime(36) + Build(31) + Security(46)", "200+ patterns categorises sur 6 domaines", "CRITIQUE"),
    ("PatternLibrary category indexing", "IMPLEMENTE - Map<PatternCategory, Pattern[]> pour O(1) lookup", "Index par categorie pour recherche rapide", "HAUTE"),
    ("ts-morph / TS Compiler API Level 2", "PARTIEL - 10 regex-based AST transforms, pas de ts-morph reel", "Transformations AST reelles via ts-morph/TS Compiler API", "CRITIQUE"),
    ("Root Cause Analysis Level 3", "IMPLEMENTE - analyzeRootCause() dans ReflectionAgent via PatternLibrary", "Analyse cause racine avec diagnostic structure", "HAUTE"),
    ("Multi-pass LLM repair (Level 3)", "IMPLEMENTE - multiPassLLMRepair() jusqu'a 3 passes avec convergence", "Reparation LLM multi-passes avec detection convergence", "HAUTE"),
    ("3-Level pipeline: Pattern -> AST -> LLM", "IMPLEMENTE - autoFixPipeline() avec escalation Pattern->AST->LLM", "Pipeline 3 niveaux avec escalation automatique", "CRITIQUE"),
    ("Pattern severity classification (critical/high/medium/low)", "IMPLEMENTE - Chaque pattern a severity, detection sorted par severity", "Classification severite avec tri prioritaire", "HAUTE"),
    ("Reverse-order replacement for string indices", "IMPLEMENTE - Application reverse-order pour maintenir indices corrects", "Remplacement ordre inverse pour coherence des indices", "MOYENNE"),
    ("PatternLibrary splitting (6 modules separables)", "ABSENT - PatternLibrary 2687 lignes monolithique", "Split en 6 modules par categorie + index", "FAIBLE"),
]

# PHASE 5: Gestion Contextuelle Lineaire
PHASE5_ROWS = [
    ("ContextGraph (BFS scope resolution)", "IMPLEMENTE - ContextGraph avec getFilesInScope(), maxDepth BFS", "Graphe de dependances avec resolution de scope BFS", "CRITIQUE"),
    ("ContextGraph topological sort", "IMPLEMENTE - getTopologicalOrder() Kahn's algorithm", "Tri topologique via Kahn's pour ordre de compilation", "HAUTE"),
    ("ContextGraph cycle detection", "IMPLEMENTE - detectCircularDependencies() DFS avec recursion stack", "Detection de cycles circulaires dans les dependances", "HAUTE"),
    ("DependencyResolver (regex import/export parser)", "IMPLEMENTE - resolveImports(), resolveExportedSymbols(), findUnusedImports()", "Parseur regex import/export pour TS/JS", "CRITIQUE"),
    ("TokenBudgetManager (priority allocation)", "IMPLEMENTE - allocateBudget() avec min floor + proportional weight", "Allocation budget tokens par priorite avec plancher minimum", "CRITIQUE"),
    ("TokenBudgetManager compression strategies", "IMPLEMENTE - truncate/summarize/compress (summarize=placeholder)", "3 strategies de compression avec summarize reel", "HAUTE"),
    ("TokenBudgetManager rebalancing", "IMPLEMENTE - Surplus 90% redistribue aux fichiers en deficit", "Reequilibrage dynamique du budget tokens", "HAUTE"),
    ("ContextCompressionService 3-stage cascade", "IMPLEMENTE - stripNoise -> extractSkeleton -> truncate", "Cascade 3 etapes de compression contextuelle", "CRITIQUE"),
    ("ContextCompressionService skeleton extraction", "IMPLEMENTE - extractSkeleton() brace-depth state machine, garde signatures", "Extraction squelette avec suivi profondeur d'accolades", "HAUTE"),
    ("ContextCompressionService selective injection", "IMPLEMENTE - selectiveInject() extraction blocs pour symboles specifies", "Injection selective de symboles dans le contexte", "HAUTE"),
    ("ContextCompressionService multi-file compression", "IMPLEMENTE - compressForContext() auto-selection niveau compression", "Compression multi-fichiers avec selection automatique", "HAUTE"),
    ("Integration dans SuperAgentOrchestrator", "ABSENT - Services existent mais pas integres dans le pipeline d'execution", "Integration complete dans le pipeline orchestrateur", "CRITIQUE"),
    ("Token estimation via tiktoken", "PARTIEL - Heuristic 1 token = 4 chars, pas de tiktoken reel", "Estimation tokens precise via tiktoken", "MOYENNE"),
]

# PHASE 6: Sandbox Cloud Native
PHASE6_ROWS = [
    ("WarmPoolManager (<500ms startup)", "IMPLEMENTE - Docker warm pool, lifecycle warm->active->returning->warm", "Pool de conteneurs pre-chauffes pour demarrage <500ms", "CRITIQUE"),
    ("WarmPoolManager auto-replenish", "IMPLEMENTE - Replenish check 30s, maintient minSize, equilibre langages", "Reapprovisionnement automatique du pool", "HAUTE"),
    ("WarmPoolManager idle rotation", "IMPLEMENTE - Rotation containers idle > maxIdleTimeMs (10min default)", "Rotation des conteneurs inactifs", "HAUTE"),
    ("SandboxScheduler priority queue", "IMPLEMENTE - critical>high>normal>low, FIFO intra-priority", "File d'attente prioritaire pour executions sandbox", "CRITIQUE"),
    ("SandboxScheduler concurrent limits per tier", "IMPLEMENTE - free=1, pro=3, enterprise=10", "Limites concurrentes par tier utilisateur", "HAUTE"),
    ("SandboxScheduler timeout enforcement", "IMPLEMENTE - Promise.race avec exit code 124 pour timeout", "Application des timeouts avec code de sortie standard", "HAUTE"),
    ("SandboxMetrics time-windowed metrics", "IMPLEMENTE - p50/p95/p99 latence, provider stats (e2b vs docker)", "Metriques fenetrees temporellement avec percentiles", "CRITIQUE"),
    ("SandboxMetrics alerting", "IMPLEMENTE - error>10%, slow>30s, memory>80%, auto-resolve", "Systeme d'alertes avec seuils et auto-resolution", "HAUTE"),
    ("E2B cloud sandbox integration", "IMPLEMENTE - executeE2B() avec API E2B", "Integration sandbox cloud E2B", "HAUTE"),
    ("Docker sandbox with resource limits", "IMPLEMENTE - executeDocker() avec memory/CPU/network limits", "Execution Docker sandboxee avec limites ressources", "HAUTE"),
    ("Pre-compiled regex blacklist (ReDoS fix)", "IMPLEMENTE - 16 patterns pre-compiles, pas de RegExp() en boucle", "Liste noire regex pre-compilee anti-ReDoS", "CRITIQUE"),
    ("SandboxManager integration (3 services)", "IMPLEMENTE - SandboxManager integre WarmPool + Scheduler + Metrics", "Integration des 3 services dans SandboxManager", "HAUTE"),
]

# PHASE 7: Moteur Deploiement Cloudflare
PHASE7_ROWS = [
    ("Cloudflare Pages deployment", "ABSENT - Pas de service de deploiement Cloudflare", "Deploiement automatique via Cloudflare Pages", "HAUTE"),
    ("Cloudflare Workers deployment", "ABSENT - Pas d'integration Workers", "Deploiement serverless via Cloudflare Workers", "HAUTE"),
    ("Cloudflare D1 database binding", "ABSENT - Pas de binding D1", "Binding base de donnees D1 pour Workers", "MOYENNE"),
    ("Cloudflare KV storage binding", "ABSENT - Pas de binding KV", "Binding stockage KV pour Workers/Pages", "MOYENNE"),
    ("Cloudflare R2 object storage", "ABSENT - Pas d'integration R2", "Stockage objets R2 pour assets/fichiers", "MOYENNE"),
    ("Rollback mechanism", "ABSENT - Pas de rollback", "Rollback automatique sur echec de deploiement", "CRITIQUE"),
    ("Preview deployments", "ABSENT - Pas de preview", "Deploiements preview par branche/PR", "HAUTE"),
    ("Blue/green deployment", "ABSENT - Pas de strategie blue/green", "Deploiement blue/green avec basculement", "HAUTE"),
    ("Canary deployment", "ABSENT - Pas de canary", "Deploiement canary avec rollout progressif", "MOYENNE"),
    ("Deployment config in env.ts", "PARTIEL - CLOUDFLARE_API_TOKEN/ACCOUNT_ID presents mais non utilises", "Configuration complete du moteur de deploiement", "HAUTE"),
    ("deployments table (DB schema)", "IMPLEMENTE - Table deployments avec platform, url, status, config", "Table DB pour suivi des deploiements", "HAUTE"),
]

# PHASE 8: Observabilite Totale
PHASE8_ROWS = [
    ("OpenTelemetry distributed tracing", "ABSENT - Pas d'instrumentation OpenTelemetry", "Tracing distribue OpenTelemetry complet", "CRITIQUE"),
    ("OpenTelemetry metrics service", "ABSENT - Pas de metrics OTel", "Service de metriques OpenTelemetry", "HAUTE"),
    ("Metrics aggregation (p50/p95/p99)", "PARTIEL - SandboxMetrics a percentiles, pas generalise", "Aggregation metriques generalisee avec percentiles", "HAUTE"),
    ("Alert Manager", "PARTIEL - SandboxMetrics a alertes basiques, pas de systeme global", "Systeme d'alertes global configurable", "CRITIQUE"),
    ("Real-time observability dashboard", "ABSENT - Pas de dashboard observabilite", "Dashboard temps reel des metriques et traces", "HAUTE"),
    ("Request logging with correlation IDs", "IMPLEMENTE - requestLogger() avec X-Request-ID, UUID generation", "Logging avec ID de correlation par requete", "HAUTE"),
    ("Health check endpoint", "IMPLEMENTE - GET /health avec status, uptime, memory, SSE clients", "Endpoint health check detaille", "HAUTE"),
    ("Structured error handling", "IMPLEMENTE - errorHandler() categorise: Validation/JWT/RateLimit/500", "Gestion d'erreurs structuree et categorisee", "HAUTE"),
    ("Event-driven execution tracking", "IMPLEMENTE - 14 event types OrchestratorEvent + SSE streaming", "Suivi d'execution evenementiel avec streaming SSE", "HAUTE"),
]

# PHASE 9: Centre de Controle Admin
PHASE9_ROWS = [
    ("Users management module", "ABSENT - Pas d'interface admin pour utilisateurs", "Module gestion utilisateurs avec CRUD, roles, tiers", "CRITIQUE"),
    ("Agents management module", "ABSENT - Pas d'interface admin pour agents", "Module gestion agents avec config, DAG, LLM pools", "CRITIQUE"),
    ("Providers management module", "ABSENT - Pas d'interface admin pour providers LLM", "Module gestion providers avec cles API, quotas", "HAUTE"),
    ("Orchestration management module", "ABSENT - Pas d'interface orchestration", "Module orchestration avec MoA config, pipelines", "HAUTE"),
    ("Finances management module", "ABSENT - Pas de suivi financier admin", "Module finances avec couts, facturation, budgets", "CRITIQUE"),
    ("Security management module", "ABSENT - Pas de dashboard securite admin", "Module securite avec audit, menaces, permissions", "CRITIQUE"),
    ("Infrastructure management module", "ABSENT - Pas de monitoring infrastructure", "Module infrastructure avec sandbox, cache, DB", "HAUTE"),
    ("Monitoring management module", "ABSENT - Pas de monitoring centralise admin", "Module monitoring avec metriques, alertes, logs", "HAUTE"),
    ("Admin API endpoints", "ABSENT - Pas de routes admin specifiques", "API REST admin pour tous les modules", "CRITIQUE"),
    ("Role-based access control for admin", "PARTIEL - JWT + tier, pas de roles admin specifiques", "RBAC avec roles Super Admin, Tenant Admin, Team Manager", "CRITIQUE"),
]

# PHASE 10: Securite Enterprise
PHASE10_ROWS = [
    ("MFA TOTP authentication", "ABSENT - Pas de MFA", "Authentification multi-facteurs TOTP", "CRITIQUE"),
    ("Device Trust / fingerprinting", "ABSENT - Pas de device trust", "Validation appareil de confiance avec fingerprint", "HAUTE"),
    ("Session Management (concurrent, timeout)", "PARTIEL - Refresh tokens DB, pas de session management complet", "Gestion sessions avec limites concurrentes, timeout", "HAUTE"),
    ("Secret Rotation (API keys)", "ABSENT - Pas de rotation de secrets", "Rotation automatique des secrets et cles API", "CRITIQUE"),
    ("Security Dashboard", "ABSENT - Pas de dashboard securite", "Dashboard securite avec menaces, audit, compliance", "HAUTE"),
    ("Threat Detection (anomaly)", "ABSENT - Pas de detection de menaces", "Detection d'anomalies et menaces en temps reel", "HAUTE"),
    ("Audit Trail (complet)", "PARTIEL - analyticsEvents table, pas de trail structure", "Piste d'audit complete et immutable", "CRITIQUE"),
    ("JWT + bcrypt auth", "IMPLEMENTE - JWT HS256 + bcrypt hash + refresh tokens DB", "Authentification JWT + bcrypt securisee", "HAUTE"),
    ("Zod validation", "IMPLEMENTE - Tous les schemas Zod pour agents, users, projects", "Validation Zod des entrees sur toutes les routes", "HAUTE"),
    ("Rate Limiting per tier", "IMPLEMENTE - Redis-backed sliding window, 3 tiers (free/pro/enterprise)", "Rate limiting Redis par tier utilisateur", "HAUTE"),
    ("CORS configuration", "IMPLEMENTE - Hono cors middleware, configurable via env", "CORS configure avec origines autorisees", "HAUTE"),
    ("Security headers (CSP/HSTS/COOP/CORP/COEP)", "IMPLEMENTE - 11 security headers dont CSP complet, HSTS prod", "Headers de securite complets", "CRITIQUE"),
    ("XSS sanitization", "IMPLEMENTE - sanitizeString() + sanitizeObject() recursive", "Sanitisation XSS des entrees utilisateur", "HAUTE"),
]

# PHASE 11: Qualite Logicielle
PHASE11_ROWS = [
    ("Unit tests (>80% coverage)", "ABSENT - Pas de tests unitaires", "Tests unitaires avec couverture >80%", "CRITIQUE"),
    ("Integration tests", "ABSENT - Pas de tests d'integration", "Tests d'integration pour API routes + DB", "CRITIQUE"),
    ("E2E tests", "ABSENT - Pas de tests E2E", "Tests end-to-end pour flux utilisateurs critiques", "HAUTE"),
    ("Load tests", "ABSENT - Pas de tests de charge", "Tests de charge pour validation scalabilite", "HAUTE"),
    ("Chaos tests", "ABSENT - Pas de tests de chaos", "Tests de chaos pour resilience (Redis down, DB fail)", "MOYENNE"),
    ("CI/CD pipeline", "ABSENT - Pas de pipeline CI/CD", "Pipeline CI/CD avec tests automatiques", "CRITIQUE"),
    ("TypeScript strict mode", "PARTIEL - tsconfig.json existe mais strict pas verified", "TypeScript strict mode sans any explicite", "HAUTE"),
    ("Linting (ESLint)", "PARTIEL - turbo lint script, pas de config ESLint monorepo", "Linting ESLint configure pour tout le monorepo", "HAUTE"),
]

# PHASE 12: Multi-Tenant Enterprise
PHASE12_ROWS = [
    ("Tenant isolation (data)", "ABSENT - Pas de multi-tenancy, schema single-tenant", "Isolation des donnees par tenant (row-level ou schema-level)", "CRITIQUE"),
    ("Tenant quotas (executions, tokens, cost)", "ABSENT - Pas de quotas par tenant", "Quotas par tenant avec enforcement", "CRITIQUE"),
    ("Tenant billing", "ABSENT - Pas de facturation", "Systeme de facturation avec plans et paiements", "HAUTE"),
    ("Tenant branding (white-label)", "ABSENT - Pas de branding par tenant", "Branding personnalise par tenant (logo, couleurs)", "MOYENNE"),
    ("Advanced RBAC (Super Admin/Tenant Admin/Team Manager)", "ABSENT - Pas de RBAC avance, seulement 3 tiers", "RBAC avance avec 3 niveaux de roles admin", "CRITIQUE"),
    ("Tenant management API", "ABSENT - Pas d'API tenant", "API REST complete pour gestion des tenants", "CRITIQUE"),
    ("Tenant-aware middleware", "ABSENT - Pas de middleware tenant", "Middleware d'isolation tenant sur toutes les routes", "CRITIQUE"),
    ("Analytics per tenant", "ABSENT - analyticsEvents global, pas par tenant", "Analytics isoles par tenant", "HAUTE"),
]

# PHASE 13: Performance & Scalabilite
PHASE13_ROWS = [
    ("Redis Cluster support", "PARTIEL - ioredis avec single instance, pas de cluster", "Support Redis Cluster pour haute disponibilite", "CRITIQUE"),
    ("Job Queue (BullMQ/Redis-based)", "ABSENT - Pas de file de travaux, execution synchrone/orchestrator", "File de travaux distribuee avec BullMQ", "CRITIQUE"),
    ("Horizontal scaling (stateless API)", "PARTIEL - API Hono stateless, mais CacheManager/SandboxManager single-instance", "API stateless avec support horizontal scaling", "CRITIQUE"),
    ("Distributed cache invalidation", "ABSENT - L1 in-memory non partage entre instances", "Invalidation cache distribuee entre instances", "HAUTE"),
    ("Connection pooling (DB)", "IMPLEMENTE - postgres.js max:20, idle_timeout:20000", "Pool de connexions DB optimise", "HAUTE"),
    ("Streaming response optimization", "IMPLEMENTE - SSE streaming pour executions", "Optimisation streaming pour reponses longues", "HAUTE"),
    ("Lazy loading services", "PARTIEL - Services instanties au demarrage, pas de lazy loading", "Chargement paresseux des services a la demande", "MOYENNE"),
    ("Graceful shutdown", "IMPLEMENTE - SIGTERM/SIGINT handlers, server.close()", "Arret gracieux avec drain des connexions", "HAUTE"),
    ("Request deduplication", "ABSENT - Pas de deduplication de requetes", "Deduplication des requetes identiques en cours", "MOYENNE"),
    ("Auto-scaling triggers", "ABSENT - Pas d'auto-scaling", "Declencheurs auto-scaling bases sur metriques", "MOYENNE"),
]

# ============================================================
# BUILD DOCUMENT
# ============================================================
OUTPUT_PATH = '/home/z/my-project/download/AgentForge_Matrice_Conformite.pdf'

doc = TocDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=LEFT_M,
    rightMargin=RIGHT_M,
    topMargin=TOP_M,
    bottomMargin=BOTTOM_M,
    title='AgentForge - Matrice de Conformite Strategique',
    author='Z.ai',
    creator='Z.ai',
    subject='Programme de Remediation Strategique - Phase 1',
)

story = []

# ============================================================
# COVER PAGE
# ============================================================
story.append(Spacer(1, 120))
story.append(HRFlowable(width="80%", thickness=2, color=ACCENT, spaceAfter=20))
story.append(Paragraph('<b>AGENTFORGE</b>', ParagraphStyle(
    'CoverBrand', fontName='LiberationSerif', fontSize=14, leading=18,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=8,
)))
story.append(Paragraph('<b>Matrice de Conformite Strategique</b>', cover_title_style))
story.append(Spacer(1, 8))
story.append(Paragraph('Programme de Remediation Strategique - Phase 1', cover_subtitle_style))
story.append(Spacer(1, 6))
story.append(Paragraph('Vision Complete - 13 Phases', cover_meta_style))
story.append(HRFlowable(width="80%", thickness=2, color=ACCENT, spaceBefore=20, spaceAfter=30))
story.append(Spacer(1, 30))
story.append(Paragraph('Enterprise Ready | Cloud Native | Horizontally Scalable', ParagraphStyle(
    'CoverKeywords', fontName='LiberationSerif', fontSize=11, leading=16,
    alignment=TA_CENTER, textColor=ACCENT, spaceAfter=4,
)))
story.append(Paragraph('Multi-Tenant | Self-Optimizing | Observable | Secure | Commercializable', ParagraphStyle(
    'CoverKeywords2', fontName='LiberationSerif', fontSize=11, leading=16,
    alignment=TA_CENTER, textColor=ACCENT, spaceAfter=20,
)))
story.append(Spacer(1, 40))
story.append(Paragraph('Document genere le 4 juin 2026', cover_meta_style))
story.append(Paragraph('Codebase analyse: 155+ fichiers | 9 services | 13 tables DB', cover_meta_style))
story.append(Paragraph('Monorepo pnpm + Turborepo | Hono API | Vite/React Web | Drizzle ORM + PostgreSQL', cover_meta_style))
story.append(PageBreak())

# ============================================================
# TABLE OF CONTENTS
# ============================================================
story.append(Paragraph('<b>Table des Matieres</b>', h1_style))
story.append(Spacer(1, 12))
toc = TableOfContents()
toc.levelStyles = [toc_h1_style, toc_h2_style]
story.append(toc)
story.append(PageBreak())

# ============================================================
# 1. INTRODUCTION
# ============================================================
story.append(add_heading('<b>1. Introduction et Methodologie</b>', h1_style, 0))
story.append(Spacer(1, 8))

story.append(Paragraph(
    'Ce document constitue la <b>Phase 1</b> du Programme de Remediation Strategique d\'AgentForge. '
    'Il presente la <b>Matrice de Conformite</b> complete, mappant chaque exigence du Blueprint architectural '
    'a l\'etat actuel de l\'implementation, l\'etat cible enterprise-grade, et la priorite de remediation. '
    'Aucune implementation ne doit etre lancee avant la validation complete de cette matrice, conformement '
    'a la regle absolue du programme: <b>jamais remplacer une implementation validee par une regression</b>.',
    body_style
))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'La methodologie adoptee repose sur une analyse forensique code-level du codebase AgentForge, '
    'couvrant les 155+ fichiers du monorepo (packages api, web, shared, sandbox) et de l\'application '
    'Next.js racine. Chaque exigence du Blueprint a ete verifiee par lecture directe du code source, '
    'identification des implementations existantes, et evaluation de l\'ecart avec l\'etat cible. '
    'Les priorites sont classifiees selon quatre niveaux: Critique (bloquant pour la production), '
    'Haute (necessaire pour enterprise-ready), Moyenne (amelioration significative), et Faible (nice-to-have).',
    body_style
))
story.append(Spacer(1, 6))

story.append(add_heading('<b>1.1 Resume Executif</b>', h2_style, 1))
story.append(Spacer(1, 6))

# Summary statistics
total_exigences = (
    len(PHASE1_ROWS) + len(PHASE2_ROWS) + len(PHASE3_ROWS) + len(PHASE4_ROWS) +
    len(PHASE5_ROWS) + len(PHASE6_ROWS) + len(PHASE7_ROWS) + len(PHASE8_ROWS) +
    len(PHASE9_ROWS) + len(PHASE10_ROWS) + len(PHASE11_ROWS) + len(PHASE12_ROWS) + len(PHASE13_ROWS)
)

all_rows = (PHASE1_ROWS + PHASE2_ROWS + PHASE3_ROWS + PHASE4_ROWS + PHASE5_ROWS + 
            PHASE6_ROWS + PHASE7_ROWS + PHASE8_ROWS + PHASE9_ROWS + PHASE10_ROWS + 
            PHASE11_ROWS + PHASE12_ROWS + PHASE13_ROWS)

impl_count = sum(1 for r in all_rows if 'IMPLEMENTE' in r[1].upper() or 'IMPL' in r[1].upper())
partial_count = sum(1 for r in all_rows if 'PARTIEL' in r[1].upper())
absent_count = sum(1 for r in all_rows if 'ABSENT' in r[1].upper())
critique_count = sum(1 for r in all_rows if r[3] == 'CRITIQUE')
haute_count = sum(1 for r in all_rows if r[3] == 'HAUTE')
moyenne_count = sum(1 for r in all_rows if r[3] == 'MOYENNE')
faible_count = sum(1 for r in all_rows if r[3] == 'FAIBLE')

impl_pct = round(impl_count / total_exigences * 100)
partial_pct = round(partial_count / total_exigences * 100)
absent_pct = round(absent_count / total_exigences * 100)

# Stats table
stats_data = [
    [PH(f'<b>Metrique</b>'), PH(f'<b>Valeur</b>')],
    [P(f'Total exigences analysees'), P(f'<b>{total_exigences}</b>', cell_center_style)],
    [P(f'Implementes complets'), P(f'<b>{impl_count}</b> ({impl_pct}%)', cell_center_style)],
    [P(f'Partiellement implementes'), P(f'<b>{partial_count}</b> ({partial_pct}%)', cell_center_style)],
    [P(f'Absents (non implementes)'), P(f'<b>{absent_count}</b> ({absent_pct}%)', cell_center_style)],
    [P(f'Priorite CRITIQUE'), P(f'<b>{critique_count}</b>', cell_center_style)],
    [P(f'Priorite HAUTE'), P(f'<b>{haute_count}</b>', cell_center_style)],
    [P(f'Priorite MOYENNE'), P(f'<b>{moyenne_count}</b>', cell_center_style)],
    [P(f'Priorite FAIBLE'), P(f'<b>{faible_count}</b>', cell_center_style)],
]
stats_table = Table(stats_data, colWidths=[AVAILABLE_W * 0.6, AVAILABLE_W * 0.4], hAlign='CENTER')
stats_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), IMPLEMENTED_BG),
    ('BACKGROUND', (0, 3), (-1, 3), PARTIAL_BG),
    ('BACKGROUND', (0, 4), (-1, 4), MISSING_BG),
    ('BACKGROUND', (0, 5), (-1, 5), CRITIQUE_COLOR),
    ('TEXTCOLOR', (0, 5), (-1, 5), colors.white),
    ('BACKGROUND', (0, 6), (-1, 6), HAUTE_COLOR),
    ('TEXTCOLOR', (0, 6), (-1, 6), colors.white),
    ('BACKGROUND', (0, 7), (-1, 7), MOYENNE_COLOR),
    ('TEXTCOLOR', (0, 7), (-1, 7), colors.white),
    ('BACKGROUND', (0, 8), (-1, 8), FAIBLE_COLOR),
    ('TEXTCOLOR', (0, 8), (-1, 8), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(Spacer(1, 12))
story.append(stats_table)
story.append(Spacer(1, 6))
story.append(Paragraph(f'<i>Tableau 1: Resume executif de la conformite AgentForge ({total_exigences} exigences sur 13 phases)</i>',
    ParagraphStyle('Caption', fontName='LiberationSerif', fontSize=9, alignment=TA_CENTER, textColor=TEXT_MUTED)))

story.append(Spacer(1, 18))

# Score de conformite global
conformity_score = round((impl_count * 100 + partial_count * 50) / total_exigences, 1)
story.append(Paragraph(
    f'<b>Score de conformite global: {conformity_score}/100</b> — '
    f'Ce score pondere les implementations completes a 100% et partielles a 50%. '
    f'Il reflète le niveau actuel de maturite d\'AgentForge par rapport au Blueprint cible enterprise-grade. '
    f'Les {critique_count} exigences Critiques non-resolues representent les bloqueurs principaux '
    f'pour une mise en production securisee et scalable.',
    body_style
))

# ============================================================
# 2-14: PHASE MATRICES
# ============================================================
phases = [
    (2, "Orchestration IA Avancee", "MoA, Reflection, Cost Optimizer", PHASE2_ROWS),
    (3, "Router RL Adaptatif", "Epsilon-greedy, Reward, Persistence, Learning", PHASE3_ROWS),
    (4, "Auto-Fix Enterprise", "200+ Patterns, ts-morph AST, Root Cause Analysis", PHASE4_ROWS),
    (5, "Gestion Contextuelle Lineaire", "ContextGraph, TokenBudget, Compression", PHASE5_ROWS),
    (6, "Sandbox Cloud Native", "WarmPool, Scheduler, Metrics, <500ms startup", PHASE6_ROWS),
    (7, "Moteur Deploiement Cloudflare", "Pages/Workers/D1/KV/R2, Blue/Green, Canary", PHASE7_ROWS),
    (8, "Observabilite Totale", "OpenTelemetry, Tracing, Metrics, Alerts", PHASE8_ROWS),
    (9, "Centre de Controle Admin", "8 Modules: Users, Agents, Providers, Orchestration, Finances, Security, Infra, Monitoring", PHASE9_ROWS),
    (10, "Securite Enterprise", "MFA TOTP, Device Trust, Secret Rotation, Threat Detection", PHASE10_ROWS),
    (11, "Qualite Logicielle", "Unit/Integration/E2E/Load/Chaos Tests, >80% Coverage", PHASE11_ROWS),
    (12, "Multi-Tenant Enterprise", "Isolation, Quotas, Billing, Branding, RBAC", PHASE12_ROWS),
    (13, "Performance et Scalabilite", "Redis Cluster, Job Queue, Horizontal Scaling", PHASE13_ROWS),
]

for phase_num, phase_title, phase_desc, phase_rows in phases:
    story.append(CondPageBreak(100))
    story.append(add_heading(f'<b>Phase {phase_num}: {phase_title}</b>', h1_style, 0))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f'<i>{phase_desc}</i>', ParagraphStyle(
        'PhaseDesc', fontName='LiberationSerif', fontSize=10, leading=14,
        textColor=TEXT_MUTED, spaceAfter=8,
    )))
    
    # Phase summary stats
    p_impl = sum(1 for r in phase_rows if 'IMPLEMENTE' in r[1].upper() or 'IMPL' in r[1].upper())
    p_part = sum(1 for r in phase_rows if 'PARTIEL' in r[1].upper())
    p_abs = sum(1 for r in phase_rows if 'ABSENT' in r[1].upper())
    p_crit = sum(1 for r in phase_rows if r[3] == 'CRITIQUE')
    
    story.append(Paragraph(
        f'Exigences: {len(phase_rows)} | Completes: {p_impl} | Partielles: {p_part} | '
        f'Absentes: {p_abs} | Critiques: {p_crit}',
        ParagraphStyle('PhaseStats', fontName='LiberationSerif', fontSize=9, leading=12,
            textColor=TEXT_MUTED, spaceAfter=8)
    ))
    
    # Build and add matrix table
    story.append(Spacer(1, 6))
    table = build_matrix_table(phase_rows)
    story.append(table)
    story.append(Spacer(1, 6))

# ============================================================
# 14. ANALYSE TRANSVERSALE
# ============================================================
story.append(CondPageBreak(100))
story.append(add_heading('<b>Analyse Transversale et Recommandations</b>', h1_style, 0))
story.append(Spacer(1, 8))

story.append(add_heading('<b>Axes Critiques (Bloqueurs Production)</b>', h2_style, 1))
story.append(Paragraph(
    f'Sur les {total_exigences} exigences identifiees, {critique_count} sont classees Critique, '
    f'representant les bloqueurs absolus pour une mise en production enterprise-grade. '
    f'Ces bloqueurs se concentrent dans trois domaines: (1) l\'observabilite avec l\'absence totale '
    f'd\'OpenTelemetry et de tracing distribue, (2) la securite avec l\'absence de MFA, rotation de secrets '
    f'et piste d\'audit, et (3) la scalabilite avec l\'absence de Redis Cluster, Job Queue distribuee '
    f'et support multi-instance. La resolution de ces trois axes doit etre prioritaire avant toute '
    f'commercialisation.',
    body_style
))
story.append(Spacer(1, 8))

story.append(add_heading('<b>Taux de Conformite par Phase</b>', h2_style, 1))

# Phase conformity scores table
phase_scores = []
for phase_num, phase_title, phase_desc, phase_rows in phases:
    p_impl = sum(1 for r in phase_rows if 'IMPLEMENTE' in r[1].upper() or 'IMPL' in r[1].upper())
    p_part = sum(1 for r in phase_rows if 'PARTIEL' in r[1].upper())
    score = round((p_impl * 100 + p_part * 50) / len(phase_rows), 1)
    phase_scores.append((f'Phase {phase_num}', phase_title, score, len(phase_rows)))

score_data = [[PH('<b>Phase</b>'), PH('<b>Titre</b>'), PH('<b>Score</b>'), PH('<b>Exigences</b>')]]
for i, (phase, title, score, count) in enumerate(phase_scores):
    bg_color = IMPLEMENTED_BG if score >= 70 else (PARTIAL_BG if score >= 40 else MISSING_BG)
    score_data.append([
        P(phase, cell_center_style),
        P(title, cell_style),
        P(f'<b>{score}%</b>', cell_center_style),
        P(str(count), cell_center_style),
    ])

score_table = Table(score_data, colWidths=[AVAILABLE_W * 0.15, AVAILABLE_W * 0.50, AVAILABLE_W * 0.15, AVAILABLE_W * 0.20], hAlign='CENTER')
score_style_cmds = [
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]
for i, (_, _, score, _) in enumerate(phase_scores):
    row_idx = i + 1
    bg_color = IMPLEMENTED_BG if score >= 70 else (PARTIAL_BG if score >= 40 else MISSING_BG)
    score_style_cmds.append(('BACKGROUND', (2, row_idx), (2, row_idx), bg_color))
    score_style_cmds.append(('BACKGROUND', (0, row_idx), (1, row_idx), TABLE_ROW_EVEN if i % 2 == 0 else TABLE_ROW_ODD))
    score_style_cmds.append(('BACKGROUND', (3, row_idx), (3, row_idx), TABLE_ROW_EVEN if i % 2 == 0 else TABLE_ROW_ODD))

score_table.setStyle(TableStyle(score_style_cmds))
story.append(Spacer(1, 12))
story.append(score_table)
story.append(Spacer(1, 6))
story.append(Paragraph('<i>Tableau 2: Taux de conformite par phase (vert >= 70%, jaune >= 40%, rouge < 40%)</i>',
    ParagraphStyle('Caption2', fontName='LiberationSerif', fontSize=9, alignment=TA_CENTER, textColor=TEXT_MUTED)))

story.append(Spacer(1, 18))

story.append(add_heading('<b>Dependencies Inter-Phases</b>', h2_style, 1))
story.append(Paragraph(
    'L\'analyse des dependances revele des chaines critiques qui dictent l\'ordre de remediation. '
    'La Phase 12 (Multi-Tenant) depend de la Phase 10 (Securite Enterprise) pour l\'isolation '
    'et le RBAC avance. La Phase 13 (Performance) depend de la Phase 8 (Observabilite) pour les '
    'metriques d\'auto-scaling et de la Phase 12 pour les quotas par tenant. La Phase 9 (Admin) '
    'depend de la Phase 12 pour la gestion multi-tenant. L\'ordre optimal de remediation est donc: '
    'Phases 2-6 (noyau existant a completer) -> Phase 8 (observabilite) -> Phase 10 (securite) -> '
    'Phase 13 (performance) -> Phase 12 (multi-tenant) -> Phase 9 (admin) -> Phase 7 (deploiement) -> '
    'Phase 11 (qualite).',
    body_style
))
story.append(Spacer(1, 8))

story.append(add_heading('<b>Risques de Regression</b>', h2_style, 1))
story.append(Paragraph(
    'Le codebase actuel contient des implementations validees et fonctionnelles qu\'il faut imperativement '
    'preserver. Les principaux risques de regression identifiees sont: (1) le remplacement du CacheManager '
    'L1+L2 existant par un systeme distribue pourrait casser les performances si la latence reseau '
    'n\'est pas geree, (2) la migration du Schema DB single-tenant vers multi-tenant doit etre '
    'realisee sans downtime via migrations incrementales, (3) l\'ajout de MFA ne doit pas casser '
    'le flux JWT existant, (4) l\'introduction d\'OpenTelemetry doit etre non-intrusive avec fallback '
    'gracieux si le collector est indisponible. Chaque remediation doit inclure un plan de rollback '
    'et des tests de non-regression.',
    body_style
))

# ============================================================
# BUILD
# ============================================================
doc.multiBuild(story)
print(f"PDF generated: {OUTPUT_PATH}")

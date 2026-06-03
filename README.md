# AgentForge — Plateforme d'Orchestration d'Agents IA

> 1 Kernel MoA, 7 Configurations d'Agents, Architecture Hyper-Scalable

## Architecture

AgentForge est une plateforme unifiee d'agents IA basee sur le pattern **Mixture-of-Agents (MoA)**. Au lieu de construire des agents independants, le systeme utilise un noyau d'orchestration unique que 7 configurations differentes parametrent.

### Les 7 Agents

| Agent | Role | DAG |
|-------|------|-----|
| Developpeur | Generation code, APIs, deploiement | Config > Types > API > UI |
| SLIDES | Presentations, design, mise en page | Template > Layout > Content > Design |
| DOC | Rapports PDF/DOCX, documents longs | Outline > Sections > Content > PDF |
| DATA | Analyse de donnees, visualisations | Schema > Query > Process > Visual |
| RECHERCHE | Synthese multi-sources, veille | Query > Search > Extract > Synthesize |
| EMAIL | Redaction, personnalisation, A/B test | Context > Draft > Refine > Send |
| MARKETING | Copy, funnels, SEO, analytics | Brief > Copy > Visual > Funnel |

### 12 Mecanismes d'Orchestration

1. **Mixture-of-Agents (MoA)** — 9 LLMs en parallele
2. **DAG-Based Code Generation** — Generation niveau par niveau
3. **Reflection Agent** — Vote multi-criteres, seuil 0.95
4. **3-Level Auto-Fix Engine** — Pattern > AST > LLM
5. **RL-Optimized Model Router** — Routage intelligent par renforcement
6. **Cost Optimizer Cascade** — Scoring qualite/cout/vitesse
7. **Cache Orchestration L1+L2** — In-memory + Redis
8. **Sandbox Warm Pool** — Conteneurs Docker prechauffes
9. **Context-Aware Generation** — Contexte lineaire inter-fichiers
10. **Linear Context Management** — Injection des dependances directes
11. **Cloudflare Edge Deployer** — Deploiement < 60s
12. **Multi-Layer Security** — Validation, sanitization, rate limiting

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Database**: Prisma ORM + SQLite
- **UI**: Tailwind CSS 4 + shadcn/ui
- **AI**: z-ai-web-dev-sdk (9 modeles LLM)
- **Icons**: Lucide React

## Getting Started

```bash
# 1. Cloner le repository
git clone https://github.com/VOTRE-USER/agentforge.git
cd agentforge

# 2. Installer les dependances
bun install

# 3. Configurer l'environnement
cp .env.example .env
# Editer .env avec vos cles API

# 4. Initialiser la base de donnees
bun run db:push

# 5. Lancer le serveur de development
bun run dev
```

## Structure du Projet

```
src/
  app/
    api/
      generate/route.ts    # Pipeline de generation complet
      agents/route.ts      # Configurations des agents
      projects/route.ts    # Gestion des projets
      sessions/route.ts    # Historique et analytics
    page.tsx               # Dashboard principal (5 onglets)
    layout.tsx             # Layout racine
  components/
    agent-card.tsx         # Carte d'agent avec details
    generation-form.tsx    # Formulaire de generation
    results-panel.tsx      # Panel de resultats
    architecture-diagram.tsx  # Diagramme MoA
    stats-cards.tsx        # Cartes de statistiques
  lib/
    services/
      orchestrator.ts      # SuperAgentOrchestrator (MoA Kernel)
      reflection.ts        # ReflectionAgent (vote multi-criteres)
      autofix.ts           # AutoFixEngine (3 niveaux)
      cache.ts             # CacheManager (L1 + L2)
      cost-optimizer.ts    # CostOptimizer + Model Router
      agent-registry.ts    # 7 configurations d'agents
    db.ts                  # Prisma client
    utils.ts               # Utilitaires
  prisma/
    schema.prisma          # Schema de base de donnees
```

## Dashboard

Le dashboard comprend 5 onglets :

1. **Agents** — Grille des 7 agents avec details (DAG, criteres, routage)
2. **Generate** — Formulaire de generation avec resultat en temps reel
3. **Projects** — Gestion des projets et historique
4. **Analytics** — Statistiques et metriques
5. **Architecture** — Diagramme visuel du MoA Kernel

## Licence

MIT

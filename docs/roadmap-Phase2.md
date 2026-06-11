# ALTER EGO OS — Phase 2 Roadmap

> Phase 1 established the kernel, the five pillars, and the cognitive engines.
> Phase 2 adds the eyes, the hands, and the production document pipeline.

---

## Phase 2 Overview

**Goal**: Make ALTER EGO OS capable of executing its first complete mission autonomously — from research to deliverables.

**Duration**: 10 weeks
**Principle**: Each new capability is a plugin. The kernel NEVER changes.

---

## Sprint S2-1: Browser Agent Plugin (2 weeks)

The Browser Agent is the most impactful plugin — it gives the system eyes on the internet.

### Deliverables
- `packages/plugins/browser-agent/` — Playwright-based headless browser
  - Navigation: `navigate(url)`, `click(selector)`, `type(selector, text)`, `scroll(direction)`
  - Extraction: `extractText(selector)`, `extractLinks()`, `extractImages()`, `extractPageContent()`
  - Search: `searchGoogle(query)`, `searchGitHub(query)`, `searchArxiv(query)`
  - Download: `downloadFile(url, destination)`, `screenshot(selector?)`
  - Session management: `login(url, credentials)`, `isLoggedIn(domain)`
  - Anti-detection: Random delays, viewport rotation, user-agent cycling
- Plugin manifest for Plugin Loader
- Integration tests with real websites (using Playwright test fixtures)

### Dependencies
- `@alterego/plugin-loader` (Phase 1)
- `playwright` (new dependency)

---

## Sprint S2-2: Research Agent Plugin (2 weeks)

The Research Agent uses the Browser Agent to conduct deep, iterative research.

### Deliverables
- `packages/plugins/research-agent/` — Deep research with iteration
  - Source discovery: Google, arXiv, GitHub, HuggingFace, Reddit, Wikipedia, Google Scholar
  - Research loop: Search → Read → Evaluate → Deepen → Synthesize
  - Source evaluation: Credibility scoring, recency check, relevance ranking
  - Synthesis: Combine findings into structured report with citations
  - Knowledge integration: Auto-archive findings in Knowledge Center
- Plugin manifest for Plugin Loader
- Integration tests with real search queries

### Dependencies
- `@alterego/browser-agent` (S2-1)
- `@alterego/knowledge` (Phase 1)
- `@alterego/memory` (Phase 1)

---

## Sprint S2-3: Writer + PDF + DOCX Agents (3 weeks)

The document production pipeline — the core of the "formation complète" use case.

### Deliverables
- `packages/plugins/writer-agent/` — Content generation agent
  - Multi-format writing: Course, article, report, documentation
  - Structured output: Chapters, sections, subsections
  - Style adaptation: Academic, professional, casual
  - Source integration: Citations, references, bibliography
  
- `packages/plugins/pdf-agent/` — Premium PDF generation
  - Professional layout: Cover page, TOC, headers/footers, page numbers
  - Typography: Noto Serif SC for body, Noto Sans SC for headings
  - Visual elements: Tables, charts (via matplotlib/mermaid), code blocks
  - Export quality: Print-ready PDF with proper margins and spacing

- `packages/plugins/docx-agent/` — Professional DOCX generation
  - Styles: Heading 1-6, body text, lists, tables
  - Auto-generated: Table of contents, index, bibliography
  - Cross-references: Figures, tables, equations
  - Metadata: Author, title, subject, keywords

### Dependencies
- `@alterego/knowledge` (Phase 1)
- `@alterego/quality-gates` (Phase 1)
- External: `pdfkit` or `puppeteer`, `docx` npm package

---

## Sprint S2-4: Slides + Course Agents (2 weeks)

The visual and educational production pipeline.

### Deliverables
- `packages/plugins/slides-agent/` — Professional presentation generation
  - PowerPoint generation with layouts: Title, Content, Two-Column, Image+Text, Quote
  - Visual elements: Timelines, process diagrams, comparison tables, icon arrays
  - Consistent theming: Color palette, font scheme, master slide
  - Speaker notes: Auto-generated for each slide

- `packages/plugins/course-agent/` — Complete course orchestrator
  - Course structure: Syllabus → Chapters → Sections → Exercises → Quiz
  - Multi-format output: PDF + DOCX + Slides + Quiz + TP + Corrigés
  - Pedagogical design: Learning objectives, progression, assessment
  - Integration: Uses Writer + PDF + DOCX + Slides agents as sub-workflows

### Dependencies
- `@alterego/writer-agent` (S2-3)
- `@alterego/pdf-agent` (S2-3)
- `@alterego/docx-agent` (S2-3)
- External: `pptxgenjs` npm package

---

## Sprint S2-5: Integration & Executive Dashboard (1 week)

Tie everything together and create the user-facing dashboard.

### Deliverables
- End-to-end integration test: "Prépare formation Docker" → 12 deliverables
- Executive Dashboard UI (Next.js page)
  - Active missions with progress
  - Daily summary (researches completed, articles generated, cost, time saved)
  - Alert feed (VPS warnings, quality gate failures, budget alerts)
  - Knowledge browser (search the document library)
  - Mission templates gallery
- Scheduler integration: Daily tech watch, weekly VPS audit

### Dependencies
- All S2-1 through S2-4 plugins
- Next.js dashboard page (existing web app)

---

## Success Criteria for Phase 2

| Criterion | Measurement |
|-----------|-------------|
| First autonomous mission | User submits "Prépare formation Docker" → system produces PDF, DOCX, PPTX, Quiz, TP, Corrigés |
| Real web research | Browser Agent navigates 5+ real websites per research mission |
| Document quality | PDF/DOCX output passes quality gates (formatting, completeness, coherence) |
| End-to-end latency | Complete formation mission in under 30 minutes |
| Cost efficiency | Under $5 per complete formation (multi-model optimization) |
| System stability | Zero kernel regressions from Phase 1 (754 tests still passing) |

---

## Phase 3 Preview (after Phase 2)

- VPS Agent — SSH monitoring, Docker management, auto-remediation
- GitHub Agent — Repository analysis, code review, PR generation
- Publishing Agent — Multi-platform content publishing
- Security Agent — Vulnerability scanning, compliance checking
- Marketplace — Plugin, template, and workflow marketplace
- Real infrastructure — PostgreSQL + Redis + pgvector backend (replace in-memory stores)

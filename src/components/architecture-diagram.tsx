'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Cpu, GitBranch, Shield, Wrench, Database, Zap, BarChart3,
  ArrowRight, Layers, Network, RefreshCw, Target,
} from 'lucide-react';

const MECHANISMS = [
  { icon: GitBranch, name: 'Task Decomposition', desc: 'Break complex tasks into parallel subtasks' },
  { icon: Network, name: 'Dynamic Model Routing', desc: 'Route subtasks to optimal LLM based on type' },
  { icon: Layers, name: 'Parallel Execution', desc: 'Execute subtasks concurrently across models' },
  { icon: RefreshCw, name: 'Multi-Model Synthesis', desc: 'Merge outputs from multiple LLMs' },
  { icon: Shield, name: 'Reflection Agent', desc: '6-criteria weighted quality evaluation' },
  { icon: Target, name: 'Confidence Threshold', desc: 'Configurable quality gate per agent' },
  { icon: Wrench, name: '3-Level Auto-Fix', desc: 'Pattern → AST → LLM error correction cascade' },
  { icon: Database, name: 'L1/L2 Caching', desc: 'In-memory + extended cache for cost reduction' },
  { icon: BarChart3, name: 'Cost Optimization', desc: 'Quality/cost/speed weighted model selection' },
  { icon: Zap, name: 'DAG Orchestration', desc: 'Directed Acyclic Graph for agent workflows' },
  { icon: Cpu, name: '9-Model MoA', desc: 'Mixture-of-Agents with diverse model pool' },
  { icon: GitBranch, name: 'Agent Registry', desc: '7 specialized agents with unique configs' },
];

export function ArchitectureDiagram() {
  return (
    <div className="space-y-6">
      {/* Flow diagram */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            MoA Kernel Architecture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto pb-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-[600px] px-2">
              {/* Input */}
              <div className="flex-shrink-0 w-24 sm:w-32">
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 sm:p-4 text-center glow-primary">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary mx-auto mb-1.5" />
                  <p className="text-[10px] sm:text-xs font-medium text-primary">User Prompt</p>
                </div>
              </div>

              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-primary/50 flex-shrink-0" />

              {/* Decomposer */}
              <div className="flex-shrink-0 w-24 sm:w-32">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 sm:p-4 text-center">
                  <GitBranch className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-[10px] sm:text-xs font-medium text-emerald-400">Decomposer</p>
                </div>
              </div>

              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400/50 flex-shrink-0" />

              {/* MoA Router */}
              <div className="flex-shrink-0 w-28 sm:w-36">
                <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-3 sm:p-4 text-center">
                  <Network className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400 mx-auto mb-1.5" />
                  <p className="text-[10px] sm:text-xs font-medium text-violet-400">MoA Router</p>
                  <p className="text-[8px] sm:text-[10px] text-violet-400/60">9 Models</p>
                </div>
              </div>

              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400/50 flex-shrink-0" />

              {/* Synthesizer */}
              <div className="flex-shrink-0 w-24 sm:w-32">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 sm:p-4 text-center">
                  <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 mx-auto mb-1.5" />
                  <p className="text-[10px] sm:text-xs font-medium text-amber-400">Synthesizer</p>
                </div>
              </div>

              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400/50 flex-shrink-0" />

              {/* Reflection */}
              <div className="flex-shrink-0 w-24 sm:w-32">
                <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3 sm:p-4 text-center">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 mx-auto mb-1.5" />
                  <p className="text-[10px] sm:text-xs font-medium text-sky-400">Reflection</p>
                </div>
              </div>

              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400/50 flex-shrink-0" />

              {/* Auto-Fix */}
              <div className="flex-shrink-0 w-24 sm:w-32">
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 sm:p-4 text-center">
                  <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 mx-auto mb-1.5" />
                  <p className="text-[10px] sm:text-xs font-medium text-rose-400">Auto-Fix</p>
                  <p className="text-[8px] sm:text-[10px] text-rose-400/60">3 Levels</p>
                </div>
              </div>

              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400/50 flex-shrink-0" />

              {/* Output */}
              <div className="flex-shrink-0 w-24 sm:w-32">
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 sm:p-4 text-center glow-primary">
                  <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-primary mx-auto mb-1.5" />
                  <p className="text-[10px] sm:text-xs font-medium text-primary">Output</p>
                </div>
              </div>
            </div>

            {/* Feedback loop */}
            <div className="relative min-w-[600px] mt-3 px-2">
              <div className="border-t border-dashed border-sky-400/30 mx-16 sm:mx-20">
                <p className="text-center text-[10px] text-sky-400/60 mt-1">
                  ↻ If confidence &lt; threshold → Auto-Fix → Re-evaluate
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mechanisms grid */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            12 Orchestration Mechanisms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MECHANISMS.map((m, i) => {
              const Icon = m.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-black/20 border border-border/30 hover:border-primary/30 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Auto-Fix detail */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="w-5 h-5 text-rose-400" />
            3-Level Auto-Fix Cascade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">1</span>
                <p className="text-sm font-medium text-emerald-400">Pattern-Based</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dictionary of 20+ common error patterns. Fast, deterministic fixes for syntax errors, style issues, and common mistakes.
              </p>
              <p className="text-[10px] text-emerald-400/60 mt-2">⚡ &lt;1ms | 20+ patterns</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">2</span>
                <p className="text-sm font-medium text-amber-400">AST Analysis</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Structural analysis for balanced braces, unclosed strings, missing delimiters, and code fence issues.
              </p>
              <p className="text-[10px] text-amber-400/60 mt-2">⚡ &lt;5ms | Structural checks</p>
            </div>
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center text-xs font-bold text-rose-400">3</span>
                <p className="text-sm font-medium text-rose-400">LLM Correction</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI-powered deep correction for semantic errors, logical inconsistencies, and complex quality issues.
              </p>
              <p className="text-[10px] text-rose-400/60 mt-2">⚡ ~2-5s | Full correction</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

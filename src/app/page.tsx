'use client';

import { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Cpu, Sparkles, FolderKanban, BarChart3, Network,
  Code2, Presentation, FileText, BarChart3 as DataIcon,
  Search, Mail, Megaphone, RefreshCw,
  Clock, DollarSign, Shield,
} from 'lucide-react';
import { AgentCard } from '@/components/agent-card';
import { GenerationForm } from '@/components/generation-form';
import { ResultsPanel } from '@/components/results-panel';
import { ArchitectureDiagram } from '@/components/architecture-diagram';
import { StatsCards } from '@/components/stats-cards';
import { useToast } from '@/hooks/use-toast';

interface AgentInfo {
  type: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  dagDefinition: { stages: { id: string; name: string; parallel: boolean; subtasks: string[] }[] };
  reflectionCriteria: { name: string; weight: number }[];
  modelRouting: { taskType: string; models: string[]; priority: string }[];
}

interface GenerationResult {
  taskId: string;
  synthesis: string;
  confidence: number;
  costCents: number;
  durationMs: number;
  modelUsed: string;
  reflectionScores?: { criterion: string; weight: number; score: number }[];
  autoFixLevel?: number;
  autoFixesApplied?: string[];
  subtasks: { id: string; type: string; model: string }[];
}

interface ProjectInfo {
  id: string;
  name: string;
  agentType: string;
  status: string;
  createdAt: string;
  _count: { sessions: number };
  sessions: { id: string; prompt: string; qualityScore: number; createdAt: string }[];
}

interface SessionInfo {
  id: string;
  prompt: string;
  result: string;
  qualityScore: number;
  modelUsed: string;
  costCents: number;
  durationMs: number;
  createdAt: string;
  project: { name: string; agentType: string };
}

const AGENT_TYPE_COLORS: Record<string, string> = {
  DEV: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  SLIDES: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  DOC: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  DATA: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  RESEARCH: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  EMAIL: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  MARKETING: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
};

const AGENT_TYPE_ICONS: Record<string, typeof Code2> = {
  DEV: Code2, SLIDES: Presentation, DOC: FileText, DATA: DataIcon,
  RESEARCH: Search, EMAIL: Mail, MARKETING: Megaphone,
};

export default function Home() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('DEV');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [analytics, setAnalytics] = useState<{
    totalGenerations: number;
    avgQualityScore: number;
    totalCostCents: number;
    avgDurationMs: number;
  } | null>(null);
  const [agentsLoaded, setAgentsLoaded] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const { toast } = useToast();

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      if (data.success) {
        setAgents(data.data);
        setAgentsLoaded(true);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch agents', variant: 'destructive' });
    }
  }, [toast]);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions?limit=20');
      const data = await res.json();
      if (data.success) {
        setSessions(data.data);
        setAnalytics(data.analytics);
        setSessionsLoaded(true);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch sessions', variant: 'destructive' });
    }
  }, [toast]);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) {
        setProjects(data.data);
        setProjectsLoaded(true);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch projects', variant: 'destructive' });
    }
  }, [toast]);

  // Generate
  const handleGenerate = async (data: { prompt: string; agentType: string; threshold: number }) => {
    setIsGenerating(true);
    setResult(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resultData = await res.json();
      if (resultData.success) {
        setResult(resultData.data);
        toast({
          title: 'Generation Complete',
          description: `Quality: ${(resultData.data.confidence * 100).toFixed(0)}% | Cost: $${(resultData.data.costCents / 100).toFixed(2)}`,
        });
        // Refresh sessions and projects
        fetchSessions();
        fetchProjects();
      } else {
        toast({ title: 'Generation Failed', description: resultData.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Network error during generation', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Load data on tab change
  const handleTabChange = (tab: string) => {
    if (tab === 'agents' && !agentsLoaded) fetchAgents();
    if (tab === 'generate' && !agentsLoaded) fetchAgents();
    if (tab === 'projects' && !projectsLoaded) fetchProjects();
    if (tab === 'analytics' && !sessionsLoaded) fetchSessions();
  };

  // Load agents on mount
  useEffect(() => {
    if (!agentsLoaded) {
      fetchAgents();
    }
  }, [agentsLoaded, fetchAgents]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-xl bg-primary/10 glow-primary">
              <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">AgentForge</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">AI Agent Orchestration Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] sm:text-xs border-primary/30 text-primary hidden sm:inline-flex">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 pulse-glow" />
              7 Agents Online
            </Badge>
            <Badge variant="outline" className="text-[10px] sm:text-xs border-primary/30 text-primary">
              MoA Kernel v2.0
            </Badge>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6">
        <Tabs
          defaultValue="generate"
          className="w-full"
          onValueChange={handleTabChange}
        >
          <TabsList className="w-full grid grid-cols-5 mb-4 sm:mb-6 bg-card/80 border border-border/30 h-auto p-1">
            <TabsTrigger value="agents" className="text-xs sm:text-sm py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Agents</span>
            </TabsTrigger>
            <TabsTrigger value="generate" className="text-xs sm:text-sm py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Generate</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-xs sm:text-sm py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <FolderKanban className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Projects</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="architecture" className="text-xs sm:text-sm py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Network className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Architecture</span>
            </TabsTrigger>
          </TabsList>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Agent Registry</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">7 specialized AI agents with unique DAGs and reflection criteria</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAgents} className="border-border/50">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Refresh
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {agents.map(agent => (
                <AgentCard
                  key={agent.type}
                  type={agent.type}
                  name={agent.name}
                  description={agent.description}
                  icon={agent.icon}
                  threshold={agent.threshold}
                  isSelected={selectedAgent === agent.type}
                  onClick={() => setSelectedAgent(agent.type)}
                />
              ))}
            </div>

            {/* Selected agent detail */}
            {selectedAgent && agents.find(a => a.type === selectedAgent) && (
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    {(() => {
                      const IconComp = AGENT_TYPE_ICONS[selectedAgent] || Code2;
                      return <IconComp className="w-5 h-5 text-primary" />;
                    })()}
                    {agents.find(a => a.type === selectedAgent)?.name} Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    {/* DAG */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">DAG Stages</p>
                      {agents.find(a => a.type === selectedAgent)?.dagDefinition.stages.map((stage, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-black/20 border border-border/20">
                          <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{stage.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {stage.parallel ? '⟶ Parallel' : '⟶ Sequential'} • {stage.subtasks.length} subtasks
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reflection Criteria */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Reflection Criteria</p>
                      {agents.find(a => a.type === selectedAgent)?.reflectionCriteria.map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-border/20">
                          <span className="text-xs text-foreground">{c.name}</span>
                          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                            {(c.weight * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      ))}
                    </div>

                    {/* Model Routing */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Model Routing</p>
                      {agents.find(a => a.type === selectedAgent)?.modelRouting.map((r, i) => (
                        <div key={i} className="p-2 rounded-lg bg-black/20 border border-border/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-foreground font-medium">{r.taskType}</span>
                            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary capitalize">
                              {r.priority}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {r.models.map((m, j) => (
                              <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Generate</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Orchestrate AI agents to generate high-quality output</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <GenerationForm
                selectedAgent={selectedAgent}
                agents={agents.map(a => ({ type: a.type, name: a.name, threshold: a.threshold }))}
                onAgentChange={setSelectedAgent}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />
              <ResultsPanel result={result} isGenerating={isGenerating} />
            </div>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Projects</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Your agent projects and generation history</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchProjects} className="border-border/50">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Refresh
              </Button>
            </div>

            {projects.length === 0 ? (
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6 sm:p-8 flex flex-col items-center justify-center min-h-[200px]">
                  <FolderKanban className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No projects yet</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">Generate something to create your first project</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {projects.map(project => {
                  const AgentIcon = AGENT_TYPE_ICONS[project.agentType] || Code2;
                  const typeColor = AGENT_TYPE_COLORS[project.agentType] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
                  return (
                    <Card key={project.id} className="border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-black/30">
                              <AgentIcon className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground truncate max-w-[140px]">{project.name}</p>
                              <Badge className={`text-[10px] ${typeColor} border`}>
                                {project.agentType}
                              </Badge>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                            {project.status}
                          </Badge>
                        </div>

                        <Separator className="bg-border/30 mb-3" />

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{project._count.sessions} sessions</span>
                          <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                        </div>

                        {project.sessions.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            <p className="text-[10px] text-muted-foreground/60">Recent:</p>
                            {project.sessions.slice(0, 2).map(s => (
                              <div key={s.id} className="text-[10px] text-muted-foreground truncate bg-black/20 rounded px-2 py-1">
                                {s.prompt}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Analytics</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Performance metrics and generation history</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchSessions} className="border-border/50">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Refresh
              </Button>
            </div>

            <StatsCards data={analytics} />

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Recent Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <BarChart3 className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No sessions yet</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">Generate something to see analytics</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2">
                      {sessions.map(session => {
                        const AgentIcon = AGENT_TYPE_ICONS[session.project?.agentType] || Code2;
                        const scoreColor = session.qualityScore >= 0.8
                          ? 'text-emerald-400'
                          : session.qualityScore >= 0.6
                          ? 'text-amber-400'
                          : 'text-rose-400';
                        return (
                          <div
                            key={session.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-border/20 hover:border-primary/30 transition-colors"
                          >
                            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                              <AgentIcon className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{session.prompt}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Shield className={`w-3 h-3 ${scoreColor}`} />
                                  <span className={scoreColor}>{(session.qualityScore * 100).toFixed(0)}%</span>
                                </span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  ${(session.costCents / 100).toFixed(2)}
                                </span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {(session.durationMs / 1000).toFixed(1)}s
                                </span>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] border-border/30 shrink-0">
                              {session.modelUsed}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Architecture Tab */}
          <TabsContent value="architecture" className="space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">System Architecture</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">MoA Kernel flow and orchestration mechanisms</p>
            </div>
            <ArchitectureDiagram />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
            <Cpu className="w-3.5 h-3.5 text-primary" />
            <span>AgentForge Platform</span>
            <span className="text-muted-foreground/30">•</span>
            <span>MoA Kernel v2.0</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground/50">
            <span>9 LLMs</span>
            <span>7 Agents</span>
            <span>3-Level Auto-Fix</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

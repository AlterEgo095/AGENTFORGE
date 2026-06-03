'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2, Clock, DollarSign, Cpu, AlertTriangle,
  Wrench, Shield, Sparkles,
} from 'lucide-react';

interface ReflectionScore {
  criterion: string;
  weight: number;
  score: number;
}

interface GenerationResult {
  taskId: string;
  synthesis: string;
  confidence: number;
  costCents: number;
  durationMs: number;
  modelUsed: string;
  reflectionScores?: ReflectionScore[];
  autoFixLevel?: number;
  autoFixesApplied?: string[];
  subtasks: { id: string; type: string; model: string }[];
}

interface ResultsPanelProps {
  result: GenerationResult | null;
  isGenerating: boolean;
}

export function ResultsPanel({ result, isGenerating }: ResultsPanelProps) {
  if (isGenerating) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-6 sm:p-8 flex flex-col items-center justify-center min-h-[300px]">
          <div className="flex gap-1.5 mb-4">
            <div className="typing-dot w-3 h-3 rounded-full bg-primary" />
            <div className="typing-dot w-3 h-3 rounded-full bg-primary" />
            <div className="typing-dot w-3 h-3 rounded-full bg-primary" />
          </div>
          <p className="text-sm text-muted-foreground mb-2">MoA Kernel orchestrating...</p>
          <div className="flex gap-2 text-xs text-muted-foreground/60">
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary/70">Decomposing</Badge>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary/70">Generating</Badge>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary/70">Reflecting</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-6 sm:p-8 flex flex-col items-center justify-center min-h-[300px]">
          <Sparkles className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Select an agent and enter a prompt to generate</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Results will appear here</p>
        </CardContent>
      </Card>
    );
  }

  const confidencePercent = Math.round(result.confidence * 100);
  const confidenceColor = confidencePercent >= 90
    ? 'text-emerald-400'
    : confidencePercent >= 70
    ? 'text-amber-400'
    : 'text-rose-400';

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Generation Complete
          </CardTitle>
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
            {result.modelUsed}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <Shield className={`w-4 h-4 mx-auto mb-1 ${confidenceColor}`} />
            <p className={`text-lg font-bold ${confidenceColor}`}>{confidencePercent}%</p>
            <p className="text-[10px] text-muted-foreground">Quality</p>
          </div>
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <DollarSign className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-foreground">${(result.costCents / 100).toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Cost</p>
          </div>
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <Clock className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-foreground">{(result.durationMs / 1000).toFixed(1)}s</p>
            <p className="text-[10px] text-muted-foreground">Duration</p>
          </div>
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <Cpu className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-foreground">{result.subtasks.length}</p>
            <p className="text-[10px] text-muted-foreground">Subtasks</p>
          </div>
        </div>

        {/* Auto-fix info */}
        {(result.autoFixLevel && result.autoFixLevel > 0) && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs text-amber-300 font-medium">
                Auto-Fix Level {result.autoFixLevel} Applied
              </p>
              {result.autoFixesApplied && result.autoFixesApplied.length > 0 && (
                <p className="text-[10px] text-amber-300/70">
                  {result.autoFixesApplied.join(', ')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Reflection scores */}
        {result.reflectionScores && result.reflectionScores.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Reflection Scores
            </p>
            {result.reflectionScores.map((score, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{score.criterion}</span>
                  <span className={score.score >= 0.8 ? 'text-emerald-400' : score.score >= 0.6 ? 'text-amber-400' : 'text-rose-400'}>
                    {(score.score * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress value={score.score * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        )}

        <Separator className="bg-border/30" />

        {/* Generated content */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Generated Output</p>
          <ScrollArea className="max-h-96 rounded-lg bg-black/30 p-3 sm:p-4">
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{result.synthesis}</div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

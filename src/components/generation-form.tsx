'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, Wrench, Zap } from 'lucide-react';

interface GenerationFormProps {
  selectedAgent: string;
  agents: { type: string; name: string; threshold: number }[];
  onAgentChange: (type: string) => void;
  onGenerate: (data: { prompt: string; agentType: string; threshold: number }) => void;
  isGenerating: boolean;
}

export function GenerationForm({
  selectedAgent,
  agents,
  onAgentChange,
  onGenerate,
  isGenerating,
}: GenerationFormProps) {
  const [prompt, setPrompt] = useState('');
  const [threshold, setThreshold] = useState(0.9);

  const currentAgent = agents.find(a => a.type === selectedAgent);

  const handleSubmit = () => {
    if (!prompt.trim() || !selectedAgent) return;
    onGenerate({ prompt: prompt.trim(), agentType: selectedAgent, threshold });
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Generate with AgentForge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-5">
        {/* Agent selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Agent Type</label>
          <Select value={selectedAgent} onValueChange={onAgentChange}>
            <SelectTrigger className="bg-input/50 border-border/50">
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map(agent => (
                <SelectItem key={agent.type} value={agent.type}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prompt */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Prompt</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Describe what you want the ${currentAgent?.name || 'agent'} to generate...`}
            className="min-h-[120px] sm:min-h-[160px] bg-input/50 border-border/50 resize-none text-sm"
            disabled={isGenerating}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground/60">{prompt.length} characters</span>
            {prompt.length > 0 && prompt.length < 10 && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Provide a more detailed prompt
              </span>
            )}
          </div>
        </div>

        {/* Confidence Threshold */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-muted-foreground">Confidence Threshold</label>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
              {(threshold * 100).toFixed(0)}%
            </Badge>
          </div>
          <Slider
            value={[threshold]}
            onValueChange={([v]) => setThreshold(v)}
            min={0.5}
            max={1}
            step={0.01}
            className="py-2"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/50">
            <span>Lenient (50%)</span>
            <span>Strict (100%)</span>
          </div>
        </div>

        {/* Pipeline info */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs gap-1">
            <Zap className="w-3 h-3" />
            MoA Kernel
          </Badge>
          <Badge variant="secondary" className="text-xs gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Reflection
          </Badge>
          <Badge variant="secondary" className="text-xs gap-1">
            <Wrench className="w-3 h-3" />
            Auto-Fix
          </Badge>
        </div>

        {/* Generate button */}
        <Button
          onClick={handleSubmit}
          disabled={isGenerating || !prompt.trim() || !selectedAgent}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-5 sm:py-6 text-sm sm:text-base glow-primary"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
              Orchestrating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Generate with {currentAgent?.name || 'Agent'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

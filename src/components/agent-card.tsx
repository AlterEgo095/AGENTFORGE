'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Code2, Presentation, FileText, BarChart3, Search, Mail, Megaphone,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Code2, Presentation, FileText, BarChart3, Search, Mail, Megaphone,
};

const AGENT_COLORS: Record<string, string> = {
  DEV: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/30',
  SLIDES: 'from-amber-500/20 to-orange-600/10 border-amber-500/30',
  DOC: 'from-sky-500/20 to-blue-600/10 border-sky-500/30',
  DATA: 'from-violet-500/20 to-purple-600/10 border-violet-500/30',
  RESEARCH: 'from-rose-500/20 to-pink-600/10 border-rose-500/30',
  EMAIL: 'from-cyan-500/20 to-teal-500/10 border-cyan-500/30',
  MARKETING: 'from-fuchsia-500/20 to-pink-500/10 border-fuchsia-500/30',
};

const AGENT_ICON_COLORS: Record<string, string> = {
  DEV: 'text-emerald-400',
  SLIDES: 'text-amber-400',
  DOC: 'text-sky-400',
  DATA: 'text-violet-400',
  RESEARCH: 'text-rose-400',
  EMAIL: 'text-cyan-400',
  MARKETING: 'text-fuchsia-400',
};

interface AgentCardProps {
  type: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  isSelected: boolean;
  onClick: () => void;
}

export function AgentCard({ type, name, description, icon, threshold, isSelected, onClick }: AgentCardProps) {
  const IconComponent = ICON_MAP[icon] || Code2;
  const colorClass = AGENT_COLORS[type] || 'from-gray-500/20 to-gray-600/10 border-gray-500/30';
  const iconColor = AGENT_ICON_COLORS[type] || 'text-gray-400';

  return (
    <Card
      className={`cursor-pointer transition-all duration-300 border bg-gradient-to-br ${colorClass} hover:scale-[1.02] hover:shadow-lg ${
        isSelected ? 'ring-2 ring-primary glow-primary-strong scale-[1.02]' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={`p-2.5 sm:p-3 rounded-xl bg-black/30 backdrop-blur-sm ${iconColor}`}>
            <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">{name}</h3>
              <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0 border-primary/30 text-primary">
                {type}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2 sm:mb-3">{description}</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400 pulse-glow' : 'bg-muted-foreground/40'}`} />
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  {isSelected ? 'Active' : 'Ready'}
                </span>
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground/60">|</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground/60">
                Threshold: {(threshold * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

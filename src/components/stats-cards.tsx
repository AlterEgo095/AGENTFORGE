'use client';

import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Shield, DollarSign, Clock } from 'lucide-react';

interface AnalyticsData {
  totalGenerations: number;
  avgQualityScore: number;
  totalCostCents: number;
  avgDurationMs: number;
}

interface StatsCardsProps {
  data: AnalyticsData | null;
}

export function StatsCards({ data }: StatsCardsProps) {
  const stats = [
    {
      icon: BarChart3,
      label: 'Total Generations',
      value: data?.totalGenerations ?? 0,
      format: (v: number) => v.toString(),
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Shield,
      label: 'Avg Quality Score',
      value: data?.avgQualityScore ?? 0,
      format: (v: number) => `${(v * 100).toFixed(1)}%`,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: DollarSign,
      label: 'Total Cost',
      value: data?.totalCostCents ?? 0,
      format: (v: number) => `$${(v / 100).toFixed(2)}`,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      icon: Clock,
      label: 'Avg Duration',
      value: data?.avgDurationMs ?? 0,
      format: (v: number) => `${(v / 1000).toFixed(1)}s`,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Card key={i} className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg sm:text-xl font-bold ${stat.color}`}>
                    {stat.format(stat.value)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

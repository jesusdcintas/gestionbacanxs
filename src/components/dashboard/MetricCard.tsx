import { ArrowDownRight, ArrowUpRight, BadgeEuro, BadgeDollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import type { DashboardMetric } from '../../services/dashboard';

interface MetricCardProps {
  metric: DashboardMetric;
  tilt?: 'left' | 'right' | 'none';
}

function getToneIcon(tone: DashboardMetric['tone']) {
  if (tone === 'positive') {
    return ArrowUpRight;
  }

  if (tone === 'warning') {
    return ArrowDownRight;
  }

  if (tone === 'accent') {
    return BadgeEuro;
  }

  return BadgeDollarSign;
}

function getValueColor(tone: DashboardMetric['tone']) {
  if (tone === 'positive' || tone === 'accent') return 'text-accent';
  if (tone === 'warning') return 'text-danger';
  return 'text-text-primary';
}

export function MetricCard({ metric, tilt = 'none' }: MetricCardProps) {
  const Icon = getToneIcon(metric.tone);
  const valueColor = getValueColor(metric.tone);

  return (
    <Card tilt={tilt}>
      <CardHeader className="pb-3! border-b! border-border!">
        <div className="flex items-start justify-between gap-3">
          <CardDescription className="text-[11px] uppercase tracking-[0.08em]">{metric.label}</CardDescription>
          <Icon className="h-4 w-4 text-text-secondary" strokeWidth={1.5} />
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle
          className={`text-3xl tracking-tight ${valueColor}`}
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          {metric.formatted}
        </CardTitle>
        <p className="mt-2 text-xs text-text-secondary">{metric.note}</p>
      </CardContent>
    </Card>
  );
}

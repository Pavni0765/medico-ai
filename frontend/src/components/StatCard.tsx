import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'teal' | 'blue' | 'amber' | 'rose' | 'emerald';
  badge?: {
    text: string;
    variant: 'positive' | 'negative' | 'neutral' | 'warning';
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'teal',
  badge,
  onClick,
}) => {
  const colorMap = {
    teal: {
      bg: 'bg-teal-50',
      icon: 'text-teal-600',
      border: 'border-teal-100',
    },
    blue: {
      bg: 'bg-sky-50',
      icon: 'text-sky-600',
      border: 'border-sky-100',
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'text-amber-600',
      border: 'border-amber-100',
    },
    rose: {
      bg: 'bg-rose-50',
      icon: 'text-rose-600',
      border: 'border-rose-100',
    },
    emerald: {
      bg: 'bg-emerald-50',
      icon: 'text-emerald-600',
      border: 'border-emerald-100',
    },
  }[color];

  const badgeColorMap = {
    positive: 'bg-emerald-100 text-emerald-800',
    negative: 'bg-rose-100 text-rose-800',
    warning: 'bg-amber-100 text-amber-800',
    neutral: 'bg-slate-100 text-slate-700',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm transition-all hover:shadow-md ${
        onClick ? 'cursor-pointer hover:border-teal-300' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {value}
            </span>
            {badge && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeColorMap[badge.variant]}`}
              >
                {badge.text}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorMap.bg} ${colorMap.border} border`}>
          <Icon className={`w-5 h-5 ${colorMap.icon}`} />
        </div>
      </div>
    </div>
  );
};

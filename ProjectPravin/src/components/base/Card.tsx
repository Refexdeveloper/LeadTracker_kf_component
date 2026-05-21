import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export default function Card({ children, className = '', hover = false, onClick, padding = 'md' }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-2xl border border-gray-100
        ${paddingStyles[padding]}
        ${hover ? 'transition-all duration-200 hover:-translate-y-1 hover:border-gray-200 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: string | number;
  icon: string;
  gradient: string;
  trend?: { value: string; positive: boolean };
  subtitle?: string;
}

export function KPICard({ title, value, icon, gradient, trend, subtitle }: KPICardProps) {
  return (
    <Card hover className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</p>
          <p className={`text-4xl font-bold mt-2 bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {value}
          </p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs mt-2 font-medium ${trend.positive ? 'text-emerald-500' : 'text-red-500'}`}>
              <i className={`${trend.positive ? 'ri-arrow-up-line' : 'ri-arrow-down-line'} mr-0.5`} />
              {trend.value}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-br ${gradient}`}>
          <i className={`${icon} text-white text-xl`} />
        </div>
      </div>
    </Card>
  );
}

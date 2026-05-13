const STATUS_STYLES: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  danger: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-500/10',
};

interface StatusBadgeProps {
  children: React.ReactNode;
  tone?: keyof typeof STATUS_STYLES;
  className?: string;
}

export function StatusBadge({ children, tone = 'neutral', className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[tone]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

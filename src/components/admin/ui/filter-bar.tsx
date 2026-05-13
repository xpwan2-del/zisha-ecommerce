import { ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function FilterBar({ children, action, className = '' }: FilterBarProps) {
  return (
    <div className={`flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-end md:justify-between ${className}`.trim()}>
      <div className="min-w-0 flex-1">{children}</div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

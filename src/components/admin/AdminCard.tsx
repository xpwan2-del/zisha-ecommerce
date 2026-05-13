import { ReactNode } from 'react';

interface AdminCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function AdminCard({ children, className = '', title, description, action }: AdminCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`.trim()}>
      {title || description || action ? (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            {title ? <h3 className="text-sm font-semibold text-slate-950">{title}</h3> : null}
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

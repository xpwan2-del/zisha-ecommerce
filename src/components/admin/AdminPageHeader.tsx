import { ReactNode } from 'react';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function AdminPageHeader({ title, description, action, eyebrow, breadcrumbs }: AdminPageHeaderProps) {
  return (
    <div className="space-y-5 border-b border-slate-200 pb-6">
      {breadcrumbs?.length ? (
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
          {breadcrumbs.map((item, index) => (
            <span key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 ? <span className="text-slate-300">/</span> : null}
              {item.href ? (
                <a href={item.href} className="transition-colors hover:text-blue-700">
                  {item.label}
                </a>
              ) : (
                <span className="text-slate-700">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">{eyebrow}</p> : null}
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
    </div>
  );
}

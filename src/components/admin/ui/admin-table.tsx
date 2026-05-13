import { ReactNode } from 'react';
import { EmptyState } from './empty-state';

interface AdminTableColumn<T> {
  key: string;
  title: ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render: (item: T, index: number) => ReactNode;
}

interface AdminTableProps<T> {
  columns: AdminTableColumn<T>[];
  data: T[];
  rowKey: (item: T, index: number) => string | number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  onRowClick?: (item: T) => void;
}

const alignClass = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function AdminTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyTitle = '暂无匹配数据',
  emptyDescription = '请尝试调整筛选条件或刷新页面。',
  className = '',
  onRowClick,
}: AdminTableProps<T>) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="space-y-3 p-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`.trim()}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={{ width: column.width }}
                  className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${alignClass[column.align || 'left']}`}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.map((item, index) => (
              <tr
                key={rowKey(item, index)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={onRowClick ? 'cursor-pointer transition-colors hover:bg-blue-50/50' : 'transition-colors hover:bg-slate-50'}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`whitespace-nowrap px-4 py-3 text-slate-700 ${alignClass[column.align || 'left']}`}>
                    {column.render(item, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

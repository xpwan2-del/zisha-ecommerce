"use client";

import Link from 'next/link';
import { ReactNode } from 'react';
import { adminNavigationGroups } from '@/components/admin/admin-navigation';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside className="fixed h-screen w-72 overflow-y-auto border-r border-gray-800 bg-gray-950 text-white">
          <div className="border-b border-gray-800 p-6">
            <h1 className="text-xl font-semibold text-white">紫砂后台管理</h1>
            <p className="mt-1 text-xs text-gray-400">Zisha Admin Console</p>
          </div>

          <nav className="space-y-5 px-4 py-5 pb-20">
            {adminNavigationGroups.map((group) => (
              <section key={group.label}>
                <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {group.label}
                </div>
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center rounded-lg px-3 py-2.5 text-sm text-gray-200 transition-colors hover:bg-gray-800 hover:text-white"
                      >
                        <span className="mr-3 w-5 text-center text-base">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>
        </aside>

        <main className="ml-72 min-h-screen flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

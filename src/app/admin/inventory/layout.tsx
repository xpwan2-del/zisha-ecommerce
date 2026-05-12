import { ReactNode } from "react";

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}

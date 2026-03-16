import { Suspense } from 'react';
import DashboardClient from './dashboard-client';

export const metadata = {
  title: 'Dashboard — Finanzas Personales 50/30/20',
};

/**
 * Dashboard page — Server Component shell.
 * All interactive state is delegated to DashboardClient (Client Component).
 */
export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Finanzas Personales
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Metodología 50/30/20 · Impulsado por IA
        </p>
      </header>

      {/* Client shell */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardClient />
      </Suspense>
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-slate-200 dark:bg-slate-700"
          />
        ))}
      </div>
      <div className="h-36 rounded-xl bg-slate-200 dark:bg-slate-700" />
      <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

'use client';

import { computeKpis } from '@/lib/utils/kpi';
import type { CategorisedTransaction } from '@/types/transaction';

interface KpiCardsProps {
  transactions: CategorisedTransaction[];
}

function formatAmount(value: number): string {
  return `${value.toFixed(2)} €`;
}

interface KpiCardProps {
  label: string;
  value: string;
  colorClass: string;
}

function KpiCard({ label, value, colorClass }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

/**
 * 3-card KPI summary: Ingresos · Gastos · Ahorro
 */
export default function KpiCards({ transactions }: KpiCardsProps) {
  const { ingresos, gastos, ahorro } = computeKpis(transactions);

  const ahorroColor =
    ahorro >= 0
      ? 'text-slate-800 dark:text-slate-100'
      : 'text-red-600 dark:text-red-400';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KpiCard
        label="Ingresos"
        value={formatAmount(ingresos)}
        colorClass="text-green-700 dark:text-green-400"
      />
      <KpiCard
        label="Gastos"
        value={formatAmount(gastos)}
        colorClass="text-red-600 dark:text-red-400"
      />
      <KpiCard label="Ahorro" value={formatAmount(ahorro)} colorClass={ahorroColor} />
    </div>
  );
}

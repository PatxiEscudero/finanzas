'use client';

import { useMemo, useState } from 'react';
import TransactionRow from './transaction-row';
import type { CategorisedTransaction } from '@/types/transaction';

interface TransactionTableProps {
  transactions: CategorisedTransaction[];
  updateTransaction: (id: string, patch: Partial<CategorisedTransaction>) => void;
  deleteTransaction: (id: string) => void;
}

const PAGE_SIZE = 20;

/**
 * Paginated, filterable, sortable transaction table with inline editing.
 */
export default function TransactionTable({
  transactions,
  updateTransaction,
  deleteTransaction,
}: TransactionTableProps) {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Sort by fecha descending, then filter
  const sorted = useMemo(
    () =>
      [...transactions].sort((a, b) => {
        // DD/MM/YYYY → compare as date strings in reversed format
        const toSortable = (s: string) => {
          const parts = s.split('/');
          return parts.length === 3 ? `${parts[2]}${parts[1]}${parts[0]}` : s;
        };
        return toSortable(b.fecha).localeCompare(toSortable(a.fecha));
      }),
    [transactions],
  );

  const filtered = useMemo(() => {
    if (!filter.trim()) return sorted;
    const lower = filter.toLowerCase();
    return sorted.filter(
      (t) =>
        t.concepto.toLowerCase().includes(lower) ||
        t.categoria.toLowerCase().includes(lower) ||
        t.subCategoria.toLowerCase().includes(lower),
    );
  }, [sorted, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleFilterChange(value: string) {
    setFilter(value);
    setPage(1);
  }

  function handleSave(id: string, patch: Partial<CategorisedTransaction>) {
    updateTransaction(id, patch);
    setEditingId(null);
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="tx-filter" className="sr-only">
          Filtrar movimientos
        </label>
        <input
          id="tx-filter"
          type="search"
          placeholder="Filtrar por concepto, categoría o sub-categoría…"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              {['Fecha', 'Concepto', 'Importe', 'Categoría', 'Sub-categoría', 'Acciones'].map(
                (col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                  >
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700 dark:bg-slate-900">
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500"
                >
                  No hay movimientos. Importa un fichero para empezar.
                </td>
              </tr>
            ) : (
              paginated.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  isEditing={editingId === t.id}
                  onEdit={(id) => setEditingId(id)}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                  onDelete={deleteTransaction}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-between"
          aria-label="Paginación de movimientos"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Siguiente →
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

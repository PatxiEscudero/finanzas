'use client';

import { useState } from 'react';
import CategoryBadge from './category-badge';
import type { CategorisedTransaction } from '@/types/transaction';

type Categoria = CategorisedTransaction['categoria'];

interface TransactionRowProps {
  transaction: CategorisedTransaction;
  isEditing: boolean;
  onEdit: (id: string) => void;
  onSave: (id: string, patch: Partial<CategorisedTransaction>) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
}

const CATEGORIES: Categoria[] = ['Necesidades', 'Deseos', 'Ahorro'];

/**
 * Single table row with inline editing support.
 */
export default function TransactionRow({
  transaction,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: TransactionRowProps) {
  const [draft, setDraft] = useState<Partial<CategorisedTransaction>>({});

  function handleEditStart() {
    setDraft({
      fecha: transaction.fecha,
      concepto: transaction.concepto,
      importe: transaction.importe,
      categoria: transaction.categoria,
      subCategoria: transaction.subCategoria,
    });
    onEdit(transaction.id);
  }

  function handleSave() {
    onSave(transaction.id, draft);
  }

  function handleDeleteClick() {
    if (window.confirm(`¿Eliminar el movimiento "${transaction.concepto}"?`)) {
      onDelete(transaction.id);
    }
  }

  const importeValue = parseFloat(transaction.importe);
  const importeColor =
    importeValue < 0
      ? 'text-red-600 dark:text-red-400'
      : 'text-slate-800 dark:text-slate-100';

  if (isEditing) {
    return (
      <tr className="bg-indigo-50 dark:bg-indigo-950">
        <td className="px-4 py-2">
          <input
            type="text"
            value={draft.fecha ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, fecha: e.target.value }))}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            placeholder="DD/MM/YYYY"
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="text"
            value={draft.concepto ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, concepto: e.target.value }))}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="text"
            value={draft.importe ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, importe: e.target.value }))}
            className="w-28 rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </td>
        <td className="px-4 py-2">
          <select
            value={draft.categoria ?? transaction.categoria}
            onChange={(e) =>
              setDraft((d) => ({ ...d, categoria: e.target.value as Categoria }))
            }
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-2">
          <input
            type="text"
            value={draft.subCategoria ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, subCategoria: e.target.value }))}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </td>
        <td className="px-4 py-2">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
              aria-label="Guardar"
            >
              Guardar
            </button>
            <button
              onClick={onCancel}
              className="rounded bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
              aria-label="Cancelar"
            >
              Cancelar
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
        {transaction.fecha}
      </td>
      <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-100">
        {transaction.concepto}
      </td>
      <td className={`px-4 py-3 text-right text-sm font-medium tabular-nums ${importeColor}`}>
        {importeValue.toFixed(2)} €
      </td>
      <td className="px-4 py-3">
        <CategoryBadge categoria={transaction.categoria} />
      </td>
      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
        {transaction.subCategoria}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={handleEditStart}
            className="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            aria-label="Editar movimiento"
          >
            Editar
          </button>
          <button
            onClick={handleDeleteClick}
            className="rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
            aria-label="Eliminar movimiento"
          >
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
}

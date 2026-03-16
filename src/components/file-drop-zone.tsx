'use client';

import { useCallback, useState } from 'react';
import type { CategorisedTransaction, Transaction } from '@/types/transaction';

type UploadState = 'idle' | 'dragging-over' | 'uploading' | 'error';

interface FileDropZoneProps {
  onTransactionsAdded: (transactions: Omit<CategorisedTransaction, 'id'>[]) => void;
}

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx'];
const ACCEPTED_MIME = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

function isValidFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext)) ||
    ACCEPTED_MIME.includes(file.type)
  );
}

/**
 * Drag-and-drop / click-to-select upload zone.
 *
 * Flow:
 *   1. POST /api/extract  (multipart) → extracted transactions
 *   2. POST /api/categorise (json)    → categorised transactions
 *   3. call onTransactionsAdded
 */
export default function FileDropZone({ onTransactionsAdded }: FileDropZoneProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function processFile(file: File) {
    if (!isValidFile(file)) {
      setState('error');
      setErrorMessage('Tipo de fichero no soportado. Sólo se aceptan .csv y .xlsx.');
      return;
    }

    setState('uploading');
    setErrorMessage(null);

    try {
      // Step 1 — extract
      const formData = new FormData();
      formData.append('file', file);

      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      if (!extractRes.ok) {
        const { error } = (await extractRes.json()) as { error: string };
        throw new Error(error ?? `HTTP ${extractRes.status}`);
      }

      const { transactions: extracted } = (await extractRes.json()) as {
        transactions: Omit<Transaction, 'id'>[];
      };

      // Step 2 — categorise (we need to give each transaction a temp id)
      const withTempIds: Transaction[] = extracted.map((t) => ({
        ...t,
        id: crypto.randomUUID(),
      }));

      const categoriseRes = await fetch('/api/categorise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: withTempIds }),
      });

      if (!categoriseRes.ok) {
        const { error } = (await categoriseRes.json()) as { error: string };
        throw new Error(error ?? `HTTP ${categoriseRes.status}`);
      }

      const { transactions: categorised } = (await categoriseRes.json()) as {
        transactions: Omit<CategorisedTransaction, 'id'>[];
      };

      onTransactionsAdded(categorised);
      setState('idle');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message);
      setState('error');
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setState('idle');
      const file = e.dataTransfer.files?.[0];
      if (file) void processFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onTransactionsAdded],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  const isUploading = state === 'uploading';
  const isDragging = state === 'dragging-over';

  const borderClass = isDragging
    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
    : state === 'error'
      ? 'border-red-400 bg-red-50 dark:bg-red-950/20'
      : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800';

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setState('dragging-over');
      }}
      onDragLeave={() => setState('idle')}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${borderClass}`}
      aria-label="Zona de importación de ficheros"
    >
      {isUploading ? (
        <>
          <Spinner />
          <p className="mt-3 text-sm font-medium text-indigo-700 dark:text-indigo-300">
            Analizando con IA…
          </p>
        </>
      ) : (
        <>
          <svg
            className="mb-3 h-10 w-10 text-slate-400 dark:text-slate-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
            />
          </svg>

          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Arrastra un fichero o{' '}
            <label className="cursor-pointer text-indigo-600 underline hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
              selecciona uno
              <input
                type="file"
                accept=".csv,.xlsx"
                className="sr-only"
                onChange={handleChange}
                disabled={isUploading}
              />
            </label>
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Formatos admitidos: .csv · .xlsx
          </p>

          {state === 'error' && errorMessage && (
            <p
              role="alert"
              className="mt-3 text-sm font-medium text-red-600 dark:text-red-400"
            >
              {errorMessage}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
      />
    </svg>
  );
}

'use client';

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Dashboard error boundary — shown when an unhandled error is thrown
 * during rendering of the dashboard route.
 */
export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-24 text-center">
      <div className="rounded-full bg-red-50 p-4 dark:bg-red-950/30">
        <svg
          className="h-10 w-10 text-red-600 dark:text-red-400"
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
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      <h2 className="mt-6 text-xl font-semibold text-slate-800 dark:text-slate-100">
        Algo ha ido mal
      </h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {error.message ?? 'Error inesperado en el panel de finanzas.'}
      </p>

      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Reintentar
      </button>
    </main>
  );
}

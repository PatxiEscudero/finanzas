export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8 animate-pulse">
        <div>
          <div className="h-8 w-64 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="mt-2 h-4 w-48 rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
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
    </main>
  );
}

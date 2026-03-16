'use client';

import { useTransactions } from '@/hooks/use-transactions';
import FileDropZone from '@/components/file-drop-zone';
import KpiCards from '@/components/kpi-cards';
import TransactionTable from '@/components/transaction-table';
import type { CategorisedTransaction } from '@/types/transaction';

/**
 * Thin client wrapper that owns the useTransactions state and wires it
 * down to all interactive components. Kept minimal so the RSC shell
 * (dashboard/page.tsx) can remain a Server Component.
 */
export default function DashboardClient() {
  const { transactions, addTransactions, updateTransaction, deleteTransaction } =
    useTransactions();

  function handleTransactionsAdded(
    incoming: Omit<CategorisedTransaction, 'id'>[],
  ) {
    addTransactions(incoming);
  }

  return (
    <div className="space-y-8">
      <KpiCards transactions={transactions} />
      <FileDropZone onTransactionsAdded={handleTransactionsAdded} />
      <TransactionTable
        transactions={transactions}
        updateTransaction={updateTransaction}
        deleteTransaction={deleteTransaction}
      />
    </div>
  );
}

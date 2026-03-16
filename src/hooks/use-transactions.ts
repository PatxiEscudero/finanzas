'use client';

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CategorisedTransaction } from '@/types/transaction';

const STORAGE_KEY = 'finance:transactions';

function loadFromStorage(): CategorisedTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CategorisedTransaction[];
  } catch {
    return [];
  }
}

function saveToStorage(transactions: CategorisedTransaction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

export interface UseTransactionsReturn {
  transactions: CategorisedTransaction[];
  addTransactions: (incoming: Omit<CategorisedTransaction, 'id'>[]) => void;
  updateTransaction: (id: string, patch: Partial<CategorisedTransaction>) => void;
  deleteTransaction: (id: string) => void;
}

/**
 * Client-side hook that manages categorised transactions persisted in localStorage.
 */
export function useTransactions(): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<CategorisedTransaction[]>([]);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    setTransactions(loadFromStorage());
  }, []);

  function addTransactions(incoming: Omit<CategorisedTransaction, 'id'>[]): void {
    setTransactions((prev) => {
      const hydrated: CategorisedTransaction[] = incoming.map((t) => ({
        ...t,
        id: uuidv4(),
      }));
      const merged = [...prev, ...hydrated];
      saveToStorage(merged);
      return merged;
    });
  }

  function updateTransaction(id: string, patch: Partial<CategorisedTransaction>): void {
    setTransactions((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
      saveToStorage(updated);
      return updated;
    });
  }

  function deleteTransaction(id: string): void {
    setTransactions((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      saveToStorage(filtered);
      return filtered;
    });
  }

  return { transactions, addTransactions, updateTransaction, deleteTransaction };
}

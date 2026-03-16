import { generateObject } from 'ai';
import { z } from 'zod';
import { ollama, MODEL } from './ollama-client';
import { TransactionSchema } from '@/lib/schemas/transaction.schema';
import type { Transaction } from '@/types/transaction';

const CHUNK_SIZE = 200;

const TransactionArraySchema = z.object({
  transactions: z.array(TransactionSchema.omit({ id: true })),
});

function buildPrompt(rows: Record<string, unknown>[]): string {
  return `Eres un asistente de finanzas personales. Extrae los movimientos bancarios del siguiente conjunto de filas CSV/XLSX.
Para cada movimiento, identifica: fecha (formato DD/MM/YYYY), concepto (descripción limpia) e importe (número decimal, negativo si es gasto).
Ignora columnas irrelevantes, cabeceras y cualquier dato no transaccional.
Filas: ${JSON.stringify(rows)}`;
}

/**
 * Extract structured transactions from raw CSV/XLSX rows using the LLM.
 * Input is chunked into slices of ≤ 200 rows to avoid context-length limits.
 */
export async function extractTransactions(
  rows: Record<string, unknown>[],
): Promise<Omit<Transaction, 'id'>[]> {
  const results: Omit<Transaction, 'id'>[] = [];

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { object } = await generateObject({
      model: ollama(MODEL),
      schema: TransactionArraySchema,
      prompt: buildPrompt(chunk),
    });
    results.push(...object.transactions);
  }

  return results;
}

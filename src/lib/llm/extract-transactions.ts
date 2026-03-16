import { generateObject } from 'ai';
import { z } from 'zod';
import { ollama, MODEL } from './ollama-client';
import { TransactionSchema } from '@/lib/schemas/transaction.schema';
import type { Transaction } from '@/types/transaction';

const CHUNK_SIZE = 50;

const TransactionArraySchema = z.object({
  transactions: z.array(TransactionSchema.omit({ id: true })),
});

const SYSTEM_PROMPT = `Eres un asistente de finanzas personales especializado en extraer datos de archivos CSV/XLSX bancarios.
Tu tarea es extraer únicamente movimientos bancarios válidos.
Responde únicamente con un objeto JSON válido en el formato exacto solicitado.
No incluyas texto adicional, explicaciones o markdown.`;

function buildPrompt(rows: Record<string, unknown>[]): string {
  return `Extrae los movimientos bancarios del siguiente conjunto de filas.
Para cada movimiento, identifica exactamente: fecha (formato DD/MM/YYYY), concepto (descripción limpia) e importe (número decimal como string, negativo si es gasto).
Ignora filas vacías, cabeceras, totales o datos no transaccionales.
Si no hay movimientos válidos, devuelve un array vacío.
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
    try {
      const { object } = await generateObject({
        model: ollama(MODEL, { numCtx: 16384 }),
        schema: TransactionArraySchema,
        system: SYSTEM_PROMPT,
        prompt: buildPrompt(chunk),
      });
      results.push(...object.transactions);
    } catch (error) {
      console.error(`Error processing chunk ${i / CHUNK_SIZE + 1}:`, error);
      // Skip this chunk and continue
    }
    // Small delay to avoid overloading Ollama
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

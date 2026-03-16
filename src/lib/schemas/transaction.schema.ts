import { z } from 'zod';

// ---------------------------------------------------------------------------
// Base transaction — fields extracted from raw CSV / XLSX
// ---------------------------------------------------------------------------
export const TransactionSchema = z.object({
  id: z.string().uuid(),
  fecha: z.string(), // DD/MM/YYYY
  concepto: z.string(),
  importe: z.string(), // decimal string, negative = expense
});

export type Transaction = z.infer<typeof TransactionSchema>;

// ---------------------------------------------------------------------------
// Categorised transaction — after LLM classification
// ---------------------------------------------------------------------------
export const CategorisedTransactionSchema = TransactionSchema.extend({
  categoria: z.enum(['Necesidades', 'Deseos', 'Ahorro']),
  subCategoria: z.string(),
});

export type CategorisedTransaction = z.infer<typeof CategorisedTransactionSchema>;

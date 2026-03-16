import { generateObject } from 'ai';
import { z } from 'zod';
import { ollama, MODEL } from './ollama-client';
import { TransactionSchema } from '@/lib/schemas/transaction.schema';
import type { Transaction, CategorisedTransaction } from '@/types/transaction';

/**
 * Zod schema for the LLM response.
 * Accepts both `subCategoria` (camelCase) and `sub-categoria` (kebab) to be
 * resilient to LLM output variance.
 */
const CategorisedArraySchema = z.object({
  transactions: z.array(
    TransactionSchema.extend({
      categoria: z.enum(['Necesidades', 'Deseos', 'Ahorro']),
      subCategoria: z.string().optional(),
      'sub-categoria': z.string().optional(),
    }),
  ),
});

const SYSTEM_PROMPT = `Eres un experto en finanzas personales con la metodología 50/30/20.
Clasifica cada movimiento bancario en una de estas categorías:
- Necesidades (50%): gastos fijos y esenciales (hipoteca, suministros, alimentación, seguros, transporte necesario)
- Deseos (30%): gastos no esenciales (ocio, restaurantes, viajes, ropa, suscripciones de entretenimiento)
- Ahorro (20%): transferencias de ahorro, inversiones, depósitos
Responde con el JSON exacto solicitado, incluyendo sub-categoria (string corto descriptivo).`;

const CHUNK_SIZE = 50;

/**
 * Classify extracted transactions into the 50/30/20 categories using the LLM.
 */
export async function categoriseTransactions(
  transactions: Transaction[],
): Promise<CategorisedTransaction[]> {
  const results: CategorisedTransaction[] = [];

  for (let i = 0; i < transactions.length; i += CHUNK_SIZE) {
    const chunk = transactions.slice(i, i + CHUNK_SIZE);
    try {
      const { object } = await generateObject({
        model: ollama(MODEL, { numCtx: 16384 }),
        schema: CategorisedArraySchema,
        system: SYSTEM_PROMPT,
        prompt: `Clasifica los siguientes movimientos bancarios:\n${JSON.stringify(chunk)}`,
      });
      results.push(...object.transactions.map((t) => {
        const raw = t as Record<string, unknown>;
        const subCategoria =
          (raw['subCategoria'] as string | undefined) ??
          (raw['sub-categoria'] as string | undefined) ??
          '';
        return {
          id: t.id,
          fecha: t.fecha,
          concepto: t.concepto,
          importe: t.importe,
          categoria: t.categoria,
          subCategoria,
        } satisfies CategorisedTransaction;
      }));
    } catch (error) {
      console.error(`Error processing categorisation chunk ${i / CHUNK_SIZE + 1}:`, error);
      // Skip this chunk
    }
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

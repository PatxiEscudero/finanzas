import type { CategorisedTransaction } from '@/types/transaction';

export interface Kpis {
  ingresos: number;
  gastos: number;
  ahorro: number;
}

/**
 * Derive aggregate KPIs from a list of categorised transactions.
 *
 * - `ingresos` = sum of positive importes
 * - `gastos`   = sum of absolute value of negative importes
 * - `ahorro`   = ingresos − gastos
 */
export function computeKpis(transactions: CategorisedTransaction[]): Kpis {
  let ingresos = 0;
  let gastos = 0;

  for (const t of transactions) {
    const value = parseFloat(t.importe);
    if (Number.isNaN(value)) continue;

    if (value > 0) {
      ingresos += value;
    } else {
      gastos += Math.abs(value);
    }
  }

  return {
    ingresos,
    gastos,
    ahorro: ingresos - gastos,
  };
}

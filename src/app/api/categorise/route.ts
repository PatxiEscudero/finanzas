import { NextResponse } from 'next/server';
import { z } from 'zod';
import { TransactionSchema } from '@/lib/schemas/transaction.schema';
import { categoriseTransactions } from '@/lib/llm/categorise-transactions';

const BodySchema = z.object({
  transactions: z.array(TransactionSchema),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const parsed = BodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const categorised = await categoriseTransactions(parsed.data.transactions);
    return NextResponse.json({ transactions: categorised }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Categorisation failed: ${message}` },
      { status: 500 },
    );
  }
}

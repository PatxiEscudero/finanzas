import { NextResponse } from 'next/server';
import { parseCsv } from '@/lib/parsers/csv-parser';
import { parseXlsx } from '@/lib/parsers/xlsx-parser';
import { extractTransactions } from '@/lib/llm/extract-transactions';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing field: file' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const name = file.name.toLowerCase();

    let rows: Record<string, unknown>[];

    if (name.endsWith('.csv')) {
      rows = parseCsv(buffer);
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      rows = parseXlsx(buffer);
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Only .csv and .xlsx are accepted.' },
        { status: 400 },
      );
    }

    const transactions = await extractTransactions(rows);
    return NextResponse.json({ transactions }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Extraction failed: ${message}` },
      { status: 500 },
    );
  }
}

<!-- markdownlint-disable-file -->
# Task Research Notes: Personal Finance App (50/30/20 LLM-Powered)

## Research Executed

### File Analysis
- `doc/requirements.md`
  - Full requirements for a personal finance web app using Next.js + TypeScript + TailwindCSS + Vercel AI SDK + Ollama
  - Core flows: (1) CSV/XLSX ingestion → LLM extraction → JSON; (2) LLM categorisation (50/30/20); (3) Data grid with CRUD, KPI cards, cumulative state
- `.github/instructions/nextjs.instructions.md`
  - Next.js 16 App Router, async request APIs, server/client component boundaries
- `.github/instructions/nextjs-tailwind.instructions.md`
  - Strict TypeScript, Zod validation, Tailwind responsive + dark mode, Suspense, optimistic updates
- `.github/instructions/typescript-5-es2022.instructions.md`
  - TS 5.x / ES2022, pure ESM, kebab-case filenames, discriminated unions, no `any`
- `.github/instructions/html-css-style-color-guide.instructions.md`
  - 60-30-10 colour rule, cool/neutral backgrounds, dark neutrals for text, hot colours only for alerts

### Project Conventions
- Standards referenced: App Router, RSC-first, `use client` only where needed, `src/` layout, feature folders
- Instructions followed: strict typing, Zod schemas, Tailwind utility classes, 60-30-10 colour palette, kebab-case file names

---

## Key Discoveries

### Project Structure

Recommended `src/` layout aligned with project conventions:

```
src/
  app/
    layout.tsx                    # Root layout (font, global styles)
    page.tsx                      # Redirect or landing
    dashboard/
      page.tsx                    # Main dashboard (RSC shell)
      loading.tsx
      error.tsx
    api/
      extract/
        route.ts                  # POST: CSV/XLSX → LLM extraction
      categorise/
        route.ts                  # POST: transactions[] → LLM categorisation
  components/
    file-drop-zone.tsx            # Drag & drop + file picker (Client)
    transaction-table.tsx         # Data grid with pagination/filter (Client)
    transaction-row.tsx           # Inline edit / delete row (Client)
    kpi-cards.tsx                 # Income / expenses / savings (Server or Client)
    category-badge.tsx            # Colour-coded badge per 50/30/20 bucket
  hooks/
    use-transactions.ts           # Client-side state: accumulate, filter, paginate
  lib/
    parsers/
      csv-parser.ts               # papaparse wrapper → raw rows
      xlsx-parser.ts              # xlsx (SheetJS) wrapper → raw rows
    llm/
      ollama-client.ts            # createOllama() + model config
      extract-transactions.ts     # generateObject: raw rows → Transaction[]
      categorise-transactions.ts  # generateObject: Transaction[] → CategorisedTransaction[]
    schemas/
      transaction.schema.ts       # Zod: Transaction, CategorisedTransaction
    utils/
      kpi.ts                      # Derive income / expenses / savings totals
  types/
    transaction.ts                # TypeScript interfaces (derived from Zod)
```

### Implementation Patterns

#### 1 — File Parsing

**CSV**: use `papaparse` (browser + Node, typed, zero config).
**XLSX**: use `xlsx` (SheetJS community edition) — strip images automatically, normalise to row arrays.

Both parsers produce `unknown[][]` (rows of raw values). A thin normalisation step types them as `Record<string, unknown>[]` before the LLM sees them.

```ts
// lib/parsers/csv-parser.ts
import Papa from 'papaparse';

export async function parseCsv(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(result.data as Record<string, unknown>[]),
      error: reject,
    });
  });
}
```

```ts
// lib/parsers/xlsx-parser.ts
import * as XLSX from 'xlsx';

export async function parseXlsx(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
}
```

#### 2 — Vercel AI SDK + Ollama: `generateObject`

The Vercel AI SDK (v4+) ships a first-class `ollama` provider via `ollama-ai-provider`. All structured extraction uses `generateObject` — never `generateText` — because it enforces the Zod schema as the response shape.

```ts
// lib/llm/ollama-client.ts
import { createOllama } from 'ollama-ai-provider';

export const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/api',
});

export const MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5:7b';
```

```ts
// lib/llm/extract-transactions.ts
import { generateObject } from 'ai';
import { z } from 'zod';
import { ollama, MODEL } from './ollama-client';

const TransactionArraySchema = z.object({
  transactions: z.array(
    z.object({
      fecha: z.string().describe('Fecha del movimiento en formato DD/MM/YYYY'),
      concepto: z.string().describe('Descripción del movimiento'),
      importe: z.string().describe('Importe del movimiento como string con 2 decimales'),
    }),
  ),
});

export async function extractTransactions(
  rawRows: Record<string, unknown>[],
): Promise<z.infer<typeof TransactionArraySchema>['transactions']> {
  const { object } = await generateObject({
    model: ollama(MODEL),
    schema: TransactionArraySchema,
    prompt: `Analiza estas filas de un fichero bancario y extrae ÚNICAMENTE: fecha (DD/MM/YYYY), concepto, importe.
Ignora columnas irrelevantes, cabeceras de imagen o metadatos.
Filas: ${JSON.stringify(rawRows.slice(0, 200))}`,
  });
  return object.transactions;
}
```

#### 3 — LLM Categorisation (50/30/20)

```ts
// lib/llm/categorise-transactions.ts
import { generateObject } from 'ai';
import { z } from 'zod';
import { ollama, MODEL } from './ollama-client';
import type { Transaction } from '@/types/transaction';

const CategorisedArraySchema = z.object({
  transactions: z.array(
    z.object({
      fecha: z.string(),
      concepto: z.string(),
      importe: z.string(),
      categoria: z.enum(['Necesidades', 'Deseos', 'Ahorro']),
      'sub-categoria': z.string(),
    }),
  ),
});

const SYSTEM_PROMPT = `Eres un experto en finanzas personales. Clasifica cada movimiento bancario según la regla 50/30/20:
- "Necesidades" (50%): gastos fijos/obligatorios (hipoteca, suministros, alimentación, seguros, transporte necesario).
- "Deseos" (30%): gastos discrecionales (ocio, restaurantes, viajes, ropa, suscripciones de entretenimiento).
- "Ahorro" (20%): ingresos, transferencias de ahorro, inversiones.
Proporciona también una sub-categoría descriptiva (ej: "Hipoteca", "Alimentación", "Ocio", "Viajes").`;

export async function categoriseTransactions(
  transactions: Transaction[],
): Promise<z.infer<typeof CategorisedArraySchema>['transactions']> {
  const { object } = await generateObject({
    model: ollama(MODEL),
    schema: CategorisedArraySchema,
    system: SYSTEM_PROMPT,
    prompt: `Clasifica estos movimientos: ${JSON.stringify(transactions)}`,
  });
  return object.transactions;
}
```

#### 4 — Zod Schemas & Types

```ts
// lib/schemas/transaction.schema.ts
import { z } from 'zod';

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  fecha: z.string(),
  concepto: z.string(),
  importe: z.string(),
});

export const CategorisedTransactionSchema = TransactionSchema.extend({
  categoria: z.enum(['Necesidades', 'Deseos', 'Ahorro']),
  subCategoria: z.string(),
});

export type Transaction = z.infer<typeof TransactionSchema>;
export type CategorisedTransaction = z.infer<typeof CategorisedTransactionSchema>;
```

#### 5 — API Route: Extract

```ts
// app/api/extract/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseCsv } from '@/lib/parsers/csv-parser';
import { parseXlsx } from '@/lib/parsers/xlsx-parser';
import { extractTransactions } from '@/lib/llm/extract-transactions';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase();
  const rows = ext === 'xlsx' ? await parseXlsx(file) : await parseCsv(file);
  const transactions = await extractTransactions(rows);
  return NextResponse.json({ transactions });
}
```

#### 6 — API Route: Categorise

```ts
// app/api/categorise/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { categoriseTransactions } from '@/lib/llm/categorise-transactions';
import { TransactionSchema } from '@/lib/schemas/transaction.schema';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const transactions = z.array(TransactionSchema).parse(body.transactions);
  const categorised = await categoriseTransactions(transactions);
  return NextResponse.json({ transactions: categorised });
}
```

#### 7 — Client State: Cumulative Accumulation

State lives in a React hook backed by `localStorage` to guarantee data is additive across multiple imports.

```ts
// hooks/use-transactions.ts
'use client';
import { useState, useEffect } from 'react';
import type { CategorisedTransaction } from '@/types/transaction';
import { v4 as uuid } from 'uuid';

const STORAGE_KEY = 'finance:transactions';

export function useTransactions() {
  const [transactions, setTransactions] = useState<CategorisedTransaction[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setTransactions(JSON.parse(stored));
  }, []);

  const addTransactions = (incoming: CategorisedTransaction[]) => {
    setTransactions((prev) => {
      const merged = [...prev, ...incoming.map((t) => ({ ...t, id: uuid() }))];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  const updateTransaction = (id: string, patch: Partial<CategorisedTransaction>) => {
    setTransactions((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return filtered;
    });
  };

  return { transactions, addTransactions, updateTransaction, deleteTransaction };
}
```

#### 8 — KPI Derivation

```ts
// lib/utils/kpi.ts
import type { CategorisedTransaction } from '@/types/transaction';

export interface Kpis {
  ingresos: number;
  gastos: number;
  ahorro: number;
}

export function computeKpis(transactions: CategorisedTransaction[]): Kpis {
  const ingresos = transactions
    .filter((t) => parseFloat(t.importe) > 0)
    .reduce((acc, t) => acc + parseFloat(t.importe), 0);
  const gastos = transactions
    .filter((t) => parseFloat(t.importe) < 0)
    .reduce((acc, t) => acc + Math.abs(parseFloat(t.importe)), 0);
  return { ingresos, gastos, ahorro: ingresos - gastos };
}
```

### API and Schema Documentation

#### Vercel AI SDK (v4) — Key Functions

| Function | Purpose |
|---|---|
| `generateObject({ model, schema, prompt })` | Returns a parsed object matching the Zod schema |
| `streamObject(...)` | Streaming variant (optional for progressive UI) |
| `createOllama({ baseURL })` | Creates an Ollama provider instance |

#### Ollama Models

| Model | Notes |
|---|---|
| `qwen2.5:7b` | Recommended — excellent instruction-following and JSON output at 7B |
| `mistral` | Alternative — good multilingual, slightly weaker structured output |

Prefer `qwen2.5:7b` for reliable `generateObject` compliance with the Zod schema.

#### Dependencies to Add

```json
{
  "dependencies": {
    "ai": "^4.x",
    "ollama-ai-provider": "^0.x",
    "papaparse": "^5.x",
    "xlsx": "^0.18.x",
    "zod": "^3.x",
    "uuid": "^9.x"
  },
  "devDependencies": {
    "@types/papaparse": "^5.x",
    "@types/uuid": "^9.x"
  }
}
```

#### Environment Variables

```env
OLLAMA_BASE_URL=http://localhost:11434/api
OLLAMA_MODEL=qwen2.5:7b
```

### Technical Requirements

1. **Batch size for LLM calls**: slice `rawRows` to ≤ 200 rows per call to stay within Ollama context windows. Larger files must be chunked.
2. **XLSX image stripping**: SheetJS `sheet_to_json` discards embedded images automatically; no special handling needed.
3. **Cumulative import**: `useTransactions` merges on every import; each transaction receives a fresh `uuid` to avoid collisions.
4. **Inline edit**: row enters edit mode via a boolean flag per row; on save, calls `updateTransaction(id, patch)`.
5. **Pagination**: implement client-side with a `page`/`pageSize` state pair (`useMemo` to slice).
6. **Filter**: filter on `concepto`, `categoria`, `subCategoria` fields with a controlled `<input>` above the table.
7. **KPI cards**: derived in real-time from `transactions` state via `computeKpis`; no server round-trip needed.

### Colour & Styling Guidance (60-30-10)

- **Primary (60%)**: light cool background — `bg-slate-50` / `bg-blue-50`
- **Secondary (30%)**: white card surfaces + mid-grey borders — `bg-white border-slate-200`
- **Accent (10%)**: indigo/blue interactive elements — `bg-indigo-600 hover:bg-indigo-700`
- **Danger/Hot (≤5%)**: `text-red-600` for delete actions and negative amounts only
- **Category badges**:
  - Necesidades → `bg-blue-100 text-blue-800`
  - Deseos → `bg-purple-100 text-purple-800`
  - Ahorro → `bg-green-100 text-green-800`
- Ensure WCAG AA contrast on all text/background combinations.

---

## Recommended Approach

**Full-stack Next.js App Router SPA with local-LLM structured extraction and categorisation via Vercel AI SDK + Ollama (`qwen2.5:7b`), with client-side cumulative state persisted in `localStorage`.**

### Architecture Decision Rationale

| Concern | Decision | Reason |
|---|---|---|
| LLM provider | Ollama (`qwen2.5:7b`) | Free, local, GDPR-safe, reliable JSON/structured output |
| Structured output | `generateObject` (Vercel AI SDK) | Enforces Zod schema, retries malformed JSON automatically |
| CSV parsing | `papaparse` | Battle-tested, TypeScript-typed, handles encoding edge cases |
| XLSX parsing | `xlsx` (SheetJS) | De-facto standard; strips images automatically |
| State persistence | `localStorage` via custom hook | Zero infrastructure, survives page refresh, cumulative by design |
| No DB (phase 1) | `localStorage` only | Requirements explicitly flag persistence as "to be analysed later" |
| API routes | `/api/extract` + `/api/categorise` | Keep LLM calls server-side (secure, no CORS to Ollama) |

---

## Implementation Guidance

- **Objectives**:
  - Full working personal finance dashboard with LLM-powered CSV/XLSX import and 50/30/20 categorisation
  - Grid with inline CRUD, pagination, filtering, and KPI summary cards
  - Cumulative data model: each import appends to existing transactions

- **Key Tasks**:
  1. Scaffold Next.js 16 project with TypeScript, Tailwind, App Router (`npx create-next-app@latest`)
  2. Install `ai`, `ollama-ai-provider`, `papaparse`, `xlsx`, `zod`, `uuid`
  3. Implement `lib/parsers/` (csv + xlsx)
  4. Implement `lib/llm/ollama-client.ts`, `extract-transactions.ts`, `categorise-transactions.ts`
  5. Implement Zod schemas in `lib/schemas/transaction.schema.ts`
  6. Implement API routes: `app/api/extract/route.ts`, `app/api/categorise/route.ts`
  7. Implement `hooks/use-transactions.ts` (localStorage + CRUD)
  8. Implement `components/file-drop-zone.tsx` (HTML5 drag-and-drop + input)
  9. Implement `components/kpi-cards.tsx`
  10. Implement `components/transaction-table.tsx` with filter, pagination, inline edit/delete
  11. Wire dashboard page (`app/dashboard/page.tsx`)
  12. Apply Tailwind colour system per 60-30-10 rule

- **Dependencies**:
  - Ollama running locally with `qwen2.5:7b` pulled (`ollama pull qwen2.5:7b`)
  - Node.js 20+ / pnpm or npm
  - `OLLAMA_BASE_URL` + `OLLAMA_MODEL` in `.env.local`

- **Success Criteria**:
  - User can drag-and-drop a CSV or XLSX file and see parsed + categorised transactions in the table
  - Each new import appends to existing rows (cumulative)
  - KPI cards reflect correct totals after each import
  - Each row is individually editable and deletable
  - Table supports text filter and pagination
  - Data survives a full page refresh (localStorage)
  - No TypeScript `any`, no lint errors, WCAG-AA colour contrast

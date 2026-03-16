<!-- markdownlint-disable-file -->
# Spec: Personal Finance App — 50/30/20 LLM-Powered

**Feature folder:** `.github/features/20260316-personal-finance-app/`  
**Status:** Ready for implementation  
**Date:** 2026-03-16  
**Stack:** Next.js 16 (App Router) · TypeScript 5 · Tailwind CSS · Vercel AI SDK v4 · Ollama (`qwen2.5:7b`)

---

## 1. Overview

A full-stack personal finance web application that:

1. Ingests bank transaction files (CSV / XLSX) via drag-and-drop or file picker.
2. Uses a local LLM (Ollama `qwen2.5:7b`) to extract structured data from the raw file rows.
3. Uses the same LLM to categorise each transaction according to the **50/30/20** rule.
4. Displays transactions in an interactive data grid with inline CRUD, filtering, and pagination.
5. Shows three KPI cards (income, expenses, savings) permanently updated from the in-memory state.
6. Accumulates data cumulatively across multiple imports — no data is lost on re-import.
7. Persists data client-side in `localStorage` (database persistence is out of scope for phase 1).

---

## 2. Architecture

### 2.1 High-Level Diagram

```
Browser
  └── /dashboard (RSC shell)
        ├── FileDropZone      [Client] → POST /api/extract
        ├── KpiCards          [Client] ← computeKpis(transactions)
        └── TransactionTable  [Client] → POST /api/categorise
                                       ← useTransactions (localStorage)

Server (Next.js App Router)
  ├── POST /api/extract      → parseCsv|parseXlsx → extractTransactions (Ollama)
  └── POST /api/categorise   → categoriseTransactions (Ollama)

Local Infrastructure
  └── Ollama (localhost:11434) running qwen2.5:7b
```

### 2.2 Server / Client Boundary

| Layer | Type | Reason |
|---|---|---|
| `app/dashboard/page.tsx` | Server Component | RSC shell — no interactivity |
| `components/file-drop-zone.tsx` | Client Component | HTML5 Drag & Drop API |
| `components/transaction-table.tsx` | Client Component | State, inline edit, pagination |
| `components/kpi-cards.tsx` | Client Component | Real-time derived totals |
| `components/category-badge.tsx` | Server or Client | Pure display, no state |
| `app/api/extract/route.ts` | Route Handler | LLM call server-side (no CORS) |
| `app/api/categorise/route.ts` | Route Handler | LLM call server-side (no CORS) |

### 2.3 Project Structure

```
src/
  app/
    layout.tsx                    # Root layout: Inter font, global styles, dark-mode class
    page.tsx                      # Redirect → /dashboard
    dashboard/
      page.tsx                    # RSC shell: imports Client components
      loading.tsx                 # Suspense fallback
      error.tsx                   # Error boundary
    api/
      extract/
        route.ts                  # POST: file upload → LLM extraction → Transaction[]
      categorise/
        route.ts                  # POST: Transaction[] → CategorisedTransaction[]
  components/
    file-drop-zone.tsx            # Drag-and-drop + file button ('use client')
    transaction-table.tsx         # Data grid with filter/pagination/inline edit ('use client')
    transaction-row.tsx           # Single editable row ('use client')
    kpi-cards.tsx                 # Income / expenses / savings cards ('use client')
    category-badge.tsx            # Colour-coded 50/30/20 badge
  hooks/
    use-transactions.ts           # Client state: accumulate, CRUD, localStorage
  lib/
    parsers/
      csv-parser.ts               # papaparse → Record<string, unknown>[]
      xlsx-parser.ts              # SheetJS → Record<string, unknown>[]
    llm/
      ollama-client.ts            # createOllama() singleton + MODEL constant
      extract-transactions.ts     # generateObject: raw rows → Transaction[]
      categorise-transactions.ts  # generateObject: Transaction[] → CategorisedTransaction[]
    schemas/
      transaction.schema.ts       # Zod schemas + inferred TypeScript types
    utils/
      kpi.ts                      # computeKpis(transactions) → Kpis
  types/
    transaction.ts                # Re-export of types derived from Zod
```

---

## 3. Data Schemas

### 3.1 Zod Schemas (`lib/schemas/transaction.schema.ts`)

```ts
import { z } from 'zod';

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  fecha: z.string(),           // DD/MM/YYYY
  concepto: z.string(),
  importe: z.string(),         // Decimal string, e.g. "1000.50" or "-200.00"
});

export const CategorisedTransactionSchema = TransactionSchema.extend({
  categoria: z.enum(['Necesidades', 'Deseos', 'Ahorro']),
  subCategoria: z.string(),    // e.g. "Hipoteca", "Alimentación", "Ocio"
});

export type Transaction = z.infer<typeof TransactionSchema>;
export type CategorisedTransaction = z.infer<typeof CategorisedTransactionSchema>;
```

### 3.2 LLM Input/Output Examples

**Extraction output (before `id` is assigned):**
```json
{"fecha": "01/01/2026", "concepto": "MERCADONA", "importe": "-98.40"}
```

**Categorisation output:**
```json
{
  "fecha": "01/01/2026",
  "concepto": "MERCADONA",
  "importe": "-98.40",
  "categoria": "Necesidades",
  "sub-categoria": "Alimentación"
}
```

> Note: LLM returns `sub-categoria` (hyphenated). Map to `subCategoria` (camelCase) when parsing into the Zod schema.

---

## 4. API Contracts

### 4.1 `POST /api/extract`

| | |
|---|---|
| **Content-Type** | `multipart/form-data` |
| **Field** | `file` — File (.csv or .xlsx) |

**Response 200:**
```json
{
  "transactions": [
    { "fecha": "01/01/2026", "concepto": "HIPOTECA", "importe": "-1000.00" }
  ]
}
```

**Response 400:**
```json
{ "error": "No file" }
```

**Response 500:**
```json
{ "error": "Extraction failed: <message>" }
```

### 4.2 `POST /api/categorise`

| | |
|---|---|
| **Content-Type** | `application/json` |

**Request body:**
```json
{
  "transactions": [
    { "id": "uuid", "fecha": "01/01/2026", "concepto": "HIPOTECA", "importe": "-1000.00" }
  ]
}
```

**Response 200:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "fecha": "01/01/2026",
      "concepto": "HIPOTECA",
      "importe": "-1000.00",
      "categoria": "Necesidades",
      "subCategoria": "Hipoteca"
    }
  ]
}
```

**Response 422** (Zod parse failure):
```json
{ "error": "Validation failed", "details": [...] }
```

---

## 5. LLM Integration

### 5.1 Ollama Client (`lib/llm/ollama-client.ts`)

```ts
import { createOllama } from 'ollama-ai-provider';

export const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/api',
});

export const MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5:7b';
```

### 5.2 Extraction Prompt

- Use `generateObject` with a `TransactionArraySchema` Zod schema.
- Slice raw rows to **≤ 200** per call. For larger files, chunk and merge results.
- Prompt language: Spanish (matches bank data locale).
- Discard irrelevant columns, header metadata, and image artefacts.

### 5.3 Categorisation Prompt

- Use `generateObject` with a `CategorisedArraySchema` Zod schema.
- System prompt enforces 50/30/20 definitions (Necesidades / Deseos / Ahorro).
- Returns `sub-categoria` as a short descriptive string (e.g. "Hipoteca", "Viajes", "Salario").

### 5.4 Constraints

| Constraint | Value |
|---|---|
| Max rows per extraction call | 200 |
| Model | `qwen2.5:7b` (preferred) / `mistral` (fallback) |
| Output format | Structured JSON via `generateObject` — never `generateText` |
| LLM calls | Server-side only (Route Handlers) |

---

## 6. Component Specifications

### 6.1 `FileDropZone`

- **Type:** `'use client'`
- **Accepts:** `.csv`, `.xlsx` files only (validate MIME type + extension)
- **Behaviours:**
  - Drag-over visual highlight (dashed border + bg-indigo-50)
  - Click to open native file picker
  - On file selected: POST to `/api/extract` → receive `Transaction[]` → POST to `/api/categorise` → receive `CategorisedTransaction[]` → call `addTransactions()`
  - Show spinner/loading state during both API calls
  - Show error toast/alert on failure
- **States:** idle | dragging-over | uploading | error

### 6.2 `KpiCards`

- **Type:** `'use client'`
- **Inputs:** `transactions: CategorisedTransaction[]`
- **Displays 3 cards:**
  - **Ingresos** — sum of `importe > 0` (green accent `text-green-700`)
  - **Gastos** — sum of `|importe| where importe < 0` (red `text-red-600`, used sparingly per colour guide)
  - **Ahorro** — Ingresos − Gastos (neutral / conditional colour)
- **Format:** amounts with 2 decimal places + "€" suffix
- **Updates:** derived in real-time from `transactions` prop (no server round-trip)

### 6.3 `TransactionTable`

- **Type:** `'use client'`
- **Inputs:** `transactions`, `updateTransaction`, `deleteTransaction` from `useTransactions`
- **Features:**
  - **Filter:** single text input filtering on `concepto`, `categoria`, `subCategoria` (case-insensitive, client-side)
  - **Pagination:** `page` + `pageSize` state (default `pageSize = 20`); `useMemo` to slice
  - **Sort:** optional — at minimum sort by `fecha` descending by default
  - **Columns:** fecha · concepto · importe · categoría · sub-categoría · acciones
  - **Inline edit:** clicking edit icon per row sets `editingId`; renders editable `<input>` / `<select>` fields; save calls `updateTransaction(id, patch)`; cancel restores previous values
  - **Delete:** confirmation prompt before calling `deleteTransaction(id)`
  - **Category badge:** renders `<CategoryBadge>` per row
- **Empty state:** "No hay movimientos. Importa un fichero para empezar."

### 6.4 `CategoryBadge`

- Renders the `categoria` value as a pill badge.
- Colour mapping:
  | Categoria | Classes |
  |---|---|
  | Necesidades | `bg-blue-100 text-blue-800` |
  | Deseos | `bg-purple-100 text-purple-800` |
  | Ahorro | `bg-green-100 text-green-800` |

### 6.5 `TransactionRow`

- **Type:** `'use client'`
- Receives `transaction`, `isEditing`, `onEdit`, `onSave`, `onCancel`, `onDelete`
- Renders either display mode or edit mode (controlled inputs) based on `isEditing`
- Edit mode exposes: `<input>` for fecha/concepto/importe; `<select>` for categoria (Necesidades/Deseos/Ahorro); `<input>` for subCategoria

---

## 7. Custom Hook: `useTransactions`

**File:** `hooks/use-transactions.ts` — `'use client'`  
**Storage key:** `'finance:transactions'`

```ts
interface UseTransactionsReturn {
  transactions: CategorisedTransaction[];
  addTransactions: (incoming: CategorisedTransaction[]) => void;
  updateTransaction: (id: string, patch: Partial<CategorisedTransaction>) => void;
  deleteTransaction: (id: string) => void;
}
```

- On mount: reads `localStorage` and hydrates `transactions` state.
- `addTransactions`: merges incoming into existing array (cumulative). Assigns fresh `uuid` to each incoming item.
- `updateTransaction`: immutable update by `id`.
- `deleteTransaction`: filters by `id`.
- All mutations write back to `localStorage`.

---

## 8. File Parsers

### 8.1 CSV — `lib/parsers/csv-parser.ts`

- Uses `papaparse` with `header: true`, `skipEmptyLines: true`
- Returns `Record<string, unknown>[]`

### 8.2 XLSX — `lib/parsers/xlsx-parser.ts`

- Uses `xlsx` (SheetJS): `XLSX.read(buffer, { type: 'array' })` + `sheet_to_json`
- Reads first sheet only (`wb.SheetNames[0]`)
- Embedded images are automatically ignored by `sheet_to_json`
- Returns `Record<string, unknown>[]`

---

## 9. KPI Utility (`lib/utils/kpi.ts`)

```ts
export interface Kpis {
  ingresos: number;   // sum of positive importes
  gastos: number;     // sum of absolute value of negative importes
  ahorro: number;     // ingresos - gastos
}

export function computeKpis(transactions: CategorisedTransaction[]): Kpis;
```

---

## 10. Styling Guidelines

Follows the **60-30-10 colour rule** per `html-css-style-color-guide.instructions.md`:

| Role | Proportion | Tailwind classes |
|---|---|---|
| Primary background | 60% | `bg-slate-50` / `bg-blue-50` |
| Card / surface | 30% | `bg-white border border-slate-200` |
| Interactive accent | 10% | `bg-indigo-600 hover:bg-indigo-700 text-white` |
| Danger (delete, negative amounts) | ≤5% | `text-red-600` |

- Dark mode: support via Tailwind `dark:` classes — dark background `dark:bg-slate-900`, dark card `dark:bg-slate-800`.
- Typography: Inter font via `next/font/google`; base text `text-slate-800 dark:text-slate-100`.
- No hot colours (orange/yellow/pink) for backgrounds.
- All text/background combinations must pass **WCAG AA** (≥ 4.5:1 for normal text).
- Gradients: subtle within same hue family (e.g. `from-slate-50 to-blue-50`).

---

## 11. Environment Variables

```env
# .env.local
OLLAMA_BASE_URL=http://localhost:11434/api
OLLAMA_MODEL=qwen2.5:7b
```

---

## 12. Dependencies

```jsonc
// package.json additions
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

---

## 13. Implementation Checklist

### Phase 1 — Scaffold & Core Libraries

- [ ] `npx create-next-app@latest` with TypeScript, Tailwind, App Router, `src/` directory
- [ ] Install all dependencies listed in §12
- [ ] Create `.env.local` with `OLLAMA_BASE_URL` and `OLLAMA_MODEL`
- [ ] Configure `tsconfig.json`: strict mode, `@/` path alias pointing to `src/`

### Phase 2 — Data Layer

- [ ] `lib/schemas/transaction.schema.ts` — Zod schemas + exported types
- [ ] `lib/parsers/csv-parser.ts` — papaparse wrapper
- [ ] `lib/parsers/xlsx-parser.ts` — SheetJS wrapper
- [ ] `lib/utils/kpi.ts` — `computeKpis`
- [ ] `hooks/use-transactions.ts` — localStorage CRUD hook

### Phase 3 — LLM Layer

- [ ] `lib/llm/ollama-client.ts` — `createOllama` singleton
- [ ] `lib/llm/extract-transactions.ts` — `generateObject` extraction
- [ ] `lib/llm/categorise-transactions.ts` — `generateObject` categorisation

### Phase 4 — API Routes

- [ ] `app/api/extract/route.ts` — file upload → parse → extract
- [ ] `app/api/categorise/route.ts` — JSON body → categorise

### Phase 5 — UI Components

- [ ] `components/category-badge.tsx` — pill badge (colour mapping)
- [ ] `components/kpi-cards.tsx` — 3 KPI cards (ingresos, gastos, ahorro)
- [ ] `components/file-drop-zone.tsx` — drag-and-drop + file picker + upload flow
- [ ] `components/transaction-row.tsx` — display + inline edit row
- [ ] `components/transaction-table.tsx` — filter, pagination, table shell

### Phase 6 — Pages

- [ ] `app/layout.tsx` — Inter font, global Tailwind base, dark mode
- [ ] `app/page.tsx` — redirect to `/dashboard`
- [ ] `app/dashboard/page.tsx` — RSC shell composing all Client components
- [ ] `app/dashboard/loading.tsx` — skeleton/spinner fallback
- [ ] `app/dashboard/error.tsx` — error boundary UI

### Phase 7 — Quality

- [ ] No TypeScript `any` — use `unknown` + narrowing
- [ ] Kebab-case filenames throughout
- [ ] WCAG-AA colour contrast verified on KPI cards, badges, and table
- [ ] `npm run lint` passes with zero errors
- [ ] Manual smoke test: import CSV → import XLSX → verify accumulation → edit row → delete row → refresh page → verify persistence

---

## 14. Acceptance Criteria

| # | Criterion |
|---|---|
| AC-01 | User can drag-and-drop or pick a `.csv` or `.xlsx` file from any bank export format |
| AC-02 | The LLM correctly identifies `fecha`, `concepto`, and `importe` regardless of extraneous columns or embedded images |
| AC-03 | Every extracted transaction is assigned one of: `Necesidades`, `Deseos`, `Ahorro` with a descriptive `subCategoria` |
| AC-04 | A second import of a different file appends to existing transactions — no data is cleared |
| AC-05 | KPI cards display correct real-time totals for ingresos, gastos, and ahorro after every import or edit |
| AC-06 | Each transaction row can be fully edited inline (all fields) and saved without a page reload |
| AC-07 | Each transaction row can be deleted after a confirmation step |
| AC-08 | The table can be filtered by free-text matching `concepto`, `categoria`, or `subCategoria` |
| AC-09 | The table is paginated (default 20 rows/page) |
| AC-10 | All transaction data survives a full browser page refresh (localStorage persistence) |
| AC-11 | No TypeScript compile errors; `eslint` reports zero errors |
| AC-12 | All interactive elements meet WCAG AA contrast ratio (≥ 4.5:1 for normal text) |

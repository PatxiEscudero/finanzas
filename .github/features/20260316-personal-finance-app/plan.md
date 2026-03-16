<!-- markdownlint-disable-file -->
# Plan: Personal Finance App — 50/30/20 LLM-Powered

**Feature folder:** `.github/features/20260316-personal-finance-app/`  
**Spec:** [spec.md](./spec.md)  
**Status:** ✅ Implementation complete — 2026-03-16  
**Date:** 2026-03-16  
**Stack:** Next.js 16 (App Router) · TypeScript 5 · Tailwind CSS · Vercel AI SDK v4 · Ollama (`qwen2.5:7b`)

---

## 0. Pre-requisites

| Check | Detail |
|---|---|
| Node.js ≥ 20 | Required by Next.js 16 |
| Ollama running | `http://localhost:11434` with `qwen2.5:7b` pulled |
| `npm` / `pnpm` | Package manager available in PATH |

---

## 1. Execution Order & Dependency Graph

```
Phase 1 (Scaffold)
    └── Phase 2 (Data Layer)
            ├── Phase 3 (LLM Layer)
            │       └── Phase 4 (API Routes)
            │               └── Phase 5 (UI Components)
            │                       └── Phase 6 (Pages)
            │                               └── Phase 7 (Quality)
            └── Phase 5 (UI Components) [hooks + utils only, no LLM dep]
```

**Critical path:** Scaffold → Schemas → Parsers + Hook → LLM clients → API routes → Components → Pages → QA.

---

## 2. Phase-by-Phase Tasks

---

### Phase 1 — Scaffold & Core Libraries

> **Goal:** Working Next.js project with all dependencies installed.

| # | Task | Command / Action |
|---|---|---|
| 1.1 | Bootstrap Next.js app | `npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"` |
| 1.2 | Install runtime dependencies | `npm install ai ollama-ai-provider papaparse xlsx zod uuid` |
| 1.3 | Install dev dependencies | `npm install -D @types/papaparse @types/uuid` |
| 1.4 | Create `.env.local` | See §11 of spec |
| 1.5 | Verify `tsconfig.json` | Strict mode ON, `"@/*": ["./src/*"]` path alias |

**Deliverable:** `npm run dev` starts without errors on port 3000.

---

### Phase 2 — Data Layer

> **Goal:** All pure-TypeScript modules; no Next.js or LLM dependency. Fully unit-testable in isolation.

#### 2.1 `src/lib/schemas/transaction.schema.ts`

Define Zod schemas and export inferred TypeScript types:

```
TransactionSchema        → Transaction
CategorisedTransactionSchema  → CategorisedTransaction
```

Key details:
- `id`: `z.string().uuid()`
- `importe`: stored as decimal string (e.g. `"-200.00"`)
- `categoria`: `z.enum(['Necesidades', 'Deseos', 'Ahorro'])`
- `subCategoria`: camelCase (map from LLM's `sub-categoria`)

#### 2.2 `src/types/transaction.ts`

Re-export `Transaction` and `CategorisedTransaction` from the schema file for convenient imports.

#### 2.3 `src/lib/parsers/csv-parser.ts`

```
parseCsv(buffer: ArrayBuffer): Record<string, unknown>[]
```

- `papaparse` with `header: true`, `skipEmptyLines: true`
- Input: raw `ArrayBuffer` from `request.formData()`

#### 2.4 `src/lib/parsers/xlsx-parser.ts`

```
parseXlsx(buffer: ArrayBuffer): Record<string, unknown>[]
```

- `XLSX.read(buffer, { type: 'array' })` + `sheet_to_json`
- First sheet only: `wb.SheetNames[0]`
- Embedded images ignored automatically

#### 2.5 `src/lib/utils/kpi.ts`

```
computeKpis(transactions: CategorisedTransaction[]): Kpis
```

- `ingresos` = sum of `parseFloat(importe)` where value > 0
- `gastos` = sum of `Math.abs(parseFloat(importe))` where value < 0
- `ahorro` = ingresos − gastos

#### 2.6 `src/hooks/use-transactions.ts`

`'use client'` hook. Storage key: `'finance:transactions'`.

```
useTransactions(): {
  transactions: CategorisedTransaction[]
  addTransactions(incoming: CategorisedTransaction[]): void
  updateTransaction(id: string, patch: Partial<CategorisedTransaction>): void
  deleteTransaction(id: string): void
}
```

- Hydrate from `localStorage` on mount (`useEffect`)
- `addTransactions`: generates fresh `uuid` per item, merges (does NOT replace)
- All mutations persist back to `localStorage`

**Deliverable:** All modules compile with `tsc --noEmit`.

---

### Phase 3 — LLM Layer

> **Goal:** Server-only modules that call Ollama via Vercel AI SDK `generateObject`.

#### 3.1 `src/lib/llm/ollama-client.ts`

```ts
import { createOllama } from 'ollama-ai-provider';

export const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/api',
});

export const MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5:7b';
```

#### 3.2 `src/lib/llm/extract-transactions.ts`

```
extractTransactions(rows: Record<string, unknown>[]): Promise<Omit<Transaction, 'id'>[]>
```

- Define `TransactionArraySchema = z.object({ transactions: z.array(TransactionSchema.omit({ id: true })) })`
- Chunk input into slices of ≤ 200 rows; merge results
- Prompt in Spanish; instruct LLM to extract `fecha` (DD/MM/YYYY), `concepto`, `importe` (decimal string)
- Use `generateObject({ model: ollama(MODEL), schema: TransactionArraySchema, prompt })`

**Prompt template (extraction):**
```
Eres un asistente de finanzas personales. Extrae los movimientos bancarios del siguiente conjunto de filas CSV/XLSX.
Para cada movimiento, identifica: fecha (formato DD/MM/YYYY), concepto (descripción limpia) e importe (número decimal, negativo si es gasto).
Ignora columnas irrelevantes, cabeceras y cualquier dato no transaccional.
Filas: <JSON>
```

#### 3.3 `src/lib/llm/categorise-transactions.ts`

```
categoriseTransactions(transactions: Transaction[]): Promise<CategorisedTransaction[]>
```

- Define `CategorisedArraySchema = z.object({ transactions: z.array(CategorisedTransactionSchema) })`
- Map LLM's `sub-categoria` → `subCategoria` after parsing
- System prompt enforces 50/30/20 rule

**System prompt (categorisation):**
```
Eres un experto en finanzas personales con la metodología 50/30/20.
Clasifica cada movimiento bancario en una de estas categorías:
- Necesidades (50%): gastos fijos y esenciales (hipoteca, suministros, alimentación, seguros, transporte necesario)
- Deseos (30%): gastos no esenciales (ocio, restaurantes, viajes, ropa, suscripciones de entretenimiento)
- Ahorro (20%): transferencias de ahorro, inversiones, depósitos
Responde con el JSON exacto solicitado, incluyendo sub-categoria (string corto descriptivo).
```

**Deliverable:** `extractTransactions` and `categoriseTransactions` callable from a test script against a live Ollama instance.

---

### Phase 4 — API Routes

> **Goal:** Two Route Handlers connecting parsers + LLM to the browser.

#### 4.1 `src/app/api/extract/route.ts`

`POST` — `multipart/form-data`, field `file`.

Flow:
1. Validate field `file` exists → 400 if missing
2. Read `ArrayBuffer` from file
3. Detect type by extension (`.csv` → `parseCsv`, `.xlsx` → `parseXlsx`) → 400 if unknown
4. `extractTransactions(rows)`
5. Return `{ transactions }` → 200
6. Catch all errors → 500 `{ error: "Extraction failed: <message>" }`

#### 4.2 `src/app/api/categorise/route.ts`

`POST` — `application/json`.

Flow:
1. Parse body; validate `transactions` array with Zod → 422 on failure
2. `categoriseTransactions(transactions)`
3. Return `{ transactions }` → 200
4. Catch errors → 500 `{ error: "Categorisation failed: <message>" }`

**Deliverable:** Both routes callable via `curl` or Postman.

---

### Phase 5 — UI Components

> **Goal:** All React components, isolated from pages, with explicit props interfaces.

Order of implementation (fewest to most dependencies):

#### 5.1 `src/components/category-badge.tsx`

- Pure display, no state
- Props: `{ categoria: 'Necesidades' | 'Deseos' | 'Ahorro' }`
- Colour mapping:
  | Categoria | Classes |
  |---|---|
  | Necesidades | `bg-blue-100 text-blue-800` |
  | Deseos | `bg-purple-100 text-purple-800` |
  | Ahorro | `bg-green-100 text-green-800` |

#### 5.2 `src/components/kpi-cards.tsx`

- `'use client'`
- Props: `{ transactions: CategorisedTransaction[] }`
- Calls `computeKpis(transactions)` inline
- 3 cards: **Ingresos** (green), **Gastos** (red, ≤5% usage), **Ahorro** (neutral/conditional)
- Amounts formatted: `${value.toFixed(2)} €`

#### 5.3 `src/components/transaction-row.tsx`

- `'use client'`
- Props: `{ transaction, isEditing, onEdit, onSave, onCancel, onDelete }`
- Display mode: renders all fields + edit/delete action icons
- Edit mode: `<input>` for fecha / concepto / importe; `<select>` for categoria; `<input>` for subCategoria
- Uses `<CategoryBadge>` in display mode

#### 5.4 `src/components/transaction-table.tsx`

- `'use client'`
- Props: `{ transactions, updateTransaction, deleteTransaction }`
- Internal state: `filter` string, `page` (default 1), `pageSize` (default 20), `editingId`
- Filter: `useMemo` on `concepto + categoria + subCategoria` (case-insensitive)
- Pagination: slice filtered array by `(page-1)*pageSize` to `page*pageSize`
- Sort: by `fecha` descending (default, `useMemo`)
- Empty state: `"No hay movimientos. Importa un fichero para empezar."`
- Columns: fecha · concepto · importe · categoría · sub-categoría · acciones

#### 5.5 `src/components/file-drop-zone.tsx`

- `'use client'`
- Props: `{ onTransactionsAdded: (t: CategorisedTransaction[]) => void }`
- States: `idle | dragging-over | uploading | error`
- Accept: `.csv`, `.xlsx` (MIME + extension validation)
- On file: POST `/api/extract` → POST `/api/categorise` → call `onTransactionsAdded`
- Drag-over: dashed border + `bg-indigo-50` highlight
- Spinner during API calls; error alert/toast on failure

**Deliverable:** All components render without runtime errors in the browser (can be tested on `/dashboard` once pages exist).

---

### Phase 6 — Pages

> **Goal:** Complete, routable application shell.

#### 6.1 `src/app/layout.tsx`

- Inter font via `next/font/google`
- `<html lang="es" className="dark">`  *(or system preference via Tailwind)*
- Global Tailwind base: `bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100`

#### 6.2 `src/app/page.tsx`

```ts
import { redirect } from 'next/navigation';
export default function Home() { redirect('/dashboard'); }
```

#### 6.3 `src/app/dashboard/page.tsx`

RSC shell — no `'use client'`. Composes:

```tsx
// Server Component
import FileDropZone from '@/components/file-drop-zone';
import KpiCards from '@/components/kpi-cards';
import TransactionTable from '@/components/transaction-table';
// + useTransactions hook wired through a thin Client wrapper
```

> **Note:** Because `useTransactions` is a Client hook, create a thin `DashboardClient` wrapper (`'use client'`) that owns `useTransactions` state and passes props down to `KpiCards`, `FileDropZone`, and `TransactionTable`.

#### 6.4 `src/app/dashboard/loading.tsx`

Skeleton/spinner fallback shown during Suspense boundaries.

#### 6.5 `src/app/dashboard/error.tsx`

`'use client'` error boundary component with `error` and `reset` props.

**Deliverable:** Full end-to-end flow working in browser.

---

### Phase 7 — Quality

> **Goal:** Zero lint errors, type safety, WCAG AA contrast, manual smoke test passing.

| # | Check | Action |
|---|---|---|
| 7.1 | TypeScript strict | `npm run build` with zero type errors; no `any` — use `unknown` + narrowing |
| 7.2 | ESLint | `npm run lint` → zero errors |
| 7.3 | WCAG AA contrast | Verify KPI cards, badges, and table values pass ≥ 4.5:1 (use browser DevTools or axe) |
| 7.4 | Smoke test — CSV | Import a `.csv` bank export → verify extraction + categorisation |
| 7.5 | Smoke test — XLSX | Import a `.xlsx` bank export (with embedded logo) → verify extraction + categorisation |
| 7.6 | Smoke test — accumulation | Import file A, then file B → verify rows do not reset |
| 7.7 | Smoke test — CRUD | Edit a row, save; delete a row with confirmation |
| 7.8 | Smoke test — persistence | Refresh the page → verify transactions still visible |
| 7.9 | Smoke test — filter/pagination | Type in filter box → verify live filtering; check pagination controls |

---

## 3. File Manifest

Complete list of files to create, in implementation order:

```
# Phase 1
.env.local
tsconfig.json                                    (verify / patch strict + alias)

# Phase 2 — Data layer
src/lib/schemas/transaction.schema.ts
src/types/transaction.ts
src/lib/parsers/csv-parser.ts
src/lib/parsers/xlsx-parser.ts
src/lib/utils/kpi.ts
src/hooks/use-transactions.ts

# Phase 3 — LLM layer
src/lib/llm/ollama-client.ts
src/lib/llm/extract-transactions.ts
src/lib/llm/categorise-transactions.ts

# Phase 4 — API routes
src/app/api/extract/route.ts
src/app/api/categorise/route.ts

# Phase 5 — Components
src/components/category-badge.tsx
src/components/kpi-cards.tsx
src/components/transaction-row.tsx
src/components/transaction-table.tsx
src/components/file-drop-zone.tsx

# Phase 6 — Pages
src/app/layout.tsx
src/app/page.tsx
src/app/dashboard/page.tsx
src/app/dashboard/loading.tsx
src/app/dashboard/error.tsx
```

---

## 4. Key Implementation Constraints

| Constraint | Rule |
|---|---|
| LLM calls | Server-side only (Route Handlers). Never call Ollama from Client Components. |
| No `next/dynamic` with `ssr: false` | Import Client Components directly in Server Components per Next.js 16 guidelines. |
| `generateObject` only | Never use `generateText` for structured data. |
| Chunk size | ≤ 200 rows per LLM extraction call. |
| Data immutability | `addTransactions` must merge, never replace. Fresh `uuid` per imported item. |
| File naming | kebab-case for all files throughout `src/`. |
| Styling | 60-30-10 colour rule; `text-red-600` only for danger / negative amounts (≤ 5%). No hot backgrounds. |
| Dark mode | All components must provide `dark:` Tailwind variants. |

---

## 5. Acceptance Criteria Reference

| ID | Criterion |
|---|---|
| AC-01 | Drag-and-drop or pick `.csv` / `.xlsx` |
| AC-02 | LLM extracts `fecha`, `concepto`, `importe` regardless of extraneous columns / images |
| AC-03 | Every transaction categorised as Necesidades / Deseos / Ahorro with `subCategoria` |
| AC-04 | Second import appends — data is never cleared |
| AC-05 | KPI cards reflect real-time totals after every import or edit |
| AC-06 | Inline row editing (all fields) saved without page reload |
| AC-07 | Row deletion with confirmation |
| AC-08 | Free-text filter on concepto / categoria / subCategoria |
| AC-09 | Table paginated at 20 rows/page by default |
| AC-10 | Data survives full browser refresh (localStorage) |
| AC-11 | Zero TypeScript compile errors; zero ESLint errors |
| AC-12 | WCAG AA contrast (≥ 4.5:1) on all interactive text |

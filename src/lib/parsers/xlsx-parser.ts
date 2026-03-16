import * as XLSX from 'xlsx';

/**
 * Parse an ArrayBuffer containing XLSX data.
 * Uses the first sheet only. Embedded images are ignored automatically.
 * @returns Array of raw row objects (header keys → values).
 */
export function parseXlsx(buffer: ArrayBuffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);
}

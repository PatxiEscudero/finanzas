import Papa from 'papaparse';

/**
 * Parse an ArrayBuffer containing CSV data.
 * @returns Array of raw row objects (header keys → values).
 */
export function parseCsv(buffer: ArrayBuffer): Record<string, unknown>[] {
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(buffer);

  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data;
}

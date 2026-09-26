/** Text to compare in a search: lowercase and without accents ("Azúcar" matches "azucar"). */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Whether a row matches what was typed: every word appears in some of its values (texts and
 * numbers, also inside nested objects such as `{ sale: { number } }`).
 */
export function rowMatches(row: unknown, query: string): boolean {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const values: string[] = [];
  const collect = (value: unknown, depth: number) => {
    if (value === null || value === undefined || depth > 3) return;
    if (typeof value === 'string' || typeof value === 'number') values.push(String(value));
    else if (Array.isArray(value)) value.forEach((item) => collect(item, depth + 1));
    else if (typeof value === 'object')
      Object.values(value).forEach((item) => collect(item, depth + 1));
  };
  collect(row, 0);
  const text = normalizeSearch(values.join(' '));
  return words.every((word) => text.includes(word));
}

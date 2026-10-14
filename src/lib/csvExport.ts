/** Spreadsheet-formula injection: neutralize cells that Excel/Sheets would treat as formulas. */
export function sanitizeCsvCell(value: unknown): string {
  const raw = value == null ? '' : String(value);
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (/^[=+\-@\t\n]/.test(normalized) || normalized.startsWith('\u0009')) {
    return `'${normalized}`;
  }
  return normalized;
}

const quoteCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export function toSafeCsv(rows: unknown[][]): string {
  return (
    '\uFEFF' +
    rows
      .map((row) => row.map((cell) => quoteCell(sanitizeCsvCell(cell))).join(','))
      .join('\r\n')
  );
}

export function downloadSafeCsv(fileName: string, rows: unknown[][]) {
  const blob = new Blob([toSafeCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatCsvDate(d: Date): string {
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '';
  let str = '';
  if (val instanceof Date) {
    str = formatCsvDate(val);
  } else {
    str = String(val);
  }
  const escaped = str.replace(/"/g, '""');
  if (
    escaped.includes(',') ||
    escaped.includes('"') ||
    escaped.includes('\n') ||
    escaped.includes('\r')
  ) {
    return `"${escaped}"`;
  }
  return escaped;
}

export function buildCsv(headers: string[], rows: unknown[][]): string {
  const csvLines = [headers.join(',')];
  for (const row of rows) {
    csvLines.push(row.map(escapeCsv).join(','));
  }
  return csvLines.join('\r\n');
}

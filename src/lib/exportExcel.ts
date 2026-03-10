/**
 * Export data to CSV (Excel-compatible) with UTF-8 BOM for Arabic support
 */
export function exportToExcel(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  filename: string
) {
  const BOM = '\uFEFF';
  const escape = (val: string | number | null | undefined) => {
    if (val == null) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csvContent = BOM + [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

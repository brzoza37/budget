import type { Transaction } from '../types/api';

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCsv(transactions: Transaction[]): void {
  const header = ['Date', 'Type', 'Amount', 'Currency', 'Category', 'Account', 'Note'];

  const rows = transactions.map((tx) => [
    tx.date ? new Date(tx.date).toISOString().slice(0, 10) : '',
    tx.type ?? '',
    tx.amount != null ? String(tx.amount) : '',
    tx.account?.currency ?? '',
    tx.category?.name ?? '',
    tx.account?.name ?? '',
    tx.note ?? '',
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\r\n');

  const BOM = '﻿';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

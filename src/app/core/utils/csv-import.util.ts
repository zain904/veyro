import { TransactionType } from '../models/transaction.model';

export interface CsvImportRow {
  rowNumber: number;
  transaction_date: string;
  type: TransactionType;
  categoryName: string;
  amount: number;
  description: string;
  accountName: string;
}

export interface CsvParseResult {
  rows: CsvImportRow[];
  errors: string[];
  skipped: number;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeType(raw: string): TransactionType | null {
  const v = raw.trim().toLowerCase();
  if (v === 'income') return 'income';
  if (v === 'expense') return 'expense';
  if (v === 'transfer') return 'transfer';
  return null;
}

function normalizeDate(raw: string): string | null {
  const v = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function parseTransactionCsv(content: string): CsvParseResult {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const errors: string[] = [];
  const rows: CsvImportRow[] = [];
  let skipped = 0;

  if (lines.length === 0) {
    return { rows, errors: ['File is empty.'], skipped: 0 };
  }

  const headerCells = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/"/g, ''));
  const dateIdx = headerCells.findIndex(h => h === 'date' || h === 'transaction_date');
  const typeIdx = headerCells.findIndex(h => h === 'type');
  const categoryIdx = headerCells.findIndex(h => h === 'category');
  const amountIdx = headerCells.findIndex(h => h === 'amount');
  const descIdx = headerCells.findIndex(h => h === 'description' || h === 'desc');
  const accountIdx = headerCells.findIndex(h => h === 'account');

  if ([dateIdx, typeIdx, amountIdx].some(i => i < 0)) {
    return {
      rows: [],
      errors: ['CSV must include Date, Type, and Amount columns (Category and Description optional).'],
      skipped: 0,
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const rowNumber = i + 1;

    const dateRaw = cells[dateIdx] ?? '';
    const typeRaw = cells[typeIdx] ?? '';
    const amountRaw = cells[amountIdx] ?? '';
    const categoryName = (categoryIdx >= 0 ? cells[categoryIdx] : '')?.replace(/^"|"$/g, '') ?? '';
    const description = (descIdx >= 0 ? cells[descIdx] : '')?.replace(/^"|"$/g, '') ?? '';
    const accountName = (accountIdx >= 0 ? cells[accountIdx] : '')?.replace(/^"|"$/g, '') ?? '';

    const transaction_date = normalizeDate(dateRaw);
    const type = normalizeType(typeRaw);
    const amount = Number(amountRaw.replace(/,/g, ''));

    if (!transaction_date || !type || !Number.isFinite(amount) || amount <= 0) {
      skipped++;
      errors.push(`Row ${rowNumber}: invalid date, type, or amount.`);
      continue;
    }

    if (type === 'transfer') {
      skipped++;
      errors.push(`Row ${rowNumber}: transfers cannot be imported via CSV yet.`);
      continue;
    }

    rows.push({
      rowNumber,
      transaction_date,
      type,
      categoryName: categoryName.trim(),
      amount,
      description: description.trim(),
      accountName: accountName.trim(),
    });
  }

  return { rows, errors, skipped };
}

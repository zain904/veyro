import { parseTransactionCsv } from './csv-import.util';

describe('parseTransactionCsv', () => {
  it('parses valid export-style rows', () => {
    const csv = [
      'Date,Type,Category,Amount,Description,Account',
      '2026-01-10,expense,Food,500,Lunch,Main',
      '2026-01-15,income,Salary,120000,January salary,Main',
    ].join('\n');

    const result = parseTransactionCsv(csv);
    expect(result.rows.length).toBe(2);
    expect(result.rows[0].type).toBe('expense');
    expect(result.rows[0].amount).toBe(500);
    expect(result.rows[1].categoryName).toBe('Salary');
  });

  it('rejects missing required columns', () => {
    const result = parseTransactionCsv('Foo,Bar\n1,2');
    expect(result.rows.length).toBe(0);
    expect(result.errors[0]).toContain('Date, Type, and Amount');
  });

  it('skips invalid rows', () => {
    const csv = [
      'Date,Type,Category,Amount,Description',
      'bad-date,expense,Food,10,',
      '2026-01-01,expense,Food,-5,',
    ].join('\n');

    const result = parseTransactionCsv(csv);
    expect(result.rows.length).toBe(0);
    expect(result.skipped).toBe(2);
  });
});

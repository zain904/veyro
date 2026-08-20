export interface PkBankPreset {
  code: string;
  name: string;
  color: string;
}

/** Common Pakistani banks — user can also enter a custom name. */
export const PK_BANK_PRESETS: PkBankPreset[] = [
  { code: 'custom', name: 'Custom', color: '#64748b' },
  { code: 'hbl', name: 'HBL — Habib Bank', color: '#00843D' },
  { code: 'ubl', name: 'UBL — United Bank', color: '#0057A8' },
  { code: 'mcb', name: 'MCB Bank', color: '#003DA5' },
  { code: 'abl', name: 'Allied Bank', color: '#C8102E' },
  { code: 'alfalah', name: 'Bank Alfalah', color: '#E31837' },
  { code: 'meezan', name: 'Meezan Bank', color: '#006B3F' },
  { code: 'faysal', name: 'Faysal Bank', color: '#0072BC' },
  { code: 'askari', name: 'Askari Bank', color: '#004B87' },
  { code: 'bop', name: 'Bank of Punjab', color: '#1E4D8C' },
  { code: 'habibmetro', name: 'Habib Metro Bank', color: '#8B0000' },
  { code: 'js', name: 'JS Bank', color: '#002855' },
  { code: 'nbp', name: 'NBP — National Bank', color: '#0054A6' },
  { code: 'silkbank', name: 'Silk Bank', color: '#6B2D5B' },
  { code: 'summit', name: 'Summit Bank', color: '#003B71' },
  { code: 'scb', name: 'Standard Chartered', color: '#007A53' },
  { code: 'bankislami', name: 'BankIslami', color: '#006633' },
  { code: 'dubaiislamic', name: 'Dubai Islamic Bank PK', color: '#8B4513' },
  { code: 'easypaisa', name: 'Easypaisa', color: '#00A651' },
  { code: 'jazzcash', name: 'JazzCash', color: '#EE2E24' },
  { code: 'general', name: 'General / Other', color: '#6366f1' },
];

export const ACCOUNT_COLORS = [
  '#6366f1', '#00843D', '#0057A8', '#003DA5', '#C8102E',
  '#E31837', '#006B3F', '#0072BC', '#004B87', '#EE2E24',
  '#00A651', '#64748b', '#8b5cf6', '#f97316', '#14b8a6',
];

export function findBankPreset(bankName: string | null | undefined): PkBankPreset | undefined {
  if (!bankName) return undefined;
  const lower = bankName.toLowerCase();
  return PK_BANK_PRESETS.find(b =>
    b.name.toLowerCase() === lower || b.code === lower
  );
}

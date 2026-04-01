/**
 * Shared category definitions matching code.gs ENUMS exactly.
 *
 * KATEGORIPEMASUKAN : IURANBULANAN, IURANINSIDENTAL, DONASI, DENDA, SALDOAWAL, LAINLAIN
 * KATEGORIPENGELUARAN: OPERASIONALRUTIN, ADMINISTRASI, INFRASTRUKTURLINGKUNGAN, SOSIALKEMANUSIAAN, KEGIATANWARGA, LAINLAIN
 */

/* ── Category ID values (match code.gs ENUMS exactly) ── */
export const INCOME_CATEGORIES = [
  { id: 'IURANBULANAN', label: 'Iuran Bulanan' },
  { id: 'IURANINSIDENTAL', label: 'Iuran Insidental' },
  { id: 'DONASI', label: 'Donasi' },
  { id: 'DENDA', label: 'Denda' },
  { id: 'SALDOAWAL', label: 'Saldo Awal' },
  { id: 'LAINLAIN_IN', label: 'Lain-lain' },
] as const;

export const EXPENSE_CATEGORIES = [
  { id: 'KEBERSIHAN', label: 'Kebersihan' },
  { id: 'KEAMANAN', label: 'Keamanan' },
  { id: 'OPERASIONALRUTIN', label: 'Operasional Rutin' },
  { id: 'ADMINISTRASI', label: 'Administrasi' },
  { id: 'INFRASTRUKTURLINGKUNGAN', label: 'Infrastruktur Lingkungan' },
  { id: 'SOSIALKEMANUSIAAN', label: 'Sosial Kemanusiaan' },
  { id: 'KEGIATANWARGA', label: 'Kegiatan Warga' },
  { id: 'LAINLAIN_OUT', label: 'Lain-lain' },
] as const;

/* ── Reverse lookup: categoryId → display label ── */
const LABEL_MAP: Record<string, string> = {};

for (const c of INCOME_CATEGORIES) LABEL_MAP[c.id] = c.label;
for (const c of EXPENSE_CATEGORIES) LABEL_MAP[c.id] = c.label;

// Legacy CAT-* aliases for backward compatibility
const LEGACY_MAP: Record<string, string> = {
  'CAT-IB': 'Iuran Bulanan',
  'CAT-II': 'Iuran Insidental',
  'CAT-DON': 'Donasi',
  'CAT-DND': 'Denda',
  'CAT-SA': 'Saldo Awal',
  'CAT-LIN': 'Lain-lain',
  'CAT-KBR': 'Kebersihan',
  'CAT-KMN': 'Keamanan',
  'CAT-OR': 'Operasional Rutin',
  'CAT-ADM': 'Administrasi',
  'CAT-INF': 'Infrastruktur Lingkungan',
  'CAT-SOS': 'Sosial Kemanusiaan',
  'CAT-KGT': 'Kegiatan Warga',
  'CAT-LEX': 'Lain-lain',
};

/**
 * Get human-readable label for a categoryId.
 * Supports both code.gs format (IURANBULANAN) and legacy CAT-* format.
 */
export function getCategoryLabel(catId: string): string {
  if (!catId) return 'Lainnya';
  return LABEL_MAP[catId] || LEGACY_MAP[catId] || catId;
}

/**
 * Get list of categories for a given transaction type (for dropdowns).
 */
export function getCategoriesByType(type: 'income' | 'expense') {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCached, setCache, cacheKey } from '@/lib/cache';

/**
 * Combined endpoint for Laporan Keuangan page.
 * Returns: dashboard stats + transactions + saldo_awal in a single DB round-trip.
 * Replaces separate calls to /api/dashboard and /api/transactions.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '';
    const cacheKeyVal = cacheKey('laporan-data', { startDate });

    const cached = getCached<unknown>(cacheKeyVal);
    if (cached) return NextResponse.json(cached);

    // Calculate date range for filtered transactions (last 13 months)
    const minDate = startDate || (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 13);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    })();

    // Single query: fetch all approved transactions within date range
    const transactions = await db.$queryRawUnsafe(
      `SELECT id, type, "categoryId", nominal, tanggal, status, deskripsi
       FROM "Transaction" 
       WHERE status = 'approved' AND tanggal >= ?
       ORDER BY tanggal ASC`,
      minDate
    ) as Record<string, unknown>[];

    // Compute aggregates in JS (already filtered to 13 months max)
    let totalIncome = 0;
    let totalExpense = 0;
    const monthlyData: Record<string, { income: number; expense: number }> = {};
    const categoryMap: Record<string, number> = {};

    const CATEGORY_NAMES: Record<string, string> = {
      'KEBERSIHAN': 'Kebersihan', 'CAT-KBR': 'Kebersihan',
      'KEAMANAN': 'Keamanan', 'CAT-KMN': 'Keamanan',
      'OPERASIONALRUTIN': 'Operasional Rutin', 'CAT-OR': 'Operasional Rutin',
      'ADMINISTRASI': 'Administrasi', 'CAT-ADM': 'Administrasi',
      'INFRASTRUKTURLINGKUNGAN': 'Infrastruktur Lingkungan', 'CAT-INF': 'Infrastruktur Lingkungan',
      'SOSIALKEMANUSIAAN': 'Sosial Kemanusiaan', 'CAT-SOS': 'Sosial Kemanusiaan',
      'KEGIATANWARGA': 'Kegiatan Warga', 'CAT-KGT': 'Kegiatan Warga',
      'LAINLAIN_OUT': 'Lain-lain', 'CAT-LEX': 'Lain-lain',
    };

    for (const t of transactions) {
      const nominal = Number(t.nominal) || 0;
      const type = String(t.type);
      const month = String(t.tanggal).substring(0, 7);
      if (type === 'income') totalIncome += nominal;
      else totalExpense += nominal;

      if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
      if (type === 'income') monthlyData[month].income += nominal;
      else monthlyData[month].expense += nominal;

      if (type === 'expense') {
        const name = CATEGORY_NAMES[String(t.categoryId)] || 'Lainnya';
        categoryMap[name] = (categoryMap[name] || 0) + nominal;
      }
    }

    const chartData = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, income: data.income, expense: data.expense, balance: data.income - data.expense }));

    const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

    // Get saldo_awal setting
    let initialSaldoAwal = 0;
    try {
      const saldoRow = await db.$queryRawUnsafe(
        `SELECT value FROM "Setting" WHERE key = 'saldo_awal'`
      ) as { value: string }[];
      if (saldoRow.length > 0) initialSaldoAwal = parseInt(saldoRow[0].value) || 0;
    } catch { /* ignore */ }

    const balance = initialSaldoAwal + totalIncome - totalExpense;

    const result = {
      success: true,
      data: {
        // Dashboard fields
        totalIncome,
        totalExpense,
        balance,
        chartData,
        categoryData,
        totalTransactions: transactions.length,
        // Raw transactions for filtering/charting
        transactions,
        // Saldo awal seed
        saldoAwal: initialSaldoAwal,
      },
    };

    setCache(cacheKeyVal, result, 15_000); // cache 15 seconds
    return NextResponse.json(result);
  } catch (error) {
    console.error('Laporan data fetch error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch laporan data' }, { status: 500 });
  }
}

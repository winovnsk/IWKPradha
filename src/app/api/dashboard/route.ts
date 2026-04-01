import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCached, setCache, cacheKey } from '@/lib/cache';

export async function GET() {
  try {
    const key = cacheKey('dashboard');
    const cached = getCached<{ success: boolean; data: unknown }>(key);
    if (cached) return NextResponse.json(cached);

    // Query 1: All aggregated financial data in ONE query
    const financialRows = await db.$queryRawUnsafe(
      `SELECT 
        type,
        SUBSTRING(tanggal, 1, 7) as month,
        SUM(nominal) as total,
        CASE WHEN type = 'expense' THEN "categoryId" ELSE NULL END as category_id
      FROM "Transaction" 
      WHERE status = 'approved'
      GROUP BY type, SUBSTRING(tanggal, 1, 7), CASE WHEN type = 'expense' THEN "categoryId" ELSE NULL END`
    ) as { type: string; month: string; total: number; category_id: string | null }[];

    // Aggregate in JS (from aggregated SQL rows — much smaller dataset)
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

    let totalTx = 0;
    for (const row of financialRows) {
      totalTx++;
      const total = Number(row.total) || 0;
      if (row.type === 'income') {
        totalIncome += total;
      } else {
        totalExpense += total;
        if (row.category_id) {
          const name = CATEGORY_NAMES[row.category_id] || 'Lainnya';
          categoryMap[name] = (categoryMap[name] || 0) + total;
        }
      }
      if (!monthlyData[row.month]) monthlyData[row.month] = { income: 0, expense: 0 };
      if (row.type === 'income') monthlyData[row.month].income += total;
      else monthlyData[row.month].expense += total;
    }

    const chartData = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, income: data.income, expense: data.expense, balance: data.income - data.expense }));

    const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

    // Query 2: saldo_awal + user_count in one query using UNION
    const miscRows = await db.$queryRawUnsafe(
      `SELECT 'saldo_awal' as key, value FROM "Setting" WHERE key = 'saldo_awal'
       UNION ALL
       SELECT 'user_count', CAST(COUNT(*) AS TEXT) FROM "User" WHERE status = 'approved'`
    ) as { key: string; value: string }[];

    let initialSaldoAwal = 0;
    let userCount = 0;
    for (const row of miscRows) {
      if (row.key === 'saldo_awal') initialSaldoAwal = parseInt(row.value) || 0;
      if (row.key === 'user_count') userCount = parseInt(row.value) || 0;
    }

    const balance = initialSaldoAwal + totalIncome - totalExpense;
    const result = {
      success: true,
      data: {
        totalIncome,
        totalExpense,
        balance,
        chartData,
        categoryData,
        userCount,
        totalTransactions: totalTx,
      },
    };

    setCache(key, result, 15_000); // cache 15 seconds
    return NextResponse.json(result);
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch dashboard' }, { status: 500 });
  }
}

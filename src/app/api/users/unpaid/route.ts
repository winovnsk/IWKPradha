import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';

    // Build conditions for unpaid query
    const conditions: string[] = [
      `status IN ('pending', 'approved')`,
      `type = 'income'`,
      `"deskripsi" LIKE '%Pembayaran Iuran%'`,
    ];
    const params: unknown[] = [];

    if (userId && userId.trim() !== '') {
      conditions.push(`"userId" = $1`);
      params.push(userId.trim());
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const transactions = await db.$queryRawUnsafe(
      `SELECT * FROM "Transaction" ${whereClause} ORDER BY "tanggal" DESC`,
      ...params
    ) as Record<string, string>[];

    // Buat set bulan yang sudah dibayar
    const paidMonths = new Set(
      transactions.map((t) => t.tanggal.substring(0, 7))
    );

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const unpaidMonths = [];
    for (let m = 1; m <= currentMonth; m++) {
      const key = `${currentYear}-${String(m).padStart(2, '0')}`;
      if (!paidMonths.has(key)) {
        unpaidMonths.push({ month: key, label: formatMonth(m, currentYear), nominal: 100000 });
      }
    }

    return NextResponse.json({ success: true, data: unpaidMonths });
  } catch (error) {
    console.error('[UNPAID ERROR] Unpaid months fetch error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch unpaid months' }, { status: 500 });
  }
}

function formatMonth(m: number, y: number): string {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${months[m - 1]} ${y}`;
}

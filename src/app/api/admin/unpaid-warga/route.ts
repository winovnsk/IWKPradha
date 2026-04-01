import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/admin/unpaid-warga
 * Returns list of warga with unpaid months, sorted by house number.
 * Also returns payment percentage stats for the current month.
 */
export async function GET() {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // All months this year up to now
    const allMonths: string[] = [];
    for (let m = 1; m <= currentMonth; m++) {
      allMonths.push(`${currentYear}-${String(m).padStart(2, '0')}`);
    }

    const MONTH_NAMES: Record<string, string> = {
      '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
      '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
      '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember',
    };

    // 1. Get all approved warga
    const users = await db.$queryRawUnsafe(
      `SELECT id, nama, alamat, noHp, email, foto, status FROM "User" WHERE role = 'warga' AND status = 'approved'`
    ) as Record<string, string>[];

    // 2. Get all iuran transactions (pending or approved) for this year
    const transactions = await db.$queryRawUnsafe(
      `SELECT "userId", tanggal, status FROM "Transaction"
       WHERE status IN ('pending', 'approved')
       AND type = 'income'
       AND "deskripsi" LIKE '%Pembayaran Iuran%'
       AND SUBSTRING(tanggal, 1, 4) = $1
       ORDER BY "userId", tanggal`,
      String(currentYear)
    ) as Record<string, string>[];

    // 3. Build a map: userId → Set of paid month keys
    const userPaidMap = new Map<string, Set<string>>();
    for (const tx of transactions) {
      const uid = tx.userId || '';
      const monthKey = (tx.tanggal || '').substring(0, 7);
      if (!monthKey) continue;
      if (!userPaidMap.has(uid)) userPaidMap.set(uid, new Set());
      userPaidMap.get(uid)!.add(monthKey);
    }

    // 4. For each user, compute unpaid months and stats
    const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    interface WargaUnpaid {
      userId: string;
      nama: string;
      alamat: string;
      noHp: string;
      foto: string;
      nomorRumah: number;
      unpaidMonths: { month: string; label: string }[];
      unpaidCount: number;
      paidCurrentMonth: boolean;
    }

    const wargaList: WargaUnpaid[] = users.map((u) => {
      const paidMonths = userPaidMap.get(u.id) || new Set();
      const unpaid = allMonths.filter((m) => !paidMonths.has(m));

      return {
        userId: u.id,
        nama: u.nama,
        alamat: u.alamat,
        noHp: u.noHp,
        foto: u.foto || '',
        nomorRumah: extractHouseNumber(u.alamat),
        unpaidMonths: unpaid.map((m) => ({
          month: m,
          label: `${MONTH_NAMES[m.substring(5, 7)] || m} ${currentYear}`,
        })),
        unpaidCount: unpaid.length,
        paidCurrentMonth: paidMonths.has(currentMonthKey),
      };
    });

    // 5. Sort by house number ascending
    wargaList.sort((a, b) => a.nomorRumah - b.nomorRumah);

    // 6. Calculate stats
    const totalWarga = wargaList.length;
    const paidThisMonth = wargaList.filter((w) => w.paidCurrentMonth).length;
    const unpaidThisMonth = totalWarga - paidThisMonth;
    const fullyPaid = wargaList.filter((w) => w.unpaidCount === 0).length;
    const hasUnpaid = wargaList.filter((w) => w.unpaidCount > 0).length;

    const paidPercent = totalWarga > 0 ? Math.round((paidThisMonth / totalWarga) * 100) : 0;
    const unpaidPercent = totalWarga > 0 ? Math.round((unpaidThisMonth / totalWarga) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        wargaList,
        stats: {
          totalWarga,
          paidThisMonth,
          unpaidThisMonth,
          paidPercent,
          unpaidPercent,
          fullyPaid,
          hasUnpaid,
          currentMonthLabel: `${MONTH_NAMES[String(currentMonth).padStart(2, '0')]} ${currentYear}`,
        },
      },
    });
  } catch (error) {
    console.error('[UNPAID WARGA ERROR]', error);
    return NextResponse.json({ success: false, message: 'Gagal memuat data' }, { status: 500 });
  }
}

/**
 * Extract the first number found in the address string for sorting.
 * E.g., "Blok A No. 12" → 12, "No 5 Komplek Pradha" → 5
 * Falls back to 9999 if no number found (sorts last).
 */
function extractHouseNumber(alamat: string): number {
  if (!alamat) return 9999;
  const match = alamat.match(/\d+/);
  return match ? parseInt(match[0], 10) : 9999;
}

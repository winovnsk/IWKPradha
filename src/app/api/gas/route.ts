import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const GAS_URL = process.env.GAS_URL || '';

async function handleLocal(action: string, params: Record<string, unknown>) {
  switch (action) {
    case 'getUsers': {
      const { status, role, search } = params;
      const where: Record<string, unknown> = {};
      if (status && status !== 'all') where.status = status;
      if (role) where.role = role;
      if (search) where.OR = [{ nama: { contains: String(search) } }, { email: { contains: String(search) } }, { alamat: { contains: String(search) } }];
      const users = await db.user.findMany({ where, orderBy: { createdAt: 'desc' } });
      return { success: true, data: users };
    }
    case 'approveUser': {
      await db.user.update({ where: { id: String(params.userid) }, data: { status: 'approved' } });
      return { success: true, message: 'User berhasil disetujui' };
    }
    case 'rejectUser': {
      await db.user.update({ where: { id: String(params.userid) }, data: { status: 'rejected' } });
      return { success: true, message: `User ditolak: ${params.reason || ''}` };
    }
    case 'deleteUser': {
      await db.user.update({ where: { id: String(params.userid) }, data: { status: 'deleted' } });
      return { success: true, message: 'User berhasil dihapus' };
    }
    case 'createTransaction': {
      const tx = await db.transaction.create({
        data: { type: String(params.type || 'income'), categoryId: String(params.categoryId || ''), nominal: Number(params.nominal) || 0, tanggal: String(params.tanggal || new Date().toISOString().split('T')[0]), status: String(params.status || 'approved'), deskripsi: String(params.deskripsi || '') },
      });
      return { success: true, data: tx, message: 'Transaksi berhasil dibuat' };
    }
    case 'validateTransaction': {
      const tx = await db.transaction.update({ where: { id: String(params.transactionid) }, data: { status: String(params.status || 'approved') } });
      return { success: true, data: tx, message: `Transaksi ${params.status}` };
    }
    case 'deleteTransaction': {
      await db.transaction.delete({ where: { id: String(params.transactionid) } });
      return { success: true, message: 'Transaksi berhasil dihapus' };
    }
    case 'createEvent': {
      const ev = await db.event.create({ data: { title: String(params.title || ''), description: String(params.description || ''), tanggalMulai: String(params.tanggalMulai || ''), tanggalSelesai: String(params.tanggalSelesai || ''), lokasi: String(params.lokasi || '') } });
      return { success: true, data: ev, message: 'Kegiatan berhasil dibuat' };
    }
    case 'deleteEvent': {
      await db.event.delete({ where: { id: String(params.eventid) } });
      return { success: true, message: 'Kegiatan berhasil dihapus' };
    }
    case 'createAnnouncement': {
      const ann = await db.announcement.create({ data: { title: String(params.title || ''), content: String(params.content || ''), tanggal: String(params.tanggal || new Date().toISOString().split('T')[0]) } });
      return { success: true, data: ann, message: 'Pengumuman berhasil dibuat' };
    }
    case 'deleteAnnouncement': {
      await db.announcement.delete({ where: { id: String(params.announcementid) } });
      return { success: true, message: 'Pengumuman berhasil dihapus' };
    }
    case 'updateSetting': {
      const key = String(params.key);
      const value = String(params.value);
      // Use raw query to avoid Prisma client cache issues
      // First try update, then insert if no rows affected
      const result = await db.$queryRawUnsafe(
        `UPDATE "Setting" SET "value" = $1, "updatedAt" = NOW() WHERE "key" = $2`,
        value, key
      );
      // @ts-expect-error PostgreSQL returns affected rows
      if (!result || result.affectedRows === 0 || (Array.isArray(result) && result.length === 0)) {
        // Check if row exists
        const existing = await db.$queryRawUnsafe(
          `SELECT id FROM "Setting" WHERE "key" = $1 LIMIT 1`,
          key
        ) as Record<string, unknown>[];
        if (existing.length === 0) {
          await db.$queryRawUnsafe(
            `INSERT INTO "Setting" ("id", "key", "value", "description", "updatedAt") VALUES (gen_random_uuid(), $1, $2, '', NOW())`,
            key, value
          );
        }
      }
      return { success: true, message: 'Pengaturan berhasil diperbarui' };
    }
    case 'submitPayment': {
      // Support single month (string) or multiple months (array)
      let bulanList: string[] = [];
      if (Array.isArray(params.bulanIuran)) {
        bulanList = params.bulanIuran.map(String);
      } else if (params.bulanIuran) {
        bulanList = [String(params.bulanIuran)];
      }

      if (bulanList.length === 0) {
        return { success: false, message: 'Pilih minimal 1 bulan iuran' };
      }

      const userId = String(params.userId || '');
      const nominal = Number(params.nominal) || 100000;
      const metode = String(params.metodePembayaran || 'transfer');
      const monthNames: Record<string, string> = {
        '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
        '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
        '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember',
      };

      const transactions = [];
      for (const bulan of bulanList) {
        // Extract month name from "YYYY-MM" format
        const monthKey = bulan.substring(5, 7);
        const monthLabel = monthNames[monthKey] || bulan;

        // Use the selected month as tanggal so unpaid check works correctly
        // tanggal = "YYYY-MM-01" so substring(0,7) = "YYYY-MM" matches
        const tanggal = `${bulan}-01`;

        const deskripsi = `Pembayaran Iuran ${monthLabel} ${bulan.substring(0, 4)} - ${metode}`;

        await db.$queryRawUnsafe(
          `INSERT INTO "Transaction" ("id", "type", "categoryId", "nominal", "tanggal", "status", "deskripsi", "userId", "createdAt")
           VALUES (gen_random_uuid(), 'income', 'CAT-IB', $1, $2, 'pending', $3, $4, NOW())`,
          nominal, tanggal, deskripsi, userId
        );

        transactions.push({ bulan, monthLabel, tanggal, nominal, deskripsi });
      }

      return {
        success: true,
        data: { count: transactions.length, transactions },
        message: `${transactions.length} pembayaran berhasil dikirim, menunggu validasi admin`,
      };
    }
    default:
      return { success: false, message: `Action tidak dikenali: ${action}` };
  }
}

async function proxyToGas(action: string, method: string, params: Record<string, unknown>, token: string) {
  try {
    if (method === 'POST') {
      const res = await fetch(GAS_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token, ...params }) });
      const text = await res.text();
      try { return JSON.parse(text); } catch { return { success: false, message: text }; }
    }
    const qs = new URLSearchParams({ action, token, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
    const res = await fetch(`${GAS_URL}?${qs}`, { redirect: 'follow' });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { success: false, message: text }; }
  } catch (err) { return { success: false, message: `GAS error: ${err instanceof Error ? err.message : 'Unknown'}` }; }
}

export async function POST(request: NextRequest) {
  try {
    const { action, method = 'POST', params = {}, token = '' } = await request.json();
    if (!action) return NextResponse.json({ success: false, message: 'Action diperlukan' }, { status: 400 });
    if (GAS_URL) return NextResponse.json(await proxyToGas(action, method, params, token));
    return NextResponse.json(await handleLocal(action, params));
  } catch (err) { return NextResponse.json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 }); }
}

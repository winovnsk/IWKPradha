import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const userId = searchParams.get('userId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const limit = Number.parseInt(searchParams.get('limit') || '50', 10);

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (type) {
      params.push(type);
      conditions.push(`type = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (userId) {
      params.push(userId);
      conditions.push(`"userId" = $${params.length}`);
    }

    if (startDate) {
      params.push(startDate);
      conditions.push(`tanggal >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      conditions.push(`tanggal <= $${params.length}`);
    }

    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 50;
    params.push(safeLimit);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const transactions = await db.$queryRawUnsafe(
      `SELECT id, "userId", type, "categoryId", nominal, tanggal, status, deskripsi, "createdAt"
       FROM "Transaction"
       ${whereClause}
       ORDER BY tanggal DESC, "createdAt" DESC
       LIMIT $${params.length}`,
      ...params
    );

    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch transactions' }, { status: 500 });
  }
}

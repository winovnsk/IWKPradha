import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, nama, alamat, noHp, email, foto } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID diperlukan' }, { status: 400 });
    }

    // Check if user exists
    const users = await db.$queryRawUnsafe(
      `SELECT id FROM "User" WHERE id = $1 LIMIT 1`,
      userId
    ) as Record<string, unknown>[];

    if (users.length === 0) {
      return NextResponse.json({ success: false, message: 'User tidak ditemukan' }, { status: 404 });
    }

    // Build update SET clause
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 0;

    if (nama !== undefined) { paramIdx++; setClauses.push(`"nama" = $${paramIdx}`); params.push(nama); }
    if (alamat !== undefined) { paramIdx++; setClauses.push(`"alamat" = $${paramIdx}`); params.push(alamat); }
    if (noHp !== undefined) { paramIdx++; setClauses.push(`"noHp" = $${paramIdx}`); params.push(noHp); }
    if (email !== undefined) { paramIdx++; setClauses.push(`"email" = $${paramIdx}`); params.push(email); }
    if (foto !== undefined) { paramIdx++; setClauses.push(`"foto" = $${paramIdx}`); params.push(foto); }

    if (setClauses.length === 0) {
      return NextResponse.json({ success: false, message: 'Tidak ada data untuk diperbarui' }, { status: 400 });
    }

    // Add updatedAt
    setClauses.push(`"updatedAt" = NOW()`);
    paramIdx++;
    params.push(userId);

    await db.$queryRawUnsafe(
      `UPDATE "User" SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
      ...params
    );

    // Fetch updated user
    const updated = await db.$queryRawUnsafe(
      `SELECT * FROM "User" WHERE id = $1 LIMIT 1`,
      userId
    ) as Record<string, unknown>[];

    const userData = updated[0] ? {
      id: updated[0].id,
      nama: updated[0].nama,
      alamat: updated[0].alamat || '',
      noHp: updated[0].noHp || '',
      email: updated[0].email,
      role: updated[0].role,
      status: updated[0].status,
      foto: updated[0].foto || '',
    } : null;

    return NextResponse.json({ success: true, data: userData });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ success: false, message: 'Gagal memperbarui profil' }, { status: 500 });
  }
}

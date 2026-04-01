import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

type LoginUserRow = {
  id: string;
  nama: string;
  alamat: string | null;
  noHp: string | null;
  email: string;
  password: string | null;
  role: string;
  status: string;
  foto: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { identifier?: string; password?: string };
    const { identifier, password } = body;

    if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier || !password) {
      return NextResponse.json({ success: false, message: 'Email dan password harus diisi' }, { status: 400 });
    }

    // Use raw query to ensure all fields including foto are returned
    const identifierLower = identifier.toLowerCase().trim();
    const identifierClean = identifier.replace(/[\s-]/g, '');

    const users = await db.$queryRawUnsafe(
      `SELECT * FROM "User" WHERE (LOWER("email") = $1 OR REPLACE(REPLACE("noHp", ' ', ''), '-', '') = $2) LIMIT 1`,
      identifierLower,
      identifierClean
    ) as LoginUserRow[];

    const user = users[0];

    if (!user) {
      return NextResponse.json({ success: false, message: 'Akun tidak ditemukan' }, { status: 401 });
    }

    if (user.status === 'pending') {
      return NextResponse.json({ success: false, message: 'Akun Anda masih menunggu persetujuan admin' }, { status: 403 });
    }

    if (user.status === 'rejected') {
      return NextResponse.json({ success: false, message: 'Akun Anda telah ditolak. Hubungi admin.' }, { status: 403 });
    }

    if (user.status !== 'approved') {
      return NextResponse.json({ success: false, message: 'Akun tidak aktif' }, { status: 403 });
    }

    if (!user.password || user.password === '') {
      return NextResponse.json({ success: false, message: 'Akun belum memiliki password. Hubungi admin.' }, { status: 401 });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ success: false, message: 'Password salah' }, { status: 401 });
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Serialize user data
    const userData = {
      id: user.id,
      nama: user.nama,
      alamat: user.alamat || '',
      noHp: user.noHp || '',
      email: user.email,
      role: user.role,
      status: user.status,
      foto: user.foto || '',
    };

    return NextResponse.json({
      success: true,
      message: 'Login berhasil',
      data: {
        user: userData,
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

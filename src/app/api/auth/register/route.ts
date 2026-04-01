import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nama, alamat, noHp, email, password } = body;

    // Validation
    if (!nama || nama.trim().length < 3) {
      return NextResponse.json({ success: false, message: 'Nama minimal 3 karakter' }, { status: 400 });
    }

    const cleanAlamat = alamat ? alamat.trim() : '';
    if (cleanAlamat.length < 1) {
      return NextResponse.json({ success: false, message: 'Alamat harus diisi' }, { status: 400 });
    }

    if (!noHp || noHp.replace(/[^0-9]/g, '').length < 10) {
      return NextResponse.json({ success: false, message: 'Format nomor HP tidak valid' }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, message: 'Format email tidak valid' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, message: 'Password minimal 6 karakter' }, { status: 400 });
    }

    // Check duplicate
    const existingEmail = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existingEmail) {
      return NextResponse.json({ success: false, message: 'Email sudah terdaftar' }, { status: 409 });
    }

    const cleanPhone = noHp.replace(/[\s-]/g, '');

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user (auto-approve for demo, set to pending in production)
    const newUser = await db.user.create({
      data: {
        nama: nama.trim(),
        alamat: cleanAlamat.startsWith('Blok') ? cleanAlamat : `Blok B ${cleanAlamat}`,
        noHp: cleanPhone,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'warga',
        status: 'approved', // auto-approve for demo
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Registrasi berhasil! Akun Anda telah aktif. Silakan login.',
      data: { id: newUser.id },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

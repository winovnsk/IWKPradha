import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const SETUP_SECRET = process.env.SETUP_DB_SECRET || 'iwk-setup-2025';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== SETUP_SECRET) {
      return NextResponse.json({ error: 'Unauthorized. Secret required.' }, { status: 401 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'DATABASE_URL not configured.' }, { status: 500 });
    }

    const prisma = new PrismaClient();
    const results: string[] = [];

    // 1. Create tables
    try {
      results.push('🔄 Creating tables...');

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Setting" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "key" TEXT NOT NULL UNIQUE,
          "value" TEXT NOT NULL DEFAULT '',
          "description" TEXT NOT NULL DEFAULT '',
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      results.push('✅ Table "Setting"');

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Announcement" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "title" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "tanggal" TEXT NOT NULL,
          "images" TEXT NOT NULL DEFAULT '',
          "attachments" TEXT NOT NULL DEFAULT '',
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      results.push('✅ Table "Announcement"');

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Event" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "title" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "tanggalMulai" TEXT NOT NULL,
          "tanggalSelesai" TEXT NOT NULL,
          "lokasi" TEXT NOT NULL DEFAULT '',
          "fotoUrl" TEXT NOT NULL DEFAULT '',
          "images" TEXT NOT NULL DEFAULT '',
          "attachments" TEXT NOT NULL DEFAULT '',
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      results.push('✅ Table "Event"');

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Transaction" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL DEFAULT '',
          "type" TEXT NOT NULL,
          "categoryId" TEXT NOT NULL DEFAULT '',
          "nominal" INTEGER NOT NULL,
          "tanggal" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'approved',
          "deskripsi" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      results.push('✅ Table "Transaction"');

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "nama" TEXT NOT NULL,
          "alamat" TEXT NOT NULL DEFAULT '',
          "noHp" TEXT NOT NULL DEFAULT '',
          "email" TEXT NOT NULL,
          "password" TEXT NOT NULL DEFAULT '',
          "role" TEXT NOT NULL DEFAULT 'warga',
          "status" TEXT NOT NULL DEFAULT 'approved',
          "foto" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      results.push('✅ Table "User"');

      // Unique indexes
      try { await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`); } catch { /* ok */ }
      try { await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Setting_key_key" ON "Setting"("key")`); } catch { /* ok */ }
    } catch (err) {
      results.push(`❌ Table error: ${err instanceof Error ? err.message : String(err)}`);
      await prisma.$disconnect();
      return NextResponse.json({ results });
    }

    // 2. Seed admin
    try {
      const existing = await prisma.$queryRawUnsafe(
        `SELECT id FROM "User" WHERE email = $1 LIMIT 1`, 'admin@rt11.id'
      ) as { id: string }[];

      if (existing.length === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await prisma.$executeRawUnsafe(
          `INSERT INTO "User" ("id", "nama", "email", "password", "noHp", "alamat", "role", "status", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          'Ketua RT 11', 'admin@rt11.id', hashedPassword, '081234567890', 'Blok A No. 1', 'admin', 'approved'
        );
        results.push('✅ Admin created: admin@rt11.id / admin123');
      } else {
        const old = await prisma.$queryRawUnsafe(
          `SELECT password FROM "User" WHERE email = $1 LIMIT 1`, 'admin@rt11.id'
        ) as { password: string }[];
        if (old.length > 0 && (!old[0].password || old[0].password === '')) {
          const hashedPassword = await bcrypt.hash('admin123', 10);
          await prisma.$executeRawUnsafe(
            `UPDATE "User" SET "password" = $1, "updatedAt" = NOW() WHERE "email" = $2`,
            hashedPassword, 'admin@rt11.id'
          );
          results.push('✅ Admin password updated');
        } else {
          results.push('ℹ️ Admin already exists');
        }
      }
    } catch (err) {
      results.push(`❌ Admin seed error: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 3. Seed settings
    try {
      const defaults = [
        ['app_name', 'Iuran Wajib Komplek RT 11'],
        ['alamat', 'Komplek Pradha Ciganitri, Bandung'],
        ['alamat_rt', 'Komplek Pradha Ciganitri'],
        ['ketua_rt', 'Ketua RT 11'],
        ['sekretaris', 'Sekretaris RT 11'],
        ['bendahara', 'Bendahara RT 11'],
        ['whatsapp_admin', '6281234567890'],
        ['nominal_iuran', '100000'],
        ['link_website', 'https://pradha-ciganitri.com'],
        ['bank_accounts', '[]'],
        ['saldo_awal', '0'],
        ['ketua_foto', ''], ['ketua_wa', '6281234567890'],
        ['sekretaris_foto', ''], ['sekretaris_wa', ''],
        ['bendahara_foto', ''], ['bendahara_wa', ''],
      ];

      let count = 0;
      for (const [key, value] of defaults) {
        const ex = await prisma.$queryRawUnsafe(
          `SELECT key FROM "Setting" WHERE key = $1 LIMIT 1`, key
        ) as { key: string }[];
        if (ex.length === 0) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "Setting" ("id", "key", "value", "description", "updatedAt") VALUES (gen_random_uuid(), $1, $2, '', NOW())`,
            key, value
          );
          count++;
        }
      }
      results.push(`✅ Settings seeded: ${count} new`);
    } catch (err) {
      results.push(`❌ Settings error: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 4. Add password column if missing
    try {
      const cols = await prisma.$queryRawUnsafe(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'password'`
      ) as { column_name: string }[];
      if (cols.length === 0) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "password" TEXT NOT NULL DEFAULT ''`);
        results.push('✅ Added password column');
      }
    } catch { /* skip */ }

    await prisma.$disconnect();

    results.push('');
    results.push('🎉 Database setup complete!');
    results.push('Login: admin@rt11.id / admin123');

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

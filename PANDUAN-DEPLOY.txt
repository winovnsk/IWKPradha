# Panduan Deploy Aplikasi IWK RT 11 — Vercel + Supabase

> **Versi:** 1.0 | **Tanggal:** Juni 2025  
> **Aplikasi:** Sistem Iuran Wajib Komplek RT 11 — Next.js 16 (App Router)  
> **Target:** Vercel (Frontend + API Routes) + Supabase (PostgreSQL + Storage + Auth)

---

## Daftar Isi

1. [Overview & Arsitektur](#1-overview--arsitektur)
2. [Prasyarat](#2-prasyarat)
3. [Setup Supabase](#3-setup-supabase)
4. [Migrasi Database (SQLite → Supabase PostgreSQL)](#4-migrasi-database-sqlite--supabase-postgresql)
5. [Migrasi File Upload (Lokal → Supabase Storage)](#5-migrasi-file-upload-lokal--supabase-storage)
6. [Peningkatan Autentikasi untuk Produksi](#6-peningkatan-autentikasi-untuk-produksi)
7. [Variabel Lingkungan](#7-variabel-lingkungan)
8. [Deploy ke Vercel](#8-deploy-ke-vercel)
9. [Checklist Pasca-Deploy](#9-checklist-pasca-deploy)
10. [Estimasi Biaya](#10-estimasi-biaya)

---

## 1. Overview & Arsitektur

### Arsitektur Saat Ini (Development)

```
┌─────────────────────────────────────────────────┐
│                 Next.js 16 App                   │
│                                                  │
│  ┌─────────────────┐  ┌──────────────────────┐  │
│  │  Frontend (SPA)  │  │  API Routes (/api/*) │  │
│  │  - Landing Page  │  │  - /api/auth/*       │  │
│  │  - Login/Register│  │  - /api/gas/*        │  │
│  │  - Warga Views   │  │  - /api/transactions │  │
│  │  - Admin Views   │  │  - /api/upload       │  │
│  │  - Laporan       │  │  - /api/report/export│  │
│  └─────────────────┘  └──────────────────────┘  │
│                              │                   │
│                    ┌─────────▼─────────┐         │
│                    │  SQLite (Prisma)   │         │
│                    │  db/custom.db      │         │
│                    └───────────────────┘         │
│                    ┌───────────────────┐         │
│                    │  Local Filesystem │         │
│                    │  public/uploads/   │         │
│                    └───────────────────┘         │
└─────────────────────────────────────────────────┘
```

**Keterangan:** Backend BUKAN server terpisah — seluruh API route berjalan di dalam Next.js sebagai serverless functions. Database menggunakan SQLite lokal (`db/custom.db`) dengan Prisma ORM. File upload disimpan di `public/uploads/` menggunakan `fs/promises`.

### Arsitektur Target (Produksi)

```
┌─────────────────────────────────────────────────┐
│              Vercel (Edge + Serverless)           │
│                                                  │
│  ┌─────────────────┐  ┌──────────────────────┐  │
│  │  Frontend (SSR)  │  │  API Routes (/api/*) │  │
│  │  - Landing Page  │  │  Serverless Functions│  │
│  │  - Login/Register│  │                      │  │
│  │  - Warga Views   │  │                      │  │
│  │  - Admin Views   │  │                      │  │
│  │  - Laporan       │  │                      │  │
│  └─────────────────┘  └──────────┬───────────┘  │
│                                  │               │
└──────────────────────────────────┼───────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │     Supabase (Cloud)        │
                    │                              │
                    │  ┌────────────────────────┐  │
                    │  │  PostgreSQL Database   │  │
                    │  │  (via Prisma ORM)      │  │
                    │  └────────────────────────┘  │
                    │  ┌────────────────────────┐  │
                    │  │  Storage Bucket         │  │
                    │  │  (uploads/*)            │  │
                    │  └────────────────────────┘  │
                    │  ┌────────────────────────┐  │
                    │  │  Row Level Security    │  │
                    │  │  (RLS Policies)        │  │
                    │  └────────────────────────┘  │
                    └──────────────────────────────┘
```

**Apa yang berubah:**
- **Database:** SQLite → PostgreSQL (Supabase)
- **File Upload:** `fs/promises` lokal → Supabase Storage API
- **Hosting:** Lokal/standalone → Vercel serverless
- **Autentikasi:** Token sederhana → Disarankan bcrypt/Supabase Auth

---

## 2. Prasyarat

Sebelum memulai, pastikan Anda memiliki:

| Kebutuhan | Versi / Detail | Link |
|-----------|---------------|------|
| Node.js | ≥ 18.x (disarankan 20 LTS) | https://nodejs.org |
| Bun | Terbaru (opsional, bisa pakai npm) | https://bun.sh |
| Git | Terbaru | https://git-scm.com |
| Akun Vercel | Gratis (Hobby Plan) | https://vercel.com/signup |
| Akun Supabase | Gratis (Free Tier) | https://supabase.com/signup |
| GitHub | Untuk push kode | https://github.com |

```bash
# Cek versi yang terinstal
node --version    # v20.x.x atau lebih baru
bun --version     # 1.x.x
git --version     # 2.x.x
```

---

## 3. Setup Supabase

### 3.1 Buat Project Supabase

1. Buka https://supabase.com/dashboard dan login
2. Klik **"New Project"**
3. Isi form:
   - **Name:** `iwk-rt11` (atau nama lain yang deskriptif)
   - **Database Password:** Simpan password ini dengan aman! Diperlukan untuk connection string
   - **Region:** Pilih yang terdekat (disarankan **Southeast Asia (Singapore)**)
   - **Plan:** Free
4. Klik **"Create new project"** dan tunggu 2-3 menit

### 3.2 Dapatkan Connection String

Setelah project dibuat:

1. Buka **Settings → Database**
2. Di bagian **Connection string**, pilih **"URI"** tab
3. Formatnya akan seperti:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
4. Klik **"Copy"** dan simpan sementara — ini akan menjadi `DATABASE_URL`

> **Penting:** Gunakan **pooler connection string** (port 6543) bukan direct connection (port 5432). Pooler lebih efisien untuk serverless functions di Vercel.

### 3.3 Dapatkan API Keys

1. Buka **Settings → API**
2. Catat nilai berikut:
   - **Project URL:** `https://[project-ref].supabase.co` → ini `NEXT_PUBLIC_SUPABASE_URL`
   - **anon (public) key:** → ini `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role (secret) key:** → ini `SUPABASE_SERVICE_ROLE_KEY`

### 3.4 Buat Storage Bucket untuk Upload

Buka **Storage** di sidebar, lalu:

1. Klik **"New Bucket"**
2. Name: `uploads`
3. Pilih **"Private"** (file hanya bisa diakses via signed URL)
4. Centang **"Enable Resumable Uploads"**
5. Klik **"Create bucket"**

#### Atur RLS Policy untuk Bucket `uploads`

Buka **SQL Editor** dan jalankan:

```sql
-- Izinkan semua orang untuk UPLOAD file (autentikasi via API)
-- Karena aplikasi ini belum pakai Supabase Auth secara penuh,
-- kita gunakan service_role key di server-side, sehingga RLS tidak menghalangi

-- Policy: Izinkan INSERT (upload) untuk authenticated users
CREATE POLICY "Izinkan upload untuk authenticated users"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');

-- Policy: Izinkan SELECT (download) untuk authenticated users
CREATE POLICY "Izinkan download untuk authenticated users"
ON storage.objects
FOR SELECT
USING (bucket_id = 'uploads' AND auth.role() = 'authenticated');

-- Policy: Izinkan DELETE untuk authenticated users
CREATE POLICY "Izinkan hapus untuk authenticated users"
ON storage.objects
FOR DELETE
USING (bucket_id = 'uploads' AND auth.role() = 'authenticated');

-- Policy: Izinkan UPDATE (rename) untuk authenticated users
CREATE POLICY "Izinkan update untuk authenticated users"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'uploads' AND auth.role() = 'authenticated');
```

> **Catatan:** Karena API route menggunakan `SUPABASE_SERVICE_ROLE_KEY` di server-side, RLS akan dilewati secara otomatis. Policies di atas sebagai fallback jika ada request yang menggunakan anon key.

### 3.5 Setup Row Level Security (RLS) untuk Tabel Database

Setelah tabel dibuat via Prisma (langkah 4), jalankan SQL berikut di **SQL Editor**:

```sql
-- ─────────────────────────────────────────────
-- Aktifkan RLS untuk semua tabel
-- ─────────────────────────────────────────────
ALTER TABLE "Setting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- Setting: publik bisa baca, hanya admin yang update
-- ─────────────────────────────────────────────
CREATE POLICY "Setting public read" ON "Setting"
  FOR SELECT USING (true);

CREATE POLICY "Setting admin write" ON "Setting"
  FOR ALL USING (true);  -- API route pakai service_role, jadi selalu diizinkan

-- ─────────────────────────────────────────────
-- Announcement: publik bisa baca aktif
-- ─────────────────────────────────────────────
CREATE POLICY "Announcement public read" ON "Announcement"
  FOR SELECT USING (true);

CREATE POLICY "Announcement admin write" ON "Announcement"
  FOR ALL USING (true);

-- ─────────────────────────────────────────────
-- Event: publik bisa baca aktif
-- ─────────────────────────────────────────────
CREATE POLICY "Event public read" ON "Event"
  FOR SELECT USING (true);

CREATE POLICY "Event admin write" ON "Event"
  FOR ALL USING (true);

-- ─────────────────────────────────────────────
-- Transaction: authenticated bisa baca miliknya
-- ─────────────────────────────────────────────
CREATE POLICY "Transaction read own" ON "Transaction"
  FOR SELECT USING (true);

CREATE POLICY "Transaction admin write" ON "Transaction"
  FOR ALL USING (true);

-- ─────────────────────────────────────────────
-- User: authenticated bisa baca semua, update profil sendiri
-- ─────────────────────────────────────────────
CREATE POLICY "User read all" ON "User"
  FOR SELECT USING (true);

CREATE POLICY "User update own" ON "User"
  FOR UPDATE USING (true);

CREATE POLICY "User insert" ON "User"
  FOR INSERT WITH CHECK (true);
```

> **Catatan penting:** Semua policy di atas menggunakan `USING (true)` karena API route menggunakan **service_role key** yang memiliki akses penuh dan melewati RLS. Jika nanti ingin menerapkan Supabase Auth penuh, ganti policy dengan pengecekan `auth.uid()`.

---

## 4. Migrasi Database (SQLite → Supabase PostgreSQL)

### 4.1 Update Prisma Schema

Buka file `prisma/schema.prisma` dan ubah konfigurasi datasource:

```prisma
// SEBELUM (SQLite):
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// SESUDAH (PostgreSQL):
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Seluruh model TIDAK PERLU diubah** — Prisma akan secara otomatis menyesuaikan tipe data:

| SQLite | PostgreSQL (otomatis oleh Prisma) |
|--------|----------------------------------|
| `String @id @default(cuid())` | `TEXT @id @default(cuid())` (cuid() berfungsi di PG) |
| `Boolean @default(true)` | `BOOLEAN @default(true)` |
| `DateTime @default(now())` | `TIMESTAMP(3) @default(now())` |
| `Int` | `INTEGER` |

### 4.2 Install Supabase Client

```bash
bun add @supabase/supabase-js
```

### 4.3 Buat File Koneksi Supabase Client

Buat file `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### 4.4 Update Raw SQL Queries

Ini adalah **langkah terbesar** dalam migrasi. Hampir semua API route menggunakan `$queryRawUnsafe` dengan sintaks SQLite. Berikut daftar perubahan yang diperlukan:

#### Tabel Referensi Perubahan Sintaks

| SQLite | PostgreSQL | Lokasi File |
|--------|-----------|-------------|
| `?` (positional) | `$1, $2, $3...` (numbered) | Semua API route |
| `datetime('now')` | `NOW()` | gas/route.ts, users/profile/route.ts |
| `randomblob(16)` | `gen_random_uuid()` | gas/route.ts |
| `hex(randomblob(8))` | `gen_random_uuid()` | gas/route.ts |
| `lower(hex(...))` | `gen_random_uuid()` | gas/route.ts |
| `substr(str, 1, 7)` | `SUBSTRING(str, 1, 7)` | dashboard/route.ts, unpaid-warga/route.ts |
| `CAST(x AS TEXT)` | `CAST(x AS TEXT)` (sama) | dashboard/route.ts |
| `REPLACE(str, ' ', '')` | `REPLACE(str, ' ', '')` (sama) | auth/login/route.ts |

#### Perubahan per File

##### 4.4.1 `src/app/api/gas/route.ts`

**`updateSetting` action — SEBELUM:**
```typescript
const result = await db.$queryRawUnsafe(
  `UPDATE "Setting" SET "value" = ?, "updatedAt" = datetime('now') WHERE "key" = ?`,
  value, key
);
```

**SESUDAH:**
```typescript
const result = await db.$queryRawUnsafe(
  `UPDATE "Setting" SET "value" = $1, "updatedAt" = NOW() WHERE "key" = $2`,
  value, key
);
```

---

**`updateSetting` — INSERT fallback — SEBELUM:**
```typescript
await db.$queryRawUnsafe(
  `INSERT INTO "Setting" ("id", "key", "value", "description", "updatedAt") VALUES (lower(hex(randomblob(8))), ?, ?, '', datetime('now'))`,
  key, value
);
```

**SESUDAH:**
```typescript
await db.$queryRawUnsafe(
  `INSERT INTO "Setting" ("id", "key", "value", "description", "updatedAt") VALUES (gen_random_uuid(), $1, $2, '', NOW())`,
  key, value
);
```

---

**`submitPayment` action — SEBELUM:**
```typescript
await db.$queryRawUnsafe(
  `INSERT INTO "Transaction" ("id", "type", "categoryId", "nominal", "tanggal", "status", "deskripsi", "userId", "createdAt")
   VALUES (lower(hex(randomblob(16))), 'income', 'CAT-IB', ?, ?, 'pending', ?, ?, datetime('now'))`,
  nominal, tanggal, deskripsi, userId
);
```

**SESUDAH:**
```typescript
await db.$queryRawUnsafe(
  `INSERT INTO "Transaction" ("id", "type", "categoryId", "nominal", "tanggal", "status", "deskripsi", "userId", "createdAt")
   VALUES (gen_random_uuid(), 'income', 'CAT-IB', $1, $2, 'pending', $3, $4, NOW())`,
  nominal, tanggal, deskripsi, userId
);
```

##### 4.4.2 `src/app/api/auth/login/route.ts`

**SEBELUM:**
```typescript
const users = await db.$queryRawUnsafe(
  `SELECT * FROM "User" WHERE (LOWER("email") = ? OR REPLACE(REPLACE("noHp", ' ', ''), '-', '') = ?) LIMIT 1`,
  identifierLower, identifierClean
) as Record<string, unknown>[];
```

**SESUDAH:**
```typescript
const users = await db.$queryRawUnsafe(
  `SELECT * FROM "User" WHERE (LOWER("email") = $1 OR REPLACE(REPLACE("noHp", ' ', ''), '-', '') = $2) LIMIT 1`,
  identifierLower, identifierClean
) as Record<string, unknown>[];
```

##### 4.4.3 `src/app/api/users/unpaid/route.ts`

**SEBELUM:**
```typescript
conditions.push(`"userId" = ?`);
params.push(userId.trim());
// ...
const transactions = await db.$queryRawUnsafe(
  `SELECT * FROM "Transaction" ${whereClause} ORDER BY "tanggal" DESC`,
  ...params
) as Record<string, string>[];
```

**SESUDAH:**
```typescript
const paramIndex = params.length + 1;
conditions.push(`"userId" = $${paramIndex}`);
params.push(userId.trim());
// ...
const transactions = await db.$queryRawUnsafe(
  `SELECT * FROM "Transaction" ${whereClause} ORDER BY "tanggal" DESC`,
  ...params
) as Record<string, string>[];
```

> **Catatan penting:** Di PostgreSQL, placeholder menggunakan `$1, $2, ...` (posisi dimulai dari 1). Karena query dibangun secara dinamis, Anda perlu melacak posisi parameter. Berikut helper function yang bisa ditambahkan:

```typescript
// src/lib/query-builder.ts — Helper untuk parameterized queries PostgreSQL

export class PgQueryBuilder {
  private conditions: string[] = [];
  private params: unknown[] = [];
  private paramIndex = 0;

  addCondition(sql: string, ...values: unknown[]): void {
    const placeholders = values.map(() => {
      this.paramIndex++;
      return `$${this.paramIndex}`;
    });
    this.conditions.push(sql.replace(/\?/g, () => placeholders.shift()!));
    this.params.push(...values);
  }

  getWhereClause(): string {
    return this.conditions.length > 0 ? `WHERE ${this.conditions.join(' AND ')}` : '';
  }

  getParams(): unknown[] {
    return this.params;
  }

  nextParam(): string {
    this.paramIndex++;
    return `$${this.paramIndex}`;
  }
}
```

**Contoh penggunaan di `users/unpaid/route.ts`:**
```typescript
import { PgQueryBuilder } from '@/lib/query-builder';

const qb = new PgQueryBuilder();
qb.addCondition(`status IN ('pending', 'approved')`);
qb.addCondition(`type = 'income'`);
qb.addCondition(`"deskripsi" LIKE '%Pembayaran Iuran%'`);

if (userId && userId.trim() !== '') {
  qb.addCondition(`"userId" = ?`, userId.trim());
}

const transactions = await db.$queryRawUnsafe(
  `SELECT * FROM "Transaction" ${qb.getWhereClause()} ORDER BY "tanggal" DESC`,
  ...qb.getParams()
);
```

##### 4.4.4 `src/app/api/transactions/route.ts`

Ganti semua `?` dengan numbered placeholder menggunakan `PgQueryBuilder`:

```typescript
// SEBELUM:
if (type && type !== 'all') {
  conditions.push(`type = ?`);
  params.push(type);
}

// SESUDAH:
const qb = new PgQueryBuilder();
if (type && type !== 'all') {
  qb.addCondition(`type = ?`, type);
}
if (status && status !== 'all') {
  qb.addCondition(`status = ?`, status);
}
if (userId && userId.trim() !== '') {
  qb.addCondition(`"userId" = ?`, userId.trim());
}
if (startDate && startDate.trim() !== '') {
  qb.addCondition(`tanggal >= ?`, startDate.trim());
}
if (endDate && endDate.trim() !== '') {
  qb.addCondition(`tanggal <= ?`, endDate.trim());
}
qb.addCondition(`1=1`); // tambahkan dummy untuk limit param
const limitParam = qb.nextParam();

const transactions = await db.$queryRawUnsafe(
  `SELECT * FROM "Transaction" ${qb.getWhereClause()} ORDER BY "tanggal" DESC LIMIT ${limitParam}`,
  ...qb.getParams(), limit
);
```

##### 4.4.5 `src/app/api/users/profile/route.ts`

**SEBELUM:**
```typescript
const users = await db.$queryRawUnsafe(
  `SELECT id FROM "User" WHERE id = ? LIMIT 1`,
  userId
) as Record<string, unknown>[];
```

**SESUDAH:**
```typescript
const users = await db.$queryRawUnsafe(
  `SELECT id FROM "User" WHERE id = $1 LIMIT 1`,
  userId
) as Record<string, unknown>[];
```

**SEBELUM:**
```typescript
if (nama !== undefined) { setClauses.push(`"nama" = ?`); params.push(nama); }
// ...
setClauses.push(`"updatedAt" = datetime('now')`);
params.push(userId);

await db.$queryRawUnsafe(
  `UPDATE "User" SET ${setClauses.join(', ')} WHERE id = ?`,
  ...params
);
```

**SESUDAH:**
```typescript
if (nama !== undefined) { setClauses.push(`"nama" = $${params.length + 1}`); params.push(nama); }
if (alamat !== undefined) { setClauses.push(`"alamat" = $${params.length + 1}`); params.push(alamat); }
if (noHp !== undefined) { setClauses.push(`"noHp" = $${params.length + 1}`); params.push(noHp); }
if (email !== undefined) { setClauses.push(`"email" = $${params.length + 1}`); params.push(email); }
if (foto !== undefined) { setClauses.push(`"foto" = $${params.length + 1}`); params.push(foto); }

setClauses.push(`"updatedAt" = NOW()`);
const userIdIndex = params.length + 1;
params.push(userId);

await db.$queryRawUnsafe(
  `UPDATE "User" SET ${setClauses.join(', ')} WHERE id = $${userIdIndex}`,
  ...params
);
```

##### 4.4.6 `src/app/api/dashboard/route.ts`

**SEBELUM:**
```typescript
const financialRows = await db.$queryRawUnsafe(
  `SELECT 
    type,
    substr(tanggal, 1, 7) as month,
    SUM(nominal) as total,
    CASE WHEN type = 'expense' THEN "categoryId" ELSE NULL END as category_id
  FROM "Transaction" 
  WHERE status = 'approved'
  GROUP BY type, substr(tanggal, 1, 7), CASE WHEN type = 'expense' THEN "categoryId" ELSE NULL END`
) as { type: string; month: string; total: number; category_id: string | null }[];
```

**SESUDAH:**
```typescript
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
```

**UNION query — SEBELUM:**
```typescript
const miscRows = await db.$queryRawUnsafe(
  `SELECT 'saldo_awal' as key, value FROM "Setting" WHERE key = 'saldo_awal'
   UNION ALL
   SELECT 'user_count', CAST(COUNT(*) AS TEXT) FROM "User" WHERE status = 'approved'`
) as { key: string; value: string }[];
```

**SESUDAH** (PostgreSQL menggunakan `AS` bukan alias tanpa kata kunci, dan `COUNT` sudah integer):
```typescript
const miscRows = await db.$queryRawUnsafe(
  `SELECT 'saldo_awal' AS key, value FROM "Setting" WHERE key = 'saldo_awal'
   UNION ALL
   SELECT 'user_count', CAST(COUNT(*) AS TEXT) FROM "User" WHERE status = 'approved'`
) as { key: string; value: string }[];
```

##### 4.4.7 `src/app/api/admin/unpaid-warga/route.ts`

**SEBELUM:**
```typescript
const transactions = await db.$queryRawUnsafe(
  `SELECT "userId", tanggal, status FROM "Transaction"
   WHERE status IN ('pending', 'approved')
   AND type = 'income'
   AND "deskripsi" LIKE '%Pembayaran Iuran%'
   AND substr(tanggal, 1, 4) = ?
   ORDER BY "userId", tanggal`,
  String(currentYear)
) as Record<string, string>[];
```

**SESUDAH:**
```typescript
const transactions = await db.$queryRawUnsafe(
  `SELECT "userId", tanggal, status FROM "Transaction"
   WHERE status IN ('pending', 'approved')
   AND type = 'income'
   AND "deskripsi" LIKE '%Pembayaran Iuran%'
   AND SUBSTRING(tanggal, 1, 4) = $1
   ORDER BY "userId", tanggal`,
  String(currentYear)
) as Record<string, string>[];
```

##### 4.4.8 `src/app/api/report/export/route.ts`

**SEBELUM:**
```typescript
if (startMonth) { conditions.push('tanggal >= ?'); params.push(startMonth + '-01'); }
```

**SESUDAH** (gunakan PgQueryBuilder):
```typescript
const qb = new PgQueryBuilder();
qb.addCondition(`status = 'approved'`);

if (startMonth) { qb.addCondition('tanggal >= ?', startMonth + '-01'); }
else if (startDate) { qb.addCondition('tanggal >= ?', startDate); }

if (endMonth) {
  const [ey, em] = endMonth.split('-').map(Number);
  const lastDay = new Date(ey, em, 0).getDate();
  qb.addCondition('tanggal <= ?', endMonth + '-' + String(lastDay).padStart(2, '0'));
} else if (endDate) {
  qb.addCondition('tanggal <= ?', endDate);
}

const transactions = await db.$queryRawUnsafe(
  'SELECT * FROM "Transaction" ' + qb.getWhereClause() + ' ORDER BY "tanggal" ASC',
  ...qb.getParams()
) as TxRow[];
```

**hitungSaldoAwalPeriode — SEBELUM:**
```typescript
const rows = await db.$queryRawUnsafe(
  `SELECT 
    SUM(CASE WHEN type = 'income' THEN nominal ELSE 0 END) as total_income,
    SUM(CASE WHEN type != 'income' THEN nominal ELSE 0 END) as total_expense,
    MAX(substr(tanggal, 1, 7)) as last_month
  FROM "Transaction" 
  WHERE status = 'approved' AND tanggal < ?`,
  startMonth + '-01'
) as { total_income: number | null; total_expense: number | null; last_month: string | null }[];
```

**SESUDAH:**
```typescript
const rows = await db.$queryRawUnsafe(
  `SELECT 
    SUM(CASE WHEN type = 'income' THEN nominal ELSE 0 END) as total_income,
    SUM(CASE WHEN type != 'income' THEN nominal ELSE 0 END) as total_expense,
    MAX(SUBSTRING(tanggal, 1, 7)) as last_month
  FROM "Transaction" 
  WHERE status = 'approved' AND tanggal < $1`,
  startMonth + '-01'
) as { total_income: number | null; total_expense: number | null; last_month: string | null }[];
```

### 4.5 Update Prisma Client Config

Buka `src/lib/db.ts` dan update untuk production:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

> **Penting:** `log: ['query']` akan mencatat semua query ke console. Hanya aktifkan di development. Di production, log query tidak disarankan karena dapat memperlambat response dan membanjiri Vercel logs.

### 4.6 Push Schema ke Supabase

```bash
# Set DATABASE_URL ke Supabase connection string
export DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

# Generate Prisma client (untuk update tipe TypeScript)
bunx prisma generate

# Push schema ke database (tanpa migration file — cocok untuk awal)
bunx prisma db push

# ATAU, jika ingin migration terkontrol:
bunx prisma migrate dev --name init
```

### 4.7 Seed Data Awal

Buat atau update `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Buat admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rt11.id' },
    update: {},
    create: {
      nama: 'Ketua RT 11',
      email: 'admin@rt11.id',
      noHp: '081234567890',
      alamat: 'Blok A No. 1',
      role: 'admin',
      status: 'approved',
    },
  });
  console.log('✅ Admin user:', admin.email);

  // 2. Buat settings default
  const defaultSettings = [
    { key: 'app_name', value: 'Iuran Wajib Komplek RT 11', description: 'Nama Aplikasi' },
    { key: 'alamat', value: 'Komplek Pradha Ciganitri, Bandung', description: 'Alamat' },
    { key: 'ketua_rt', value: 'Ketua RT 11', description: 'Nama Ketua RT' },
    { key: 'sekretaris', value: 'Sekretaris RT 11', description: 'Nama Sekretaris' },
    { key: 'bendahara', value: 'Bendahara RT 11', description: 'Nama Bendahara' },
    { key: 'no_wa', value: '6281234567890', description: 'Nomor WhatsApp' },
    { key: 'nominal_iuran', value: '100000', description: 'Nominal Iuran Bulanan' },
    { key: 'link_website', value: 'https://pradha-ciganitri.com', description: 'Link Website' },
    { key: 'bank_accounts', value: '[]', description: 'Rekening Bank (JSON)' },
    { key: 'saldo_awal', value: '0', description: 'Saldo Awal Keuangan' },
    { key: 'ketua_foto', value: '', description: 'Foto Ketua RT' },
    { key: 'ketua_wa', value: '6281234567890', description: 'WA Ketua RT' },
    { key: 'sekretaris_foto', value: '', description: 'Foto Sekretaris' },
    { key: 'sekretaris_wa', value: '', description: 'WA Sekretaris' },
    { key: 'bendahara_foto', value: '', description: 'Foto Bendahara' },
    { key: 'bendahara_wa', value: '', description: 'WA Bendahara' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`✅ ${defaultSettings.length} settings seeded`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Tambahkan konfigurasi seed di `package.json`:
```json
{
  "prisma": {
    "seed": "bun run prisma/seed.ts"
  }
}
```

Jalankan seed:
```bash
bunx prisma db seed
```

---

## 5. Migrasi File Upload (Lokal → Supabase Storage)

### 5.1 Buat Utility Storage

Buat file `src/lib/storage.ts`:

```typescript
import { supabase } from './supabase';

const BUCKET_NAME = 'uploads';

export interface UploadResult {
  url: string;
  name: string;
  size: number;
  type: 'image' | 'file';
}

/**
 * Upload file ke Supabase Storage
 * @param file - File object dari FormData
 * @param folder - Subfolder (opsional, contoh: "events", "announcements")
 * @returns UploadResult dengan URL publik
 */
export async function uploadFile(file: File, folder: string = ''): Promise<UploadResult> {
  const ext = file.name.split('.').pop() || 'bin';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const filename = `${timestamp}-${random}.${ext}`;

  // Path di storage bucket
  const storagePath = folder ? `${folder}/${filename}` : filename;

  // Konversi File ke ArrayBuffer
  const bytes = await file.arrayBuffer();
  const buffer = new Uint8Array(bytes);

  // Upload ke Supabase Storage
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload gagal: ${error.message}`);
  }

  // Dapatkan signed URL (berlaku 1 tahun)
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  // ATAU gunakan signed URL untuk private bucket:
  // const { data: signedData, error: signedError } = await supabase.storage
  //   .from(BUCKET_NAME)
  //   .createSignedUrl(storagePath, 31536000); // 1 tahun

  const isImage = file.type.startsWith('image/');

  return {
    url: urlData.publicUrl,
    name: file.name,
    size: file.size,
    type: isImage ? 'image' : 'file',
  };
}

/**
 * Hapus file dari Supabase Storage
 * @param url - URL file yang akan dihapus
 */
export async function deleteFile(url: string): Promise<void> {
  // Ekstrak path dari URL
  // Format: https://[project-ref].supabase.co/storage/v1/object/public/uploads/[path]
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/uploads/');
  if (pathParts.length < 2) return;

  const storagePath = pathParts[1];

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    console.error('Gagal menghapus file:', error.message);
  }
}

/**
 * Upload multiple files sekaligus
 */
export async function uploadFiles(files: File[], folder: string = ''): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  for (const file of files) {
    const result = await uploadFile(file, folder);
    results.push(result);
  }
  return results;
}
```

### 5.2 Update Route Upload

Ganti isi `src/app/api/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { uploadFiles, deleteFile } from '@/lib/storage';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const folder = (formData.get('folder') as string) || '';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada file yang diunggah' },
        { status: 400 }
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        { success: false, message: 'Maksimal 10 file sekaligus' },
        { status: 400 }
      );
    }

    // Validasi semua file
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, message: `File "${file.name}" melebihi batas 5MB` },
          { status: 400 }
        );
      }

      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
      const isAllowedFile = ALLOWED_FILE_TYPES.includes(file.type);

      if (!isImage && !isAllowedFile) {
        return NextResponse.json(
          { success: false, message: `Tipe file "${file.name}" tidak didukung` },
          { status: 400 }
        );
      }
    }

    // Upload ke Supabase Storage
    const results = await uploadFiles(files, folder);

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengunggah file' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const urls = searchParams.getAll('url');

    if (!urls.length) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada URL file' },
        { status: 400 }
      );
    }

    for (const url of urls) {
      await deleteFile(url);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus file' },
      { status: 500 }
    );
  }
}
```

### 5.3 Perhatian: In-Memory Cache Tidak Berfungsi di Serverless

File `src/lib/cache.ts` menggunakan `Map` global sebagai in-memory cache. Di Vercel serverless, setiap function instance memiliki memory-nya sendiri, sehingga:

- Cache tidak akan shared antar-request
- Tidak akan konsisten (beda instance = beda cache)

**Solusi pilihan:**

1. **Hapus cache** — hapus `getCached()`/`setCache()` dari dashboard route (paling mudah, Supabase cukup cepat)
2. **Gunakan Redis** — via Upstash Redis atau Supabase pg_net
3. **Biarkan sebagai-is** — tetap berguna untuk deduplikasi dalam 1 request yang sama, tapi jangan bergantung padanya

Untuk awal, cukup hapus penggunaan cache di `src/app/api/dashboard/route.ts`:

```typescript
// SEBELUM:
import { getCached, setCache, cacheKey } from '@/lib/cache';
// ...
const cached = getCached<...>(key);
if (cached) return NextResponse.json(cached);
// ...
setCache(key, result, 15_000);

// SESUDAH: Hapus baris cache, langsung return hasil
```

---

## 6. Peningkatan Autentikasi untuk Produksi

### 6.1 Masalah Saat Ini

Sistem autentikasi saat ini **TIDAK AMAN** untuk produksi:

```typescript
// src/app/api/auth/login/route.ts
// Password check: hanya cek panjang >= 6, TIDAK ADA hashing!
if (password.length < 6) {
  return NextResponse.json({ success: false, message: 'Password salah' }, { status: 401 });
}

// Token: format yang sangat sederhana
const token = `demo_${user.id}_${Date.now()}`;
```

Artinya: **password apapun dengan panjang ≥ 6 akan diterima**, dan token bisa dipalsukan.

### 6.2 Opsi A: Password Hashing dengan bcrypt (Direkomendasikan - Minimal)

Install bcrypt:
```bash
bun add bcryptjs
bun add -D @types/bcryptjs
```

**Update `src/app/api/auth/register/route.ts`:**
```typescript
import bcrypt from 'bcryptjs';

// ... di dalam handler POST:
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(password, salt);

const newUser = await db.user.create({
  data: {
    nama: nama.trim(),
    alamat: cleanAlamat.startsWith('Blok') ? cleanAlamat : `Blok B ${cleanAlamat}`,
    noHp: cleanPhone,
    email: email.toLowerCase().trim(),
    role: 'warga',
    status: 'pending', // Di production, set pending agar admin approve
    password: hashedPassword,
  },
});
```

**Update `src/app/api/auth/login/route.ts`:**
```typescript
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ... di dalam handler POST:
const user = users[0];

if (!user) {
  return NextResponse.json({ success: false, message: 'Akun tidak ditemukan' }, { status: 401 });
}

// Hash check
if (!user.password) {
  return NextResponse.json(
    { success: false, message: 'Akun belum memiliki password. Hubungi admin.' },
    { status: 401 }
  );
}

const isPasswordValid = await bcrypt.compare(password, user.password);
if (!isPasswordValid) {
  return NextResponse.json({ success: false, message: 'Password salah' }, { status: 401 });
}

// Token yang lebih aman
const token = crypto.randomBytes(32).toString('hex');
```

**Tambahkan kolom `password` ke Prisma schema:**
```prisma
model User {
  id        String   @id @default(cuid())
  nama      String
  alamat    String   @default("")
  noHp      String   @default("")
  email     String   @unique
  password  String   @default("")  // <-- TAMBAHKAN INI
  role      String   @default("warga")
  status    String   @default("approved")
  foto      String   @default("")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 6.3 Opsi B: Gunakan Supabase Auth (Ideal)

Supabase Auth menyediakan autentikasi lengkap: email/password, magic link, OAuth, dan JWT token yang aman.

1. Supabase Auth sudah tersedia gratis di project Supabase
2. Ganti login/register endpoint dengan Supabase Auth API
3. Gunakan JWT token dari Supabase
4. Tambahkan middleware untuk validasi token

**Contoh login dengan Supabase Auth:**
```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase.auth.signInWithPassword({
  email: identifier,
  password,
});

if (error) {
  return NextResponse.json({ success: false, message: error.message }, { status: 401 });
}

// data.session.access_token = JWT token yang aman
// data.user = data user dari Supabase Auth
```

> **Catatan:** Jika menggunakan Supabase Auth, Anda mungkin perlu sinkronisasi user antara Supabase Auth dan tabel `User` di database. Ini memerlukan refactoring yang lebih besar.

### 6.4 Opsi C: Token Table di Database (Intermediate)

Buat tabel `Session` untuk menyimpan token aktif:

```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  createdAt DateTime @default(now())
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id])
}
```

Setiap login, buat token acak dan simpan di tabel. Setiap request API, validasi token terhadap tabel.

---

## 7. Variabel Lingkungan

### 7.1 Variabel yang Diperlukan

Buat file `.env.local` untuk development:

```env
# ─── Database ───────────────────────────────────────────
# Supabase PostgreSQL connection string (pooler)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# ─── Supabase ───────────────────────────────────────────
# Supabase Project URL (publik, aman untuk di-expose)
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co

# Supabase Anon Key (publik, aman untuk di-expose)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key (RAHASIA! Jangan expose ke client)
# Hanya digunakan di API routes (server-side)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ─── Opsional ───────────────────────────────────────────
# GAS URL (jika masih ingin menggunakan Google Apps Script sebagai backend)
# GAS_URL=https://script.google.com/macros/s/xxx/exec
```

### 7.2 Keamanan Variabel Lingkungan

| Variabel | Prefix | Client-side? | Deskripsi |
|----------|--------|-------------|-----------|
| `DATABASE_URL` | — | ❌ TIDAK | Connection string database |
| `NEXT_PUBLIC_SUPABASE_URL` | `NEXT_PUBLIC_` | ✅ YA | URL Supabase (aman) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_` | ✅ YA | Anon key (aman, di-RQL) |
| `SUPABASE_SERVICE_ROLE_KEY` | — | ❌ TIDAK | Full access key (RAHASIA) |

> **PENTING:** `SUPABASE_SERVICE_ROLE_KEY` dan `DATABASE_URL` JANGAN PERNAH di-expose ke client. Pastikan tidak ada `NEXT_PUBLIC_` prefix pada variabel sensitif.

### 7.3 Set di Vercel

Setelah push kode ke GitHub dan connect ke Vercel (lihat bagian 8):

1. Buka **Vercel Dashboard → Project → Settings → Environment Variables**
2. Tambahkan semua variabel di atas
3. Pilih environment: **Production**, **Preview**, dan **Development**

---

## 8. Deploy ke Vercel

### 8.1 Persiapan Repository

```bash
# Pastikan ada .gitignore yang benar
# .gitignore harus berisi:
# node_modules/
# .next/
# .env.local
# db/
# public/uploads/
# *.log
```

Tambahkan ke `.gitignore`:
```gitignore
# Database lokal
db/

# Upload lokal (akan pindah ke Supabase Storage)
public/uploads/

# Environment variables
.env
.env.local
.env.production

# Logs
*.log
dev.log
server.log

# Dependencies
node_modules/
bun.lock

# Build output
.next/
.vercel/

# OS files
.DS_Store
Thumbs.db
```

```bash
# Init git (jika belum)
git init
git add .
git commit -m "feat: initial commit - IWK RT 11 app"

# Push ke GitHub
git remote add origin https://github.com/[username]/iwk-rt11.git
git branch -M main
git push -u origin main
```

### 8.2 Connect ke Vercel

1. Buka https://vercel.com/new
2. Pilih repository **iwk-rt11** dari GitHub
3. Vercel akan otomatis mendeteksi sebagai **Next.js** project
4. Klik **"Deploy"**

### 8.3 Konfigurasi Build

Vercel otomatis menggunakan konfigurasi berikut (sesuai `package.json`):

| Pengaturan | Nilai |
|-----------|-------|
| **Framework Preset** | Next.js (auto-detected) |
| **Build Command** | `bun run build` (ataau `npm run build` jika tanpa bun) |
| **Output Directory** | `.next` |
| **Install Command** | `bun install` (atau `npm install`) |

> **Catatan tentang `output: "standalone"`:** Saat ini `next.config.ts` memiliki `output: "standalone"`. Untuk deploy ke Vercel, opsi ini **tidak diperlukan** dan bisa dihapus. Vercel memiliki handler khusus Next.js yang lebih optimal. Biarkan saja — Vercel akan mengabaikannya.

Jika Vercel tidak mendeteksi bun, atur manual di **Settings → Build & Development Settings**:
- **Build Command:** `npm run build` (atau `cd / && npm install bun && bun run build`)
- **Install Command:** `npm install`

### 8.4 Set Environment Variables di Vercel

1. Buka **Settings → Environment Variables**
2. Tambahkan variabel berikut:

| Key | Value | Environments |
|-----|-------|-------------|
| `DATABASE_URL` | `postgresql://postgres...` | Production, Preview, Dev |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview, Dev |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Production, Preview, Dev |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Production, Preview, Dev |

3. Klik **Save**
4. **Redeploy** agar variabel lingkungan berlaku:
   - Buka **Deployments** → klik titik tiga (...) pada deployment terbaru → **Redeploy**

### 8.5 Custom Domain (Opsional)

1. Buka **Settings → Domains**
2. Klik **"Add Domain"**
3. Masukkan domain Anda (contoh: `iwk.pradha-ciganitri.com`)
4. Update DNS records di registrar domain:
   ```
   Type: CNAME
   Name: iwk (atau subdomain yang diinginkan)
   Value: cname.vercel-dns.com
   ```
5. Vercel akan otomatis mengeluarkan SSL certificate (HTTPS)

### 8.6 Verifikasi Deploy

Setelah deploy berhasil, cek:

1. **Build log** — pastikan tidak ada error
2. **Function logs** — buka **Logs** tab di Vercel dashboard
3. **Test URL** — buka deployment URL, test fitur:
   - Landing page load
   - Login/register
   - Upload file
   - Dashboard data

---

## 9. Checklist Pasca-Deploy

### 9.1 Checklist Sebelum Go-Live

- [ ] **Build berhasil** — tidak ada error di Vercel build log
- [ ] **Landing page** tampil dengan benar (gambar, teks, pengurus)
- [ ] **Registrasi user baru** berhasil (cek di Supabase database)
- [ ] **Login** berhasil dengan user yang sudah terdaftar
- [ ] **Dashboard warga** menampilkan data (transaksi, unpaid months)
- [ ] **Dashboard admin** menampilkan statistik yang benar
- [ ] **File upload** berhasil (cek di Supabase Storage)
- [ ] **File gambar** ditampilkan dengan benar di browser
- [ ] **Pembayaran iuran** workflow berjalan (pilih bulan → submit → admin approve)
- [ ] **Laporan keuangan** bisa di-download (PDF/Excel/CSV)
- [ ] **Pengumuman & Kegiatan** CRUD berfungsi
- [ ] **Settings admin** tersimpan dan terbaca di halaman depan
- [ ] **WhatsApp reminder** link berfungsi

### 9.2 Seed Admin Account

Setelah deploy, buat admin account:

1. Buka **Supabase Dashboard → Table Editor → User**
2. Klik **"Insert row"**
3. Isi:
   - `nama`: "Ketua RT 11"
   - `email`: "admin@rt11.id" (ganti dengan email yang diinginkan)
   - `noHp`: "081234567890"
   - `alamat`: "Blok A No. 1"
   - `role`: "admin"
   - `status`: "approved"
   - `password`: hash dari password yang diinginkan (gunakan bcrypt)
4. Login dengan email dan password tersebut

**Atau** jalankan seed script:
```bash
# Set DATABASE_URL
DATABASE_URL="postgresql://postgres..." bunx prisma db seed
```

### 9.3 Seed Settings Default

Pastikan settings default sudah diisi:

1. Buka **Supabase Dashboard → Table Editor → Setting**
2. Pastikan baris berikut ada:
   - `app_name` = "Iuran Wajib Komplek RT 11"
   - `nominal_iuran` = "100000" (sesuaikan)
   - `no_wa` = "6281234567890"
   - `alamat` = "Komplek Pradha Ciganitri, Bandung"
3. Atau seed via `prisma db seed` (lihat bagian 4.7)

### 9.4 Monitoring & Debugging

#### Vercel Logs
Buka **Vercel Dashboard → Project → Logs** untuk melihat:
- API route errors
- Function execution time
- Cold start latency

#### Supabase Logs
Buka **Supabase Dashboard → Database → Logs** untuk melihat:
- SQL query logs
- Connection pool stats
- Slow queries

#### Performance Checklist
- [ ] API response time < 3 detik (termasuk cold start)
- [ ] Halaman utama load < 2 detik
- [ ] Upload file < 10 detik untuk 5MB
- [ ] Download laporan PDF < 5 detik

---

## 10. Estimasi Biaya

### 10.1 Vercel — Hobby Plan (Gratis)

| Resource | Batas | Cukup untuk? |
|----------|-------|-------------|
| Bandwidth | 100 GB/bulan | ✅ > 10K pageviews/hari |
| Serverless executions | 100 GB-hours/bulan | ✅ |
| Build minutes | 6000 menit/bulan | ✅ |
| Functions | 12 fungsi (tanpa batas jumlah route) | ✅ (14 API routes) |
| Custom domains | 1 domain | ✅ |
| SSL | Otomatis | ✅ |

### 10.2 Supabase — Free Tier

| Resource | Batas | Cukup untuk? |
|----------|-------|-------------|
| Database | 500 MB | ✅ (RT kecil, < 1000 warga) |
| Storage | 1 GB | ✅ (foto, PDF pengumuman) |
| Bandwidth | 5 GB/bulan | ✅ |
| API requests | 500K/bulan | ✅ |
| Row Level Security | ✅ Termasuk | ✅ |
| Realtime | 200 concurrent connections | ✅ |

### 10.3 Kapan Harus Upgrade?

**Vercel Pro ($20/bulan)** jika:
- Bandwidth > 100 GB/bulan
- Butuh team collaboration
- Butuh analytics yang lebih detail
- Custom timeout > 10 detik

**Supabase Pro ($25/bulan)** jika:
- Database > 500 MB
- Storage > 1 GB
- Butuh daily backups otomatis
- Butuh point-in-time recovery
- API requests > 500K/bulan

### 10.4 Estimasi Total untuk RT

Untuk Rukun Tetangga dengan ~50-100 KK:

| Komponen | Tier | Biaya/bulan |
|----------|------|------------|
| Vercel | Hobby (Free) | Rp 0 |
| Supabase | Free | Rp 0 |
| Domain (.com) | ~Rp 120.000/tahun | Rp 10.000 |
| **Total** | | **~Rp 10.000/bulan** |

---

## Lampiran A: Daftar File yang Harus Diubah

| File | Perubahan | Prioritas |
|------|-----------|-----------|
| `prisma/schema.prisma` | `provider = "postgresql"`, tambah `password` field | 🔴 Wajib |
| `src/lib/db.ts` | Hapus query log di production | 🟡 Disarankan |
| `src/lib/supabase.ts` | **File baru** — Supabase client | 🔴 Wajib |
| `src/lib/storage.ts` | **File baru** — Storage utility | 🔴 Wajib |
| `src/lib/query-builder.ts` | **File baru** — PostgreSQL parameter helper | 🔴 Wajib |
| `src/app/api/gas/route.ts` | `datetime('now')` → `NOW()`, `?` → `$n`, `randomblob()` → `gen_random_uuid()` | 🔴 Wajib |
| `src/app/api/auth/login/route.ts` | `?` → `$n`, password hashing | 🔴 Wajib |
| `src/app/api/auth/register/route.ts` | Password hashing | 🔴 Wajib |
| `src/app/api/users/unpaid/route.ts` | `?` → `$n` | 🔴 Wajib |
| `src/app/api/transactions/route.ts` | `?` → `$n` | 🔴 Wajib |
| `src/app/api/users/profile/route.ts` | `?` → `$n`, `datetime('now')` → `NOW()` | 🔴 Wajib |
| `src/app/api/dashboard/route.ts` | `substr()` → `SUBSTRING()`, hapus cache | 🔴 Wajib |
| `src/app/api/admin/unpaid-warga/route.ts` | `substr()` → `SUBSTRING()`, `?` → `$n` | 🔴 Wajib |
| `src/app/api/report/export/route.ts` | `?` → `$n`, `substr()` → `SUBSTRING()` | 🔴 Wajib |
| `src/app/api/upload/route.ts` | Ganti `fs/promises` dengan Supabase Storage | 🔴 Wajib |
| `src/app/api/settings/route.ts` | (Tidak ada raw SQL SQLite-specific) | ✅ Aman |
| `src/lib/cache.ts` | (Hapus penggunaan, atau biarkan) | 🟡 Opsional |
| `next.config.ts` | Hapus `output: "standalone"` (opsional) | 🟢 Opsional |
| `.gitignore` | Tambahkan `db/`, `public/uploads/` | 🔴 Wajib |
| `.env.local` | Update `DATABASE_URL` ke Supabase | 🔴 Wajib |

---

## Lampiran B: Troubleshooting

### Build Error: Module not found

```
Module not found: Can't resolve 'fs/promises'
```
**Solusi:** Hapus semua import `fs/promises`, `fs`, `path` dari API routes. File system tidak tersedia di Vercel serverless.

### Runtime Error: Prisma Client tidak bisa connect

```
Error: P1001: Can't reach database server
```
**Solusi:** 
1. Pastikan `DATABASE_URL` benar di Vercel environment variables
2. Gunakan **pooler connection string** (port 6543), bukan direct (port 5432)
3. Cek apakah IPv4 diaktifkan di Supabase (Settings → Database → IPv4)

### Cold Start Lambat

**Gejala:** API request pertama setelah idle membutuhkan 3-5 detik

**Solusi:**
1. Normal untuk serverless — Vercel akan menjaga warm instance
2. Aktifkan "Minify" di Vercel settings
3. Pertimbangkan Vercel Pro untuk lebih banyak execution time

### Upload Gagal: Storage error

```
Upload gagal: storage bucket not found
```
**Solusi:**
1. Pastikan bucket `uploads` sudah dibuat di Supabase Storage
2. Pastikan `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` benar

### Gambar Tidak Tampil

**Gejala:** Upload berhasil tapi gambar 404

**Solusi:**
1. Jika bucket **Private**: gunakan signed URL, atau ubah ke **Public**
2. Untuk bucket public, URL format: `https://[project-ref].supabase.co/storage/v1/object/public/uploads/[path]`
3. Pastikan `NEXT_PUBLIC_SUPABASE_URL` mengarah ke project yang benar

---

## Lampiran C: Script Migrasi Otomatis

Berikut script shell yang bisa digunakan untuk migrasi cepat:

```bash
#!/bin/bash
# migrate-to-supabase.sh
# Jalankan: bash migrate-to-supabase.sh

set -e

echo "🚀 Migrasi IWK RT 11 ke Vercel + Supabase"
echo "=========================================="

# 1. Install dependency baru
echo ""
echo "📦 Step 1: Install @supabase/supabase-js dan bcryptjs..."
bun add @supabase/supabase-js bcryptjs
bun add -D @types/bcryptjs

# 2. Tanya DATABASE_URL
echo ""
echo "🔑 Step 2: Masukkan Supabase DATABASE_URL:"
read -p "DATABASE_URL: " DB_URL

if [ -z "$DB_URL" ]; then
  echo "❌ DATABASE_URL tidak boleh kosong"
  exit 1
fi

# 3. Update .env.local
echo ""
echo "📝 Step 3: Update .env.local..."
cat > .env.local << EOF
DATABASE_URL=$DB_URL
NEXT_PUBLIC_SUPABASE_URL=$(echo $DB_URL | sed -n 's|postgresql://[^@]*@\([^/]*\)/.*|https://\1|p' | sed 's|pooler\.||')
EOF

echo "⚠️  Pastikan untuk menambahkan NEXT_PUBLIC_SUPABASE_ANON_KEY dan SUPABASE_SERVICE_ROLE_KEY di .env.local"
echo "   Dapatkan dari: Supabase Dashboard → Settings → API"

# 4. Generate Prisma client
echo ""
echo "🔄 Step 4: Generate Prisma client..."
DATABASE_URL=$DB_URL bunx prisma generate

# 5. Push schema
echo ""
echo "💾 Step 5: Push schema ke Supabase..."
DATABASE_URL=$DB_URL bunx prisma db push

echo ""
echo "✅ Migrasi database selesai!"
echo ""
echo "📋 Langkah selanjutnya:"
echo "   1. Update raw SQL queries di API routes (lihat DEPLOYMENT_GUIDE.md bagian 4.4)"
echo "   2. Update file upload route (lihat bagian 5.2)"
echo "   3. Tambahkan password hashing (lihat bagian 6.2)"
echo "   4. Push ke GitHub dan deploy ke Vercel"
```

---

## Lampiran D: Diagram Alur Deploy

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Local Dev    │────▶│   GitHub     │────▶│   Vercel     │
│               │ git │  Repository  │ auto│  Build &     │
│  - Ubah kode  │ push│              │ pull│  Deploy      │
│  - Test lokal │     │              │     │              │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                           ┌──────▼───────┐
                                           │  Supabase    │
                                           │  - PostgreSQL│
                                           │  - Storage   │
                                           │  - Auth      │
                                           └──────────────┘
```

**Alur kerja yang direkomendasikan:**

1. **Develop lokal** — gunakan Supabase remote database (bukan SQLite)
2. **Test** — pastikan semua fitur bekerja dengan Supabase
3. **Commit & Push** — ke GitHub
4. **Vercel auto-deploy** — setiap push ke `main` otomatis di-deploy
5. **Preview** — setiap PR mendapat deployment preview URL
6. **Production** — merge ke `main` = auto-deploy ke production

---

> **Selamat!** Aplikasi IWK RT 11 siap untuk produksi. Jika ada pertanyaan, silakan buka issue di repository GitHub.

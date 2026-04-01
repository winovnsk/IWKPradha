PRODUCT REQUIREMENTS DOCUMENT (PRD) — REVISI
Sistem IWK & Manajemen Kegiatan RT 11 (SPA Web App)

Version: 2.0.0 | Revised: Berdasarkan Code.gs v1.0.0

Project Overview
Problem
• Pencatatan iuran dan keuangan masih manual → rawan kesalahan & tidak transparan
• Sulit melacak pembayaran warga
• Bukti transfer tersebar & tidak terorganisir
• Informasi kegiatan RT tidak terpusat
• Tidak ada sistem laporan yang mudah diakses warga

Solution
Web App SPA berbasis Google Apps Script + Google Sheets + Google Drive, di-host frontend di Vercel, untuk:
• Manajemen iuran & pembayaran
• Transparansi keuangan real-time
• Publikasi kegiatan RT berbasis kalender
• Sistem laporan otomatis (PDF / Excel / CSV)

Target User
• Warga RT 11 (Komplek Pradha Ciganitri)
• Pengurus RT (Admin)
• Publik (mode transparansi — Landing Page)

Value Proposition
• Transparansi keuangan 100%
• Mudah digunakan warga non-teknis
• Tanpa server tambahan (low cost, Google infra)
• Semua data terpusat & terdokumentasi

Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Registrasi warga | Conversion approval | > 80% |
| Pembayaran via sistem | Payment completion rate | > 90% |
| Transparansi laporan | Akses real-time | 100% |
| Pengurangan manual | Error transaksi | < 2% |
| Performa | Page load | < 3 detik |
| Kepuasan | Rating pengguna | > 4/5 |

User Roles & Permissions

| Role | Permissions |
|------|-------------|
| Admin | Full CRUD semua data, validasi pembayaran, approve/reject user, export laporan, manage settings |
| Warga | Edit profil sendiri, bayar iuran (wizard), lihat riwayat, lihat laporan, download report |
| Publik | View transparansi keuangan, kalender kegiatan, pengumuman (Landing Page) |

Scope
✅ In Scope
• Landing Page publik (info RT, transparansi, kegiatan)
• Registrasi & approval user
• Sistem pembayaran manual (transfer + QRIS) dengan wizard
• Upload bukti ke Google Drive
• Dashboard keuangan dengan chart
• Laporan & export (PDF, Excel, CSV)
• Kalender kegiatan RT
• Pengumuman
• Settings dinamis
• Activity logs
• WhatsApp redirect otomatis

❌ Out of Scope
• Payment gateway otomatis (Midtrans/Xendit)
• Mobile native app
• Multi RT / multi tenant (Phase 1)
• Push notification real-time

Arsitektur Sistem
Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | HTML + CSS + Vanilla JS (SPA) |
| Hosting Frontend | Vercel |
| Backend | Google Apps Script (Web App) |
| Database | Google Sheets |
| Storage | Google Drive |
| Session | Hash token di sheet settings + CacheService |

Diagram Arsitektur

``
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                     │
│              Vercel Hosted SPA Frontend                 │
│         HTML + CSS + Vanilla JS (SPA Router)            │
└──────────────────────┬──────────────────────────────────┘
                       │  fetch() + redirect:"follow"
                       │  Content-Type: text/plain;charset=utf-8
                       ▼
┌─────────────────────────────────────────────────────────┐
│          GOOGLE APPS SCRIPT (Web App)                   │
│                                                         │
│  ┌─────────────┐    ┌──────────────┐   ┌─────────────┐ │
│  │  doGet(e)   │    │  doPost(e)   │   │  Middleware │ │
│  │  (GET API)  │    │  (POST API)  │   │  requireAuth│ │
│  └──────┬──────┘    └──────┬───────┘   └──────┬──────┘ │
│         └─────────────────┼───────────────────┘        │
│                           ▼                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │              BUSINESS LOGIC LAYER               │   │
│  │  Auth │ Users │ Transactions │ Events │ Reports │   │
│  └──────────────────────┬──────────────────────────┘   │
└─────────────────────────┼───────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│Google Sheets│  │ Google Drive │  │  Google Docs │
│ (Database)  │  │  (Storage)   │  │  (PDF/Excel) │
│             │  │              │  │              │
│ 12 Sheets   │  │ /buktitrans │  │ Auto-generate│
│ (users, tx, │  │ /events      │  │ laporan      │
│  cats, etc) │  │ /reports     │  │              │
└─────────────┘  └──────────────┘  └──────────────┘
`

Integrasi Frontend ↔ Backend (KRITIS)
6.1 Masalah CORS & Solusinya

Google Apps Script Web App menggunakan HTTP 302 redirect ke domain script.googleusercontent.com sebelum mengembalikan JSON. Browser akan memblokir ini jika tidak dikonfigurasi dengan benar.

Solusi wajib di semua fetch() frontend:

`javascript
// ✅ BENAR - Selalu gunakan ini
const SCRIPTURL = 'https://script.google.com/macros/s/YOURSCRIPTID/exec';

async function apiCall(action, params = {}, method = 'GET') {
  if (method === 'GET') {
    const query = new URLSearchParams({ action, token: getToken(), ...params });
    const res = await fetch(${SCRIPTURL}?${query}, {
      redirect: 'follow'   // ⚠️ WAJIB untuk handle HTTP 302
    });
    return res.json();
  }

  if (method === 'POST') {
    const body = JSON.stringify({ action, token: getToken(), ...params });
    const res = await fetch(SCRIPTURL, {
      method: 'POST',
      redirect: 'follow',              // ⚠️ WAJIB
      // ⚠️ JANGAN gunakan 'application/json'
      // GAS tidak support preflight OPTIONS untuk content-type JSON
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body
    });
    return res.json();
  }
}
`

6.2 Kenapa text/plain bukan application/json?

| | application/json | text/plain;charset=utf-8 |
|---|---|---|
| Browser kirim Preflight OPTIONS? | ✅ Ya | ❌ Tidak |
| GAS support Preflight OPTIONS? | ❌ Tidak | ✅ Tidak perlu |
| Hasil | CORS Error | ✅ Berhasil |
| Cara baca di GAS | — | JSON.parse(e.postData.contents) |

> Backend (doPost) di Code.gs sudah menangani ini:
> `javascript
> data = JSON.parse(e.postData.contents); // Baca sebagai teks, parse manual
> `

6.3 Auth Header Pattern

`javascript
// Token dikirim via body (POST) atau query param (GET)
// Bukan via Authorization header (tidak didukung GAS)

// GET
fetch(${SCRIPTURL}?action=getDashboard&token=${token})

// POST
fetch(SCRIPTURL, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify({ action: 'login', token: token, ...data })
})
`

Struktur URL & Endpoint API
GET Endpoints (Tidak mengubah data)

| Action | Auth | Role | Parameter |
|--------|------|------|-----------|
| getPublicSettings | ❌ | Publik | — |
| getAnnouncements | ❌ | Publik | limit |
| getEvents | ❌ | Publik | month, year |
| getDashboard | ✅ | All | — |
| getTransactions | ✅ | All | type, status, startdate, enddate, userid |
| getFinancialReport | ✅ | All | startdate, enddate |
| getChartData | ✅ | All | year |
| getUsers | ✅ | Admin | status, role, search, includedeleted |
| getCategories | ✅ | All | type |
| getBankAccounts | ✅ | All | activeOnly |
| getLogs | ✅ | Admin | userid, logaction, limit |
| getProfile | ✅ | All | userid (admin only) |
| getUnpaidMonths | ✅ | All | userid (admin only) |
| exportReport | ✅ | All | format, year, startdate, enddate |

POST Endpoints (Mengubah data)

| Action | Auth | Role | Key Parameters |
|--------|------|------|----------------|
| login | ❌ | — | identifier, password |
| logout | ✅ | All | — |
| register | ❌ | — | nama, alamat, nohp, email, password |
| updateUser | ✅ | All | userid, fields |
| approveUser | ✅ | Admin | userid |
| rejectUser | ✅ | Admin | userid, reason |
| deleteUser | ✅ | Admin | userid |
| changeUserRole | ✅ | Admin | userid, newrole |
| createTransaction | ✅ | Admin | transaction fields |
| updateTransaction | ✅ | Admin | transactionid, fields |
| validateTransaction | ✅ | Admin | transactionid, status |
| deleteTransaction | ✅ | Admin | transactionid |
| savePaymentDraft | ✅ | Warga | step, data |
| getPaymentDraft | ✅ | Warga | — |
| submitPayment | ✅ | Warga | payment fields |
| createCategory | ✅ | Admin | category fields |
| createBankAccount | ✅ | Admin | account fields |
| createEvent | ✅ | Admin | event fields |
| createAnnouncement | ✅ | Admin | announcement fields |
| updateSetting | ✅ | Admin | key, value |
| uploadFile | ✅ | All | base64, filename, foldertype |
| exportReport | ✅ | All | format, year |

Struktur Halaman (SPA Router)
Diagram Halaman

`
┌─────────────────────────────────────────────────────────────────┐
│                        ROUTING MAP                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PUBLIC ROUTES (no auth)                                        │
│  ├── /                    → Landing Page                        │
│  ├── /login               → Login Page                          │
│  └── /register            → Register Page                       │
│                                                                 │
│  WARGA ROUTES (auth: warga + admin)                             │
│  ├── /dashboard           → Dashboard (summary, charts)         │
│  ├── /bayar               → Payment Wizard                      │
│  ├── /riwayat             → Payment History                     │
│  ├── /kegiatan            → Events Calendar                     │
│  ├── /pengumuman          → Announcements                       │
│  ├── /laporan             → Financial Report                    │
│  └── /profil              → Edit Profile                        │
│                                                                 │
│  ADMIN ROUTES (auth: admin only)                                │
│  ├── /admin/dashboard     → Admin Dashboard                     │
│  ├── /admin/users         → User Management                     │
│  ├── /admin/transaksi     → Transaction Management              │
│  ├── /admin/validasi      → Pending Validations                 │
│  ├── /admin/kategori      → Category Management                 │
│  ├── /admin/rekening      → Bank Account Management             │
│  ├── /admin/kegiatan      → Event Management                    │
│  ├── /admin/pengumuman    → Announcement Management             │
│  ├── /admin/laporan       → Advanced Reports                    │
│  ├── /admin/logs          → Activity Logs                       │
│  └── /admin/settings      → App Settings                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
`

Functional Requirements (Detail)
9.1 Landing Page (BARU)

Halaman publik yang dapat diakses siapa saja tanpa login.

Sections:
Hero — Nama RT, tagline, tombol "Login" & "Daftar"
Tentang RT 11 — Profil singkat Komplek Pradha Ciganitri
Transparansi Keuangan — Summary saldo publik (total income, expense, balance)
Kegiatan Terbaru — 3 card kegiatan terakhir
Pengumuman — 3 pengumuman terbaru
Cara Bayar — Step visual cara membayar IWK
Kontak & Lokasi — Info pengurus, WhatsApp admin
Footer — Copyright, link penting

Data yang diambil (tanpa auth):
• getPublicSettings → nama app, alamat, WA admin
• getAnnouncements → 3 terbaru
• getEvents → 3 terbaru
• getDashboard → summary (ditampilkan sebagian, tanpa breakdown user)

9.2 Autentikasi
Flow Registrasi
`
User isi form → Validasi frontend → POST register
      ↓
  Status: PENDING
      ↓
Admin terima notifikasi → Review di /admin/users
      ↓
  APPROVE → status: approved → User bisa login
  REJECT  → status: rejected → User dapat pesan penolakan
`

Flow Login
`
User input ID/Email + Password → POST login
      ↓
  Rate limit check (5x / 5 menit)
      ↓
  Verifikasi password hash
      ↓
  Generate session token (24 jam)
      ↓
  Simpan token di localStorage
      ↓
  Redirect ke /dashboard
`

Session Management
• Token disimpan di localStorage (key: iwktoken)
• Setiap request sertakan token di parameter
• Token expired → redirect ke /login
• Logout → POST logout → hapus token lokal

9.3 Dashboard

Admin Dashboard:
• Total saldo kas
• Pemasukan & pengeluaran bulan ini
• Jumlah warga terdaftar
• Jumlah transaksi pending (badge alert)
• Bar Chart: income vs expense 12 bulan
• Pie Chart: distribusi pengeluaran per kategori
• Line Chart: tren saldo
• Filter tahun untuk semua chart (default: tahun berjalan)
• Panel Download Laporan:
    - Pilih bulan/periode (month picker atau range)
    - Pilih format: PDF / Excel / CSV
    - Tombol "Download" → exportReport → buka file_url
• Tabel transaksi pending (quick action approve/reject)
• Pengumuman terbaru

Warga Dashboard:
• Status pembayaran bulan ini (Lunas / Belum Lunas)
• Riwayat 3 pembayaran terakhir
• Bulan yang belum dibayar (dari getUnpaidMonths)
• Tombol bayar iuran
• Pengumuman terbaru
• Kegiatan mendatang
[TAMBAHAN]
• Bar Chart: Income vs Expense 12 bulan (dari getChartData)
• Pie Chart: Distribusi pengeluaran per kategori
• Line Chart: Tren saldo sepanjang tahun
• Filter tahun untuk semua chart (default: tahun berjalan)
• Panel Download Laporan:
    - Pilih bulan/periode (month picker atau range)
    - Pilih format: PDF / Excel / CSV
    - Tombol "Download" → exportReport → buka file_url
    

9.4 Payment Wizard (6 Langkah)

`
STEP 1: Pilih Bulan
   └── List bulan yang belum dibayar (dari getUnpaidMonths)
   └── Nominal default dari settings (defaultiwknominal)

STEP 2: Pilih Metode Pembayaran
   └── Transfer Bank / QRIS / Cash
   └── Data dari getBankAccounts

STEP 3: Tampilkan Info Rekening / QRIS
   └── Nomor rekening + nama bank + logo
   └── QR Code jika QRIS
   └── Nominal yang harus dibayar

STEP 4: Upload Bukti Transfer
   └── Pilih file (JPG/PNG/PDF, max 5MB)
   └── Preview file
   └── POST uploadFile → dapat buktiurl

STEP 5: Preview & Konfirmasi
   └── Ringkasan: bulan, nominal, metode, bukti
   └── Tombol "Kembali" & "Submit"

STEP 6: Sukses
   └── POST submitPayment
   └── Tampil: ID Transaksi, status Pending
   └── Tombol "Kirim ke WhatsApp Admin" (auto redirect)
   └── Format WA: Islami + detail pembayaran
`

Autosave: Setiap step → savePaymentDraft ke backend

9.5 Laporan Keuangan

Filter:
• Periode: Bulanan / Kuartal / Tahunan / Custom range
• Type: Semua / Income / Expense
• Status: Semua / Approved

Tampilan:
• Tabel transaksi dengan pagination
• Summary card (total in, out, balance)
• Chart untuk periode dipilih

Export:
`
Format PDF   → generatePdfReport() → Google Docs → link download
Format Excel → generateExcelReport() → Google Sheets → .xlsx download
Format CSV   → generateCsvReport() → file .csv download
`

9.6 Kalender Kegiatan
• Tampilan kalender bulanan
• Dot marker pada tanggal yang ada kegiatan
• Klik tanggal → list kegiatan hari itu
• Card kegiatan: judul, deskripsi, lokasi, foto, file PDF
• Filter by bulan/tahun
• Admin: tombol tambah/edit/hapus kegiatan

Struktur Data (Sesuai Code.gs)
10.1 Enums yang Digunakan Backend

`javascript
TRANSACTIONTYPE:     ['income', 'expense']
USERSTATUS:          ['pending', 'approved', 'rejected']
USERROLES:           ['admin', 'warga']
PAYMENTMETHOD:       ['transfer', 'qris', 'cash']
TRANSACTIONSTATUS:   ['pending', 'approved', 'rejected']

KATEGORIINCOME: [
  'IURANBULANAN', 'IURANINSIDENTAL', 'DONASI',
  'DENDA', 'SALDOAWAL', 'LAINLAIN'
]

KATEGORIEXPENSE: [
  'OPERASIONALRUTIN', 'ADMINISTRASI', 'INFRASTRUKTURLINGKUNGAN',
  'SOSIALKEMANUSIAAN', 'KEGIATANWARGA', 'LAINLAIN'
]
`

10.2 Default Category IDs

| ID | Nama | Type |
|----|------|------|
| CAT-IB | Iuran Bulanan | income |
| CAT-II | Iuran Insidental | income |
| CAT-DON | Donasi | income |
| CAT-DND | Denda | income |
| CAT-SA | Saldo Awal | income |
| CAT-LIN | Lain-lain (Pemasukan) | income |
| CAT-OR | Operasional Rutin | expense |
| CAT-ADM | Administrasi | expense |
| CAT-INF | Infrastruktur Lingkungan | expense |
| CAT-SOS | Sosial Kemanusiaan | expense |
| CAT-KGT | Kegiatan Warga | expense |
| CAT-LEX | Lain-lain (Pengeluaran) | expense |

10.3 Format Data Penting

`
ID Format:
  USR-[timestamp][random]   → User
  TRX-[timestamp][random]   → Transaksi
  CAT-[timestamp][random]   → Kategori
  BNK-[timestamp][random]   → Rekening
  EVT-[timestamp][random]   → Event
  ANN-[timestamp][random]   → Pengumuman
  FIL-[timestamp][random]   → File
  LOG-[timestamp][random]   → Log
  PSB-[timestamp][random]   → Payment Submission

Bulan Iuran: "MM-YYYY" (contoh: "06-2025")
Tanggal:     "YYYY-MM-DD" (ISO, untuk input/filter)
Display:     "DD-MM-YYYY" (untuk tampil ke user)
Alamat:      Selalu diawali "Blok B " (auto-prefix dari backend)
`

Diagram Flow Lengkap
11.1 Flow Autentikasi

`
┌──────────┐     POST login          ┌──────────────┐
│  Client  │ ──────────────────────► │  GAS Backend │
│          │  {identifier, password} │              │
│          │ ◄──────────────────────  │  Rate limit  │
│          │  {success, token, user} │  check       │
│          │                         │  Hash verify │
│  Store   │                         │  Gen token   │
│  token   │                         │  Log login   │
│  in LS   │                         └──────────────┘
└──────────┘

Next request:
┌──────────┐  GET ?action=X&token=T  ┌──────────────┐
│  Client  │ ──────────────────────► │  verifyToken │
│          │                         │  → getUser   │
│          │ ◄────────────────────── │  → execute   │
│          │  {success, data}        │  action      │
└──────────┘                         └──────────────┘
`

11.2 Flow Payment Wizard

`
┌─────────┐
│  STEP 1 │ Pilih bulan (getUnpaidMonths)
└────┬────┘
     │ savePaymentDraft(step=1)
┌────▼────┐
│  STEP 2 │ Pilih metode (getBankAccounts)
└────┬────┘
     │ savePaymentDraft(step=2)
┌────▼────┐
│  STEP 3 │ Tampil rekening/QRIS
└────┬────┘
     │ savePaymentDraft(step=3)
┌────▼────┐
│  STEP 4 │ Upload bukti → uploadFile → dapat buktiurl
└────┬────┘
     │ savePaymentDraft(step=4, buktiurl)
┌────▼────┐
│  STEP 5 │ Preview konfirmasi
└────┬────┘
     │
┌────▼────┐
│  STEP 6 │ submitPayment → createTransaction (status:pending)
└────┬────┘  → update draft status: submitted
     │       → generate WA URL
     ▼
  Redirect wa.me/{admin}?text={pesanislami}
`

11.3 Flow Admin Validasi

`
Admin buka /admin/validasi
         │
         ▼
  getTransactions({status:'pending'})
         │
         ▼
  Tabel transaksi pending
  [Approve] [Reject]
         │
   ┌─────┴──────┐
   ▼            ▼
validateTx   validateTx
(approved)   (rejected)
   │            │
   ▼            ▼
updateMonthly  Log activity
Balance        Notif warga
`

11.4 Flow Export Laporan

`
User klik Export
      │
      ├── format=pdf
      │      └── buildReportPayload()
      │          └── generatePdfReport()
      │              └── DocumentApp.create()
      │                  └── Export as PDF
      │                      └── Save to Drive /reports/
      │                          └── Return download URL
      │
      ├── format=excel
      │      └── buildReportPayload()
      │          └── generateExcelReport()
      │              └── SpreadsheetApp.create()
      │                  └── Export as .xlsx
      │                      └── Return download URL
      │
      └── format=csv
             └── buildReportPayload()
                 └── generateCsvReport()
                     └── Blob CSV
                         └── Save to Drive
                             └── Return content + URL
`

Struktur File Frontend (Rekomendasi)

`
/frontend (Vercel)
├── index.html              ← SPA entry point
├── vercel.json             ← Rewrite rules (SPA routing)
│
├── /css
│   ├── main.css            ← Global styles
│   ├── landing.css         ← Landing page
│   ├── dashboard.css       ← Dashboard
│   ├── wizard.css          ← Payment wizard
│   └── components.css      ← Shared components
│
├── /js
│   ├── app.js              ← SPA Router & init
│   ├── config.js           ← SCRIPTURL, constants
│   ├── api.js              ← API helper (fetch wrapper)
│   ├── auth.js             ← Login, logout, session
│   │
│   ├── /pages
│   │   ├── landing.js      ← Landing page logic
│   │   ├── login.js
│   │   ├── register.js
│   │   ├── dashboard.js
│   │   ├── payment.js      ← Wizard 6 steps
│   │   ├── history.js
│   │   ├── events.js
│   │   ├── announcements.js
│   │   ├── report.js
│   │   ├── profile.js
│   │   └── /admin
│   │       ├── users.js
│   │       ├── transactions.js
│   │       ├── validasi.js
│   │       ├── events.js
│   │       ├── settings.js
│   │       └── logs.js
│   │
│   └── /components
│       ├── navbar.js
│       ├── sidebar.js
│       ├── chart.js        ← Chart.js wrapper
│       ├── calendar.js
│       ├── modal.js
│       ├── toast.js
│       └── loader.js
│
└── /assets
    ├── /images
    └── /icons
`

vercel.json (SPA Routing)

`json
{
  "rewrites": [
    { "source": "/((?!api|next|assets|css|js).)", "destination": "/index.html" }
  ]
}
`

config.js

`javascript
const CONFIG = {
  SCRIPTURL: 'https://script.google.com/macros/s/YOURDEPLOYMENTID/exec',
  APPNAME: 'IWK RT 11',
  TOKENKEY: 'iwktoken',
  USERKEY: 'iwkuser',
};
`

api.js (Fetch Wrapper — CORS Safe)

`javascript
async function api(action, params = {}, method = 'GET') {
  const token = localStorage.getItem(CONFIG.TOKENKEY) || '';

  try {
    if (method === 'GET') {
      const qs = new URLSearchParams({ action, token, ...params }).toString();
      const res = await fetch(${CONFIG.SCRIPTURL}?${qs}, {
        redirect: 'follow'
      });
      return await res.json();
    }

    const res = await fetch(CONFIG.SCRIPTURL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token, ...params })
    });
    return await res.json();

  } catch (err) {
    return { success: false, message: Network error: ${err.message} };
  }
}
`

UI/UX Guidelines
Desain System

| Elemen | Spesifikasi |
|--------|-------------|
| Primary Color | #1a3c5e (Navy) |
| Accent Color | #2e7d32 (Hijau) |
| Danger Color | #c62828 (Merah) |
| Warning Color | #f9a825 (Emas) |
| Background | #f5f7fa |
| Font | Inter / Poppins |
| Border Radius | 12px (card), 8px (button) |
| Shadow | 0 2px 12px rgba(0,0,0,0.08) |

Prinsip UX
• Mobile-first — Semua halaman responsif
• Max 3 klik untuk aksi utama
• Loading state di setiap fetch
• Toast notification untuk feedback aksi
• Empty state jika data kosong
• Error state jika fetch gagal dengan tombol retry
• Offline detection — Tampil banner jika offline

Komponen Utama
• Card-based layout
• Wizard step indicator (progress bar)
• Chart interaktif (Chart.js)
• Kalender bulanan dengan event dot
• Modal konfirmasi sebelum delete/reject
• Badge counter untuk pending items (admin)
• Skeleton loading placeholder

Security Requirements

| Aspek | Implementasi |
|-------|-------------|
| Authentication | Session token SHA-256 + expiry 24 jam |
| Authorization | requireAuth() + requireAdmin() middleware di backend |
| Password | SHA-256 hash + salt dari Script Properties |
| IDOR Prevention | Backend cek user.id vs targetid untuk non-admin |
| Rate Limiting | Login: 5x/5min, Register: 3x/10min, exponential backoff |
| Input Sanitasi | cleanString() semua input teks |
| File Upload | Validasi MIME type + max 5MB |
| Session Hijacking | Single-session policy (invalidasi sesi lama saat login baru) |
| Token Storage | localStorage (tidak ideal untuk high-security, tapi cukup untuk use case ini) |

Deployment Checklist
Backend (Google Apps Script)

`
□ Buat Google Spreadsheet baru
□ Catat SPREADSHEETID → update CONFIG
□ Buat Google Drive folder utama
□ Catat DRIVEFOLDERID → update CONFIG
□ Jalankan setupSecureProperties() → generate PASSWORDSALT
□ Jalankan initializeAllSheets() → buat semua sheet + header
□ Jalankan initializeDriveFolders() → buat sub-folder
□ Deploy sebagai Web App:
    Execute as: Me
    Who has access: Anyone
□ Catat DEPLOYMENT URL
□ (Opsional) Setup Time Trigger cleanupExpiredSessions() → setiap hari jam 00:00
`

Frontend (Vercel)

`
□ Update config.js → SCRIPTURL dengan deployment URL GAS
□ Pastikan semua fetch() menggunakan redirect: 'follow'
□ Pastikan semua POST menggunakan Content-Type: text/plain;charset=utf-8
□ Tambahkan vercel.json untuk SPA routing
□ Deploy ke Vercel
□ Test semua flow utama:
    □ Register → Approve → Login
    □ Payment Wizard 6 step
    □ Export PDF/Excel/CSV
    □ Admin validasi transaksi
`

Testing Plan
Skenario Utama

| # | Skenario | Expected |
|---|----------|----------|
| 1 | Register warga baru | Status pending, muncul di admin |
| 2 | Admin approve user | Status approved, user bisa login |
| 3 | Login dengan ID | Token valid, redirect dashboard |
| 4 | Login 6x salah | Rate limit aktif, cooldown |
| 5 | Payment wizard full | Transaksi pending terbuat |
| 6 | Admin approve transaksi | Saldo bulanan terupdate |
| 7 | Export laporan PDF | File tersimpan di Drive, URL valid |
| 8 | Upload file > 5MB | Error validasi |
| 9 | Warga akses admin route | Akses ditolak |
| 10 | Token expired | Redirect ke login |

Future Roadmap
Phase 2
• WhatsApp API otomatis (notifikasi push)
• Payment gateway (Midtrans/Xendit)
• Multi RT system
• Progressive Web App (PWA)

Phase 3
• AI ringkasan laporan keuangan
• Reminder otomatis iuran (bulanan)
• Dashboard statistik lanjutan
• Integrasi e-wallet

Referensi Data Penting

| Item | Value |
|------|-------|
| Google Sheets URL | https://docs.google.com/spreadsheets/d/1dR9gFKKa0veginNzAtUaNh7v1IBtPGgECDqQp7qqWRA/edit |
| Google Drive URL | https://drive.google.com/drive/folders/1AF4smi0enImC30GaP_x8kC4BdSi-LWwh |
| Default WA Admin | 628568999001 |
| Default Nominal IWK | Rp 100.000 |
| Alamat RT | Komplek Pradha Ciganitri |
| Session Timeout | 24 jam |
| Max File Size | 5 MB |
| Allowed File Types | JPG, PNG, PDF` |

PRD ini disinkronkan dengan Code.gs v1.0.0 dan mencakup semua fungsi yang tersedia di backend.*
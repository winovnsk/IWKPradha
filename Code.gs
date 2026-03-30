/**
 * ============================================================================
 * SISTEM IWK & MANAJEMEN KEGIATAN RT 11
 * Backend Code.gs - Google Apps Script
 * Version: 1.0.0
 * ============================================================================
 * 
 * Fitur Lengkap:
 * - Authentication & Authorization
 * - CRUD Users, Transactions, Categories, Bank Accounts, Events, Announcements
 * - Dashboard & Financial Reports
 * - Chart Data (Bar, Pie, Line)
 * - File Management (Google Drive)
 * - Activity Logs
 * - WhatsApp Integration
 * - Auto Initialize Headers & Folders
 * - Testing Functions with Dummy Data
 */

// ============================================================================
// SECTION 1: CONFIGURATION & CONSTANTS
// ============================================================================

/**
 * Konfigurasi utama aplikasi
 * Sesuaikan dengan ID Google Sheets dan Drive Anda
 */
const CONFIG = {
  // Google Sheets ID - Ganti dengan ID Spreadsheet Anda
  SPREADSHEET_ID: '1dR9gFKKa0veginNzAtUaNh7v1IBtPGgECDqQp7qqWRA',
  
  // Google Drive Folder ID - Ganti dengan ID Folder Utama Anda
  DRIVE_FOLDER_ID: '1AF4smi0enImC30GaP_x8kC4BdSi-LWwh',
  
  // Nama Sheet
  SHEETS: {
    USERS: 'users',
    TRANSACTIONS: 'transactions',
    CATEGORIES: 'categories',
    BANK_ACCOUNTS: 'bank_accounts',
    SETTINGS: 'settings',
    EVENTS: 'events',
    ANNOUNCEMENTS: 'announcements',
    PAYMENT_SUBMISSIONS: 'payment_submissions',
    FILES: 'files',
    LOGS: 'logs',
    MONTHLY_BALANCES: 'monthly_balances',
    NOTIFICATIONS: 'notifications'
  },
  
  // Nama Sub-folder di Google Drive
  FOLDERS: {
    BUKTI_TRANSFER: 'bukti_transfer',
    EVENTS: 'events',
    REPORTS: 'reports',
    PROFILES: 'profiles'
  },

  // Salt untuk hash password (wajib di Script Properties)
  PASSWORD_SALT: '',
  
  // Prefix ID untuk setiap entitas
  ID_PREFIX: {
    USER: 'USR',
    TRANSACTION: 'TRX',
    CATEGORY: 'CAT',
    BANK: 'BNK',
    EVENT: 'EVT',
    ANNOUNCEMENT: 'ANN',
    FILE: 'FIL',
    LOG: 'LOG',
    NOTIFICATION: 'NTF',
    PAYMENT_SUBMISSION: 'PSB'
  },
  
  // Enum Values
  ENUMS: {
    USERSTATUS: ['pending', 'approved', 'rejected'],
    USERROLES: ['admin', 'warga'],
    TRANSACTIONTYPE: ['income', 'expense'],
    KATEGORIPEMASUKAN: [
      'IURANBULANAN',
      'IURANINSIDENTAL',
      'DONASI',
      'DENDA',
      'SALDOAWAL',
      'LAINLAIN'
    ],
    KATEGORIPENGELUARAN: [
      'OPERASIONALRUTIN',
      'ADMINISTRASI',
      'INFRASTRUKTURLINGKUNGAN',
      'SOSIALKEMANUSIAAN',
      'KEGIATANWARGA',
      'LAINLAIN'
    ],
    PAYMENTMETHOD: ['transfer', 'qris', 'cash'],
    TRANSACTIONSTATUS: ['pending', 'approved', 'rejected'],
    FILETYPE: ['bukti', 'event', 'laporan', 'profile']
  },
  
  // Session timeout dalam jam
  SESSION_TIMEOUT_HOURS: 24,
  
  // Max file upload size dalam bytes (5MB)
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  
  // Allowed file types
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
};

// ============================================================================
// SECTION 2: SHEET & DRIVE INITIALIZATION
// ============================================================================

/**
 * Inisialisasi semua sheet dengan header otomatis
 * Fungsi ini harus dijalankan sekali saat pertama kali setup
 */
function initializeAllSheets() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const results = {
    success: [],
    errors: []
  };
  
  // Definisi header untuk setiap sheet
  const sheetHeaders = {
    [CONFIG.SHEETS.USERS]: [
      'id', 'nama', 'alamat', 'no_hp', 'email', 'password_hash', 'role', 
      'status', 'foto_url', 'created_at', 'approved_at', 'approved_by', 'last_login'
    ],
    [CONFIG.SHEETS.TRANSACTIONS]: [
      'id', 'user_id', 'type', 'source', 'category_id', 'nominal', 'tanggal', 
      'bulan_iuran', 'metode_pembayaran', 'rekening_id', 'bukti_url', 'status', 
      'deskripsi', 'created_at', 'created_by', 'validated_at', 'validated_by'
    ],
    [CONFIG.SHEETS.CATEGORIES]: [
      'id', 'name', 'type', 'is_active', 'created_at'
    ],
    [CONFIG.SHEETS.BANK_ACCOUNTS]: [
      'id', 'nama_bank', 'nomor_rekening', 'nama_pemilik', 'cabang', 
      'logo_url', 'is_qris', 'qris_image_url', 'is_active', 'display_order', 
      'created_at', 'updated_at'
    ],
    [CONFIG.SHEETS.SETTINGS]: [
      'key', 'value', 'description', 'updated_at'
    ],
    [CONFIG.SHEETS.EVENTS]: [
      'id', 'title', 'description', 'tanggal_mulai', 'tanggal_selesai', 
      'lokasi', 'foto_url', 'file_url', 'created_by', 'created_at', 'is_active'
    ],
    [CONFIG.SHEETS.ANNOUNCEMENTS]: [
      'id', 'title', 'content', 'tanggal', 'created_by', 'is_active'
    ],
    [CONFIG.SHEETS.PAYMENT_SUBMISSIONS]: [
      'id', 'user_id', 'step', 'data_json', 'status', 'created_at'
    ],
    [CONFIG.SHEETS.FILES]: [
      'id', 'related_id', 'type', 'file_name', 'file_url', 'uploaded_by', 'created_at'
    ],
    [CONFIG.SHEETS.LOGS]: [
      'id', 'user_id', 'action', 'entity', 'entity_id', 'metadata', 'created_at'
    ],
    [CONFIG.SHEETS.MONTHLY_BALANCES]: [
      'id', 'bulan', 'opening_balance', 'total_income', 'total_expense', 
      'closing_balance', 'last_updated'
    ],
    [CONFIG.SHEETS.NOTIFICATIONS]: [
      'id', 'user_id', 'title', 'message', 'is_read', 'created_at'
    ]
  };
  
  // Buat atau update setiap sheet
  for (const [sheetName, headers] of Object.entries(sheetHeaders)) {
    try {
      let sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        // Buat sheet baru jika belum ada
        sheet = ss.insertSheet(sheetName);
      }
      
      // Cek apakah header sudah ada
      const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
      const isEmpty = firstRow.every(cell => cell === '');
      
      if (isEmpty) {
        // Set header
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        
        // Format header
        const headerRange = sheet.getRange(1, 1, 1, headers.length);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#4285f4');
        headerRange.setFontColor('#ffffff');
        headerRange.setHorizontalAlignment('center');
        
        // Freeze header row
        sheet.setFrozenRows(1);
        
        // Auto resize columns
        sheet.autoResizeColumns(1, headers.length);
      }
      
      results.success.push(`Sheet '${sheetName}' berhasil diinisialisasi`);
    } catch (error) {
      results.errors.push(`Error pada sheet '${sheetName}': ${error.message}`);
    }
  }
  
  // Inisialisasi default data
  try {
    initializeDefaultCategories();
    initializeDefaultSettings();
    initializeDefaultBankAccounts();
    results.success.push('Data default berhasil diinisialisasi');
  } catch (error) {
    results.errors.push(`Error inisialisasi data default: ${error.message}`);
  }
  
  return results;
}

/**
 * Inisialisasi sub-folder di Google Drive
 */
function initializeDriveFolders() {
  const results = {
    success: [],
    errors: [],
    folderIds: {}
  };
  
  try {
    const parentFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    
    for (const [configKey, actualFolderName] of Object.entries(CONFIG.FOLDERS)) {
      try {
        // Cek apakah folder sudah ada
        const existingFolders = parentFolder.getFoldersByName(actualFolderName);
        
        if (existingFolders.hasNext()) {
          const folder = existingFolders.next();
          results.folderIds[configKey] = folder.getId();
          results.success.push(`Folder '${actualFolderName}' sudah ada: ${folder.getId()}`);
        } else {
          // Buat folder baru
          const newFolder = parentFolder.createFolder(actualFolderName);
          results.folderIds[configKey] = newFolder.getId();
          results.success.push(`Folder '${actualFolderName}' berhasil dibuat: ${newFolder.getId()}`);
        }
      } catch (error) {
        results.errors.push(`Error membuat folder '${actualFolderName}': ${error.message}`);
      }
    }
  } catch (error) {
    results.errors.push(`Error akses parent folder: ${error.message}`);
  }
  
  return results;
}

/**
 * Inisialisasi kategori default
 */
function initializeDefaultCategories() {
  const sheet = getSheet(CONFIG.SHEETS.CATEGORIES);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    const categories = [
      // ── Pemasukan ──────────────────────────────────────────────────────
      { id: 'CAT-IB', name: 'Iuran Bulanan', type: 'income', source: 'IURANBULANAN', isactive: true },
      { id: 'CAT-II', name: 'Iuran Insidental', type: 'income', source: 'IURANINSIDENTAL', isactive: true },
      { id: 'CAT-DON', name: 'Donasi', type: 'income', source: 'DONASI', isactive: true },
      { id: 'CAT-DND', name: 'Denda', type: 'income', source: 'DENDA', isactive: true },
      { id: 'CAT-SA', name: 'Saldo Awal', type: 'income', source: 'SALDOAWAL', isactive: true },
      { id: 'CAT-LIN', name: 'Lain-lain (Pemasukan)', type: 'income', source: 'LAINLAIN', isactive: true },
      // ── Pengeluaran ────────────────────────────────────────────────────
      { id: 'CAT-OR', name: 'Operasional Rutin', type: 'expense', source: 'OPERASIONALRUTIN', isactive: true },
      { id: 'CAT-ADM', name: 'Administrasi', type: 'expense', source: 'ADMINISTRASI', isactive: true },
      { id: 'CAT-INF', name: 'Infrastruktur Lingkungan', type: 'expense', source: 'INFRASTRUKTURLINGKUNGAN', isactive: true },
      { id: 'CAT-SOS', name: 'Sosial Kemanusiaan', type: 'expense', source: 'SOSIALKEMANUSIAAN', isactive: true },
      { id: 'CAT-KGT', name: 'Kegiatan Warga', type: 'expense', source: 'KEGIATANWARGA', isactive: true },
      { id: 'CAT-LEX', name: 'Lain-lain (Pengeluaran)', type: 'expense', source: 'LAINLAIN', isactive: true }
    ];

    const now = getCurrentDateTime();
    const rows = categories.map(cat => [
      cat.id, cat.name, cat.type, cat.isactive, now
    ]);

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 5).setValues(rows);
    }
  }
}

/**
 * Inisialisasi settings default
 */
function initializeDefaultSettings() {
  const sheet = getSheet(CONFIG.SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) { // Hanya header
    const settings = [
      { key: 'app_name', value: 'IWK RT 11', description: 'Nama aplikasi' },
      { key: 'whatsapp_admin', value: '628568999001', description: 'Nomor WhatsApp admin' },
      { key: 'default_iwk_nominal', value: '100000', description: 'Nominal iuran default' },
      { key: 'logo_app', value: '', description: 'URL logo aplikasi' },
      { key: 'alamat_rt', value: 'Komplek Pradha', description: 'Alamat RT' },
      { key: 'opening_balance', value: '0', description: 'Saldo awal periode' }
    ];
    
    const now = getCurrentDateTime();
    const rows = settings.map(s => [s.key, s.value, s.description, now]);
    
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 4).setValues(rows);
    }
  }
}

/**
 * Inisialisasi rekening bank default
 */
function initializeDefaultBankAccounts() {
  const sheet = getSheet(CONFIG.SHEETS.BANK_ACCOUNTS);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) { // Hanya header
    const accounts = [
      {
        id: 'BNK-001',
        nama_bank: 'BCA',
        nomor_rekening: '1234567890',
        nama_pemilik: 'RT 11',
        cabang: 'Jakarta',
        logo_url: '',
        is_qris: false,
        qris_image_url: '',
        is_active: true,
        display_order: 1
      },
      {
        id: 'BNK-002',
        nama_bank: 'QRIS',
        nomor_rekening: '',
        nama_pemilik: 'RT 11',
        cabang: '',
        logo_url: '',
        is_qris: true,
        qris_image_url: '',
        is_active: true,
        display_order: 2
      }
    ];
    
    const now = getCurrentDateTime();
    const rows = accounts.map(acc => [
      acc.id, acc.nama_bank, acc.nomor_rekening, acc.nama_pemilik, acc.cabang,
      acc.logo_url, acc.is_qris, acc.qris_image_url, acc.is_active, acc.display_order,
      now, now
    ]);
    
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 12).setValues(rows);
    }
  }
}

// ============================================================================
// SECTION 3: UTILITY FUNCTIONS
// ============================================================================

/**
 * Mendapatkan sheet berdasarkan nama
 */
function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    // Auto create jika belum ada
    ss.insertSheet(sheetName);
    sheet = ss.getSheetByName(sheetName);
  }
  
  return sheet;
}

/**
 * Generate UUID dengan prefix
 */
function generateId(prefix) {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}${randomPart}`.toUpperCase();
}

/**
 * Mendapatkan tanggal/waktu saat ini dalam format ISO
 */
function getCurrentDateTime() {
  return new Date().toISOString();
}

/**
 * Normalisasi nilai boolean dari Google Sheets / input string
 */
function isTruthy(val) {
  return val === true || String(val).toLowerCase() === 'true';
}

/**
 * Parse tanggal dengan aman, mempertahankan Date object dari sheet
 */
function safeDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format tanggal untuk display
 */
function formatDate(date, format = 'DD-MM-YYYY') {
  const d = safeDate(date);
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  switch (format) {
    case 'DD-MM-YYYY': return `${day}-${month}-${year}`;
    case 'MM-YYYY': return `${month}-${year}`; // Format konsisten untuk iuran
    case 'DD-MM-YYYY HH:mm:ss': return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
    case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
    default: return `${day}-${month}-${year}`;
  }
}

/**
 * Hash password menggunakan SHA-256
 */
function setupSecureProperties() {
  const props = PropertiesService.getScriptProperties();
  const existingSalt = props.getProperty('PASSWORD_SALT');

  if (!existingSalt) {
    const generatedSalt = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('PASSWORD_SALT', generatedSalt);
    console.log('PASSWORD_SALT berhasil dibuat di Script Properties');
    return generatedSalt;
  }

  return existingSalt;
}

function getPasswordSalt() {
  const scriptProps = PropertiesService.getScriptProperties();
  return scriptProps.getProperty('PASSWORD_SALT') || setupSecureProperties();
}

function hashPassword(password) {
  const salt = getPasswordSalt();
  if (!salt) {
    throw new Error('PASSWORD_SALT belum dikonfigurasi');
  }
  const salted = password + salt;
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salted);
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

/**
 * Verifikasi password
 */
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

/**
 * Parse JSON dengan aman
 */
function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Convert sheet data ke array of objects
 */
function sheetToArray(sheetData) {
  if (!sheetData || sheetData.length <= 1) return [];
  
  const headers = sheetData[0];
  const rows = sheetData.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * Find row index by column value
 */
function findRowIndex(sheet, columnIndex, searchValue, caseSensitive = false) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  // Optimasi: Hanya baca 1 kolom yang dicari, bukan seluruh data sheet
  const columnData = sheet.getRange(2, columnIndex, lastRow - 1, 1).getValues();
  const searchStr = caseSensitive ? String(searchValue) : String(searchValue).toLowerCase();
  for (let i = 0; i < columnData.length; i++) {
    const cellStr = caseSensitive
      ? String(columnData[i][0])
      : String(columnData[i][0]).toLowerCase();
    if (cellStr === searchStr) return i + 2;
  }
  return -1;
}

/**
 * Find row data by column value
 */
function findRowByValue(sheet, columnIndex, searchValue, caseSensitive = true) {
  const rowIndex = findRowIndex(sheet, columnIndex, searchValue, caseSensitive);
  if (rowIndex > 0) {
    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const rowData = sheet.getRange(rowIndex, 1, 1, lastCol).getValues()[0];
    const obj = {};
    headers.forEach((header, index) => { obj[header] = rowData[index]; });
    return obj;
  }
  return null;
}

// FUNGSI BARU: Mencegah Race Condition
function insertRowWithLock(sheet, rowData) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) { // Tunggu maks 10 detik
    try {
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, 1, rowData.length).setValues([rowData]);
      SpreadsheetApp.flush(); // Paksa tulis langsung
      return true;
    } catch (e) {
      throw new Error('Gagal simpan data: ' + e.message);
    } finally {
      lock.releaseLock();
    }
  } else {
    throw new Error('Sistem sedang sibuk. Silakan coba beberapa saat lagi.');
  }
}

/**
 * Find all rows by column value
 */
function findAllRowsByValue(sheet, columnIndex, searchValue) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const results = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][columnIndex - 1] === searchValue) {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = data[i][index];
      });
      results.push(obj);
    }
  }
  return results;
}

/**
 * Validasi email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validasi nomor HP Indonesia
 */
function isValidPhoneNumber(phone) {
  const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Normalisasi nomor HP ke format canonical (628xxxxxxxxxx)
 */
function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let formatted = String(phone).replace(/[^0-9+]/g, '');
  if (formatted.startsWith('+62')) {
    formatted = '62' + formatted.substring(3);
  } else if (formatted.startsWith('0')) {
    formatted = '62' + formatted.substring(1);
  }
  return formatted;
}

/**
 * Format nomor HP ke format WhatsApp
 */
function formatWhatsAppNumber(phone) {
  let formatted = phone.replace(/[\s-]/g, '');
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.substring(1);
  } else if (formatted.startsWith('+62')) {
    formatted = formatted.substring(1);
  }
  return formatted;
}

/**
 * Encode URL component
 */
function encodeUrlParam(param) {
  return encodeURIComponent(param);
}

/**
 * Get setting value by key
 */
function getSetting(key) {
  const sheet = getSheet(CONFIG.SHEETS.SETTINGS);
  const row = findRowByValue(sheet, 1, key, true);
  return row ? row.value : null;
}

/**
 * Set setting value
 */
function setSetting(key, value, description = '') {
  const sheet = getSheet(CONFIG.SHEETS.SETTINGS);
  const rowIndex = findRowIndex(sheet, 1, key);
  
  if (rowIndex > 0) {
    // Update existing
    sheet.getRange(rowIndex, 2, 1, 2).setValues([[value, description || sheet.getRange(rowIndex, 3).getValue()]]);
    sheet.getRange(rowIndex, 4).setValue(getCurrentDateTime());
  } else {
    // Insert new
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, 1, 4).setValues([[key, value, description, getCurrentDateTime()]]);
  }
  
  return true;
}

/**
 * Clean dan trim string
 */
function cleanString(str) {
  if (!str) return '';
  return String(str).trim();
}

/**
 * Validasi dan format nominal
 */
function formatNominal(nominal) {
  if (!nominal) return 0;
  // Jika input berupa string (misal: "100.000" atau "Rp100.000")
  if (typeof nominal === 'string') {
    nominal = nominal.replace(/[^0-9-]/g, ''); // Buang semua huruf dan tanda baca kecuali minus dan angka
  }
  return Number(nominal) || 0;
}

/**
 * Format currency (Rupiah)
 */
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// ============================================================================
// SECTION 4: AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Login user dengan id/email dan password
 * Mendukung login menggunakan ID user atau email
 */
function loginUser(identifier, password) {
  try {
    // Validasi input
    if (!identifier || !password) {
      return {
        success: false,
        message: 'ID/Email dan password harus diisi'
      };
    }
    const normalizedIdentifier = String(identifier).toLowerCase().trim();
    const loginLimiter = consumeRateLimit('login', normalizedIdentifier, 5, 300);
    if (!loginLimiter.allowed) {
      return {
        success: false,
        message: `Terlalu banyak percobaan login. Coba lagi dalam ${loginLimiter.waitSeconds} detik`
      };
    }
    
    const sheet = getSheet(CONFIG.SHEETS.USERS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Cari user berdasarkan ID atau Email (case insensitive)
    let user = null;
    let userRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      const rowId = String(data[i][0]).toLowerCase(); // id
      const rowEmail = String(data[i][4]).toLowerCase(); // email
      
      if (rowId === normalizedIdentifier || rowEmail === normalizedIdentifier) {
        user = {};
        headers.forEach((header, index) => {
          user[header] = data[i][index];
        });
        userRowIndex = i + 1;
        break;
      }
    }
    
    // User tidak ditemukan
    if (!user) {
      return {
        success: false,
        message: 'ID/Email tidak terdaftar'
      };
    }
    
    // Cek status user
    if (user.status === 'deleted') {
      return {
        success: false,
        message: 'Akun Anda sudah dinonaktifkan'
      };
    }

    if (user.status === 'pending') {
      return {
        success: false,
        message: 'Akun Anda masih menunggu persetujuan admin'
      };
    }
    
    if (user.status === 'rejected') {
      return {
        success: false,
        message: 'Akun Anda telah ditolak. Silakan hubungi admin'
      };
    }
    
    // Verifikasi password
    if (!verifyPassword(password, user.password_hash)) {
      return {
        success: false,
        message: 'Password salah'
      };
    }
    
    // Update last login
    const lastLoginColumn = headers.indexOf('last_login') + 1;
    if (lastLoginColumn > 0 && userRowIndex > 0) {
      sheet.getRange(userRowIndex, lastLoginColumn).setValue(getCurrentDateTime());
    }
    
    // Single-session policy: invalidasi sesi lama sebelum membuat token baru
    invalidateUserSessions(user.id);

    // Generate session token
    const sessionToken = generateSessionToken(user.id);
    
    // Log aktivitas
    logActivity(user.id, 'LOGIN', 'users', user.id, { login_time: getCurrentDateTime() });
    
    // Return user data tanpa password
    const userData = { ...user };
    delete userData.password_hash;
    
    const response = {
      success: true,
      message: 'Login berhasil',
      data: {
        user: userData,
        token: sessionToken
      }
    };
    resetRateLimit('login', normalizedIdentifier);
    return response;
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Generate session token
 */
function generateSessionToken(userId) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const token = hashPassword(`${userId}${timestamp}${random}`);
  
  // Simpan token di settings (sebagai session storage sederhana)
  const sessionKey = `session_${token}`;
  const expiryTime = new Date(Date.now() + CONFIG.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000).toISOString();
  
  setSetting(sessionKey, JSON.stringify({
    user_id: userId,
    created_at: getCurrentDateTime(),
    expires_at: expiryTime
  }), 'Session token');
  clearSessionCache(token);
  
  return token;
}

function invalidateUserSessions(userId) {
  const sheet = getSheet(CONFIG.SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  const rowsToDelete = [];

  for (let i = data.length - 1; i >= 1; i--) {
    const key = String(data[i][0] || '');
    if (!key.startsWith('session_')) continue;

    const sessionData = safeJsonParse(data[i][1]);
    if (sessionData && String(sessionData.user_id) === String(userId)) {
      rowsToDelete.push(i + 1);
    }
  }

  rowsToDelete.sort((a, b) => b - a);
  rowsToDelete.forEach(rowIndex => {
    const token = String(data[rowIndex - 1][0] || '').replace('session_', '');
    clearSessionCache(token);
    sheet.deleteRow(rowIndex);
  });
}

/**
 * Verifikasi session token
 */
function verifySessionToken(token) {
  try {
    if (!token) return null;
    const cachedUser = getSessionCache(token);
    if (cachedUser) return cachedUser;

    const sessionKey = `session_${token}`;
    const sessionData = getSetting(sessionKey);
    if (!sessionData) return null;

    const session = safeJsonParse(sessionData);
    if (!session || !session.expires_at || !session.user_id) return null;

    // Cek expiry lebih awal dan langsung invalidasi
    if (new Date(session.expires_at) <= new Date()) {
      deleteSessionToken(token); // best-effort cleanup
      return null;
    }

    const user = getUserById(session.user_id);
    if (!user || user.status !== 'approved') return null;

    // Sliding session expiry: perpanjang saat sisa masa berlaku sudah < 20%
    const timeoutMs = CONFIG.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000;
    const remainingMs = new Date(session.expires_at).getTime() - Date.now();
    const renewThreshold = 0.2;
    if (remainingMs > 0 && (remainingMs / timeoutMs) < renewThreshold) {
      const newExpiry = new Date(Date.now() + timeoutMs).toISOString();
      session.expires_at = newExpiry;
      setSetting(sessionKey, JSON.stringify(session), 'Session token');
    }
    cacheSessionUser(token, user);

    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Hapus session token (logout)
 */
function deleteSessionToken(token) {
  const sheet = getSheet(CONFIG.SHEETS.SETTINGS);
  const rowIndex = findRowIndex(sheet, 1, `session_${token}`, true);
  
  if (rowIndex > 0) {
    sheet.deleteRow(rowIndex);
  }
  clearSessionCache(token);
}

/**
 * Logout user
 */
function logoutUser(token) {
  try {
    deleteSessionToken(token);
    return {
      success: true,
      message: 'Logout berhasil'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Membersihkan session token yang sudah expired dari sheet SETTINGS
 * Disarankan untuk dijalankan via Time-driven Trigger setiap jam 12 malam
 */
function cleanupExpiredSessions() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.SETTINGS);
    const data = sheet.getDataRange().getValues();
    const rowsToDelete = [];
    const now = new Date();
    
    // Looping dari bawah ke atas agar index tidak bergeser saat menghapus baris
    for (let i = data.length - 1; i >= 1; i--) {
      const key = String(data[i][0]);
      if (key.startsWith('session_')) {
        try {
          const sessionData = JSON.parse(data[i][1]);
          const expiresAt = new Date(sessionData.expires_at);
          
          if (expiresAt < now) {
            clearSessionCache(key.replace('session_', ''));
            rowsToDelete.push(i + 1); // +1 karena sheet index dimulai dari 1
          }
        } catch (e) {
          // Jika JSON korup, hapus saja barisnya
          rowsToDelete.push(i + 1);
        }
      }
    }
    
    // Eksekusi penghapusan (descending untuk mencegah pergeseran indeks)
    rowsToDelete.sort((a, b) => b - a);
    rowsToDelete.forEach(rowIndex => {
      sheet.deleteRow(rowIndex);
    });
    
    return {
      success: true,
      message: `Berhasil menghapus ${rowsToDelete.length} sesi kadaluarsa`
    };
  } catch (error) {
    console.error('Error cleanup sessions:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Normalisasi token auth (dukung format Bearer)
 */
function normalizeAuthToken(rawToken) {
  if (!rawToken) return '';
  const token = String(rawToken).trim();
  return token.toLowerCase().startsWith('bearer ') ? token.substring(7).trim() : token;
}

function getSessionCacheKey(token) {
  return `session_user_${token}`;
}

function getSessionCache(token) {
  const cache = CacheService.getScriptCache();
  const raw = cache.get(getSessionCacheKey(token));
  return raw ? safeJsonParse(raw) : null;
}

function cacheSessionUser(token, user) {
  if (!token || !user) return;
  CacheService.getScriptCache().put(getSessionCacheKey(token), JSON.stringify(user), 600); // 10 menit
}

function clearSessionCache(token) {
  if (!token) return;
  CacheService.getScriptCache().remove(getSessionCacheKey(token));
}

function getRateLimitKey(action, identity) {
  const normalizedIdentity = cleanString(identity || 'anonymous').toLowerCase();
  const digest = Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, normalizedIdentity)
  ).substring(0, 32);
  return `rl_${action}_${digest}`;
}

function consumeRateLimit(action, identity, maxAttempts = 5, windowSeconds = 300) {
  const cache = CacheService.getScriptCache();
  const key = getRateLimitKey(action, identity);
  const now = Date.now();
  const state = safeJsonParse(cache.get(key), { count: 0, blockedUntil: 0 });

  if (state.blockedUntil && now < state.blockedUntil) {
    const waitSeconds = Math.ceil((state.blockedUntil - now) / 1000);
    return { allowed: false, waitSeconds };
  }

  state.count = (Number(state.count) || 0) + 1;
  state.blockedUntil = 0;

  if (state.count > maxAttempts) {
    const extraAttempts = state.count - maxAttempts;
    const cooldownSeconds = Math.min(3600, Math.pow(2, extraAttempts) * 30);
    state.blockedUntil = now + (cooldownSeconds * 1000);
    cache.put(key, JSON.stringify(state), Math.max(windowSeconds, cooldownSeconds));
    return { allowed: false, waitSeconds: cooldownSeconds };
  }

  cache.put(key, JSON.stringify(state), windowSeconds);
  return { allowed: true };
}

function resetRateLimit(action, identity) {
  CacheService.getScriptCache().remove(getRateLimitKey(action, identity));
}

function sanitizeDateParam(value) {
  if (!value) return undefined;
  const clean = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : undefined;
}

/**
 * Middleware untuk mengecek autentikasi
 */
function requireAuth(request) {
  const token = normalizeAuthToken(request.headers?.Authorization || request.token);
  
  if (!token) {
    return {
      authenticated: false,
      message: 'Token autentikasi diperlukan'
    };
  }
  
  const user = verifySessionToken(token);
  
  if (!user) {
    return {
      authenticated: false,
      message: 'Token tidak valid atau sudah expired'
    };
  }
  
  return {
    authenticated: true,
    user: user
  };
}

/**
 * Middleware untuk mengecek role admin
 */
function requireAdmin(user) {
  if (!user || user.role !== 'admin') {
    return {
      authorized: false,
      message: 'Akses ditolak. Hanya admin yang dapat melakukan aksi ini'
    };
  }
  
  return {
    authorized: true
  };
}

// ============================================================================
// SECTION 5: USER MANAGEMENT (CRUD)
// ============================================================================

/**
 * Registrasi user baru
 */
function registerUser(userData) {
  try {
    const registerIdentity = userData?.email || userData?.no_hp || 'anonymous_register';
    const registerLimiter = consumeRateLimit('register', registerIdentity, 3, 600);
    if (!registerLimiter.allowed) {
      return {
        success: false,
        message: `Terlalu banyak percobaan registrasi. Coba lagi dalam ${registerLimiter.waitSeconds} detik`
      };
    }
    
    // Validasi input
    const validation = validateUserData(userData, true);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.message
      };
    }
    
    const sheet = getSheet(CONFIG.SHEETS.USERS);
    
    // Cek duplikat no_hp dan email
    const normalizedPhone = normalizePhoneNumber(userData.no_hp);
    const existingPhone = findRowByValue(sheet, 4, normalizedPhone, false);
    if (existingPhone) {
      return {
        success: false,
        message: 'Nomor HP sudah terdaftar'
      };
    }
    
    if (userData.email) {
      const existingEmail = findRowByValue(sheet, 5, cleanString(userData.email).toLowerCase(), false);
      if (existingEmail) {
        return {
          success: false,
          message: 'Email sudah terdaftar'
        };
      }
    }
    
    // Generate ID
    const userId = generateId(CONFIG.ID_PREFIX.USER);
    
    // Hash password
    const passwordHash = hashPassword(userData.password);
    
    // Prepare row data
    const now = getCurrentDateTime();
    const rowData = [
      userId,
      cleanString(userData.nama),
      cleanString(userData.alamat),
      normalizedPhone,
      cleanString(userData.email).toLowerCase() || '',
      passwordHash,
      'warga', // default role
      'pending', // default status
      '', // foto_url
      now, // created_at
      '', // approved_at
      '', // approved_by
      '' // last_login
    ];
    
    // Insert ke sheet
    insertRowWithLock(sheet, rowData);
    
    // Log aktivitas
    logActivity(userId, 'REGISTER', 'users', userId, { nama: userData.nama });
    
    const response = {
      success: true,
      message: 'Registrasi berhasil. Menunggu persetujuan admin.',
      data: { id: userId }
    };
    resetRateLimit('register', registerIdentity);
    return response;
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Validasi data user
 */
function validateUserData(userData, isRegistration = false) {
  // Validasi nama
  if (!userData.nama || cleanString(userData.nama).length < 3) {
    return { valid: false, message: 'Nama minimal 3 karakter' };
  }
  
  // Normalisasi alamat dengan prefix tetap "Blok B "
  if (userData.alamat !== undefined) {
    const cleaned = cleanString(userData.alamat);
    const PREFIX = 'Blok B ';
    const withoutPrefix = cleaned.replace(/^blok\s+b\s*/i, '');
    userData.alamat = PREFIX + withoutPrefix;
  }
  
  // Validasi alamat (warga cukup isi nomor rumah)
  if (!userData.alamat || cleanString(userData.alamat).length < 5) {
    return { valid: false, message: 'Alamat (nomor rumah) harus diisi' };
  }
  
  // Validasi no_hp
  if (!userData.no_hp || !isValidPhoneNumber(userData.no_hp)) {
    return { valid: false, message: 'Format nomor HP tidak valid' };
  }
  
  // Validasi email (jika ada)
  if (userData.email && !isValidEmail(userData.email)) {
    return { valid: false, message: 'Format email tidak valid' };
  }
  
  // Validasi password (untuk registrasi)
  if (isRegistration) {
    if (!userData.password || userData.password.length < 6) {
      return { valid: false, message: 'Password minimal 6 karakter' };
    }
  }
  
  return { valid: true };
}

/**
 * Get user by ID
 */
function getUserById(userId) {
  const sheet = getSheet(CONFIG.SHEETS.USERS);
  const user = findRowByValue(sheet, 1, userId, true);
  
  if (user) {
    delete user.password_hash;
  }
  
  return user;
}

/**
 * Get all users (admin only)
 */
function getAllUsers(filters = {}) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.USERS);
    const data = sheet.getDataRange().getValues();
    let users = sheetToArray(data);

    // Secara default, sembunyikan user yang sudah di-soft delete
    const includeDeleted = filters.include_deleted || filters.includedeleted;
    if (!includeDeleted) {
      users = users.filter(u => u.status !== 'deleted');
    }
    
    // Remove password hash
    users = users.map(user => {
      const u = { ...user };
      delete u.password_hash;
      return u;
    });
    
    // Apply filters
    if (filters.status) {
      users = users.filter(u => u.status === filters.status);
    }
    
    if (filters.role) {
      users = users.filter(u => u.role === filters.role);
    }
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      users = users.filter(u => 
        String(u.nama || '').toLowerCase().includes(search) ||
        String(u.alamat || '').toLowerCase().includes(search) ||
        String(u.no_hp || '').toLowerCase().includes(search) ||
        String(u.email || '').toLowerCase().includes(search)
      );
    }
    
    return {
      success: true,
      data: users
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Update user
 */
function updateUser(userId, userData, updatedBy) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.USERS);
    const rowIndex = findRowIndex(sheet, 1, userId, true);
    
    if (rowIndex < 0) {
      return {
        success: false,
        message: 'User tidak ditemukan'
      };
    }
    
    // Validasi input hanya untuk field yang dikirim (partial update)
    if (userData.nama !== undefined && cleanString(userData.nama).length < 3) {
      return { success: false, message: 'Nama minimal 3 karakter' };
    }
    if (userData.alamat !== undefined) {
      const PREFIX = 'Blok B ';
      const withoutPrefix = cleanString(userData.alamat).replace(/^blok\s+b\s*/i, '');
      userData.alamat = PREFIX + withoutPrefix;
      if (userData.alamat.length < 5) {
        return { success: false, message: 'Alamat (nomor rumah) harus diisi' };
      }
    }
    if (userData.no_hp !== undefined && !isValidPhoneNumber(userData.no_hp)) {
      return { success: false, message: 'Format nomor HP tidak valid' };
    }
    if (userData.email !== undefined && userData.email && !isValidEmail(userData.email)) {
      return { success: false, message: 'Format email tidak valid' };
    }

    // Cek duplikasi nomor HP/email (kecuali milik user saat ini)
    if (userData.no_hp !== undefined) {
      const normalizedPhone = normalizePhoneNumber(userData.no_hp);
      const existingPhone = findRowByValue(sheet, 4, normalizedPhone, false);
      if (existingPhone && existingPhone.id !== userId) {
        return { success: false, message: 'Nomor HP sudah terdaftar' };
      }
      userData.no_hp = normalizedPhone;
    }
    if (userData.email !== undefined) {
      const normalizedEmail = cleanString(userData.email).toLowerCase();
      const existingEmail = normalizedEmail ? findRowByValue(sheet, 5, normalizedEmail, false) : null;
      if (existingEmail && existingEmail.id !== userId) {
        return { success: false, message: 'Email sudah terdaftar' };
      }
      userData.email = normalizedEmail;
    }
    
    // Update fields
    if (userData.nama !== undefined) sheet.getRange(rowIndex, 2).setValue(cleanString(userData.nama));
    if (userData.alamat !== undefined) sheet.getRange(rowIndex, 3).setValue(cleanString(userData.alamat));
    if (userData.no_hp !== undefined) sheet.getRange(rowIndex, 4).setValue(userData.no_hp);
    if (userData.email !== undefined) sheet.getRange(rowIndex, 5).setValue(cleanString(userData.email));
    if (userData.foto_url !== undefined) sheet.getRange(rowIndex, 9).setValue(userData.foto_url);
    
    // Update password jika ada
    if (userData.password) {
      if (userData.password.length < 6) {
        return {
          success: false,
          message: 'Password minimal 6 karakter'
        };
      }
      sheet.getRange(rowIndex, 6).setValue(hashPassword(userData.password));
    }
    
    // Log aktivitas
    logActivity(updatedBy, 'UPDATE_USER', 'users', userId, userData);
    
    return {
      success: true,
      message: 'User berhasil diupdate'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Approve user (admin only)
 */
function approveUser(userId, adminId) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.USERS);
    const rowIndex = findRowIndex(sheet, 1, userId, true);
    
    if (rowIndex < 0) {
      return {
        success: false,
        message: 'User tidak ditemukan'
      };
    }
    
    const now = getCurrentDateTime();
    
    // Update status
    sheet.getRange(rowIndex, 8).setValue('approved');
    sheet.getRange(rowIndex, 11).setValue(now); // approved_at
    sheet.getRange(rowIndex, 12).setValue(adminId); // approved_by
    
    // Log aktivitas
    logActivity(adminId, 'APPROVE_USER', 'users', userId, { approved_at: now });
    
    return {
      success: true,
      message: 'User berhasil diapprove'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Reject user (admin only)
 */
function rejectUser(userId, adminId, reason = '') {
  try {
    const sheet = getSheet(CONFIG.SHEETS.USERS);
    const rowIndex = findRowIndex(sheet, 1, userId, true);
    
    if (rowIndex < 0) {
      return {
        success: false,
        message: 'User tidak ditemukan'
      };
    }
    
    // Update status
    sheet.getRange(rowIndex, 8).setValue('rejected');
    invalidateUserSessions(userId);
    
    // Log aktivitas
    logActivity(adminId, 'REJECT_USER', 'users', userId, { reason: reason });
    
    return {
      success: true,
      message: 'User berhasil direject'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Delete user (admin only)
 */
function deleteUser(userId, adminId) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.USERS);
    const rowIndex = findRowIndex(sheet, 1, userId, true);
    
    if (rowIndex < 0) {
      return {
        success: false,
        message: 'User tidak ditemukan'
      };
    }
    
    // Soft delete: ubah status user menjadi deleted
    sheet.getRange(rowIndex, 8).setValue('deleted');
    invalidateUserSessions(userId);
    
    // Log aktivitas
    logActivity(adminId, 'DELETE_USER', 'users', userId, { action: 'soft_delete' });
    
    return {
      success: true,
      message: 'User berhasil dihapus (dinonaktifkan)'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Change user role (admin only)
 */
function changeUserRole(userId, newRole, adminId) {
  try {
    if (!CONFIG.ENUMS.USERROLES.includes(newRole)) {
      return {
        success: false,
        message: 'Role tidak valid'
      };
    }
    
    const sheet = getSheet(CONFIG.SHEETS.USERS);
    const rowIndex = findRowIndex(sheet, 1, userId, true);
    
    if (rowIndex < 0) {
      return {
        success: false,
        message: 'User tidak ditemukan'
      };
    }
    
    // Update role
    sheet.getRange(rowIndex, 7).setValue(newRole);
    
    // Log aktivitas
    logActivity(adminId, 'CHANGE_ROLE', 'users', userId, { new_role: newRole });
    
    return {
      success: true,
      message: 'Role user berhasil diubah'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

// ============================================================================
// SECTION 6: TRANSACTION MANAGEMENT (CRUD)
// ============================================================================

/**
 * Create transaction
 */
function createTransaction(transactionData, createdBy) {
  try {
    // Validasi input
    const validation = validateTransactionData(transactionData);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.message
      };
    }
    
    const sheet = getSheet(CONFIG.SHEETS.TRANSACTIONS);
    
    // Generate ID
    const transactionId = generateId(CONFIG.ID_PREFIX.TRANSACTION);
    
    // Prepare row data
    const now = getCurrentDateTime();
    const rowData = [
      transactionId,
      transactionData.user_id || createdBy,
      transactionData.type,
      transactionData.source || 'IURANBULANAN',
      transactionData.category_id || '',
      formatNominal(transactionData.nominal),
      transactionData.tanggal || formatDate(new Date(), 'YYYY-MM-DD'),
      transactionData.bulan_iuran || '',
      transactionData.metode_pembayaran || 'transfer',
      transactionData.rekening_id || '',
      transactionData.bukti_url || '',
      transactionData.status || 'pending',
      cleanString(transactionData.deskripsi) || '',
      now,
      createdBy,
      '', // validated_at
      '' // validated_by
    ];
    
    // Insert ke sheet
    insertRowWithLock(sheet, rowData);
    
    // Update monthly balance
    updateMonthlyBalance(transactionData.tanggal || formatDate(new Date(), 'YYYY-MM-DD'));
    
    // Log aktivitas
    logActivity(createdBy, 'CREATE_TRANSACTION', 'transactions', transactionId, transactionData);
    
    return {
      success: true,
      message: 'Transaksi berhasil dibuat',
      data: { id: transactionId }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Validasi data transaksi
 */
function validateTransactionData(data) {
  // Validasi type
  if (!CONFIG.ENUMS.TRANSACTIONTYPE.includes(data.type)) {
    return { valid: false, message: 'Tipe transaksi tidak valid (income/expense)' };
  }

  // Validasi kategori aktif berdasarkan category_id
  if (!data.category_id) {
    return { valid: false, message: 'Kategori transaksi wajib diisi' };
  }
  const category = getCategoryById(data.category_id);
  if (!category) {
    return { valid: false, message: 'Kategori tidak ditemukan' };
  }
  const isCategoryActive = category.is_active === true || String(category.is_active).toLowerCase() === 'true';
  if (!isCategoryActive) {
    return { valid: false, message: 'Kategori tidak aktif' };
  }
  if (category.type !== data.type) {
    return { valid: false, message: 'Kategori tidak sesuai tipe transaksi' };
  }
  
  // Validasi nominal
  if (!data.nominal || formatNominal(data.nominal) <= 0) {
    return { valid: false, message: 'Nominal harus lebih dari 0' };
  }
  
  // Validasi tanggal
  if (data.tanggal) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.tanggal)) {
      return { valid: false, message: 'Format tanggal harus YYYY-MM-DD' };
    }
  }
  
  // Validasi status
  if (data.status && !CONFIG.ENUMS.TRANSACTIONSTATUS.includes(data.status)) {
    return { valid: false, message: 'Status tidak valid' };
  }
  
  // Validasi metode pembayaran
  if (data.metode_pembayaran && !CONFIG.ENUMS.PAYMENTMETHOD.includes(data.metode_pembayaran)) {
    return { valid: false, message: 'Metode pembayaran tidak valid' };
  }
  
  return { valid: true };
}

/**
 * Get transaction by ID
 */
function getTransactionById(transactionId) {
  const sheet = getSheet(CONFIG.SHEETS.TRANSACTIONS);
  return findRowByValue(sheet, 1, transactionId, true);
}

/**
 * Get all transactions with filters
 */
function getAllTransactions(filters = {}) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();
    let transactions = sheetToArray(data);
    
    // Apply filters
    if (filters.type) transactions = transactions.filter(t => t.type === filters.type);
    if (filters.status) transactions = transactions.filter(t => t.status === filters.status);
    if (filters.user_id) transactions = transactions.filter(t => t.user_id === filters.user_id);
    if (filters.source) transactions = transactions.filter(t => t.source === filters.source);
    if (filters.category_id) transactions = transactions.filter(t => t.category_id === filters.category_id);
    if (filters.bulan_iuran) transactions = transactions.filter(t => t.bulan_iuran === filters.bulan_iuran);
    
    const startDateFilter = filters.start_date || filters.startdate;
    const endDateFilter = filters.end_date || filters.enddate;
    if (startDateFilter || endDateFilter) {
      const start = startDateFilter ? new Date(startDateFilter) : null;
      const end = endDateFilter ? new Date(endDateFilter) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      
      transactions = transactions.filter(t => {
        const date = new Date(t.tanggal);
        if (isNaN(date.getTime())) return false;
        if (start && date < start) return false;
        if (end && date > end) return false;
        return true;
      });
    }
    
    // FIX BUG: Mencegah crash jika deskripsi kosong
    if (filters.search) {
      const search = filters.search.toLowerCase();
      transactions = transactions.filter(t => 
        String(t.deskripsi || '').toLowerCase().includes(search) ||
        String(t.id || '').toLowerCase().includes(search)
      );
    }
    
    // Sort by tanggal descending
    transactions.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    return {
      success: true,
      data: transactions
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Update transaction
 */
function validateTransactionDataForUpdate(data) {
  if (data.type !== undefined && !CONFIG.ENUMS.TRANSACTIONTYPE.includes(data.type)) {
    return { valid: false, message: 'Tipe transaksi tidak valid (income/expense)' };
  }

  if (data.category_id !== undefined) {
    const category = getCategoryById(data.category_id);
    if (!category) {
      return { valid: false, message: 'Kategori tidak ditemukan' };
    }

    const isCategoryActive = category.is_active === true || String(category.is_active).toLowerCase() === 'true';
    if (!isCategoryActive) {
      return { valid: false, message: 'Kategori tidak aktif' };
    }

    if (data.type !== undefined && category.type !== data.type) {
      return { valid: false, message: 'Kategori tidak sesuai tipe transaksi' };
    }
  }

  if (data.nominal !== undefined && formatNominal(data.nominal) <= 0) {
    return { valid: false, message: 'Nominal harus lebih dari 0' };
  }

  if (data.tanggal !== undefined) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.tanggal)) {
      return { valid: false, message: 'Format tanggal harus YYYY-MM-DD' };
    }
  }

  if (data.status !== undefined && !CONFIG.ENUMS.TRANSACTIONSTATUS.includes(data.status)) {
    return { valid: false, message: 'Status tidak valid' };
  }

  if (data.metode_pembayaran !== undefined && !CONFIG.ENUMS.PAYMENTMETHOD.includes(data.metode_pembayaran)) {
    return { valid: false, message: 'Metode pembayaran tidak valid' };
  }

  return { valid: true };
}

function updateTransaction(transactionId, transactionData, updatedBy) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.TRANSACTIONS);
    const rowIndex = findRowIndex(sheet, 1, transactionId, true);
    
    if (rowIndex < 0) {
      return {
        success: false,
        message: 'Transaksi tidak ditemukan'
      };
    }
    
    // Validasi input
    const validation = validateTransactionDataForUpdate(transactionData);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.message
      };
    }
    
    // Ambil tanggal lama sebelum update untuk sinkronisasi saldo bulanan
    const oldTanggal = sheet.getRange(rowIndex, 7).getValue();

    // Update fields
    if (transactionData.type) sheet.getRange(rowIndex, 3).setValue(transactionData.type);
    if (transactionData.source) sheet.getRange(rowIndex, 4).setValue(transactionData.source);
    if (transactionData.category_id !== undefined) sheet.getRange(rowIndex, 5).setValue(transactionData.category_id);
    if (transactionData.nominal) sheet.getRange(rowIndex, 6).setValue(formatNominal(transactionData.nominal));
    if (transactionData.tanggal) sheet.getRange(rowIndex, 7).setValue(transactionData.tanggal);
    if (transactionData.bulan_iuran !== undefined) sheet.getRange(rowIndex, 8).setValue(transactionData.bulan_iuran);
    if (transactionData.metode_pembayaran) sheet.getRange(rowIndex, 9).setValue(transactionData.metode_pembayaran);
    if (transactionData.rekening_id !== undefined) sheet.getRange(rowIndex, 10).setValue(transactionData.rekening_id);
    if (transactionData.bukti_url !== undefined) sheet.getRange(rowIndex, 11).setValue(transactionData.bukti_url);
    if (transactionData.status) sheet.getRange(rowIndex, 12).setValue(transactionData.status);
    if (transactionData.deskripsi !== undefined) sheet.getRange(rowIndex, 13).setValue(cleanString(transactionData.deskripsi));
    
    // Update monthly balance dari tanggal paling lampau (antara tanggal lama vs baru)
    const newTanggal = transactionData.tanggal || oldTanggal;
    const dateToUpdate = new Date(oldTanggal) < new Date(newTanggal) ? oldTanggal : newTanggal;
    updateMonthlyBalance(dateToUpdate);
    
    // Log aktivitas
    logActivity(updatedBy, 'UPDATE_TRANSACTION', 'transactions', transactionId, transactionData);
    
    return {
      success: true,
      message: 'Transaksi berhasil diupdate'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Validate/Approve transaction (admin only)
 */
function validateTransaction(transactionId, status, adminId, notes = '') {
  try {
    if (!CONFIG.ENUMS.TRANSACTIONSTATUS.includes(status)) {
      return {
        success: false,
        message: 'Status tidak valid'
      };
    }
    
    const sheet = getSheet(CONFIG.SHEETS.TRANSACTIONS);
    const rowIndex = findRowIndex(sheet, 1, transactionId, true);
    
    if (rowIndex < 0) {
      return {
        success: false,
        message: 'Transaksi tidak ditemukan'
      };
    }
    
    const now = getCurrentDateTime();
    
    // Update status
    sheet.getRange(rowIndex, 12).setValue(status);
    sheet.getRange(rowIndex, 16).setValue(now); // validated_at
    sheet.getRange(rowIndex, 17).setValue(adminId); // validated_by
    
    // Update monthly balance
    const tanggal = sheet.getRange(rowIndex, 7).getValue();
    if (tanggal) updateMonthlyBalance(tanggal);
    
    // Log aktivitas
    logActivity(adminId, 'VALIDATE_TRANSACTION', 'transactions', transactionId, { status, notes });
    
    return {
      success: true,
      message: `Transaksi berhasil di-${status}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Delete transaction (admin only)
 */
function deleteTransaction(transactionId, adminId) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.TRANSACTIONS);
    const rowIndex = findRowIndex(sheet, 1, transactionId, true);
    
    if (rowIndex < 0) {
      return {
        success: false,
        message: 'Transaksi tidak ditemukan'
      };
    }
    
    // Get transaction data sebelum dihapus
    const transactionData = findRowByValue(sheet, 1, transactionId, true);
    
    // Hapus row
    sheet.deleteRow(rowIndex);
    
    // Update monthly balance
    if (transactionData && transactionData.tanggal) {
      updateMonthlyBalance(transactionData.tanggal);
    }
    
    // Log aktivitas
    logActivity(adminId, 'DELETE_TRANSACTION', 'transactions', transactionId, { deleted_transaction: transactionData });
    
    return {
      success: true,
      message: 'Transaksi berhasil dihapus'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Get transactions by user
 */
function getTransactionsByUser(userId, filters = {}) {
  return getAllTransactions({ ...filters, user_id: userId });
}

/**
 * Get pending transactions (for admin validation)
 */
function getPendingTransactions() {
  return getAllTransactions({ status: 'pending' });
}

// ============================================================================
// SECTION 7: CATEGORY MANAGEMENT (CRUD)
// ============================================================================

/**
 * Create category (admin only)
 */
function createCategory(categoryData, createdBy) {
  try {
    if (!categoryData.name || cleanString(categoryData.name).length < 2) {
      return {
        success: false,
        message: 'Nama kategori minimal 2 karakter'
      };
    }
    
    if (!CONFIG.ENUMS.TRANSACTIONTYPE.includes(categoryData.type)) {
      return {
        success: false,
        message: 'Tipe kategori tidak valid'
      };
    }
    
    const sheet = getSheet(CONFIG.SHEETS.CATEGORIES);
    
    // Generate ID
    const categoryId = generateId(CONFIG.ID_PREFIX.CATEGORY);
    
    const now = getCurrentDateTime();
    const rowData = [
      categoryId,
      cleanString(categoryData.name),
      categoryData.type,
      categoryData.is_active !== false,
      now
    ];
    
    // Insert ke sheet
    insertRowWithLock(sheet, rowData);
    
    // Log aktivitas
    logActivity(createdBy, 'CREATE_CATEGORY', 'categories', categoryId, categoryData);
    
    return {
      success: true,
      message: 'Kategori berhasil dibuat',
      data: { id: categoryId }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Get all categories
 */
function getAllCategories(type = null) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.CATEGORIES);
    const data = sheet.getDataRange().getValues();
    let categories = sheetToArray(data);
    
    // Filter hanya yang aktif
    categories = categories.filter(c => isTruthy(c.is_active));
    
    // Filter by type
    if (type) {
      categories = categories.filter(c => c.type === type);
    }
    
    return {
      success: true,
      data: categories
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Get category by ID
 */
function getCategoryById(categoryId) {
  const sheet = getSheet(CONFIG.SHEETS.CATEGORIES);
  return findRowByValue(sheet, 1, categoryId, true);
}

/**
 * Update category (admin only)
 */
function updateCategory(categoryId, categoryData, updatedBy) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.CATEGORIES);
    const rowIndex = findRowIndex(sheet, 1, categoryId, true);
    
    if (rowIndex < 0) {
      return {
        success: false,
        message: 'Kategori tidak ditemukan'
      };
    }
    
    // Update fields
    if (categoryData.name) sheet.getRange(rowIndex, 2).setValue(cleanString(categoryData.name));
    if (categoryData.type) sheet.getRange(rowIndex, 3).setValue(categoryData.type);
    if (categoryData.is_active !== undefined) sheet.getRange(rowIndex, 4).setValue(categoryData.is_active);
    
    // Log aktivitas
    logActivity(updatedBy, 'UPDATE_CATEGORY', 'categories', categoryId, categoryData);
    
    return {
      success: true,
      message: 'Kategori berhasil diupdate'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Delete category (soft delete - set is_active = false)
 */
function deleteCategory(categoryId, deletedBy) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.CATEGORIES);
    const rowIndex = findRowIndex(sheet, 1, categoryId, true);
    
    if (rowIndex < 0) {
      return {
        success: false,
        message: 'Kategori tidak ditemukan'
      };
    }
    
    // Soft delete
    sheet.getRange(rowIndex, 4).setValue(false);
    
    // Log aktivitas
    logActivity(deletedBy, 'DELETE_CATEGORY', 'categories', categoryId, {});
    
    return {
      success: true,
      message: 'Kategori berhasil dihapus'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

// ============================================================================
// SECTION 8: BANK ACCOUNT MANAGEMENT (CRUD)
// ============================================================================

/**
 * Create bank account (admin only)
 */
function createBankAccount(accountData, createdBy) {
  try {
    if (!accountData.nama_bank || cleanString(accountData.nama_bank).length < 2) {
      return {
        success: false,
        message: 'Nama bank minimal 2 karakter'
      };
    }
    
    if (!accountData.is_qris && (!accountData.nomor_rekening || cleanString(accountData.nomor_rekening).length < 5)) {
      return {
        success: false,
        message: 'Nomor rekening minimal 5 karakter'
      };
    }
    
    const sheet = getSheet(CONFIG.SHEETS.BANK_ACCOUNTS);
    
    // Generate ID
    const accountId = generateId(CONFIG.ID_PREFIX.BANK);
    
    const now = getCurrentDateTime();
    const rowData = [
      accountId,
      cleanString(accountData.nama_bank),
      cleanString(accountData.nomor_rekening) || '',
      cleanString(accountData.nama_pemilik) || '',
      cleanString(accountData.cabang) || '',
      accountData.logo_url || '',
      accountData.is_qris === true,
      accountData.qris_image_url || '',
      accountData.is_active !== false,
      accountData.display_order || 0,
      now,
      now
    ];
    
    // Insert ke sheet
    insertRowWithLock(sheet, rowData);
    
    // Log aktivitas
    logActivity(createdBy, 'CREATE_BANK_ACCOUNT', 'bank_accounts', accountId, accountData);
    
    return {
      success: true,
      message: 'Rekening berhasil ditambahkan',
      data: { id: accountId }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Get all bank accounts
 */
function getAllBankAccounts(activeOnly = true) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.BANK_ACCOUNTS);
    const data = sheet.getDataRange().getValues();
    let accounts = sheetToArray(data);
    
    // Filter hanya yang aktif
    if (activeOnly) {
      accounts = accounts.filter(a => isTruthy(a.is_active));
    }
    
    // Sort by display_order
    accounts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    return {
      success: true,
      data: accounts
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Get bank account by ID
 */
function getBankAccountById(accountId) {
  const sheet = getSheet(CONFIG.SHEETS.BANK_ACCOUNTS);
  return findRowByValue(sheet, 1, accountId, true);
}

/**
 * Update bank account (admin only)
 */
function updateBankAccount(accountId, accountData, updatedBy) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.BANK_ACCOUNTS);
    const rowIndex = findRowIndex(sheet, 1, accountId, true);
    
    if (rowIndex < 0) {
      return {
        success: false,
        message: 'Rekening tidak ditemukan'
      };
    }
    
    // Update fields
    if (accountData.nama_bank) sheet.getRange(rowIndex, 2).setValue(cleanString(accountData.nama_bank));
    if (accountData.nomor_rekening !== undefined) sheet.getRange(rowIndex, 3).setValue(cleanString(accountData.nomor_rekening));
    if (accountData.nama_pemilik !== undefined) sheet.getRange(rowIndex, 4).setValue(cleanString(accountData.nama_pemilik));
    if (accountData.cabang !== undefined) sheet.getRange(rowIndex, 5).setValue(cleanString(accountData.cabang));
    if (accountData.logo_url !== undefined) sheet.getRange(rowIndex, 6).setValue(accountData.logo_url);
    if (accountData.is_qris !== undefined) sheet.getRange(rowIndex, 7).setValue(accountData.is_qris);
    if (accountData.qris_image_url !== undefined) sheet.getRange(rowIndex, 8).setValue(accountData.qris_image_url);
    if (accountData.is_active !== undefined) sheet.getRange(rowIndex, 9).setValue(accountData.is_active);
    if (accountData.display_order !== undefined) sheet.getRange(rowIndex, 10).setValue(accountData.display_order);
    
    // Update timestamp
    sheet.getRange(rowIndex, 12).setValue(getCurrentDateTime());
    
    // Log aktivitas
    logActivity(updatedBy, 'UPDATE_BANK_ACCOUNT', 'bank_accounts', accountId, accountData);
    
    return {
      success: true,
      message: 'Rekening berhasil diupdate'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Delete bank account (soft delete)
 */
function deleteBankAccount(accountId, deletedBy) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.BANK_ACCOUNTS);
    const rowIndex = findRowIndex(sheet, 1, accountId, true);
    
    if (rowIndex < 0) {
      return {
        success: false,
        message: 'Rekening tidak ditemukan'
      };
    }
    
    // Soft delete
    sheet.getRange(rowIndex, 9).setValue(false);
    
    // Log aktivitas
    logActivity(deletedBy, 'DELETE_BANK_ACCOUNT', 'bank_accounts', accountId, {});
    
    return {
      success: true,
      message: 'Rekening berhasil dihapus'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

// ============================================================================
// SECTION 9: EVENT MANAGEMENT (CRUD)
// ============================================================================

/**
 * Create event (admin only)
 */
function createEvent(eventData, createdBy) {
  try {
    // Validasi
    if (!eventData.title || cleanString(eventData.title).length < 3) {
      return {
        success: false,
        message: 'Judul kegiatan minimal 3 karakter'
      };
    }
    
    if (!eventData.tanggal_mulai) {
      return {
        success: false,
        message: 'Tanggal mulai harus diisi'
      };
    }
    
    const sheet = getSheet(CONFIG.SHEETS.EVENTS);
    
    // Generate ID
    const eventId = generateId(CONFIG.ID_PREFIX.EVENT);
    
    const now = getCurrentDateTime();
    const rowData = [
      eventId,
      cleanString(eventData.title),
      cleanString(eventData.description) || '',
      eventData.tanggal_mulai,
      eventData.tanggal_selesai || eventData.tanggal_mulai,
      cleanString(eventData.lokasi) || '',
      eventData.foto_url || '',
      eventData.file_url || '',
      createdBy,
      now,
      eventData.is_active !== false
    ];
    
    // Insert ke sheet
    insertRowWithLock(sheet, rowData);
    
    // Log aktivitas
    logActivity(createdBy, 'CREATE_EVENT', 'events', eventId, eventData);
    
    return {
      success: true,
      message: 'Kegiatan berhasil dibuat',
      data: { id: eventId }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Get event by ID
 */
function getEventById(eventId) {
  const sheet = getSheet(CONFIG.SHEETS.EVENTS);
  return findRowByValue(sheet, 1, eventId, true);
}

/**
 * Get all events with filters
 */
function getAllEvents(filters = {}) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.EVENTS);
    const data = sheet.getDataRange().getValues();
    let events = sheetToArray(data);
    
    // Filter hanya yang aktif
    if (filters.activeOnly !== false) {
      events = events.filter(e => isTruthy(e.is_active));
    }
    
    // Filter by date range
    if (filters.start_date && filters.end_date) {
      events = events.filter(e => {
        const eventDate = new Date(e.tanggal_mulai);
        return eventDate >= new Date(filters.start_date) && eventDate <= new Date(filters.end_date);
      });
    }
    
    // Filter by month
    if (filters.month && filters.year) {
      events = events.filter(e => {
        const eventDate = new Date(e.tanggal_mulai);
        return eventDate.getMonth() + 1 === parseInt(filters.month) && 
               eventDate.getFullYear() === parseInt(filters.year);
      });
    }
    
    // Search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      events = events.filter(e => 
        String(e.title || '').toLowerCase().includes(search) ||
        String(e.description || '').toLowerCase().includes(search) ||
        String(e.lokasi || '').toLowerCase().includes(search)
      );
    }
    
    // Sort by tanggal_mulai descending
    events.sort((a, b) => new Date(b.tanggal_mulai) - new Date(a.tanggal_mulai));
    
    return {
      success: true,
      data: events
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Get events for calendar
 */
function getEventsForCalendar(year, month) {
  return getAllEvents({ year, month, activeOnly: true });
}

/**
 * Update event (admin only)
 */
function updateEvent(eventId, eventData, updatedBy) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.EVENTS);
    const rowIndex = findRowIndex(sheet, 1, eventId, true);
    
    if (rowIndex < 0) {
      return {
        success: false,
        message: 'Kegiatan tidak ditemukan'
      };
    }
    
    // Update fields
    if (eventData.title) sheet.getRange(rowIndex, 2).setValue(cleanString(eventData.title));
    if (eventData.description !== undefined) sheet.getRange(rowIndex, 3).setValue(cleanString(eventData.description));
    if (eventData.tanggal_mulai) sheet.getRange(rowIndex, 4).setValue(eventData.tanggal_mulai);
    if (eventData.tanggal_selesai !== undefined) sheet.getRange(rowIndex, 5).setValue(eventData.tanggal_selesai);
    if (eventData.lokasi !== undefined) sheet.getRange(rowIndex, 6).setValue(cleanString(eventData.lokasi));
    if (eventData.foto_url !== undefined) sheet.getRange(rowIndex, 7).setValue(eventData.foto_url);
    if (eventData.file_url !== undefined) sheet.getRange(rowIndex, 8).setValue(eventData.file_url);
    if (eventData.is_active !== undefined) sheet.getRange(rowIndex, 11).setValue(eventData.is_active);
    
    // Log aktivitas
    logActivity(updatedBy, 'UPDATE_EVENT', 'events', eventId, eventData);
    
    return {
      success: true,
      message: 'Kegiatan berhasil diupdate'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Delete event (soft delete)
 */
function deleteEvent(eventId, deletedBy) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.EVENTS);
    const rowIndex = findRowIndex(sheet, 1, eventId, true);
    
    if (rowIndex < 0) {
      return {
        success: false,
        message: 'Kegiatan tidak ditemukan'
      };
    }
    
    // Soft delete
    sheet.getRange(rowIndex, 11).setValue(false);
    
    // Log aktivitas
    logActivity(deletedBy, 'DELETE_EVENT', 'events', eventId, {});
    
    return {
      success: true,
      message: 'Kegiatan berhasil dihapus'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

// ============================================================================
// SECTION 10: ANNOUNCEMENT MANAGEMENT (CRUD)
// ============================================================================

/**
 * Create announcement (admin only)
 */
function createAnnouncement(announcementData, createdBy) {
  try {
    if (!announcementData.title || cleanString(announcementData.title).length < 3) {
      return {
        success: false,
        message: 'Judul pengumuman minimal 3 karakter'
      };
    }
    
    if (!announcementData.content || cleanString(announcementData.content).length < 5) {
      return {
        success: false,
        message: 'Isi pengumuman minimal 5 karakter'
      };
    }
    
    const sheet = getSheet(CONFIG.SHEETS.ANNOUNCEMENTS);
    
    // Generate ID
    const announcementId = generateId(CONFIG.ID_PREFIX.ANNOUNCEMENT);
    
    const now = getCurrentDateTime();
    const rowData = [
      announcementId,
      cleanString(announcementData.title),
      cleanString(announcementData.content),
      announcementData.tanggal || now,
      createdBy,
      announcementData.is_active !== false
    ];
    
    // Insert ke sheet
    insertRowWithLock(sheet, rowData);
    
    // Log aktivitas
    logActivity(createdBy, 'CREATE_ANNOUNCEMENT', 'announcements', announcementId, announcementData);
    
    return {
      success: true,
      message: 'Pengumuman berhasil dibuat',
      data: { id: announcementId }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Get announcement by ID
 */
function getAnnouncementById(announcementId) {
  const sheet = getSheet(CONFIG.SHEETS.ANNOUNCEMENTS);
  return findRowByValue(sheet, 1, announcementId, true);
}

/**
 * Get all announcements
 */
function getAllAnnouncements(limit = 10) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.ANNOUNCEMENTS);
    const data = sheet.getDataRange().getValues();
    let announcements = sheetToArray(data);
    
    // Filter hanya yang aktif
    announcements = announcements.filter(a => isTruthy(a.is_active));
    
    // Sort by tanggal descending
    announcements.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    // Limit
    if (limit > 0) {
      announcements = announcements.slice(0, limit);
    }
    
    return {
      success: true,
      data: announcements
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Update announcement (admin only)
 */
function updateAnnouncement(announcementId, announcementData, updatedBy) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.ANNOUNCEMENTS);
    const rowIndex = findRowIndex(sheet, 1, announcementId, true);
    
    if (rowIndex < 0) {
      return {
        success: false,
        message: 'Pengumuman tidak ditemukan'
      };
    }
    
    // Update fields
    if (announcementData.title) sheet.getRange(rowIndex, 2).setValue(cleanString(announcementData.title));
    if (announcementData.content) sheet.getRange(rowIndex, 3).setValue(cleanString(announcementData.content));
    if (announcementData.tanggal !== undefined) sheet.getRange(rowIndex, 4).setValue(announcementData.tanggal);
    if (announcementData.is_active !== undefined) sheet.getRange(rowIndex, 6).setValue(announcementData.is_active);
    
    // Log aktivitas
    logActivity(updatedBy, 'UPDATE_ANNOUNCEMENT', 'announcements', announcementId, announcementData);
    
    return {
      success: true,
      message: 'Pengumuman berhasil diupdate'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Delete announcement (soft delete)
 */
function deleteAnnouncement(announcementId, deletedBy) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.ANNOUNCEMENTS);
    const rowIndex = findRowIndex(sheet, 1, announcementId, true);
    
    if (rowIndex < 0) {
      return {
        success: false,
        message: 'Pengumuman tidak ditemukan'
      };
    }
    
    // Soft delete
    sheet.getRange(rowIndex, 6).setValue(false);
    
    // Log aktivitas
    logActivity(deletedBy, 'DELETE_ANNOUNCEMENT', 'announcements', announcementId, {});
    
    return {
      success: true,
      message: 'Pengumuman berhasil dihapus'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

// ============================================================================
// SECTION 11: SETTINGS MANAGEMENT
// ============================================================================

/**
 * Get all settings
 */
function getAllSettings() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.SETTINGS);
    const data = sheet.getDataRange().getValues();
    const settings = sheetToArray(data);
    
    // Filter out session data
    const filteredSettings = settings.filter(s => !s.key.startsWith('session_'));
    
    return {
      success: true,
      data: filteredSettings
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Update setting (admin only)
 */
function updateSetting(key, value, description, updatedBy) {
  try {
    setSetting(key, value, description);
    
    // Log aktivitas
    logActivity(updatedBy, 'UPDATE_SETTING', 'settings', key, { value, description });
    
    return {
      success: true,
      message: 'Setting berhasil diupdate'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Get public settings (untuk warga)
 */
function getPublicSettings() {
  const publicKeys = ['app_name', 'logo_app', 'alamat_rt', 'whatsapp_admin', 'default_iwk_nominal'];
  
  try {
    const settings = {};
    publicKeys.forEach(key => {
      const value = getSetting(key);
      if (value !== null) {
        settings[key] = value;
      }
    });
    
    return {
      success: true,
      data: settings
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

// ============================================================================
// SECTION 12: FILE MANAGEMENT
// ============================================================================

/**
 * Upload file ke Google Drive
 * Base64 format
 */
function uploadFile(base64Data, fileName, folderType, relatedId, uploadedBy) {
  try {
    // Validasi folder type
    if (!CONFIG.FOLDERS[folderType]) {
      return {
        success: false,
        message: 'Tipe folder tidak valid'
      };
    }
    
    // Get atau buat folder
    const folderId = getOrCreateFolder(CONFIG.FOLDERS[folderType]);
    
    // Decode base64
    const splitData = base64Data.split(',');
    const mimeType = splitData[0].match(/data:(.*?);/)?.[1] || 'application/octet-stream';
    const base64String = splitData[1] || base64Data;
    
    // Validasi file type
    if (!CONFIG.ALLOWED_FILE_TYPES.includes(mimeType)) {
      return {
        success: false,
        message: 'Tipe file tidak diizinkan'
      };
    }
    
    // Decode
    const decoded = Utilities.base64Decode(base64String);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    
    // Upload ke Drive
    const folder = DriveApp.getFolderById(folderId);
    const file = folder.createFile(blob);
    
    // Set public access
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fileId = file.getId();
    const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    
    // Save ke files sheet
    saveFileRecord({
      related_id: relatedId,
      type: folderType,
      file_name: fileName,
      file_url: directUrl,
      uploaded_by: uploadedBy
    });
    
    // Log aktivitas
    logActivity(uploadedBy, 'UPLOAD_FILE', 'files', fileId, { fileName, folderType });
    
    return {
      success: true,
      message: 'File berhasil diupload',
      data: {
        file_id: fileId,
        file_url: directUrl,
        file_name: fileName
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Get atau create folder
 */
function getOrCreateFolder(folderName) {
  try {
    const parentFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    const folders = parentFolder.getFoldersByName(folderName);
    
    if (folders.hasNext()) {
      return folders.next().getId();
    } else {
      const newFolder = parentFolder.createFolder(folderName);
      return newFolder.getId();
    }
  } catch (error) {
    throw new Error(`Gagal membuat folder: ${error.message}`);
  }
}

/**
 * Save file record ke sheet
 */
function saveFileRecord(fileData) {
  const sheet = getSheet(CONFIG.SHEETS.FILES);
  
  const fileId = generateId(CONFIG.ID_PREFIX.FILE);
  const now = getCurrentDateTime();
  
  const rowData = [
    fileId,
    fileData.related_id || '',
    fileData.type,
    fileData.file_name,
    fileData.file_url,
    fileData.uploaded_by,
    now
  ];
  
  insertRowWithLock(sheet, rowData);
  
  return fileId;
}

/**
 * Get files by related ID
 */
function getFilesByRelatedId(relatedId) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.FILES);
    const files = findAllRowsByValue(sheet, 2, relatedId);
    
    return {
      success: true,
      data: files
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Helper: Extract Drive ID secara aman menggunakan Regex
 */
function extractDriveFileId(url) {
  if (!url || typeof url !== 'string') return null;

  let match = url.match(/[?&]id=([\w-]{25,})/);
  if (match) return match[1];

  match = url.match(/\/file\/d\/([\w-]{25,})/);
  if (match) return match[1];

  return null;
}

/**
 * Delete file dari Drive dan sheet
 */
function deleteFile(fileId, deletedBy) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.FILES);
    const fileRecord = findRowByValue(sheet, 1, fileId, true);
    
    if (!fileRecord) {
      return {
        success: false,
        message: 'File tidak ditemukan'
      };
    }
    
    // Hapus dari Drive menggunakan ekstraksi ID yang aman
    try {
      const driveId = extractDriveFileId(fileRecord.file_url);
      if (driveId) {
        const file = DriveApp.getFileById(driveId);
        file.setTrashed(true);
      }
    } catch (e) {
      console.warn('File mungkin sudah tidak ada di Drive atau izin kurang: ' + e.message);
    }
    
    // Hapus dari sheet
    const rowIndex = findRowIndex(sheet, 1, fileId);
    if (rowIndex > 0) {
      sheet.deleteRow(rowIndex);
    }
    
    // Log aktivitas
    logActivity(deletedBy, 'DELETE_FILE', 'files', fileId, {});
    
    return {
      success: true,
      message: 'File berhasil dihapus'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

// ============================================================================
// SECTION 13: DASHBOARD & FINANCIAL REPORTS
// ============================================================================

/**
 * Get dashboard summary
 */
function getDashboardSummary() {
  try {
    const transactions = getAllTransactions({ status: 'approved' });
    const txData = transactions.data || [];
    
    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;
    
    txData.forEach(t => {
      if (t.type === 'income') {
        totalIncome += Number(t.nominal) || 0;
      } else {
        totalExpense += Number(t.nominal) || 0;
      }
    });
    
    const balance = totalIncome - totalExpense;
    
    // Get counts
    const users = getAllUsers({ status: 'approved' });
    const pendingTransactions = getAllTransactions({ status: 'pending' });
    
    // Monthly data
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const monthlyIncome = txData
      .filter(t => {
        const date = new Date(t.tanggal);
        return t.type === 'income' && 
               date.getMonth() + 1 === currentMonth && 
               date.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
    
    const monthlyExpense = txData
      .filter(t => {
        const date = new Date(t.tanggal);
        return t.type === 'expense' && 
               date.getMonth() + 1 === currentMonth && 
               date.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
    
    return {
      success: true,
      data: {
        total_income: totalIncome,
        total_expense: totalExpense,
        balance: balance,
        monthly_income: monthlyIncome,
        monthly_expense: monthlyExpense,
        monthly_balance: monthlyIncome - monthlyExpense,
        total_users: users.data?.length || 0,
        pending_transactions: pendingTransactions.data?.length || 0
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Get financial report
 */
function getFinancialReport(filters = {}) {
  try {
    const transactions = getAllTransactions(filters);
    const txData = transactions.data || [];
    
    // Group by type
    const incomeTransactions = txData.filter(t => t.type === 'income');
    const expenseTransactions = txData.filter(t => t.type === 'expense');
    
    // Calculate totals
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
    
    // Group by source/category
    const incomeBySource = {};
    incomeTransactions.forEach(t => {
      const source = t.source || 'Lainnya';
      if (!incomeBySource[source]) incomeBySource[source] = 0;
      incomeBySource[source] += Number(t.nominal) || 0;
    });
    
    const expenseByCategory = {};
    expenseTransactions.forEach(t => {
      const cat = t.category_id || 'Lainnya';
      if (!expenseByCategory[cat]) expenseByCategory[cat] = 0;
      expenseByCategory[cat] += Number(t.nominal) || 0;
    });
    
    // Get category names
    const categories = getAllCategories();
    const catMap = {};
    (categories.data || []).forEach(c => {
      catMap[c.id] = c.name;
    });
    
    const expenseByCategoryNamed = {};
    Object.keys(expenseByCategory).forEach(key => {
      expenseByCategoryNamed[catMap[key] || key] = expenseByCategory[key];
    });
    
    return {
      success: true,
      data: {
        period: {
          start_date: filters.start_date,
          end_date: filters.end_date
        },
        summary: {
          total_income: totalIncome,
          total_expense: totalExpense,
          balance: totalIncome - totalExpense,
          transaction_count: txData.length
        },
        income_by_source: incomeBySource,
        expense_by_category: expenseByCategoryNamed,
        transactions: txData
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Get monthly balance report
 */
function getMonthlyBalanceReport(year) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.MONTHLY_BALANCES);
    const data = sheet.getDataRange().getValues();
    let balances = sheetToArray(data);
    
    if (year) {
      balances = balances.filter(b => b.bulan && b.bulan.includes(year.toString()));
    }
    
    return {
      success: true,
      data: balances
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Update monthly balance (called after transaction changes)
 */
function updateMonthlyBalance(targetDate) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.MONTHLY_BALANCES);
    const dateObj = new Date(targetDate);
    if (isNaN(dateObj.getTime())) {
      console.error('updateMonthlyBalance: targetDate tidak valid:', targetDate);
      return false;
    }

    const now = new Date();
    const endMonth = now.getMonth() + 1;
    const endYear = now.getFullYear();

    // Jangan proses tanggal lebih dari bulan ini
    if (
      dateObj.getFullYear() > endYear ||
      (dateObj.getFullYear() === endYear && dateObj.getMonth() + 1 > endMonth)
    ) {
      console.warn('updateMonthlyBalance: tanggal melebihi bulan saat ini, dilewati');
      return false;
    }

    const targetMonth = dateObj.getMonth() + 1;
    const targetYear = dateObj.getFullYear();

    // Ambil semua transaksi approved sekali saja
    const allTx = getAllTransactions({ status: 'approved' }).data || [];
    const txByMonth = {};
    allTx.forEach(t => {
      if (!t.tanggal) return;
      const d = new Date(t.tanggal);
      if (isNaN(d.getTime())) return;
      const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      if (!txByMonth[key]) txByMonth[key] = { income: 0, expense: 0 };
      const nominal = Number(t.nominal) || 0;
      if (t.type === 'income') txByMonth[key].income += nominal;
      if (t.type === 'expense') txByMonth[key].expense += nominal;
    });

    let calcYear = targetYear;
    let calcMonth = targetMonth;
    let openingBalance = null;
    let iterCount = 0;
    const MAX_ITER = 120;

    while (
      (calcYear < endYear || (calcYear === endYear && calcMonth <= endMonth)) &&
      iterCount < MAX_ITER
    ) {
      iterCount++;
      const monthStr = String(calcMonth).padStart(2, '0');
      const bulanKey = `${monthStr}-${calcYear}`;
      const monthData = txByMonth[bulanKey] || { income: 0, expense: 0 };

      if (openingBalance === null) {
        const prevMonth = calcMonth === 1 ? 12 : calcMonth - 1;
        const prevYear = calcMonth === 1 ? calcYear - 1 : calcYear;
        const prevBulanKey = `${String(prevMonth).padStart(2, '0')}-${prevYear}`;
        const prevBalance = findRowByValue(sheet, 2, prevBulanKey);
        openingBalance = prevBalance
          ? (Number(prevBalance.closing_balance) || 0)
          : (Number(getSetting('opening_balance')) || 0);
      }

      const totalIncome = monthData.income;
      const totalExpense = monthData.expense;
      const closingBalance = openingBalance + totalIncome - totalExpense;
      const existingRow = findRowIndex(sheet, 2, bulanKey);
      const timestamp = getCurrentDateTime();

      if (existingRow > 0) {
        sheet.getRange(existingRow, 3, 1, 5).setValues([
          [openingBalance, totalIncome, totalExpense, closingBalance, timestamp]
        ]);
      } else {
        insertRowWithLock(sheet, [
          generateId('BAL'), bulanKey,
          openingBalance, totalIncome, totalExpense, closingBalance, timestamp
        ]);
      }

      openingBalance = closingBalance;

      calcMonth++;
      if (calcMonth > 12) {
        calcMonth = 1;
        calcYear++;
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating monthly balance:', error);
    return false;
  }
}


// ============================================================================
// SECTION 14: CHART DATA FUNCTIONS
// ============================================================================

/**
 * Get data untuk Bar Chart (Income vs Expense per bulan)
 */
function getBarChartData(year) {
  try {
    const targetYear = year || new Date().getFullYear();
    const allTx = getAllTransactions({
      start_date: `${targetYear}-01-01`,
      end_date: `${targetYear}-12-31`,
      status: 'approved'
    }).data || [];

    const byMonth = {};
    for (let month = 1; month <= 12; month++) {
      byMonth[month] = { income: 0, expense: 0 };
    }

    allTx.forEach(t => {
      const d = new Date(t.tanggal);
      if (isNaN(d.getTime())) return;
      const month = d.getMonth() + 1;
      if (t.type === 'income') byMonth[month].income += Number(t.nominal) || 0;
      if (t.type === 'expense') byMonth[month].expense += Number(t.nominal) || 0;
    });
    
    return {
      success: true,
      data: {
        labels: Array.from({ length: 12 }, (_, i) => getMonthName(i + 1)),
        datasets: [
          {
            label: 'Pemasukan',
            data: Array.from({ length: 12 }, (_, i) => byMonth[i + 1].income),
            backgroundColor: '#4CAF50'
          },
          {
            label: 'Pengeluaran',
            data: Array.from({ length: 12 }, (_, i) => byMonth[i + 1].expense),
            backgroundColor: '#F44336'
          }
        ]
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Get data untuk Pie Chart (Expense by Category)
 */
function getPieChartData(filters = {}) {
  try {
    const queryFilters = { type: 'expense', status: 'approved' };

    // Prioritaskan start_date/end_date eksplisit; fallback ke year
    if (filters.start_date && filters.end_date) {
      queryFilters.start_date = filters.start_date;
      queryFilters.end_date = filters.end_date;
    } else if (filters.year) {
      const parsedYear = parseInt(filters.year, 10);
      if (!isNaN(parsedYear)) {
        queryFilters.start_date = `${parsedYear}-01-01`;
        queryFilters.end_date = `${parsedYear}-12-31`;
      }
    }

    const transactions = getAllTransactions(queryFilters);
    const txData = transactions.data || [];

    const categories = getAllCategories('expense');
    const catMap = {};
    (categories.data || []).forEach(c => { catMap[c.id] = c.name; });

    const categoryTotals = {};
    txData.forEach(t => {
      const catName = catMap[t.category_id] || t.category_id || 'Lainnya';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + (Number(t.nominal) || 0);
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const colors = generateColors(labels.length);

    return {
      success: true,
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors }]
      }
    };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
  }
}


/**
 * Get data untuk Line Chart (Balance Trend)
 */
function getLineChartData(year) {
  try {
    const targetYear = year || new Date().getFullYear();
    const monthlyBalances = [];
    let runningBalance = Number(getSetting('opening_balance')) || 0;
    const allTx = getAllTransactions({
      start_date: `${targetYear}-01-01`,
      end_date: `${targetYear}-12-31`,
      status: 'approved'
    }).data || [];

    const byMonth = {};
    for (let month = 1; month <= 12; month++) {
      byMonth[month] = { income: 0, expense: 0 };
    }

    allTx.forEach(t => {
      const d = new Date(t.tanggal);
      if (isNaN(d.getTime())) return;
      const month = d.getMonth() + 1;
      if (t.type === 'income') byMonth[month].income += Number(t.nominal) || 0;
      if (t.type === 'expense') byMonth[month].expense += Number(t.nominal) || 0;
    });

    for (let month = 1; month <= 12; month++) {
      runningBalance += byMonth[month].income - byMonth[month].expense;
      monthlyBalances.push({
        month: getMonthName(month),
        balance: runningBalance
      });
    }
    
    return {
      success: true,
      data: {
        labels: monthlyBalances.map(d => d.month),
        datasets: [{
          label: 'Saldo',
          data: monthlyBalances.map(d => d.balance),
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          fill: true,
          tension: 0.4
        }]
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Get all chart data in one call
 */
function getAllChartData(year) {
  try {
    const targetYear = year || new Date().getFullYear();
    
    return {
      success: true,
      data: {
        bar_chart: getBarChartData(targetYear).data,
        pie_chart: getPieChartData({ year: targetYear }).data,
        line_chart: getLineChartData(targetYear).data
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Helper: Get month name
 */
function getMonthName(month) {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[month - 1] || '';
}

/**
 * Helper: Generate colors for chart
 */
function generateColors(count) {
  const colors = [
    '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
    '#00BCD4', '#795548', '#607D8B', '#E91E63', '#3F51B5',
    '#009688', '#FFC107', '#673AB7', '#8BC34A', '#03A9F4'
  ];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  return result;
}

// ============================================================================
// SECTION 15: LOGS & ACTIVITY TRACKING
// ============================================================================

/**
 * Log activity
 */
function logActivity(userId, action, entity, entityId, metadata = {}) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.LOGS);
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) {
      console.warn(`logActivity: gagal lock, log dilewati untuk action=${action}`);
      return null;
    }
    try {
      const logId = generateId(CONFIG.ID_PREFIX.LOG);
      const now = getCurrentDateTime();
      const rowData = [
        logId,
        userId,
        action,
        entity,
        String(entityId),
        JSON.stringify(metadata),
        now
      ];
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, 1, rowData.length).setValues([rowData]);
      SpreadsheetApp.flush();
      return logId;
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
}

/**
 * Get logs with filters
 */
function getLogs(filters = {}) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.LOGS);
    const data = sheet.getDataRange().getValues();
    let logs = sheetToArray(data);
    
    // Apply filters
    if (filters.user_id) {
      logs = logs.filter(l => l.user_id === filters.user_id);
    }
    
    if (filters.action) {
      logs = logs.filter(l => l.action === filters.action);
    }
    
    if (filters.entity) {
      logs = logs.filter(l => l.entity === filters.entity);
    }
    
    if (filters.start_date && filters.end_date) {
      logs = logs.filter(l => {
        const date = new Date(l.created_at);
        return date >= new Date(filters.start_date) && date <= new Date(filters.end_date);
      });
    }
    
    // Sort by created_at descending
    logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Limit
    if (filters.limit) {
      logs = logs.slice(0, filters.limit);
    }
    
    return {
      success: true,
      data: logs
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Get user activity
 */
function getUserActivity(userId, limit = 50) {
  return getLogs({ user_id: userId, limit });
}

// ============================================================================
// SECTION 16: WHATSAPP INTEGRATION
// ============================================================================

/**
 * Generate WhatsApp redirect URL
 */
function generateWhatsAppUrl(phoneNumber, message) {
  const formattedPhone = formatWhatsAppNumber(phoneNumber);
  const encodedMessage = encodeUrlParam(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

/**
 * Generate payment notification message
 */
function generatePaymentMessage(userData, transactionData) {
  const template = `Assalamu'alaikum Warahmatullahi Wabarakatuh

Bismillahirrahmanirrahim, kami informasikan bahwa telah ada pembayaran iuran dengan detail sebagai berikut:

Nama: {nama}
Bulan Iuran: {bulan}
Nominal: {nominal}
Metode Pembayaran: {metode}
Link Bukti Transfer: {bukti_url}

Demikian informasi ini kami sampaikan. Jazakumullahu khairan.

Wassalamu'alaikum Warahmatullahi Wabarakatuh`;

  return template
    .replace('{nama}', userData.nama || '-')
    .replace('{bulan}', transactionData.bulan_iuran || '-')
    .replace('{nominal}', formatRupiah(transactionData.nominal || 0))
    .replace('{metode}', transactionData.metode_pembayaran || '-')
    .replace('{bukti_url}', transactionData.bukti_url || 'Tidak ada');
}

/**
 * Send payment notification (returns WhatsApp URL)
 */
function sendPaymentNotification(userId, transactionId) {
  try {
    const user = getUserById(userId);
    const transaction = getTransactionById(transactionId);
    
    if (!user || !transaction) {
      return {
        success: false,
        message: 'User atau transaksi tidak ditemukan'
      };
    }
    
    const adminPhone = getSetting('whatsapp_admin');
    if (!adminPhone) {
      return {
        success: false,
        message: 'Nomor WhatsApp admin belum dikonfigurasi'
      };
    }
    
    const message = generatePaymentMessage(user, transaction);
    const waUrl = generateWhatsAppUrl(adminPhone, message);
    
    return {
      success: true,
      data: {
        whatsapp_url: waUrl,
        message: message
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

// ============================================================================
// SECTION 17: PAYMENT SUBMISSION (WIZARD TRACKING)
// ============================================================================

/**
 * Save payment submission draft
 */
function savePaymentDraft(userId, step, dataJson) {
  const lock = LockService.getUserLock();
  if (!lock.tryLock(10000)) {
    return { success: false, message: 'Sistem sedang sibuk, coba lagi.' };
  }
  try {
    const sheet = getSheet(CONFIG.SHEETS.PAYMENT_SUBMISSIONS);
    const rows = sheet.getDataRange().getValues();
    let existingRowIndex = -1;
    let existingDraftId = null;

    for (let i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][1]) === String(userId) && String(rows[i][4]) === 'draft') {
        existingRowIndex = i + 1;
        existingDraftId = rows[i][0];
        break;
      }
    }

    const now = getCurrentDateTime();
    const serialized = typeof dataJson === 'string' ? dataJson : JSON.stringify(dataJson);

    if (existingRowIndex > 0) {
      sheet.getRange(existingRowIndex, 3).setValue(step);
      sheet.getRange(existingRowIndex, 4).setValue(serialized);
      SpreadsheetApp.flush();
      return {
        success: true,
        message: 'Draft berhasil disimpan',
        data: { id: existingDraftId }
      };
    } else {
      const draftId = generateId(CONFIG.ID_PREFIX.PAYMENT_SUBMISSION);
      const rowData = [draftId, userId, step, serialized, 'draft', now];
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, 1, rowData.length).setValues([rowData]);
      SpreadsheetApp.flush();
      return {
        success: true,
        message: 'Draft berhasil disimpan',
        data: { id: draftId }
      };
    }
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
  } finally {
    lock.releaseLock();
  }
}


/**
 * Get payment draft
 */
function getPaymentDraft(userId) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.PAYMENT_SUBMISSIONS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: false, message: 'Tidak ada draft yang tersimpan' };
    }

    const headers = data[0];
    let latestDraft = null;

    // Cari dari bawah agar mendapatkan draft terbaru
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      const rowUserId = String(row[1]);
      const rowStatus = String(row[4]);

      if (rowUserId === String(userId) && rowStatus === 'draft') {
        latestDraft = {};
        headers.forEach((header, index) => {
          latestDraft[header] = row[index];
        });
        break;
      }
    }

    if (!latestDraft) {
      return {
        success: false,
        message: 'Tidak ada draft yang tersimpan'
      };
    }

    latestDraft.data_json = safeJsonParse(latestDraft.data_json, {});

    return {
      success: true,
      data: latestDraft
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Submit payment
 */
function submitPayment(userId, paymentData) {
  try {
    // Validasi nominal lebih awal
    const nominal = formatNominal(paymentData.nominal);
    if (!nominal || nominal <= 0) {
      return {
        success: false,
        message: 'Nominal pembayaran harus lebih dari 0'
      };
    }

    if (!paymentData.metode_pembayaran || !CONFIG.ENUMS.PAYMENTMETHOD.includes(paymentData.metode_pembayaran)) {
      return {
        success: false,
        message: 'Metode pembayaran tidak valid'
      };
    }

    if (!paymentData.bulan_iuran) {
      return {
        success: false,
        message: 'Bulan iuran harus diisi'
      };
    }

    // Validasi format bulan_iuran (MM-YYYY)
    if (!/^\d{2}-\d{4}$/.test(paymentData.bulan_iuran)) {
      return {
        success: false,
        message: 'Format bulan iuran tidak valid (MM-YYYY)'
      };
    }

    const iuranCategory = getCategoryById('CAT-IB');
    if (!iuranCategory || !isTruthy(iuranCategory.is_active)) {
      return {
        success: false,
        message: 'Kategori iuran bulanan tidak tersedia. Hubungi admin.'
      };
    }

    // Cek duplikat
    const existingTransactions = getAllTransactions({
      user_id: userId,
      type: 'income',
      source: 'IURANBULANAN'
    }).data || [];

    const duplicate = existingTransactions.find(t =>
      t.bulan_iuran === paymentData.bulan_iuran &&
      (t.status === 'pending' || t.status === 'approved')
    );

    if (duplicate) {
      return {
        success: false,
        message: `Pembayaran untuk bulan ${paymentData.bulan_iuran} sudah ada (status: ${duplicate.status})`
      };
    }

    // Create transaction
    const transactionResult = createTransaction({
      user_id: userId,
      type: 'income',
      source: 'IURANBULANAN',
      category_id: 'CAT-IB',
      nominal: nominal,
      tanggal: formatDate(new Date(), 'YYYY-MM-DD'),
      bulan_iuran: paymentData.bulan_iuran,
      metode_pembayaran: paymentData.metode_pembayaran,
      rekening_id: paymentData.rekening_id || '',
      bukti_url: paymentData.bukti_url || '',
      status: 'pending',
      deskripsi: cleanString(paymentData.deskripsi) || ''
    }, userId);

    if (!transactionResult.success) {
      return transactionResult;
    }

    // Update draft status
    const psSheet = getSheet(CONFIG.SHEETS.PAYMENT_SUBMISSIONS);
    const psData = psSheet.getDataRange().getValues();
    for (let i = psData.length - 1; i >= 1; i--) {
      if (String(psData[i][1]) === String(userId) && String(psData[i][4]) === 'draft') {
        psSheet.getRange(i + 1, 5).setValue('submitted');
        break;
      }
    }

    // Generate WhatsApp URL
    const waResult = sendPaymentNotification(userId, transactionResult.data.id);

    return {
      success: true,
      message: 'Pembayaran berhasil disubmit',
      data: {
        transaction_id: transactionResult.data.id,
        whatsapp_url: waResult.data?.whatsapp_url || null
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}


// ============================================================================
// SECTION 18: TESTING FUNCTIONS
// ============================================================================

/**
 * Test semua fungsi
 */
function runAllTests() {
  const results = {
    timestamp: getCurrentDateTime(),
    tests: []
  };
  
  // Test 1: Sheet Initialization
  results.tests.push(testSheetInitialization());
  
  // Test 2: Drive Initialization
  results.tests.push(testDriveInitialization());
  
  // Test 3: User Registration
  results.tests.push(testUserRegistration());
  
  // Test 4: User Login
  results.tests.push(testUserLogin());
  
  // Test 5: Transaction CRUD
  results.tests.push(testTransactionCRUD());
  
  // Test 6: Category CRUD
  results.tests.push(testCategoryCRUD());
  
  // Test 7: Bank Account CRUD
  results.tests.push(testBankAccountCRUD());
  
  // Test 8: Event CRUD
  results.tests.push(testEventCRUD());
  
  // Test 9: Announcement CRUD
  results.tests.push(testAnnouncementCRUD());
  
  // Test 10: Dashboard & Reports
  results.tests.push(testDashboardAndReports());
  
  // Test 11: Chart Data
  results.tests.push(testChartData());
  
  // Test 12: Settings
  results.tests.push(testSettings());
  
  return results;
}

/**
 * Test sheet initialization
 */
function testSheetInitialization() {
  const test = {
    name: 'Sheet Initialization',
    success: false,
    message: '',
    details: {}
  };
  
  try {
    const result = initializeAllSheets();
    test.success = result.errors.length === 0;
    test.message = test.success ? 'Semua sheet berhasil diinisialisasi' : 'Ada error pada inisialisasi';
    test.details = result;
  } catch (error) {
    test.message = `Error: ${error.message}`;
  }
  
  return test;
}

/**
 * Test drive initialization
 */
function testDriveInitialization() {
  const test = {
    name: 'Drive Initialization',
    success: false,
    message: '',
    details: {}
  };
  
  try {
    const result = initializeDriveFolders();
    test.success = result.errors.length === 0;
    test.message = test.success ? 'Semua folder berhasil dibuat' : 'Ada error pada pembuatan folder';
    test.details = result;
  } catch (error) {
    test.message = `Error: ${error.message}`;
  }
  
  return test;
}

/**
 * Test user registration
 */
function testUserRegistration() {
  const test = {
    name: 'User Registration',
    success: false,
    message: '',
    details: {}
  };
  
  try {
    const result = registerUser({
      nama: 'Test User',
      alamat: 'Jl. Test No. 123',
      no_hp: '081234567890',
      email: 'test@example.com',
      password: 'password123'
    });
    
    test.success = result.success;
    test.message = result.message;
    test.details = result;
  } catch (error) {
    test.message = `Error: ${error.message}`;
  }
  
  return test;
}

/**
 * Test user login
 */
function testUserLogin() {
  const test = {
    name: 'User Login',
    success: false,
    message: '',
    details: {}
  };
  
  try {
    // First register a test user
    const regResult = registerUser({
      nama: 'Login Test User',
      alamat: 'Jl. Login Test No. 123',
      no_hp: '081234567891',
      email: 'logintest@example.com',
      password: 'password123'
    });
    
    // Approve the user (simulate admin approval)
    if (regResult.success && regResult.data) {
      // Find admin to approve
      const users = getAllUsers({ role: 'admin' });
      const adminId = users.data?.[0]?.id || 'SYSTEM';
      approveUser(regResult.data.id, adminId);
      
      // Now test login
      const loginResult = loginUser(regResult.data.id, 'password123');
      test.success = loginResult.success;
      test.message = loginResult.message;
      test.details = {
        user_id: regResult.data.id,
        login_success: loginResult.success
      };
    } else {
      test.message = 'Gagal membuat user test';
    }
  } catch (error) {
    test.message = `Error: ${error.message}`;
  }
  
  return test;
}

/**
 * Test transaction CRUD
 */
function testTransactionCRUD() {
  const test = {
    name: 'Transaction CRUD',
    success: false,
    message: '',
    details: {}
  };
  
  try {
    // Create
    const createResult = createTransaction({
      type: 'income',
      source: 'IURANBULANAN',
      category_id: 'CAT-IB',
      nominal: 100000,
      tanggal: formatDate(new Date(), 'YYYY-MM-DD'),
      bulan_iuran: formatDate(new Date(), 'MM-YYYY'),
      metode_pembayaran: 'transfer',
      status: 'pending'
    }, 'TEST-USER');
    
    if (!createResult.success) {
      test.message = `Create failed: ${createResult.message}`;
      return test;
    }
    
    // Read
    const readResult = getTransactionById(createResult.data.id);
    if (!readResult) {
      test.message = 'Read failed: Transaction not found';
      return test;
    }
    
    // Update
    const updateResult = updateTransaction(createResult.data.id, {
      nominal: 150000,
      status: 'approved'
    }, 'TEST-ADMIN');
    
    if (!updateResult.success) {
      test.message = `Update failed: ${updateResult.message}`;
      return test;
    }
    
    // Delete
    const deleteResult = deleteTransaction(createResult.data.id, 'TEST-ADMIN');
    
    test.success = deleteResult.success;
    test.message = test.success ? 'Transaction CRUD berhasil' : `Delete failed: ${deleteResult.message}`;
    test.details = {
      create_id: createResult.data.id,
      read_success: !!readResult,
      update_success: updateResult.success,
      delete_success: deleteResult.success
    };
  } catch (error) {
    test.message = `Error: ${error.message}`;
  }
  
  return test;
}

/**
 * Test category CRUD
 */
function testCategoryCRUD() {
  const test = {
    name: 'Category CRUD',
    success: false,
    message: '',
    details: {}
  };
  
  try {
    // Create
    const createResult = createCategory({
      name: 'Test Category',
      type: 'expense',
      is_active: true
    }, 'TEST-ADMIN');
    
    if (!createResult.success) {
      test.message = `Create failed: ${createResult.message}`;
      return test;
    }
    
    // Read
    const readResult = getCategoryById(createResult.data.id);
    
    // Update
    const updateResult = updateCategory(createResult.data.id, {
      name: 'Updated Test Category'
    }, 'TEST-ADMIN');
    
    // Delete
    const deleteResult = deleteCategory(createResult.data.id, 'TEST-ADMIN');
    
    test.success = readResult && updateResult.success && deleteResult.success;
    test.message = test.success ? 'Category CRUD berhasil' : 'Ada yang gagal';
    test.details = {
      create_id: createResult.data.id,
      read_success: !!readResult,
      update_success: updateResult.success,
      delete_success: deleteResult.success
    };
  } catch (error) {
    test.message = `Error: ${error.message}`;
  }
  
  return test;
}

/**
 * Test bank account CRUD
 */
function testBankAccountCRUD() {
  const test = {
    name: 'Bank Account CRUD',
    success: false,
    message: '',
    details: {}
  };
  
  try {
    // Create
    const createResult = createBankAccount({
      nama_bank: 'Test Bank',
      nomor_rekening: '1234567890',
      nama_pemilik: 'Test Owner',
      is_active: true
    }, 'TEST-ADMIN');
    
    if (!createResult.success) {
      test.message = `Create failed: ${createResult.message}`;
      return test;
    }
    
    // Read
    const readResult = getBankAccountById(createResult.data.id);
    
    // Update
    const updateResult = updateBankAccount(createResult.data.id, {
      nama_pemilik: 'Updated Owner'
    }, 'TEST-ADMIN');
    
    // Delete
    const deleteResult = deleteBankAccount(createResult.data.id, 'TEST-ADMIN');
    
    test.success = readResult && updateResult.success && deleteResult.success;
    test.message = test.success ? 'Bank Account CRUD berhasil' : 'Ada yang gagal';
    test.details = {
      create_id: createResult.data.id,
      read_success: !!readResult,
      update_success: updateResult.success,
      delete_success: deleteResult.success
    };
  } catch (error) {
    test.message = `Error: ${error.message}`;
  }
  
  return test;
}

/**
 * Test event CRUD
 */
function testEventCRUD() {
  const test = {
    name: 'Event CRUD',
    success: false,
    message: '',
    details: {}
  };
  
  try {
    const now = formatDate(new Date(), 'YYYY-MM-DD');
    
    // Create
    const createResult = createEvent({
      title: 'Test Event',
      description: 'Test Description',
      tanggal_mulai: now,
      tanggal_selesai: now,
      lokasi: 'Test Location'
    }, 'TEST-ADMIN');
    
    if (!createResult.success) {
      test.message = `Create failed: ${createResult.message}`;
      return test;
    }
    
    // Read
    const readResult = getEventById(createResult.data.id);
    
    // Update
    const updateResult = updateEvent(createResult.data.id, {
      title: 'Updated Test Event'
    }, 'TEST-ADMIN');
    
    // Delete
    const deleteResult = deleteEvent(createResult.data.id, 'TEST-ADMIN');
    
    test.success = readResult && updateResult.success && deleteResult.success;
    test.message = test.success ? 'Event CRUD berhasil' : 'Ada yang gagal';
    test.details = {
      create_id: createResult.data.id,
      read_success: !!readResult,
      update_success: updateResult.success,
      delete_success: deleteResult.success
    };
  } catch (error) {
    test.message = `Error: ${error.message}`;
  }
  
  return test;
}

/**
 * Test announcement CRUD
 */
function testAnnouncementCRUD() {
  const test = {
    name: 'Announcement CRUD',
    success: false,
    message: '',
    details: {}
  };
  
  try {
    // Create
    const createResult = createAnnouncement({
      title: 'Test Announcement',
      content: 'Test Content untuk pengumuman ini adalah test content yang cukup panjang'
    }, 'TEST-ADMIN');
    
    if (!createResult.success) {
      test.message = `Create failed: ${createResult.message}`;
      return test;
    }
    
    // Read
    const readResult = getAnnouncementById(createResult.data.id);
    
    // Update
    const updateResult = updateAnnouncement(createResult.data.id, {
      title: 'Updated Test Announcement'
    }, 'TEST-ADMIN');
    
    // Delete
    const deleteResult = deleteAnnouncement(createResult.data.id, 'TEST-ADMIN');
    
    test.success = readResult && updateResult.success && deleteResult.success;
    test.message = test.success ? 'Announcement CRUD berhasil' : 'Ada yang gagal';
    test.details = {
      create_id: createResult.data.id,
      read_success: !!readResult,
      update_success: updateResult.success,
      delete_success: deleteResult.success
    };
  } catch (error) {
    test.message = `Error: ${error.message}`;
  }
  
  return test;
}

/**
 * Test dashboard and reports
 */
function testDashboardAndReports() {
  const test = {
    name: 'Dashboard & Reports',
    success: false,
    message: '',
    details: {}
  };
  
  try {
    // Dashboard
    const dashboardResult = getDashboardSummary();
    
    // Financial Report
    const reportResult = getFinancialReport({
      start_date: formatDate(new Date(new Date().getFullYear(), 0, 1), 'YYYY-MM-DD'),
      end_date: formatDate(new Date(), 'YYYY-MM-DD')
    });
    
    // Monthly Balance
    const balanceResult = getMonthlyBalanceReport(new Date().getFullYear());
    
    test.success = dashboardResult.success && reportResult.success && balanceResult.success;
    test.message = test.success ? 'Dashboard & Reports berhasil' : 'Ada yang gagal';
    test.details = {
      dashboard_success: dashboardResult.success,
      report_success: reportResult.success,
      balance_success: balanceResult.success,
      dashboard_data: dashboardResult.data
    };
  } catch (error) {
    test.message = `Error: ${error.message}`;
  }
  
  return test;
}

/**
 * Test chart data
 */
function testChartData() {
  const test = {
    name: 'Chart Data',
    success: false,
    message: '',
    details: {}
  };
  
  try {
    const barResult = getBarChartData(new Date().getFullYear());
    const pieResult = getPieChartData({});
    const lineResult = getLineChartData(new Date().getFullYear());
    
    test.success = barResult.success && pieResult.success && lineResult.success;
    test.message = test.success ? 'Chart Data berhasil' : 'Ada yang gagal';
    test.details = {
      bar_chart_success: barResult.success,
      pie_chart_success: pieResult.success,
      line_chart_success: lineResult.success
    };
  } catch (error) {
    test.message = `Error: ${error.message}`;
  }
  
  return test;
}

/**
 * Test settings
 */
function testSettings() {
  const test = {
    name: 'Settings',
    success: false,
    message: '',
    details: {}
  };
  
  try {
    // Get all settings
    const allSettings = getAllSettings();
    
    // Get public settings
    const publicSettings = getPublicSettings();
    
    // Update setting
    const updateResult = updateSetting('test_key', 'test_value', 'Test description', 'TEST-ADMIN');
    
    // Get setting
    const value = getSetting('test_key');
    
    test.success = allSettings.success && publicSettings.success && updateResult.success && value === 'test_value';
    test.message = test.success ? 'Settings berhasil' : 'Ada yang gagal';
    test.details = {
      all_settings_success: allSettings.success,
      public_settings_success: publicSettings.success,
      update_success: updateResult.success,
      read_value: value
    };
  } catch (error) {
    test.message = `Error: ${error.message}`;
  }
  
  return test;
}

// ============================================================================
// SECTION 19: DUMMY DATA FOR TESTING
// ============================================================================

/**
 * Insert dummy data untuk testing
 */
function insertDummyData() {
  const results = {
    users: [],
    transactions: [],
    events: [],
    announcements: [],
    errors: []
  };
  
  try {
    // Insert 3 dummy users
    const dummyUsers = [
      {
        nama: 'Ahmad Hidayat',
        alamat: 'Jl. Melati No. 11, RT 11',
        no_hp: '081234500001',
        email: 'ahmad.hidayat@email.com',
        password: 'password123',
        role: 'admin'
      },
      {
        nama: 'Siti Nurhaliza',
        alamat: 'Jl. Melati No. 12, RT 11',
        no_hp: '081234500002',
        email: 'siti.nurhaliza@email.com',
        password: 'password123',
        role: 'warga'
      },
      {
        nama: 'Budi Santoso',
        alamat: 'Jl. Melati No. 13, RT 11',
        no_hp: '081234500003',
        email: 'budi.santoso@email.com',
        password: 'password123',
        role: 'warga'
      }
    ];
    
    for (const userData of dummyUsers) {
      const result = registerUser(userData);
      if (result.success) {
        // Auto approve untuk testing
        approveUser(result.data.id, 'SYSTEM');
        
        // Update role jika admin
        if (userData.role === 'admin') {
          changeUserRole(result.data.id, 'admin', 'SYSTEM');
        }
        
        results.users.push({
          id: result.data.id,
          nama: userData.nama,
          email: userData.email,
          role: userData.role
        });
      } else {
        results.errors.push(`User ${userData.nama}: ${result.message}`);
      }
    }
    
    // Insert dummy transactions
    const now = new Date();
    const dummyTransactions = [
      {
        user_id: results.users[0]?.id,
        type: 'income',
        source: 'IURANBULANAN',
        category_id: 'CAT-IB',
        nominal: 100000,
        tanggal: formatDate(new Date(now.getFullYear(), now.getMonth(), 5), 'YYYY-MM-DD'),
        bulan_iuran: formatDate(new Date(now.getFullYear(), now.getMonth(), 1), 'MM-YYYY'),
        metode_pembayaran: 'transfer',
        status: 'pending'  // selalu pending dulu, approve via validateTransaction
      },
      {
        user_id: results.users[1]?.id,
        type: 'income',
        source: 'IURANBULANAN',
        category_id: 'CAT-IB',
        nominal: 100000,
        tanggal: formatDate(new Date(now.getFullYear(), now.getMonth(), 10), 'YYYY-MM-DD'),
        bulan_iuran: formatDate(new Date(now.getFullYear(), now.getMonth(), 1), 'MM-YYYY'),
        metode_pembayaran: 'transfer',
        status: 'pending'
      },
      {
        user_id: results.users[2]?.id,
        type: 'income',
        source: 'DONASI',
        category_id: 'CAT-DON',
        nominal: 50000,
        tanggal: formatDate(new Date(now.getFullYear(), now.getMonth(), 15), 'YYYY-MM-DD'),
        metode_pembayaran: 'cash',
        status: 'pending'
      }
    ];
    
    for (const txData of dummyTransactions) {
      if (txData.user_id) {
        const result = createTransaction(txData, txData.user_id);
        if (result.success) {
          // Validate transaction
          if (txData.status === 'approved') {
            validateTransaction(result.data.id, 'approved', 'SYSTEM');
          }
          
          results.transactions.push({
            id: result.data.id,
            type: txData.type,
            nominal: txData.nominal
          });
        } else {
          results.errors.push(`Transaction: ${result.message}`);
        }
      }
    }
    
    // Insert dummy events
    const dummyEvents = [
      {
        title: 'Kerja Bakti RT 11',
        description: 'Kerja bakti rutin bulanan untuk membersihkan lingkungan RT',
        tanggal_mulai: formatDate(new Date(now.getFullYear(), now.getMonth(), 20), 'YYYY-MM-DD'),
        tanggal_selesai: formatDate(new Date(now.getFullYear(), now.getMonth(), 20), 'YYYY-MM-DD'),
        lokasi: 'Area RT 11'
      },
      {
        title: 'Rapat Bulanan',
        description: 'Rapat koordinasi bulanan warga RT 11',
        tanggal_mulai: formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 1), 'YYYY-MM-DD'),
        tanggal_selesai: formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 1), 'YYYY-MM-DD'),
        lokasi: 'Balai RT 11'
      },
      {
        title: 'Senam Bersama',
        description: 'Kegiatan senam bersama warga RT setiap minggu',
        tanggal_mulai: formatDate(new Date(now.getFullYear(), now.getMonth(), 25), 'YYYY-MM-DD'),
        tanggal_selesai: formatDate(new Date(now.getFullYear(), now.getMonth(), 25), 'YYYY-MM-DD'),
        lokasi: 'Taman RT 11'
      }
    ];
    
    for (const eventData of dummyEvents) {
      const result = createEvent(eventData, 'SYSTEM');
      if (result.success) {
        results.events.push({
          id: result.data.id,
          title: eventData.title
        });
      } else {
        results.errors.push(`Event: ${result.message}`);
      }
    }
    
    // Insert dummy announcements
    const dummyAnnouncements = [
      {
        title: 'Pengumuman Iuran Bulan Ini',
        content: 'Mohon kepada seluruh warga RT 11 untuk membayar iuran wajib keluarga bulan ini paling lambat tanggal 25. Terima kasih atas kerjasamanya.'
      },
      {
        title: 'Jadwal Kerja Bakti',
        content: 'Diumumkan kepada seluruh warga RT 11 bahwa akan diadakan kerja bakti pada hari Minggu tanggal 20. Mohon kehadiran seluruh warga.'
      },
      {
        title: 'Selamat Datang Warga Baru',
        content: 'Kami mengucapkan selamat datang kepada warga baru RT 11. Semoga dapat beradaptasi dengan baik dan berkontribusi positif untuk lingkungan.'
      }
    ];
    
    for (const annData of dummyAnnouncements) {
      const result = createAnnouncement(annData, 'SYSTEM');
      if (result.success) {
        results.announcements.push({
          id: result.data.id,
          title: annData.title
        });
      } else {
        results.errors.push(`Announcement: ${result.message}`);
      }
    }
    
    // Update monthly balance
    updateMonthlyBalance(formatDate(new Date(), 'YYYY-MM-DD'));
    
  } catch (error) {
    results.errors.push(`General error: ${error.message}`);
  }
  
  return results;
}

/**
 * Clear dummy data
 */
function clearDummyData() {
  const results = {
    deleted: [],
    errors: []
  };
  
  try {
    // Clear users (except first admin)
    const users = getAllUsers();
    for (const user of users.data || []) {
      if (user.email?.includes('test') || user.email?.includes('@email.com')) {
        try {
          deleteUser(user.id, 'SYSTEM');
          results.deleted.push(`User: ${user.nama}`);
        } catch (e) {
          results.errors.push(`Delete user ${user.nama}: ${e.message}`);
        }
      }
    }
    
    // Clear test transactions
    const transactions = getAllTransactions();
    for (const tx of transactions.data || []) {
      const isDummyTx = String(tx.created_by || '').toUpperCase() === 'SYSTEM' ||
        /test|dummy/i.test(String(tx.deskripsi || ''));
      if (isDummyTx) {
        try {
          deleteTransaction(tx.id, 'SYSTEM');
          results.deleted.push(`Transaction: ${tx.id}`);
        } catch (e) {
          results.errors.push(`Delete transaction ${tx.id}: ${e.message}`);
        }
      }
    }
    
  } catch (error) {
    results.errors.push(`General error: ${error.message}`);
  }
  
  return results;
}

// ============================================================================
// SECTION 20: WEB APP ENDPOINTS (DOGET/DOPOST)
// ============================================================================

function createJsonResponse(result) {
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle GET requests
 */
function doGet(e) {
  const endpoint = e && e.parameter ? (e.parameter.action || '') : '';
  const token = e && e.parameter ? e.parameter.token : null;
  
  // Verify token for protected endpoints
  let user = null;
  if (token) {
    user = verifySessionToken(token);
  }
  
  let result;
  
  try {
    switch (endpoint) {
      // Public endpoints
      case 'getPublicSettings':
        result = getPublicSettings();
        break;
        
      case 'getAnnouncements':
        result = getAllAnnouncements(parseInt(e.parameter.limit) || 10);
        break;
        
      case 'getEvents':
        result = getAllEvents({
          month: e.parameter.month,
          year: e.parameter.year,
          activeOnly: true
        });
        break;
        
      // Auth required endpoints
      case 'getDashboard':
        if (!user) {
          result = { success: false, message: 'Autentikasi diperlukan' };
          break;
        }
        result = getDashboardSummary();
        break;
        
      case 'getTransactions':
        if (!user) {
          result = { success: false, message: 'Autentikasi diperlukan' };
          break;
        }
        const requestedUserId = cleanString(e.parameter.user_id || e.parameter.userid || '');
        const startDate = sanitizeDateParam(e.parameter.start_date || e.parameter.startdate);
        const endDate = sanitizeDateParam(e.parameter.end_date || e.parameter.enddate);
        const filterUserId = user.role !== 'admin' ? user.id : (requestedUserId || undefined);
        result = getAllTransactions({
          type: e.parameter.type,
          status: e.parameter.status,
          start_date: startDate,
          end_date: endDate,
          user_id: filterUserId
        });
        break;
        
      case 'getFinancialReport':
        if (!user) {
          result = { success: false, message: 'Autentikasi diperlukan' };
          break;
        }
        result = getFinancialReport({
          start_date: sanitizeDateParam(e.parameter.start_date),
          end_date: sanitizeDateParam(e.parameter.end_date)
        });
        break;
        
      case 'getChartData':
        if (!user) {
          result = { success: false, message: 'Autentikasi diperlukan' };
          break;
        }
        result = getAllChartData(parseInt(e.parameter.year) || new Date().getFullYear());
        break;
        
      case 'getUsers':
        if (!user || user.role !== 'admin') {
          result = { success: false, message: 'Akses ditolak' };
          break;
        }
        result = getAllUsers({
          status: e.parameter.status,
          role: e.parameter.role,
          search: e.parameter.search,
          include_deleted: e.parameter.include_deleted === 'true' || e.parameter.includedeleted === 'true'
        });
        break;
        
      case 'getCategories':
        result = getAllCategories(e.parameter.type);
        break;
        
      case 'getBankAccounts':
        result = getAllBankAccounts(e.parameter.activeOnly !== 'false');
        break;
        
      case 'getLogs':
        if (!user || user.role !== 'admin') {
          result = { success: false, message: 'Akses ditolak' };
          break;
        }
        result = getLogs({
          user_id: e.parameter.user_id,
          action: e.parameter.log_action || e.parameter.logaction || '',
          limit: parseInt(e.parameter.limit) || 100
        });
        break;

      case 'getProfile':
        if (!user) {
          result = { success: false, message: 'Autentikasi diperlukan' };
          break;
        }
        const profileId = user.role === 'admin'
          ? cleanString(e.parameter.userid || e.parameter.user_id || user.id)
          : user.id;
        result = {
          success: true,
          data: getUserById(profileId)
        };
        break;

      case 'getUnpaidMonths':
        if (!user) {
          result = { success: false, message: 'Autentikasi diperlukan' };
          break;
        }
        const unpaidUserId = user.role === 'admin'
          ? cleanString(e.parameter.userid || e.parameter.user_id || user.id)
          : user.id;
        result = getUnpaidMonths(unpaidUserId);
        break;

      case 'exportReport':
        if (!user) {
          result = { success: false, message: 'Autentikasi diperlukan' };
          break;
        }
        result = exportReport(e.parameter, user);
        break;
        
      default:
        result = {
          success: false,
          message: 'Action tidak dikenali',
          available_actions: [
            'getPublicSettings',
            'getAnnouncements', 
            'getEvents',
            'getDashboard',
            'getTransactions',
            'getFinancialReport',
            'getChartData',
            'getUsers',
            'getCategories',
            'getBankAccounts',
            'getLogs',
            'getProfile',
            'getUnpaidMonths',
            'exportReport'
          ]
        };
    }
  } catch (error) {
    result = {
      success: false,
      message: `Error: ${error.message}`
    };
  }
  
  return createJsonResponse(result);
}

/**
 * Handle POST requests
 */
function doPost(e) {
  let data = {};
  try {
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      data = e.parameter;
      // FIX TIPE DATA: Ubah string 'true'/'false' jadi boolean beneran
      for (let key in data) {
        if (data[key] === 'true') data[key] = true;
        if (data[key] === 'false') data[key] = false;
      }
    }
  } catch (error) {
    return createJsonResponse({ success: false, message: 'Format JSON tidak valid' });
  }

  const action = data.action;
  const token = normalizeAuthToken(data.token || (e && e.parameter ? e.parameter.token : null));

  // IMPLEMENTASI MIDDLEWARE:
  const auth = requireAuth({ token: token });
  const user = auth.authenticated ? auth.user : null;
  const adminCheck = requireAdmin(user);

  let result;
  
  try {
    switch (action) {
      // Auth endpoints
      case 'login':
        result = loginUser(data.identifier, data.password);
        break;
        
      case 'logout':
        result = logoutUser(token);
        break;
        
      case 'register':
        result = registerUser(data);
        break;
        
      // User management
      case 'updateUser':
        if (!auth.authenticated) return createJsonResponse(auth);
        
        // FIX BUG IDOR: Jika bukan admin, paksa target ID menjadi ID dirinya sendiri (tidak bisa bajak akun orang)
        let targetUserId = data.user_id || user.id;
        if (user.role !== 'admin' && data.user_id && data.user_id !== user.id) {
          return createJsonResponse({ success: false, message: 'Akses ditolak: Anda hanya dapat mengubah data Anda sendiri' });
        }
        
        result = updateUser(targetUserId, data, user.id);
        break;
        
      case 'approveUser':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = approveUser(data.user_id, user.id);
        break;
        
      case 'rejectUser':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = rejectUser(data.user_id, user.id, data.reason);
        break;
        
      case 'deleteUser':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = deleteUser(data.user_id, user.id);
        break;

      case 'changeUserRole': {
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        const targetId = cleanString(data.user_id || data.userid || '');
        const newRole = cleanString(data.new_role || data.newrole || data.role || '');
        if (!targetId) return createJsonResponse({ success: false, message: 'user_id wajib diisi' });
        if (!newRole) return createJsonResponse({ success: false, message: 'new_role wajib diisi' });
        result = changeUserRole(targetId, newRole, user.id);
        break;
      }
        
      // Transaction management
      case 'createTransaction':
        // FIX BUG PRIVILEGE: Hanya admin yang boleh create transaksi bebas langsung
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = createTransaction(data, user.id);
        break;
        
      case 'updateTransaction':
        // FIX BUG PRIVILEGE: Hanya admin yang boleh edit transaksi/mengubah status jadi approved
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = updateTransaction(data.transaction_id, data, user.id);
        break;
        
      case 'validateTransaction':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = validateTransaction(data.transaction_id, data.status, user.id, data.notes);
        break;
        
      case 'deleteTransaction':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = deleteTransaction(data.transaction_id, user.id);
        break;
        
      // Payment submission
      case 'savePaymentDraft':
        if (!auth.authenticated) return createJsonResponse(auth);
        result = savePaymentDraft(user.id, data.step, data.data);
        break;
        
      case 'getPaymentDraft':
        if (!auth.authenticated) return createJsonResponse(auth);
        result = getPaymentDraft(user.id);
        break;
        
      case 'submitPayment':
        if (!auth.authenticated) return createJsonResponse(auth);
        result = submitPayment(user.id, data);
        break;
        
      // Category management (admin)
      case 'createCategory':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = createCategory(data, user.id);
        break;
        
      case 'updateCategory':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = updateCategory(data.category_id, data, user.id);
        break;
        
      case 'deleteCategory':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = deleteCategory(data.category_id, user.id);
        break;
        
      // Bank account management (admin)
      case 'createBankAccount':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = createBankAccount(data, user.id);
        break;
        
      case 'updateBankAccount':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = updateBankAccount(data.account_id, data, user.id);
        break;
        
      case 'deleteBankAccount':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = deleteBankAccount(data.account_id, user.id);
        break;
        
      // Event management (admin)
      case 'createEvent':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = createEvent(data, user.id);
        break;
        
      case 'updateEvent':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = updateEvent(data.event_id, data, user.id);
        break;
        
      case 'deleteEvent':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = deleteEvent(data.event_id, user.id);
        break;
        
      // Announcement management (admin)
      case 'createAnnouncement':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = createAnnouncement(data, user.id);
        break;
        
      case 'updateAnnouncement':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = updateAnnouncement(data.announcement_id, data, user.id);
        break;
        
      case 'deleteAnnouncement':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = deleteAnnouncement(data.announcement_id, user.id);
        break;
        
      // Settings management (admin)
      case 'updateSetting':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = updateSetting(data.key, data.value, data.description, user.id);
        break;
        
      // File upload
      case 'uploadFile':
        if (!auth.authenticated) return createJsonResponse(auth);
        result = uploadFile(data.base64, data.file_name, data.folder_type, data.related_id, user.id);
        break;

      case 'exportReport':
        if (!auth.authenticated) return createJsonResponse(auth);
        result = exportReport(data, user);
        break;
        
      // Testing endpoints (untuk development)
      case 'runTests':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = runAllTests();
        break;
        
      case 'insertDummyData':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = insertDummyData();
        break;
        
      case 'initializeSheets':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = initializeAllSheets();
        break;
        
      case 'initializeDrive':
        if (!adminCheck.authorized) return createJsonResponse(adminCheck);
        result = initializeDriveFolders();
        break;
        
      default:
        result = {
          success: false,
          message: 'Action tidak dikenali',
          available_actions: [
            'login', 'logout', 'register',
            'updateUser', 'approveUser', 'rejectUser', 'deleteUser', 'changeUserRole',
            'createTransaction', 'updateTransaction', 'validateTransaction', 'deleteTransaction',
            'savePaymentDraft', 'getPaymentDraft', 'submitPayment',
            'createCategory', 'updateCategory', 'deleteCategory',
            'createBankAccount', 'updateBankAccount', 'deleteBankAccount',
            'createEvent', 'updateEvent', 'deleteEvent',
            'createAnnouncement', 'updateAnnouncement', 'deleteAnnouncement',
            'updateSetting', 'uploadFile', 'exportReport',
            'runTests', 'insertDummyData', 'initializeSheets', 'initializeDrive'
          ]
        };
    }
  } catch (error) {
    result = {
      success: false,
      message: `Error: ${error.message}`
    };
  }
  
  return createJsonResponse(result);
}

// ============================================================================
// SECTION 21: HELPER FUNCTIONS FOR FRONTEND
// ============================================================================

/**
 * Get current user info
 */
function getCurrentUser(token) {
  return verifySessionToken(token);
}

/**
 * Check if user is admin
 */
function isAdmin(user) {
  return user && user.role === 'admin';
}

/**
 * Get user's unpaid months
 */
function getUnpaidMonths(userId) {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Get user's transactions
    const transactions = getAllTransactions({
      user_id: userId,
      type: 'income',
      source: 'IURANBULANAN'
    });

    const paidMonths = new Map();
    (transactions.data || []).forEach(t => {
      if (t.bulan_iuran && (t.status === 'approved' || t.status === 'pending')) {
        paidMonths.set(t.bulan_iuran, t.status);
      }
    });
    
    // Check last 12 months
    const unpaid = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const calcMonth = d.getMonth() + 1;
      const calcYear = d.getFullYear();
      const mm = String(calcMonth).padStart(2, '0');
      const monthStr = `${mm}-${calcYear}`;
      
      if (!paidMonths.has(monthStr)) {
        unpaid.push({
          month: monthStr,
          month_name: getMonthName(calcMonth),
          year: calcYear
        });
      }
    }
    
    return {
      success: true,
      data: unpaid
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Get payment history for user
 */
function getPaymentHistory(userId, limit = 12) {
  try {
    const transactions = getAllTransactions({
      user_id: userId,
      type: 'income',
      source: 'IURANBULANAN'
    });
    
    const history = (transactions.data || [])
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
      .slice(0, limit)
      .map(t => ({
        id: t.id,
        bulan_iuran: t.bulan_iuran,
        nominal: t.nominal,
        tanggal: t.tanggal,
        status: t.status,
        metode_pembayaran: t.metode_pembayaran
      }));
    
    return {
      success: true,
      data: history
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Search all data
 */
function searchData(query, type = 'all') {
  try {
    const results = {
      users: [],
      transactions: [],
      events: [],
      announcements: []
    };
    
    if (type === 'all' || type === 'users') {
      const users = getAllUsers({ search: query });
      results.users = users.data || [];
    }
    
    if (type === 'all' || type === 'transactions') {
      const transactions = getAllTransactions({ search: query });
      results.transactions = transactions.data || [];
    }
    
    if (type === 'all' || type === 'events') {
      const events = getAllEvents({ search: query });
      results.events = events.data || [];
    }
    
    if (type === 'all' || type === 'announcements') {
      const announcements = getAllAnnouncements(20);
      const filtered = (announcements.data || []).filter(a => 
        a.title?.toLowerCase().includes(query.toLowerCase()) ||
        a.content?.toLowerCase().includes(query.toLowerCase())
      );
      results.announcements = filtered;
    }
    
    return {
      success: true,
      data: results
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Export data to CSV format
 */
function exportToCSV(type, filters = {}) {
  try {
    let headers = [];
    let rows = [];
    const escapeCSV = (value) => {
      const str = String(value === null || value === undefined ? '' : value);
      if (/["\n,]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    switch (type) {
      case 'transactions':
        const txResult = getAllTransactions(filters);
        headers = ['ID', 'Tanggal', 'Type', 'Source', 'Nominal', 'Status', 'Deskripsi'];
        rows = (txResult.data || []).map(item => [
          item.id, item.tanggal, item.type, item.source, item.nominal, item.status, item.deskripsi || ''
        ]);
        break;
        
      case 'users':
        const userResult = getAllUsers(filters);
        headers = ['ID', 'Nama', 'Alamat', 'No HP', 'Email', 'Status', 'Role'];
        rows = (userResult.data || []).map(item => [
          item.id,
          item.nama || '',
          item.alamat || '',
          item.no_hp || '',
          item.email || '',
          item.status || '',
          item.role || ''
        ]);
        break;
        
      default:
        return {
          success: false,
          message: 'Type tidak dikenali'
        };
    }
    
    // Convert to CSV
    const csvLines = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ];
    
    return {
      success: true,
      data: csvLines.join('\n'),
      filename: `${type}_${formatDate(new Date(), 'YYYY-MM-DD')}.csv`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Get statistics summary
 */
function getStatisticsSummary() {
  try {
    const dashboard = getDashboardSummary();
    const users = getAllUsers({ status: 'approved' });
    const transactions = getAllTransactions({ status: 'approved' });
    
    const txData = transactions.data || [];
    
    // Average transaction
    const avgTransaction = txData.length > 0 
      ? txData.reduce((sum, t) => sum + (Number(t.nominal) || 0), 0) / txData.length 
      : 0;
    
    // Transaction count by type
    const incomeCount = txData.filter(t => t.type === 'income').length;
    const expenseCount = txData.filter(t => t.type === 'expense').length;
    
    // Payment rate (users who paid this month)
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const paidThisMonth = new Set(
      txData
        .filter(t => {
          const date = new Date(t.tanggal);
          return t.type === 'income' && t.source === 'IURANBULANAN' &&
                 date.getMonth() + 1 === currentMonth &&
                 date.getFullYear() === currentYear;
        })
        .map(t => t.user_id)
    );
    
    const paymentRate = users.data?.length > 0 
      ? (paidThisMonth.size / users.data.length * 100).toFixed(1) 
      : 0;
    
    return {
      success: true,
      data: {
        ...dashboard.data,
        average_transaction: avgTransaction,
        transaction_count: txData.length,
        income_count: incomeCount,
        expense_count: expenseCount,
        payment_rate: paymentRate
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

// ============================================================================
// END OF CODE
// ============================================================================

// ============================================================================
// SECTION 22: EXPORT PDF & EXCEL (LAPORAN KEUANGAN PROFESIONAL)
// ============================================================================

/**
 * MASTER EXPORT HANDLER
 * Dipanggil dari frontend via doGet dengan action=exportReport
 * Parameter: token, format (pdf/excel/csv), report_type, start_date, end_date, year
 */
function exportReport(params, user) {
  const format      = (params.format || 'pdf').toLowerCase();
  const reportType  = params.report_type || 'financial';
  const filters     = {
    start_date : params.start_date || params.startdate || null,
    end_date   : params.end_date   || params.enddate   || null,
    year       : parseInt(params.year) || new Date().getFullYear(),
    status     : 'approved'
  };

  // Bangun payload laporan
  const reportData = buildReportPayload(reportType, filters, user);
  if (!reportData.success) return reportData;

  switch (format) {
    case 'pdf':
      return generatePdfReport(reportData.data, reportType, filters);
    case 'excel':
    case 'xlsx':
      return generateExcelReport(reportData.data, reportType, filters);
    case 'csv':
      return generateCsvReport(reportData.data, reportType, filters);
    default:
      return { success: false, message: 'Format tidak dikenali. Gunakan: pdf / excel / csv' };
  }
}

// ─────────────────────────────────────────────
// BAGIAN A: BUILDER DATA LAPORAN
// ─────────────────────────────────────────────

/**
 * Kumpulkan semua data yang dibutuhkan laporan
 */
function buildReportPayload(reportType, filters, user) {
  try {
    const settings    = getPublicSettings().data || {};
    const appName     = settings.app_name   || 'IWK RT 11';
    const alamatRt    = settings.alamat_rt  || 'Komplek Pradha';
    const generatedAt = formatDate(new Date(), 'DD-MM-YYYY HH:mm:ss');
    const generatedBy = user ? (user.nama || user.id) : 'Sistem';

    // Resolusi periode
    let periodLabel, startDate, endDate;
    if (filters.start_date && filters.end_date) {
      startDate   = filters.start_date;
      endDate     = filters.end_date;
      periodLabel = `${formatDate(new Date(startDate), 'DD-MM-YYYY')} s.d. ${formatDate(new Date(endDate), 'DD-MM-YYYY')}`;
    } else {
      startDate   = `${filters.year}-01-01`;
      endDate     = `${filters.year}-12-31`;
      periodLabel = `Tahun ${filters.year}`;
    }

    // Transaksi approved di periode ini
    const allTx = getAllTransactions({
      start_date : startDate,
      end_date   : endDate,
      status     : 'approved'
    }).data || [];

    const incomeTx  = allTx.filter(t => t.type === 'income');
    const expenseTx = allTx.filter(t => t.type === 'expense');

    const totalIncome  = incomeTx.reduce( (s, t) => s + (Number(t.nominal) || 0), 0);
    const totalExpense = expenseTx.reduce((s, t) => s + (Number(t.nominal) || 0), 0);
    const netBalance   = totalIncome - totalExpense;

    // Saldo awal (closing balance bulan sebelum periode)
    const startDateObj   = new Date(startDate);
    const prevMonthDate  = new Date(startDateObj.getFullYear(), startDateObj.getMonth() - 1, 1);
    const prevBulanKey   = `${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-${prevMonthDate.getFullYear()}`;
    const monthlySheet   = getSheet(CONFIG.SHEETS.MONTHLY_BALANCES);
    const prevBalance    = findRowByValue(monthlySheet, 2, prevBulanKey);
    const openingBalance = prevBalance ? (Number(prevBalance.closing_balance) || 0)
                                       : (Number(getSetting('opening_balance')) || 0);
    const closingBalance = openingBalance + netBalance;

    // Kategori lookup
    const catMap = {};
    (getAllCategories().data || []).forEach(c => { catMap[c.id] = c.name; });

    // User lookup (id → nama)
    const userMap = {};
    (getAllUsers().data || []).forEach(u => { userMap[u.id] = u.nama || u.id; });

    // Rekap pemasukan per sumber
    const incomeBySource = {};
    incomeTx.forEach(t => {
      const key = t.source || 'Lainnya';
      incomeBySource[key] = (incomeBySource[key] || 0) + (Number(t.nominal) || 0);
    });

    // Rekap pengeluaran per kategori
    const expenseByCategory = {};
    expenseTx.forEach(t => {
      const key = catMap[t.category_id] || t.category_id || 'Lainnya';
      expenseByCategory[key] = (expenseByCategory[key] || 0) + (Number(t.nominal) || 0);
    });

    // Arus kas bulanan (12 bulan dalam setahun berdasarkan filter.year)
    const cashFlowMonthly = [];
    let runningBal = openingBalance;
    for (let m = 1; m <= 12; m++) {
      const mStr  = String(m).padStart(2, '0');
      const mKey  = `${mStr}-${filters.year}`;
      const mInc  = incomeTx.filter( t => t.tanggal && t.tanggal.startsWith(`${filters.year}-${mStr}`))
                             .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const mExp  = expenseTx.filter(t => t.tanggal && t.tanggal.startsWith(`${filters.year}-${mStr}`))
                              .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      runningBal += mInc - mExp;
      cashFlowMonthly.push({
        bulan        : getMonthName(m),
        bulan_key    : mKey,
        pemasukan    : mInc,
        pengeluaran  : mExp,
        saldo_akhir  : runningBal
      });
    }

    // Data warga & iuran (untuk laporan warga)
    const iuranPerWarga = {};
    incomeTx.filter(t => t.source === 'IURANBULANAN').forEach(t => {
      const nama = userMap[t.user_id] || t.user_id;
      if (!iuranPerWarga[nama]) iuranPerWarga[nama] = { total: 0, count: 0, months: [] };
      iuranPerWarga[nama].total += Number(t.nominal) || 0;
      iuranPerWarga[nama].count += 1;
      if (t.bulan_iuran) iuranPerWarga[nama].months.push(t.bulan_iuran);
    });

    return {
      success: true,
      data: {
        meta: {
          app_name     : appName,
          alamat_rt    : alamatRt,
          report_type  : reportType,
          period_label : periodLabel,
          start_date   : startDate,
          end_date     : endDate,
          generated_at : generatedAt,
          generated_by : generatedBy
        },
        summary: {
          opening_balance : openingBalance,
          total_income    : totalIncome,
          total_expense   : totalExpense,
          net_balance     : netBalance,
          closing_balance : closingBalance
        },
        income_by_source    : incomeBySource,
        expense_by_category : expenseByCategory,
        cash_flow_monthly   : cashFlowMonthly,
        iuran_per_warga     : iuranPerWarga,
        transactions        : allTx.map(t => ({
          ...t,
          user_nama    : userMap[t.user_id] || t.user_id,
          category_nama: catMap[t.category_id] || t.category_id || '-'
        }))
      }
    };
  } catch (e) {
    return { success: false, message: `Build payload error: ${e.message}` };
  }
}

// ─────────────────────────────────────────────
// BAGIAN B: GENERATE PDF (via Google Docs)
// ─────────────────────────────────────────────

/**
 * Generate laporan PDF profesional menggunakan Google Docs sebagai template
 * Mengembalikan URL download PDF yang bisa langsung dibuka/diunduh frontend
 */
function generatePdfReport(data, reportType, filters) {
  try {
    const meta    = data.meta;
    const summary = data.summary;

    // ── Buat Google Doc baru ──────────────────────────────────────────────
    const docTitle = `Laporan Keuangan ${meta.app_name} - ${meta.period_label}`;
    const doc      = DocumentApp.create(docTitle);
    const body     = doc.getBody();

    // Style konstanta
    const COLOR_PRIMARY   = '#1a3c5e'; // Navy
    const COLOR_SECONDARY = '#2e7d32'; // Hijau tua (income)
    const COLOR_DANGER    = '#c62828'; // Merah (expense)
    const COLOR_GOLD      = '#f9a825'; // Emas (aksen)
    const COLOR_LIGHT_BG  = '#e8f5e9';
    const COLOR_TABLE_HDR = '#1a3c5e';
    const COLOR_STRIPE    = '#f5f5f5';

    // ── HEADER UTAMA ─────────────────────────────────────────────────────
    _addDocHeader(body, meta, COLOR_PRIMARY, COLOR_GOLD);

    // ── RINGKASAN NERACA ─────────────────────────────────────────────────
    _addSectionTitle(body, '1. NERACA SALDO', COLOR_PRIMARY);
    _addBalanceSummaryTable(body, summary, COLOR_TABLE_HDR, COLOR_SECONDARY, COLOR_DANGER, COLOR_GOLD);

    body.appendParagraph('').setSpacingAfter(4);

    // ── ARUS KAS BULANAN ─────────────────────────────────────────────────
    _addSectionTitle(body, '2. LAPORAN ARUS KAS BULANAN', COLOR_PRIMARY);
    _addParagraphNote(body, `Rekapitulasi arus kas masuk dan keluar sepanjang Tahun ${filters.year}.`);
    _addCashFlowTable(body, data.cash_flow_monthly, summary.opening_balance, COLOR_TABLE_HDR, COLOR_STRIPE);

    body.appendParagraph('').setSpacingAfter(4);

    // ── RINCIAN PEMASUKAN ────────────────────────────────────────────────
    _addSectionTitle(body, '3. RINCIAN PEMASUKAN', COLOR_PRIMARY);
    _addParagraphNote(body, 'Pemasukan dikelompokkan berdasarkan sumber dana.');
    _addSourceBreakdownTable(body, data.income_by_source, summary.total_income, COLOR_TABLE_HDR, COLOR_LIGHT_BG, COLOR_SECONDARY);

    body.appendParagraph('').setSpacingAfter(4);

    // ── RINCIAN PENGELUARAN ──────────────────────────────────────────────
    _addSectionTitle(body, '4. RINCIAN PENGELUARAN', COLOR_PRIMARY);
    _addParagraphNote(body, 'Pengeluaran dikelompokkan berdasarkan kategori belanja.');
    _addExpenseBreakdownTable(body, data.expense_by_category, summary.total_expense, COLOR_TABLE_HDR, COLOR_LIGHT_BG, COLOR_DANGER);

    body.appendParagraph('').setSpacingAfter(4);

    // ── IURAN PER WARGA ──────────────────────────────────────────────────
    if (Object.keys(data.iuran_per_warga).length > 0) {
      _addSectionTitle(body, '5. REKAPITULASI IURAN PER WARGA', COLOR_PRIMARY);
      _addParagraphNote(body, 'Daftar total IWK yang telah diterima per warga pada periode ini.');
      _addIuranPerWargaTable(body, data.iuran_per_warga, COLOR_TABLE_HDR, COLOR_STRIPE);
      body.appendParagraph('').setSpacingAfter(4);
    }

    // ── DETAIL TRANSAKSI ─────────────────────────────────────────────────
    const sectionNum = Object.keys(data.iuran_per_warga).length > 0 ? '6' : '5';
    _addSectionTitle(body, `${sectionNum}. DETAIL TRANSAKSI`, COLOR_PRIMARY);
    _addParagraphNote(body, `Total ${data.transactions.length} transaksi yang telah divalidasi pada periode ini.`);
    _addTransactionDetailTable(body, data.transactions, COLOR_TABLE_HDR, COLOR_STRIPE, COLOR_SECONDARY, COLOR_DANGER);

    body.appendParagraph('').setSpacingAfter(4);

    // ── TANDA TANGAN & FOOTER ────────────────────────────────────────────
    _addSignatureSection(body, meta, COLOR_PRIMARY);
    _addDocFooter(body, meta, COLOR_PRIMARY);

    // ── Simpan & Export ──────────────────────────────────────────────────
    doc.saveAndClose();

    const docFile     = DriveApp.getFileById(doc.getId());
    const pdfBlob     = docFile.getAs('application/pdf');
    const pdfFileName = `Laporan_Keuangan_${meta.app_name.replace(/\s/g, '_')}_${meta.period_label.replace(/\s/g, '_')}.pdf`;

    // Simpan ke folder laporan
    const folderId = getOrCreateFolder(CONFIG.FOLDERS.REPORTS);
    const folder   = DriveApp.getFolderById(folderId);
    const pdfFile  = folder.createFile(pdfBlob.setName(pdfFileName));
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Hapus Doc sumber (hanya PDF yang disimpan)
    docFile.setTrashed(true);

    return {
      success    : true,
      message    : 'Laporan PDF berhasil dibuat',
      data       : {
        file_url     : `https://drive.google.com/uc?export=download&id=${pdfFile.getId()}`,
        view_url     : `https://drive.google.com/file/d/${pdfFile.getId()}/view`,
        file_name    : pdfFileName,
        file_id      : pdfFile.getId(),
        generated_at : meta.generated_at
      }
    };
  } catch (e) {
    return { success: false, message: `Generate PDF error: ${e.message}` };
  }
}

// ─── Sub-helper: Header Dokumen ───────────────────────────────────────────────
function _addDocHeader(body, meta, colorPrimary, colorGold) {
  // Garis atas dekoratif
  const topLine = body.appendParagraph('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  topLine.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
         .editAsText().setForegroundColor(colorGold).setFontSize(8);

  // Nama organisasi
  const org = body.appendParagraph(meta.app_name.toUpperCase());
  org.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
     .editAsText()
     .setFontFamily('Arial')
     .setFontSize(20)
     .setBold(true)
     .setForegroundColor(colorPrimary);

  // Alamat
  const addr = body.appendParagraph(meta.alamat_rt);
  addr.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .editAsText().setFontSize(11).setForegroundColor('#555555').setItalic(true);

  // Judul laporan
  const title = body.appendParagraph('LAPORAN KEUANGAN');
  title.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
       .editAsText()
       .setFontSize(15)
       .setBold(true)
       .setForegroundColor(colorPrimary);

  // Periode
  const period = body.appendParagraph(`Periode: ${meta.period_label}`);
  period.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
        .editAsText().setFontSize(11).setForegroundColor('#333333');

  // Garis bawah dekoratif
  const botLine = body.appendParagraph('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  botLine.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
         .editAsText().setForegroundColor(colorGold).setFontSize(8);

  // Meta info (tanggal cetak)
  const metaInfo = body.appendParagraph(`Dicetak pada: ${meta.generated_at}   |   Oleh: ${meta.generated_by}`);
  metaInfo.setAlignment(DocumentApp.HorizontalAlignment.RIGHT)
          .editAsText().setFontSize(8).setForegroundColor('#888888').setItalic(true);

  body.appendParagraph('').setSpacingAfter(6);
}

// ─── Sub-helper: Judul Section ────────────────────────────────────────────────
function _addSectionTitle(body, title, color) {
  const p = body.appendParagraph(title);
  p.setHeading(DocumentApp.ParagraphHeading.HEADING2)
   .setSpacingBefore(14)
   .setSpacingAfter(4);
  p.editAsText()
   .setFontFamily('Arial')
   .setFontSize(12)
   .setBold(true)
   .setForegroundColor(color);
}

// ─── Sub-helper: Paragraf catatan ────────────────────────────────────────────
function _addParagraphNote(body, text) {
  const p = body.appendParagraph(text);
  p.editAsText().setFontSize(9).setForegroundColor('#555555').setItalic(true);
  p.setSpacingAfter(4);
}

// ─── Sub-helper: Tabel Neraca Saldo ──────────────────────────────────────────
function _addBalanceSummaryTable(body, summary, hdrColor, incColor, expColor, goldColor) {
  const tableData = [
    ['URAIAN', 'JUMLAH (Rp)'],
    ['Saldo Awal Periode',    formatRupiah(summary.opening_balance)],
    ['(+) Total Pemasukan',   formatRupiah(summary.total_income)],
    ['(-) Total Pengeluaran', formatRupiah(summary.total_expense)],
    ['(=) Selisih Kas',       formatRupiah(summary.net_balance)],
    ['SALDO AKHIR PERIODE',   formatRupiah(summary.closing_balance)]
  ];

  const table = body.appendTable(tableData);
  table.setBorderWidth(1);

  // Header row
  const hdr = table.getRow(0);
  for (let c = 0; c < 2; c++) {
    hdr.getCell(c).setBackgroundColor(hdrColor)
       .editAsText().setForegroundColor('#ffffff').setFontSize(10).setBold(true);
  }
  // Baris konten
  const rowColors = [
    '#ffffff', incColor, expColor, '#ffffff', goldColor
  ];
  const textColors = [
    '#333333', '#ffffff', '#ffffff', '#333333', '#1a1a1a'
  ];
  const isBold = [false, true, true, false, true];

  for (let r = 1; r < tableData.length; r++) {
    const row = table.getRow(r);
    const bg  = rowColors[r - 1]  || '#ffffff';
    const fg  = textColors[r - 1] || '#333333';
    const bld = isBold[r - 1]     || false;

    for (let c = 0; c < 2; c++) {
      row.getCell(c).setBackgroundColor(bg)
         .editAsText().setForegroundColor(fg).setFontSize(10).setBold(bld);
    }
    // Rata kanan untuk angka
    row.getCell(1).setPaddingRight(8)
       .setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER);
    const pNum = row.getCell(1).getChild(0).asParagraph();
    pNum.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  }
}

// ─── Sub-helper: Tabel Arus Kas Bulanan ──────────────────────────────────────
function _addCashFlowTable(body, cashFlow, openingBalance, hdrColor, stripeColor) {
  const headers = ['Bulan', 'Saldo Awal (Rp)', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Saldo Akhir (Rp)', 'Net (Rp)'];
  const rows    = [headers];

  let prevBalance = openingBalance;
  cashFlow.forEach(row => {
    const net = row.pemasukan - row.pengeluaran;
    rows.push([
      row.bulan,
      formatRupiah(prevBalance),
      formatRupiah(row.pemasukan),
      formatRupiah(row.pengeluaran),
      formatRupiah(row.saldo_akhir),
      formatRupiah(net)
    ]);
    prevBalance = row.saldo_akhir;
  });

  // Baris total
  const totInc  = cashFlow.reduce((s, r) => s + r.pemasukan, 0);
  const totExp  = cashFlow.reduce((s, r) => s + r.pengeluaran, 0);
  rows.push(['TOTAL', '-', formatRupiah(totInc), formatRupiah(totExp), '-', formatRupiah(totInc - totExp)]);

  const table = body.appendTable(rows);
  table.setBorderWidth(1);

  // Header styling
  const hdr = table.getRow(0);
  for (let c = 0; c < headers.length; c++) {
    hdr.getCell(c).setBackgroundColor(hdrColor)
       .editAsText().setForegroundColor('#ffffff').setFontSize(9).setBold(true);
  }

  // Data rows
  for (let r = 1; r < rows.length - 1; r++) {
    const bg = r % 2 === 0 ? stripeColor : '#ffffff';
    const row = table.getRow(r);
    for (let c = 0; c < headers.length; c++) {
      row.getCell(c).setBackgroundColor(bg)
         .editAsText().setFontSize(9).setForegroundColor('#333333');
    }
    // Kolom angka rata kanan
    for (let c = 1; c < headers.length; c++) {
      row.getCell(c).getChild(0).asParagraph()
         .setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    }
    // Warna net (positif = hijau, negatif = merah)
    const netVal = cashFlow[r - 1] ? cashFlow[r - 1].pemasukan - cashFlow[r - 1].pengeluaran : 0;
    row.getCell(5).editAsText()
       .setForegroundColor(netVal >= 0 ? '#2e7d32' : '#c62828').setBold(netVal !== 0);
  }

  // Baris TOTAL
  const totRow = table.getRow(rows.length - 1);
  for (let c = 0; c < headers.length; c++) {
    totRow.getCell(c).setBackgroundColor('#1a3c5e')
          .editAsText().setForegroundColor('#ffffff').setFontSize(9).setBold(true);
    if (c > 0) totRow.getCell(c).getChild(0).asParagraph()
                     .setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  }
}

// ─── Sub-helper: Tabel Rincian Pemasukan ─────────────────────────────────────
function _addSourceBreakdownTable(body, incomeBySource, totalIncome, hdrColor, bgColor, accentColor) {
  const rows = [['Sumber Dana', 'Jumlah (Rp)', 'Persentase (%)']];
  Object.entries(incomeBySource).sort((a, b) => b[1] - a[1]).forEach(([src, amt]) => {
    const pct = totalIncome > 0 ? ((amt / totalIncome) * 100).toFixed(1) : '0.0';
    rows.push([src, formatRupiah(amt), `${pct}%`]);
  });
  rows.push(['TOTAL PEMASUKAN', formatRupiah(totalIncome), '100.0%']);

  const table = body.appendTable(rows);
  table.setBorderWidth(1);

  // Header
  const hdr = table.getRow(0);
  for (let c = 0; c < 3; c++) {
    hdr.getCell(c).setBackgroundColor(hdrColor)
       .editAsText().setForegroundColor('#ffffff').setFontSize(10).setBold(true);
  }

  // Data rows
  for (let r = 1; r < rows.length - 1; r++) {
    const row = table.getRow(r);
    row.getCell(0).setBackgroundColor(bgColor)
       .editAsText().setFontSize(10).setForegroundColor('#333333');
    for (let c = 1; c < 3; c++) {
      row.getCell(c).setBackgroundColor(r % 2 === 0 ? '#f1f8e9' : '#ffffff')
         .editAsText().setFontSize(10).setForegroundColor(accentColor).setBold(c === 1);
      row.getCell(c).getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    }
  }

  // Baris total
  const totRow = table.getRow(rows.length - 1);
  for (let c = 0; c < 3; c++) {
    totRow.getCell(c).setBackgroundColor(accentColor)
          .editAsText().setForegroundColor('#ffffff').setFontSize(10).setBold(true);
    if (c > 0) totRow.getCell(c).getChild(0).asParagraph()
                     .setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  }
}

// ─── Sub-helper: Tabel Rincian Pengeluaran ───────────────────────────────────
function _addExpenseBreakdownTable(body, expenseByCategory, totalExpense, hdrColor, bgColor, accentColor) {
  const rows = [['Kategori Belanja', 'Jumlah (Rp)', 'Persentase (%)']];
  Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
    const pct = totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : '0.0';
    rows.push([cat, formatRupiah(amt), `${pct}%`]);
  });
  rows.push(['TOTAL PENGELUARAN', formatRupiah(totalExpense), '100.0%']);

  const table = body.appendTable(rows);
  table.setBorderWidth(1);

  const hdr = table.getRow(0);
  for (let c = 0; c < 3; c++) {
    hdr.getCell(c).setBackgroundColor(hdrColor)
       .editAsText().setForegroundColor('#ffffff').setFontSize(10).setBold(true);
  }

  for (let r = 1; r < rows.length - 1; r++) {
    const row = table.getRow(r);
    row.getCell(0).setBackgroundColor(bgColor)
       .editAsText().setFontSize(10).setForegroundColor('#333333');
    for (let c = 1; c < 3; c++) {
      row.getCell(c).setBackgroundColor(r % 2 === 0 ? '#ffebee' : '#ffffff')
         .editAsText().setFontSize(10).setForegroundColor(accentColor).setBold(c === 1);
      row.getCell(c).getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    }
  }

  const totRow = table.getRow(rows.length - 1);
  for (let c = 0; c < 3; c++) {
    totRow.getCell(c).setBackgroundColor(accentColor)
          .editAsText().setForegroundColor('#ffffff').setFontSize(10).setBold(true);
    if (c > 0) totRow.getCell(c).getChild(0).asParagraph()
                     .setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  }
}

// ─── Sub-helper: Tabel Iuran Per Warga ───────────────────────────────────────
function _addIuranPerWargaTable(body, iuranPerWarga, hdrColor, stripeColor) {
  const rows = [['No.', 'Nama Warga', 'Jumlah Bulan', 'Bulan yang Dibayar', 'Total (Rp)']];
  let no = 1;
  Object.entries(iuranPerWarga)
        .sort((a, b) => b[1].total - a[1].total)
        .forEach(([nama, info]) => {
    rows.push([
      String(no++),
      nama,
      String(info.count),
      info.months.slice().sort().join(', ') || '-',
      formatRupiah(info.total)
    ]);
  });

  const table = body.appendTable(rows);
  table.setBorderWidth(1);

  const hdr = table.getRow(0);
  for (let c = 0; c < 5; c++) {
    hdr.getCell(c).setBackgroundColor(hdrColor)
       .editAsText().setForegroundColor('#ffffff').setFontSize(9).setBold(true);
  }
  hdr.getCell(0).setWidth(30);
  hdr.getCell(1).setWidth(140);
  hdr.getCell(2).setWidth(80);
  hdr.getCell(3).setWidth(180);
  hdr.getCell(4).setWidth(110);

  for (let r = 1; r < rows.length; r++) {
    const bg  = r % 2 === 0 ? stripeColor : '#ffffff';
    const row = table.getRow(r);
    for (let c = 0; c < 5; c++) {
      row.getCell(c).setBackgroundColor(bg)
         .editAsText().setFontSize(9).setForegroundColor('#333333');
    }
    row.getCell(0).getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    row.getCell(2).getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    row.getCell(4).getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    row.getCell(4).editAsText().setForegroundColor('#2e7d32').setBold(true);
  }
}

// ─── Sub-helper: Tabel Detail Transaksi ──────────────────────────────────────
function _addTransactionDetailTable(body, transactions, hdrColor, stripeColor, incColor, expColor) {
  const rows = [['No.', 'Tanggal', 'Nama Warga', 'Keterangan', 'Kategori', 'Tipe', 'Nominal (Rp)']];
  transactions.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
              .forEach((t, i) => {
    const desc = t.bulan_iuran
      ? `IWK ${t.bulan_iuran}`
      : (t.deskripsi || t.category_nama || '-');
    rows.push([
      String(i + 1),
      formatDate(new Date(t.tanggal), 'DD-MM-YYYY'),
      t.user_nama || '-',
      desc,
      t.category_nama || '-',
      t.type === 'income' ? 'Masuk' : 'Keluar',
      formatRupiah(t.nominal)
    ]);
  });

  const table = body.appendTable(rows);
  table.setBorderWidth(1);

  const hdr = table.getRow(0);
  for (let c = 0; c < 7; c++) {
    hdr.getCell(c).setBackgroundColor(hdrColor)
       .editAsText().setForegroundColor('#ffffff').setFontSize(8).setBold(true);
  }

  for (let r = 1; r < rows.length; r++) {
    const bg  = r % 2 === 0 ? stripeColor : '#ffffff';
    const row = table.getRow(r);
    const isIncome = transactions[r - 1]?.type === 'income';

    for (let c = 0; c < 7; c++) {
      row.getCell(c).setBackgroundColor(bg)
         .editAsText().setFontSize(8).setForegroundColor('#333333');
    }
    row.getCell(0).getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    row.getCell(6).getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    row.getCell(6).editAsText()
       .setForegroundColor(isIncome ? incColor : expColor).setBold(true);
    row.getCell(5).editAsText()
       .setForegroundColor(isIncome ? incColor : expColor).setBold(true);
  }

  if (transactions.length === 0) {
    body.appendParagraph('Tidak ada transaksi pada periode ini.')
      .editAsText().setFontSize(10).setForegroundColor('#888888').setItalic(true);
  }
}

// ─── Sub-helper: Bagian Tanda Tangan ─────────────────────────────────────────
function _addSignatureSection(body, meta, colorPrimary) {
  body.appendParagraph('').setSpacingAfter(8);

  const sep = body.appendParagraph('─────────────────────────────────────────────────────────────────');
  sep.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
     .editAsText().setForegroundColor('#cccccc').setFontSize(8);

  const sigTitle = body.appendParagraph('PENGESAHAN LAPORAN');
  sigTitle.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
          .editAsText().setFontSize(11).setBold(true).setForegroundColor(colorPrimary);

  body.appendParagraph('').setSpacingAfter(4);

  // Tabel tanda tangan 2 kolom
  const sigTable = body.appendTable([
    ['Bendahara RT', 'Ketua RT'],
    ['', ''],
    ['', ''],
    ['( ________________________ )', '( ________________________ )'],
  ]);
  sigTable.setBorderWidth(0);

  [0, 3].forEach(r => {
    for (let c = 0; c < 2; c++) {
      sigTable.getRow(r).getCell(c).editAsText()
              .setFontSize(10).setForegroundColor('#333333').setBold(r === 0);
      sigTable.getRow(r).getCell(c).getChild(0).asParagraph()
              .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    }
  });
  [1, 2].forEach(r => {
    for (let c = 0; c < 2; c++) {
      sigTable.getRow(r).getCell(c).editAsText().setFontSize(14);
    }
  });
}

// ─── Sub-helper: Footer Dokumen ───────────────────────────────────────────────
function _addDocFooter(body, meta, colorPrimary) {
  body.appendParagraph('').setSpacingAfter(4);

  const line = body.appendParagraph('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  line.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .editAsText().setForegroundColor('#f9a825').setFontSize(8);

  const footer = body.appendParagraph(
    `${meta.app_name}  •  ${meta.alamat_rt}  •  Laporan dicetak: ${meta.generated_at}  •  Sistem IWK & Manajemen Kegiatan`
  );
  footer.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
        .editAsText().setFontSize(8).setForegroundColor('#888888').setItalic(true);

  const disclaimer = body.appendParagraph(
    'Dokumen ini digenerate secara otomatis oleh sistem. Keabsahan dokumen ditentukan oleh tanda tangan pejabat yang berwenang.'
  );
  disclaimer.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
            .editAsText().setFontSize(7).setForegroundColor('#aaaaaa').setItalic(true);
}

// ─────────────────────────────────────────────
// BAGIAN C: GENERATE EXCEL (via Google Sheets)
// ─────────────────────────────────────────────

/**
 * Generate laporan Excel profesional menggunakan Google Sheets
 * Mengembalikan URL download .xlsx
 */
function generateExcelReport(data, reportType, filters) {
  try {
    const meta    = data.meta;
    const summary = data.summary;

    const ssTitle = `Laporan Keuangan ${meta.app_name} - ${meta.period_label}`;
    const ss      = SpreadsheetApp.create(ssTitle);

    // ── Sheet 1: Ringkasan ────────────────────────────────────────────────
    const sheetRingkasan = ss.getSheets()[0];
    sheetRingkasan.setName('Ringkasan');
    _buildExcelRingkasan(sheetRingkasan, data);

    // ── Sheet 2: Arus Kas Bulanan ─────────────────────────────────────────
    const sheetArusKas = ss.insertSheet('Arus Kas Bulanan');
    _buildExcelArusKas(sheetArusKas, data, summary.opening_balance, filters.year);

    // ── Sheet 3: Detail Transaksi ─────────────────────────────────────────
    const sheetTx = ss.insertSheet('Detail Transaksi');
    _buildExcelTransaksi(sheetTx, data.transactions, meta);

    // ── Sheet 4: Iuran Per Warga ──────────────────────────────────────────
    if (Object.keys(data.iuran_per_warga).length > 0) {
      const sheetIuran = ss.insertSheet('Iuran Per Warga');
      _buildExcelIuranWarga(sheetIuran, data.iuran_per_warga, meta);
    }

    ss.setActiveSheet(sheetRingkasan);

    // Export ke XLSX
    const ssFile    = DriveApp.getFileById(ss.getId());
    const xlsxBlob  = ssFile.getAs('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const xlsxName  = `Laporan_Keuangan_${meta.app_name.replace(/\s/g, '_')}_${meta.period_label.replace(/\s/g, '_')}.xlsx`;

    const folderId  = getOrCreateFolder(CONFIG.FOLDERS.REPORTS);
    const folder    = DriveApp.getFolderById(folderId);
    const xlsxFile  = folder.createFile(xlsxBlob.setName(xlsxName));
    xlsxFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Hapus Spreadsheet sumber
    ssFile.setTrashed(true);

    return {
      success  : true,
      message  : 'Laporan Excel berhasil dibuat',
      data     : {
        file_url     : `https://drive.google.com/uc?export=download&id=${xlsxFile.getId()}`,
        view_url     : `https://drive.google.com/file/d/${xlsxFile.getId()}/view`,
        file_name    : xlsxName,
        file_id      : xlsxFile.getId(),
        generated_at : meta.generated_at
      }
    };
  } catch (e) {
    return { success: false, message: `Generate Excel error: ${e.message}` };
  }
}

// ─── Excel Sheet: Ringkasan ───────────────────────────────────────────────────
function _buildExcelRingkasan(sheet, data) {
  const meta    = data.meta;
  const summary = data.summary;
  const navy    = '#1a3c5e';
  const gold    = '#f9a825';
  const green   = '#2e7d32';
  const red     = '#c62828';
  const white   = '#ffffff';

  // Merge header
  sheet.getRange('A1:G1').merge().setValue(meta.app_name.toUpperCase())
       .setBackground(navy).setFontColor(white).setFontSize(16).setFontWeight('bold')
       .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(1, 36);

  sheet.getRange('A2:G2').merge().setValue(`Laporan Keuangan — Periode: ${meta.period_label}`)
       .setBackground(navy).setFontColor(gold).setFontSize(11).setFontWeight('bold')
       .setHorizontalAlignment('center');

  sheet.getRange('A3:G3').merge().setValue(meta.alamat_rt)
       .setBackground('#1e4976').setFontColor('#ccddee').setFontSize(9).setFontStyle('italic')
       .setHorizontalAlignment('center');

  sheet.getRange('A4:G4').merge()
       .setValue(`Dicetak: ${meta.generated_at}  |  Oleh: ${meta.generated_by}`)
       .setBackground('#f5f5f5').setFontColor('#888888').setFontSize(8).setFontStyle('italic')
       .setHorizontalAlignment('right');

  // ── Neraca Saldo ──────────────────────────────────────────────────────
  sheet.getRange('A6:C6').merge().setValue('NERACA SALDO')
       .setBackground(navy).setFontColor(white).setFontSize(11).setFontWeight('bold')
       .setHorizontalAlignment('center');

  const neracaRows = [
    ['Uraian', 'Jumlah (Rp)'],
    ['Saldo Awal Periode',    summary.opening_balance],
    ['(+) Total Pemasukan',   summary.total_income],
    ['(-) Total Pengeluaran', summary.total_expense],
    ['(=) Selisih Kas',       summary.net_balance],
    ['SALDO AKHIR PERIODE',   summary.closing_balance]
  ];
  const neracaColors = [navy, '#37474f', green, red, '#f9a825', navy];
  const neracaFg     = [white, white, white, white, '#1a1a1a', white];

  neracaRows.forEach((row, i) => {
    const r = 7 + i;
    sheet.getRange(r, 1).setValue(row[0]).setFontWeight(i === 0 || i === 5 ? 'bold' : 'normal')
         .setBackground(neracaColors[i]).setFontColor(neracaFg[i]).setFontSize(10);
    if (i === 0) {
      sheet.getRange(r, 2).setValue(row[1]).setBackground(neracaColors[i])
           .setFontColor(neracaFg[i]).setFontWeight('bold').setFontSize(10)
           .setHorizontalAlignment('center');
    } else {
      sheet.getRange(r, 2).setValue(row[1]).setNumberFormat('"Rp"#,##0')
           .setBackground(neracaColors[i]).setFontColor(neracaFg[i])
           .setFontWeight(i === 5 ? 'bold' : 'normal')
           .setHorizontalAlignment('right').setFontSize(10);
    }
  });

  // ── Rekap Pemasukan ───────────────────────────────────────────────────
  let startRow = 15;
  sheet.getRange(startRow, 4, 1, 3).merge().setValue('REKAP PEMASUKAN')
       .setBackground(green).setFontColor(white).setFontWeight('bold').setHorizontalAlignment('center');
  startRow++;

  sheet.getRange(startRow, 4).setValue('Sumber').setBackground(navy).setFontColor(white).setFontWeight('bold');
  sheet.getRange(startRow, 5).setValue('Jumlah (Rp)').setBackground(navy).setFontColor(white).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(startRow, 6).setValue('%').setBackground(navy).setFontColor(white).setFontWeight('bold').setHorizontalAlignment('center');
  startRow++;

  const totalIncome = summary.total_income;
  Object.entries(data.income_by_source).sort((a, b) => b[1] - a[1]).forEach(([src, amt], idx) => {
    const bg = idx % 2 === 0 ? '#f1f8e9' : white;
    const pct = totalIncome > 0 ? amt / totalIncome : 0;
    sheet.getRange(startRow, 4).setValue(src).setBackground(bg);
    sheet.getRange(startRow, 5).setValue(amt).setNumberFormat('"Rp"#,##0').setBackground(bg)
         .setFontColor(green).setFontWeight('bold').setHorizontalAlignment('right');
    sheet.getRange(startRow, 6).setValue(pct).setNumberFormat('0.0%').setBackground(bg)
         .setHorizontalAlignment('center');
    startRow++;
  });
  sheet.getRange(startRow, 4).setValue('TOTAL').setBackground(green).setFontColor(white).setFontWeight('bold');
  sheet.getRange(startRow, 5).setValue(totalIncome).setNumberFormat('"Rp"#,##0')
       .setBackground(green).setFontColor(white).setFontWeight('bold').setHorizontalAlignment('right');
  sheet.getRange(startRow, 6).setValue(1).setNumberFormat('0.0%')
       .setBackground(green).setFontColor(white).setFontWeight('bold').setHorizontalAlignment('center');

  // ── Rekap Pengeluaran ─────────────────────────────────────────────────
  startRow += 2;
  sheet.getRange(startRow, 4, 1, 3).merge().setValue('REKAP PENGELUARAN')
       .setBackground(red).setFontColor(white).setFontWeight('bold').setHorizontalAlignment('center');
  startRow++;

  sheet.getRange(startRow, 4).setValue('Kategori').setBackground(navy).setFontColor(white).setFontWeight('bold');
  sheet.getRange(startRow, 5).setValue('Jumlah (Rp)').setBackground(navy).setFontColor(white).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(startRow, 6).setValue('%').setBackground(navy).setFontColor(white).setFontWeight('bold').setHorizontalAlignment('center');
  startRow++;

  const totalExpense = summary.total_expense;
  Object.entries(data.expense_by_category).sort((a, b) => b[1] - a[1]).forEach(([cat, amt], idx) => {
    const bg = idx % 2 === 0 ? '#ffebee' : white;
    const pct = totalExpense > 0 ? amt / totalExpense : 0;
    sheet.getRange(startRow, 4).setValue(cat).setBackground(bg);
    sheet.getRange(startRow, 5).setValue(amt).setNumberFormat('"Rp"#,##0').setBackground(bg)
         .setFontColor(red).setFontWeight('bold').setHorizontalAlignment('right');
    sheet.getRange(startRow, 6).setValue(pct).setNumberFormat('0.0%').setBackground(bg)
         .setHorizontalAlignment('center');
    startRow++;
  });
  sheet.getRange(startRow, 4).setValue('TOTAL').setBackground(red).setFontColor(white).setFontWeight('bold');
  sheet.getRange(startRow, 5).setValue(totalExpense).setNumberFormat('"Rp"#,##0')
       .setBackground(red).setFontColor(white).setFontWeight('bold').setHorizontalAlignment('right');
  sheet.getRange(startRow, 6).setValue(1).setNumberFormat('0.0%')
       .setBackground(red).setFontColor(white).setFontWeight('bold').setHorizontalAlignment('center');

  // Auto resize
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 20);
  sheet.setColumnWidth(4, 160);
  sheet.setColumnWidth(5, 160);
  sheet.setColumnWidth(6, 80);
  sheet.setColumnWidth(7, 80);
}

// ─── Excel Sheet: Arus Kas Bulanan ───────────────────────────────────────────
function _buildExcelArusKas(sheet, data, openingBalance, year) {
  const navy  = '#1a3c5e';
  const white = '#ffffff';
  const green = '#2e7d32';
  const red   = '#c62828';
  const meta  = data.meta;

  // Header
  sheet.getRange('A1:G1').merge()
       .setValue(`LAPORAN ARUS KAS BULANAN — ${meta.app_name} — Tahun ${year}`)
       .setBackground(navy).setFontColor(white).setFontSize(13).setFontWeight('bold')
       .setHorizontalAlignment('center');
  sheet.setRowHeight(1, 32);

  // Kolom header
  const headers = ['Bulan', 'Saldo Awal (Rp)', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Net (Rp)', 'Saldo Akhir (Rp)', 'Ket.'];
  headers.forEach((h, i) => {
    sheet.getRange(2, i + 1).setValue(h)
         .setBackground(navy).setFontColor(white).setFontWeight('bold')
         .setHorizontalAlignment('center').setFontSize(9);
  });
  sheet.setRowHeight(2, 24);

  let prevBal = openingBalance;
  data.cash_flow_monthly.forEach((row, i) => {
    const r   = i + 3;
    const net = row.pemasukan - row.pengeluaran;
    const bg  = i % 2 === 0 ? '#f5f9ff' : white;

    sheet.getRange(r, 1).setValue(row.bulan).setBackground(bg).setFontSize(9);
    sheet.getRange(r, 2).setValue(prevBal).setNumberFormat('"Rp"#,##0').setBackground(bg).setHorizontalAlignment('right').setFontSize(9);
    sheet.getRange(r, 3).setValue(row.pemasukan).setNumberFormat('"Rp"#,##0').setBackground(bg)
         .setFontColor(green).setFontWeight('bold').setHorizontalAlignment('right').setFontSize(9);
    sheet.getRange(r, 4).setValue(row.pengeluaran).setNumberFormat('"Rp"#,##0').setBackground(bg)
         .setFontColor(red).setFontWeight('bold').setHorizontalAlignment('right').setFontSize(9);
    sheet.getRange(r, 5).setValue(net).setNumberFormat('"Rp"#,##0').setBackground(bg)
         .setFontColor(net >= 0 ? green : red).setFontWeight('bold').setHorizontalAlignment('right').setFontSize(9);
    sheet.getRange(r, 6).setValue(row.saldo_akhir).setNumberFormat('"Rp"#,##0').setBackground(bg)
         .setFontWeight('bold').setHorizontalAlignment('right').setFontSize(9);
    sheet.getRange(r, 7).setValue(net >= 0 ? '▲ Surplus' : '▼ Defisit')
         .setFontColor(net >= 0 ? green : red).setBackground(bg).setFontSize(9);

    prevBal = row.saldo_akhir;
  });

  // Baris total
  const totRow = 3 + data.cash_flow_monthly.length;
  const totInc = data.cash_flow_monthly.reduce((s, r) => s + r.pemasukan, 0);
  const totExp = data.cash_flow_monthly.reduce((s, r) => s + r.pengeluaran, 0);
  ['TOTAL', '-', totInc, totExp, totInc - totExp, '-', '-'].forEach((v, c) => {
    const cell = sheet.getRange(totRow, c + 1);
    cell.setValue(v).setBackground(navy).setFontColor(white).setFontWeight('bold').setFontSize(9);
    if (c > 1 && c < 5 && typeof v === 'number') cell.setNumberFormat('"Rp"#,##0').setHorizontalAlignment('right');
  });

  [1, 2, 3, 4, 5, 6].forEach(c => sheet.setColumnWidth(c, 130));
  sheet.setColumnWidth(7, 90);
}

// ─── Excel Sheet: Detail Transaksi ───────────────────────────────────────────
function _buildExcelTransaksi(sheet, transactions, meta) {
  const navy  = '#1a3c5e';
  const white = '#ffffff';
  const green = '#2e7d32';
  const red   = '#c62828';

  sheet.getRange('A1:H1').merge()
       .setValue(`DETAIL TRANSAKSI — ${meta.app_name} — ${meta.period_label}`)
       .setBackground(navy).setFontColor(white).setFontSize(12).setFontWeight('bold')
       .setHorizontalAlignment('center');
  sheet.setRowHeight(1, 30);

  const headers = ['No.', 'Tanggal', 'Nama Warga', 'Keterangan', 'Kategori', 'Metode', 'Tipe', 'Nominal (Rp)'];
  headers.forEach((h, i) => {
    sheet.getRange(2, i + 1).setValue(h)
         .setBackground(navy).setFontColor(white).setFontWeight('bold')
         .setHorizontalAlignment('center').setFontSize(9);
  });

  transactions.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
              .forEach((t, i) => {
    const r        = i + 3;
    const isIncome = t.type === 'income';
    const bg       = i % 2 === 0 ? '#f9f9f9' : white;
    const desc     = t.bulan_iuran ? `IWK ${t.bulan_iuran}` : (t.deskripsi || '-');

    sheet.getRange(r, 1).setValue(i + 1).setBackground(bg).setHorizontalAlignment('center').setFontSize(9);
    sheet.getRange(r, 2).setValue(formatDate(new Date(t.tanggal), 'DD-MM-YYYY')).setBackground(bg).setFontSize(9);
    sheet.getRange(r, 3).setValue(t.user_nama || '-').setBackground(bg).setFontSize(9);
    sheet.getRange(r, 4).setValue(desc).setBackground(bg).setFontSize(9);
    sheet.getRange(r, 5).setValue(t.category_nama || '-').setBackground(bg).setFontSize(9);
    sheet.getRange(r, 6).setValue(t.metode_pembayaran || '-').setBackground(bg).setFontSize(9)
         .setHorizontalAlignment('center');
    sheet.getRange(r, 7).setValue(isIncome ? 'Masuk' : 'Keluar')
         .setFontColor(isIncome ? green : red).setFontWeight('bold').setBackground(bg)
         .setHorizontalAlignment('center').setFontSize(9);
    sheet.getRange(r, 8).setValue(Number(t.nominal) || 0)
         .setNumberFormat('"Rp"#,##0')
         .setFontColor(isIncome ? green : red).setFontWeight('bold')
         .setBackground(bg).setHorizontalAlignment('right').setFontSize(9);
  });

  [30, 90, 140, 180, 100, 90, 70, 130].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  sheet.setFrozenRows(2);
}

// ─── Excel Sheet: Iuran Per Warga ────────────────────────────────────────────
function _buildExcelIuranWarga(sheet, iuranPerWarga, meta) {
  const navy  = '#1a3c5e';
  const white = '#ffffff';
  const green = '#2e7d32';

  sheet.getRange('A1:E1').merge()
       .setValue(`REKAPITULASI IURAN PER WARGA — ${meta.app_name} — ${meta.period_label}`)
       .setBackground(navy).setFontColor(white).setFontSize(12).setFontWeight('bold')
       .setHorizontalAlignment('center');

  ['No.', 'Nama Warga', 'Jumlah Bulan', 'Bulan yang Dibayar', 'Total (Rp)'].forEach((h, i) => {
    sheet.getRange(2, i + 1).setValue(h)
         .setBackground(navy).setFontColor(white).setFontWeight('bold')
         .setHorizontalAlignment('center').setFontSize(9);
  });

  Object.entries(iuranPerWarga)
        .sort((a, b) => b[1].total - a[1].total)
        .forEach(([nama, info], i) => {
    const r  = i + 3;
    const bg = i % 2 === 0 ? '#f1f8e9' : white;
    sheet.getRange(r, 1).setValue(i + 1).setBackground(bg).setHorizontalAlignment('center').setFontSize(9);
    sheet.getRange(r, 2).setValue(nama).setBackground(bg).setFontSize(9);
    sheet.getRange(r, 3).setValue(info.count).setBackground(bg).setHorizontalAlignment('center').setFontSize(9);
    sheet.getRange(r, 4).setValue(info.months.slice().sort().join(', ') || '-').setBackground(bg).setFontSize(9);
    sheet.getRange(r, 5).setValue(info.total).setNumberFormat('"Rp"#,##0')
         .setFontColor(green).setFontWeight('bold').setBackground(bg)
         .setHorizontalAlignment('right').setFontSize(9);
  });

  [30, 160, 80, 220, 130].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  sheet.setFrozenRows(2);
}

// ─────────────────────────────────────────────
// BAGIAN D: GENERATE CSV (Lightweight)
// ─────────────────────────────────────────────

function generateCsvReport(data, reportType, filters) {
  try {
    const meta    = data.meta;
    const summary = data.summary;
    const esc     = v => {
      const s = String(v === null || v === undefined ? '' : v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const row = cols => cols.map(esc).join(',');

    const lines = [];

    // Header info
    lines.push(row([meta.app_name, '', '', '', '', '', '']));
    lines.push(row([`Laporan Keuangan — Periode: ${meta.period_label}`, '', '', '', '', '', '']));
    lines.push(row([`Dicetak: ${meta.generated_at}`, '', '', '', '', '', '']));
    lines.push('');

    // Neraca
    lines.push(row(['=== NERACA SALDO ===', '']));
    lines.push(row(['Uraian', 'Jumlah (Rp)']));
    lines.push(row(['Saldo Awal Periode',    summary.opening_balance]));
    lines.push(row(['Total Pemasukan',       summary.total_income]));
    lines.push(row(['Total Pengeluaran',     summary.total_expense]));
    lines.push(row(['Selisih Kas',           summary.net_balance]));
    lines.push(row(['Saldo Akhir Periode',   summary.closing_balance]));
    lines.push('');

    // Arus kas
    lines.push(row(['=== ARUS KAS BULANAN ===', '', '', '', '']));
    lines.push(row(['Bulan', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Net (Rp)', 'Saldo Akhir (Rp)']));
    data.cash_flow_monthly.forEach(r => {
      lines.push(row([r.bulan, r.pemasukan, r.pengeluaran, r.pemasukan - r.pengeluaran, r.saldo_akhir]));
    });
    lines.push('');

    // Detail transaksi
    lines.push(row(['=== DETAIL TRANSAKSI ===', '', '', '', '', '', '']));
    lines.push(row(['Tanggal', 'Nama Warga', 'Keterangan', 'Kategori', 'Metode', 'Tipe', 'Nominal (Rp)']));
    data.transactions.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal)).forEach(t => {
      lines.push(row([
        formatDate(new Date(t.tanggal), 'DD-MM-YYYY'),
        t.user_nama || '-',
        t.bulan_iuran ? `IWK ${t.bulan_iuran}` : (t.deskripsi || '-'),
        t.category_nama || '-',
        t.metode_pembayaran || '-',
        t.type === 'income' ? 'Masuk' : 'Keluar',
        t.nominal
      ]));
    });

    const csvContent = lines.join('\n');
    const csvName    = `Laporan_${meta.app_name.replace(/\s/g, '_')}_${meta.period_label.replace(/\s/g, '_')}.csv`;

    const folderId = getOrCreateFolder(CONFIG.FOLDERS.REPORTS);
    const folder   = DriveApp.getFolderById(folderId);
    const csvBlob  = Utilities.newBlob(csvContent, 'text/csv', csvName);
    const csvFile  = folder.createFile(csvBlob);
    csvFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success  : true,
      message  : 'Laporan CSV berhasil dibuat',
      data     : {
        content      : csvContent,
        file_url     : `https://drive.google.com/uc?export=download&id=${csvFile.getId()}`,
        view_url     : `https://drive.google.com/file/d/${csvFile.getId()}/view`,
        file_name    : csvName,
        file_id      : csvFile.getId(),
        generated_at : meta.generated_at
      }
    };
  } catch (e) {
    return { success: false, message: `Generate CSV error: ${e.message}` };
  }
}

// ─────────────────────────────────────────────
// BAGIAN E: INTEGRASI doGet / doPost
// ─────────────────────────────────────────────

/**
 * Endpoint exportReport telah diintegrasikan ke doGet() dan doPost().
 */

// ─────────────────────────────────────────────
// BAGIAN F: CONTOH PEMANGGILAN DARI FRONTEND
// ─────────────────────────────────────────────

/**
 * Contoh fetch dari JavaScript frontend:
 *
 * // Export PDF tahunan
 * fetch(`${SCRIPT_URL}?action=exportReport&token=${token}&format=pdf&year=2025`)
 *   .then(r => r.json())
 *   .then(res => {
 *     if (res.success) window.open(res.data.file_url, '_blank');
 *   });
 *
 * // Export Excel dengan rentang tanggal
 * fetch(`${SCRIPT_URL}?action=exportReport&token=${token}&format=excel&start_date=2025-01-01&end_date=2025-06-30`)
 *   .then(r => r.json())
 *   .then(res => {
 *     if (res.success) {
 *       const a = document.createElement('a');
 *       a.href = res.data.file_url;
 *       a.download = res.data.file_name;
 *       a.click();
 *     }
 *   });
 *
 * // Export CSV (langsung tampil di browser / unduh)
 * fetch(`${SCRIPT_URL}?action=exportReport&token=${token}&format=csv&year=2025`)
 *   .then(r => r.json())
 *   .then(res => {
 *     if (res.success) {
 *       const blob = new Blob([res.data.content], { type: 'text/csv;charset=utf-8;' });
 *       const url  = URL.createObjectURL(blob);
 *       const a    = document.createElement('a');
 *       a.href = url; a.download = res.data.file_name; a.click();
 *     }
 *   });
 */

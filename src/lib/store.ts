import { create } from 'zustand';

export type ViewType =
  | 'landing'
  | 'login'
  | 'register'
  | 'warga-dashboard'
  | 'warga-bayar'
  | 'warga-riwayat'
  | 'warga-kegiatan'
  | 'warga-pengumuman'
  | 'warga-laporan'
  | 'warga-profil'
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-transaksi'
  | 'admin-validasi'
  | 'admin-kegiatan'
  | 'admin-pengumuman'
  | 'admin-settings';

export interface User {
  id: string;
  nama: string;
  alamat: string;
  noHp: string;
  email: string;
  role: 'admin' | 'warga';
  status: string;
  foto: string;
}

export interface PengurusInfo {
  nama: string;
  jabatan: string;
  whatsapp: string;
  foto: string;
}

export interface BankAccount {
  id: string;
  bank: string;
  noRekening: string;
  atasNama: string;
}

export interface Settings {
  app_name: string;
  whatsapp_admin: string;
  default_iwk_nominal: string;
  alamat_rt: string;

  // Pengurus (JSON strings stored in DB)
  ketua_rt: string;
  sekretaris_rt: string;
  bendahara_rt: string;
  ketua_wa: string;
  sekretaris_wa: string;
  bendahara_wa: string;
  ketua_foto: string;
  sekretaris_foto: string;
  bendahara_foto: string;

  // Website & Pembayaran
  link_website: string;

  // Keuangan
  saldo_awal: string;

  // Dynamic bank accounts (JSON string in DB)
  bank_accounts: string; // JSON array of BankAccount
}

export function parseBankAccounts(jsonStr: string): BankAccount[] {
  try {
    const arr = JSON.parse(jsonStr || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const defaultSettings: Settings = {
  app_name: 'IWK RT 11',
  whatsapp_admin: '',
  default_iwk_nominal: '100000',
  alamat_rt: 'Komplek Pradha Ciganitri, Bandung',

  ketua_rt: '',
  sekretaris_rt: '',
  bendahara_rt: '',
  ketua_wa: '',
  sekretaris_wa: '',
  bendahara_wa: '',
  ketua_foto: '',
  sekretaris_foto: '',
  bendahara_foto: '',

  link_website: 'https://pradha-ciganitri.com',
  saldo_awal: '0',
  bank_accounts: JSON.stringify([
    { id: 'bca', bank: 'BCA', noRekening: '1234567890', atasNama: 'IWK RT 11 Pradha Ciganitri' },
    { id: 'bni', bank: 'BNI', noRekening: '0987654321', atasNama: 'IWK RT 11 Pradha Ciganitri' },
  ]),
};

// Keep old bank keys for backward compat in buildWaReminderUrl
export interface SettingsCompat extends Settings {
  bank_bca_no: string;
  bank_bca_name: string;
  bank_bni_no: string;
  bank_bni_name: string;
}

export function withBankCompat(s: Settings): SettingsCompat {
  const banks = parseBankAccounts(s.bank_accounts);
  const bca = banks.find(b => b.id === 'bca') || banks.find(b => b.bank.toLowerCase().includes('bca'));
  const bni = banks.find(b => b.id === 'bni') || banks.find(b => b.bank.toLowerCase().includes('bni'));
  return {
    ...s,
    bank_bca_no: bca?.noRekening || '',
    bank_bca_name: bca?.atasNama || '',
    bank_bni_no: bni?.noRekening || '',
    bank_bni_name: bni?.atasNama || '',
  };
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Navigation
  currentView: ViewType;
  sidebarOpen: boolean;

  // Toast
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;

  // Settings (global)
  settings: Settings;
  settingsLoaded: boolean;

  // Actions
  setView: (view: ViewType) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  toggleSidebar: () => void;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
  updateUser: (data: Partial<User>) => void;
  setSettings: (settings: Settings) => void;
  fetchSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth defaults
  user: null,
  token: null,
  isAuthenticated: false,

  // Navigation defaults
  currentView: 'landing',
  sidebarOpen: false,

  // Toast default
  toast: null,

  // Settings defaults
  settings: defaultSettings,
  settingsLoaded: false,

  // Actions
  setView: (view) => set({ currentView: view, sidebarOpen: false }),
  login: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('iwk_user', JSON.stringify(user));
      localStorage.setItem('iwk_token', token);
    }
    set({
      user,
      token,
      isAuthenticated: true,
      currentView: user.role === 'admin' ? 'admin-dashboard' : 'warga-dashboard',
    });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('iwk_user');
      localStorage.removeItem('iwk_token');
    }
    set({ user: null, token: null, isAuthenticated: false, currentView: 'landing' });
  },
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setToast: (toast) => set({ toast }),
  updateUser: (data) => set((s) => {
    if (!s.user) return s;
    const updatedUser = { ...s.user, ...data };
    if (typeof window !== 'undefined') {
      localStorage.setItem('iwk_user', JSON.stringify(updatedUser));
    }
    return { user: updatedUser };
  }),

  // Settings actions
  setSettings: (settings) => set({ settings, settingsLoaded: true }),

  fetchSettings: async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.data) {
        set({ settings: { ...defaultSettings, ...data.data }, settingsLoaded: true });
      }
    } catch {
      set({ settingsLoaded: true });
    }
  },

  updateSetting: (key, value) => set((s) => ({
    settings: { ...s.settings, [key]: value },
  })),
}));

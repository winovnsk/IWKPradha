'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Building2, LayoutDashboard, Users, ClipboardList, ShieldCheck,
  CalendarDays, Megaphone, Settings, Menu, LogOut, Save, RefreshCw,
  AppWindow, Phone, DollarSign, MapPin, User, FileText, Wallet,
  Globe, CreditCard, Building, Camera, X, Plus, Trash2, ImageIcon,
  MessageCircle, Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppStore, type Settings, type BankAccount, parseBankAccounts } from '@/lib/store';
import { api } from '@/lib/api';

/* ═══════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                  */
/* ═══════════════════════════════════════════════════════════ */
const adminMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', view: 'admin-dashboard' },
  { icon: Users, label: 'Kelola Warga', view: 'admin-users' },
  { icon: ClipboardList, label: 'Transaksi', view: 'admin-transaksi' },
  { icon: ShieldCheck, label: 'Validasi', view: 'admin-validasi' },
  { icon: CalendarDays, label: 'Kegiatan', view: 'admin-kegiatan' },
  { icon: Megaphone, label: 'Pengumuman', view: 'admin-pengumuman' },
  { icon: Settings, label: 'Pengaturan', view: 'admin-settings' },
];

const settingFields: { key: keyof Settings; label: string; placeholder: string; icon: typeof Settings; group: string }[] = [
  { key: 'app_name', label: 'Nama Aplikasi', placeholder: 'IWK RT 11', icon: AppWindow, group: 'Umum' },
  { key: 'whatsapp_admin', label: 'WhatsApp Admin', placeholder: '628xxxxxxxxxx', icon: Phone, group: 'Umum' },
  { key: 'default_iwk_nominal', label: 'Nominal Iuran Default (Rp)', placeholder: '100000', icon: DollarSign, group: 'Keuangan' },
  { key: 'saldo_awal', label: 'Saldo Awal Keuangan (Rp)', placeholder: '0', icon: Wallet, group: 'Keuangan' },
  { key: 'alamat_rt', label: 'Alamat RT', placeholder: 'Komplek Pradha Ciganitri, Bandung', icon: MapPin, group: 'Lokasi' },
  { key: 'link_website', label: 'Link Website', placeholder: 'https://pradha-ciganitri.com', icon: Globe, group: 'Website & Pembayaran' },
];

const pengurusFields = [
  { namaKey: 'ketua_rt' as const, waKey: 'ketua_wa' as const, fotoKey: 'ketua_foto' as const, label: 'Ketua RT', icon: User },
  { namaKey: 'sekretaris_rt' as const, waKey: 'sekretaris_wa' as const, fotoKey: 'sekretaris_foto' as const, label: 'Sekretaris', icon: FileText },
  { namaKey: 'bendahara_rt' as const, waKey: 'bendahara_wa' as const, fotoKey: 'bendahara_foto' as const, label: 'Bendahara', icon: Wallet },
];

const BANK_OPTIONS = ['BCA', 'BNI', 'BRI', 'Mandiri', 'BSI', 'CIMB', 'Danamon', 'Permata', 'Lainnya'];

/* ═══════════════════════════════════════════════════════════ */
/*  HELPERS                                                    */
/* ═══════════════════════════════════════════════════════════ */
function compressImage(file: File, maxSize = 300): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height, maxSize);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(e.target?.result as string || ''); return; }
        ctx.drawImage(img, (size - img.width * (size / Math.min(img.width, img.height))) / 2, (size - img.height * (size / Math.min(img.width, img.height))) / 2, img.width * (size / Math.min(img.width, img.height)), img.height * (size / Math.min(img.width, img.height)));
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/* ═══════════════════════════════════════════════════════════ */
/*  ADMIN SETTINGS                                             */
/* ═══════════════════════════════════════════════════════════ */
export default function AdminSettings() {
  const { user, currentView, setView, logout, toggleSidebar, sidebarOpen, setToast, updateSetting, fetchSettings: storeFetchSettings, settings: globalSettings } = useAppStore();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Bank accounts state
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [newBank, setNewBank] = useState({ bank: 'BCA', noRekening: '', atasNama: '' });
  const [showAddBank, setShowAddBank] = useState(false);
  const [deleteBankId, setDeleteBankId] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getSettings();
      const data = res.data || res;
      setSettings(data);
      setBanks(parseBankAccounts(data?.bank_accounts || '[]'));
    } catch {
      setToast({ message: 'Gagal memuat pengaturan', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [setToast]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async (key: keyof Settings, value: string) => {
    if (!value.trim()) { setToast({ message: 'Nilai tidak boleh kosong', type: 'error' }); return; }
    setSaving(key);
    try {
      const res = await api.gas('updateSetting', { key, value: value.trim() });
      if (res.success) {
        updateSetting(key, value.trim());
        await storeFetchSettings();
        setSettings(prev => prev ? { ...prev, [key]: value.trim() } : prev);
        setToast({ message: 'Pengaturan berhasil disimpan', type: 'success' });
      } else {
        setToast({ message: res.message || 'Gagal menyimpan', type: 'error' });
      }
    } catch {
      setToast({ message: 'Terjadi kesalahan', type: 'error' });
    } finally {
      setSaving(null);
    }
  };

  const handlePengurusSave = async (field: { namaKey: string; waKey: string; fotoKey: string }, nama: string, wa: string, foto: string) => {
    setSaving(field.namaKey);
    try {
      await api.gas('updateSetting', { key: field.namaKey, value: nama.trim() });
      await api.gas('updateSetting', { key: field.waKey, value: wa.trim() });
      await api.gas('updateSetting', { key: field.fotoKey, value: foto });
      updateSetting(field.namaKey, nama.trim());
      updateSetting(field.waKey, wa.trim());
      updateSetting(field.fotoKey, foto);
      await storeFetchSettings();
      setSettings(prev => prev ? { ...prev, [field.namaKey]: nama.trim(), [field.waKey]: wa.trim(), [field.fotoKey]: foto } : prev);
      setToast({ message: 'Data pengurus berhasil disimpan', type: 'success' });
    } catch {
      setToast({ message: 'Gagal menyimpan', type: 'error' });
    } finally {
      setSaving(null);
    }
  };

  const handleSaveBanks = async (updatedBanks: BankAccount[]) => {
    const json = JSON.stringify(updatedBanks);
    setSaving('bank_accounts');
    try {
      const res = await api.gas('updateSetting', { key: 'bank_accounts', value: json });
      if (res.success) {
        updateSetting('bank_accounts', json);
        await storeFetchSettings();
        setSettings(prev => prev ? { ...prev, bank_accounts: json } : prev);
        setBanks(updatedBanks);
        setToast({ message: 'Rekening berhasil diperbarui', type: 'success' });
      } else {
        setToast({ message: res.message || 'Gagal menyimpan', type: 'error' });
      }
    } catch {
      setToast({ message: 'Terjadi kesalahan', type: 'error' });
    } finally {
      setSaving(null);
    }
  };

  const handleAddBank = async () => {
    if (!newBank.noRekening.trim() || !newBank.atasNama.trim()) {
      setToast({ message: 'Nomor rekening dan atas nama wajib diisi', type: 'error' });
      return;
    }
    const id = `bank_${Date.now()}`;
    const updated = [...banks, { id, ...newBank, noRekening: newBank.noRekening.trim(), atasNama: newBank.atasNama.trim() }];
    await handleSaveBanks(updated);
    setNewBank({ bank: 'BCA', noRekening: '', atasNama: '' });
    setShowAddBank(false);
  };

  const handleDeleteBank = async () => {
    if (!deleteBankId) return;
    const updated = banks.filter(b => b.id !== deleteBankId);
    await handleSaveBanks(updated);
    setDeleteBankId(null);
  };

  const handleRefreshAll = async () => {
    await loadSettings();
    await storeFetchSettings();
    setToast({ message: 'Pengaturan berhasil di-refresh', type: 'info' });
  };

  const groups = ['Umum', 'Keuangan', 'Lokasi', 'Pengurus', 'Website & Pembayaran'];

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <aside className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-[#0f1a2e] text-white transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] flex items-center justify-center"><Building2 className="w-5 h-5 text-white" /></div>
          <div><p className="text-sm font-bold">{globalSettings.app_name || 'IWK RT 11'}</p><p className="text-[10px] text-white/40">{globalSettings.alamat_rt || 'Pradha Ciganitri'}</p></div>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-10rem)]">
          {adminMenuItems.map(item => (
            <button key={item.view} onClick={() => setView(item.view)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${currentView === item.view ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
              <item.icon className="w-4 h-4" />{item.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[#0f1a2e]">
          <div className="flex items-center gap-3 mb-3"><div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] flex items-center justify-center text-sm font-bold">{user?.nama?.[0]}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{user?.nama}</p><Badge className="bg-red-500/20 text-red-300 border-0 text-[10px]">Admin</Badge></div></div>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"><LogOut className="w-4 h-4" />Keluar</button>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={toggleSidebar} />}

      <main className="lg:ml-64">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b px-4 sm:px-6 h-16 flex items-center justify-between">
          <button className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 z-[10000] transition-colors duration-150" onClick={toggleSidebar}><Menu className="w-5 h-5" /></button>
          <div><h1 className="text-lg font-bold text-[#1a3c5e]">Pengaturan</h1><p className="text-xs text-gray-400">Konfigurasi sistem {globalSettings.app_name || 'IWK RT 11'}</p></div>
          <button className="text-gray-600 hover:text-[#1a3c5e] hover:bg-gray-100 active:bg-gray-200 font-medium px-2 py-1.5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={handleRefreshAll}><RefreshCw className="w-4 h-4" /></button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl">
          {loading ? (
            <div className="space-y-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
          ) : settings ? (
            groups.map((group) => {
              if (group === 'Pengurus') {
                return <PengurusSection key={group} settings={settings} saving={saving} handleSave={handlePengurusSave} />;
              }
              if (group === 'Website & Pembayaran') {
                const webField = settingFields.find(f => f.group === group && f.key === 'link_website');
                return (
                  <Card key={group} className="border-0 shadow-md">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2">
                        <Settings className="w-4 h-4" />{group}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* Link Website field */}
                      {webField && (
                        <div>
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#1a3c5e]/10 flex items-center justify-center flex-shrink-0 mt-0.5"><webField.icon className="w-5 h-5 text-[#1a3c5e]" /></div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <Label className="text-sm font-medium text-gray-700">{webField.label}</Label>
                              <div className="flex gap-2">
                                <Input placeholder={webField.placeholder} defaultValue={settings[webField.key] || ''} id={`setting-${webField.key}`} className="flex-1" />
                                <button className="bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white font-bold text-sm px-3 py-1.5 rounded-md flex-shrink-0 transition-colors duration-150" onClick={() => { const inp = document.getElementById(`setting-${webField.key}`) as HTMLInputElement; if (inp) handleSave(webField.key, inp.value); }} disabled={saving === webField.key}>
                                  {saving === webField.key ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" />Menyimpan</> : <><Save className="w-4 h-4 mr-1" />Simpan</>}
                                </button>
                              </div>
                            </div>
                          </div>
                          <Separator className="mt-5" />
                        </div>
                      )}

                      {/* Dynamic Bank Accounts */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-[#1a3c5e]/10 flex items-center justify-center flex-shrink-0"><CreditCard className="w-5 h-5 text-[#1a3c5e]" /></div>
                            <div>
                              <Label className="text-sm font-medium text-gray-700">Rekening Bank</Label>
                              <p className="text-[11px] text-gray-400">Kelola rekening untuk pembayaran iuran</p>
                            </div>
                          </div>
                          <button onClick={() => setShowAddBank(true)} className="bg-[#2e7d32] hover:bg-[#1a6b2c] active:bg-[#14532d] text-white font-bold text-xs px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors">
                            <Plus className="w-3.5 h-3.5" />Tambah
                          </button>
                        </div>

                        {banks.length === 0 && !showAddBank && (
                          <div className="p-6 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-center">
                            <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">Belum ada rekening bank</p>
                          </div>
                        )}

                        <div className="space-y-3">
                          {banks.map((bank) => (
                            <div key={bank.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                              <div className="w-10 h-10 rounded-lg bg-[#1a3c5e]/10 flex items-center justify-center flex-shrink-0">
                                <Building className="w-5 h-5 text-[#1a3c5e]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{bank.bank}</p>
                                <p className="text-xs text-gray-500 font-mono tracking-wider">{bank.noRekening}</p>
                                <p className="text-[11px] text-gray-400">a.n. {bank.atasNama}</p>
                              </div>
                              <button onClick={() => setDeleteBankId(bank.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add new bank form */}
                        {showAddBank && (
                          <div className="p-4 rounded-xl border-2 border-dashed border-[#1a3c5e]/30 bg-[#1a3c5e]/5 space-y-3">
                            <p className="text-sm font-semibold text-[#1a3c5e]">Tambah Rekening Baru</p>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-[11px] text-gray-500 mb-1">Bank</Label>
                                <select value={newBank.bank} onChange={(e) => setNewBank(p => ({ ...p, bank: e.target.value }))} className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3c5e]/20">
                                  {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                              </div>
                              <div>
                                <Label className="text-[11px] text-gray-500 mb-1">No. Rekening</Label>
                                <Input placeholder="1234567890" value={newBank.noRekening} onChange={(e) => setNewBank(p => ({ ...p, noRekening: e.target.value }))} className="text-sm" />
                              </div>
                              <div>
                                <Label className="text-[11px] text-gray-500 mb-1">Atas Nama</Label>
                                <Input placeholder="Nama pemilik" value={newBank.atasNama} onChange={(e) => setNewBank(p => ({ ...p, atasNama: e.target.value }))} className="text-sm" />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => { setShowAddBank(false); setNewBank({ bank: 'BCA', noRekening: '', atasNama: '' }); }} className="text-gray-500 hover:text-gray-700 text-xs font-medium px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">Batal</button>
                              <button onClick={handleAddBank} disabled={saving === 'bank_accounts'} className="bg-[#1a3c5e] hover:bg-[#2e5a3e] text-white font-bold text-xs px-4 py-1.5 rounded-md transition-colors">
                                {saving === 'bank_accounts' ? 'Menyimpan...' : 'Simpan Rekening'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // Default rendering for other groups
              const fields = settingFields.filter(f => f.group === group);
              return (
                <Card key={group} className="border-0 shadow-md">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2">
                      <Settings className="w-4 h-4" />{group}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {fields.map((field, idx) => (
                      <div key={field.key}>
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#1a3c5e]/10 flex items-center justify-center flex-shrink-0 mt-0.5"><field.icon className="w-5 h-5 text-[#1a3c5e]" /></div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <Label className="text-sm font-medium text-gray-700">{field.label}</Label>
                            <div className="flex gap-2">
                              <Input placeholder={field.placeholder} defaultValue={settings[field.key] || ''} id={`setting-${field.key}`} className="flex-1" />
                              <button className="bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white font-bold text-sm px-3 py-1.5 rounded-md flex-shrink-0 transition-colors duration-150" onClick={() => { const inp = document.getElementById(`setting-${field.key}`) as HTMLInputElement; if (inp) handleSave(field.key, inp.value); }} disabled={saving === field.key}>
                                {saving === field.key ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" />Menyimpan</> : <><Save className="w-4 h-4 mr-1" />Simpan</>}
                              </button>
                            </div>
                          </div>
                        </div>
                        {idx < fields.length - 1 && <Separator className="mt-5" />}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="border-0 shadow-md">
              <CardContent className="p-16 text-center">
                <Settings className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Gagal memuat pengaturan</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Delete Bank Dialog */}
      <AlertDialog open={!!deleteBankId} onOpenChange={() => setDeleteBankId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Rekening Bank</AlertDialogTitle>
            <AlertDialogDescription>Apakah Anda yakin ingin menghapus rekening ini? Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving === 'bank_accounts'}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBank} disabled={saving === 'bank_accounts'} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  PENGURUS SECTION                                           */
/* ═══════════════════════════════════════════════════════════ */
function PengurusSection({ settings, saving, handleSave }: {
  settings: Settings;
  saving: string | null;
  handleSave: (field: { namaKey: string; waKey: string; fotoKey: string }, nama: string, wa: string, foto: string) => Promise<void>;
}) {
  const [editData, setEditData] = useState<Record<string, { nama: string; wa: string; foto: string }>>({});

  useEffect(() => {
    const data: Record<string, { nama: string; wa: string; foto: string }> = {};
    pengurusFields.forEach(f => {
      data[f.namaKey] = { nama: settings[f.namaKey] || '', wa: settings[f.waKey] || '', foto: settings[f.fotoKey] || '' };
    });
    setEditData(data);
  }, [settings]);

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handlePhotoChange = async (field: { fotoKey: string; namaKey: string }, file: File) => {
    try {
      const compressed = await compressImage(file);
      setEditData(prev => ({ ...prev, [field.namaKey]: { ...prev[field.namaKey], foto: compressed } }));
    } catch {
      // ignore compression errors
    }
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2">
          <User className="w-4 h-4" />Pengurus RT
        </CardTitle>
        <p className="text-xs text-gray-400 mt-1">Data pengurus akan tampil di halaman utama dan halaman pembayaran</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {pengurusFields.map((field, idx) => {
          const d = editData[field.namaKey] || { nama: '', wa: '', foto: '' };
          const isSaving = saving === field.namaKey;

          return (
            <div key={field.namaKey}>
              <div className="flex items-start gap-4">
                {/* Photo */}
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-50">
                    {d.foto ? (
                      <img src={d.foto} alt={d.nama || field.label} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] flex items-center justify-center">
                        <span className="text-xl font-bold text-white">{(d.nama || field.label)[0]}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileRefs.current[field.namaKey]?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#1a3c5e] text-white flex items-center justify-center shadow-md hover:bg-[#2e5a3e] transition-colors"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                  {d.foto && (
                    <button
                      onClick={() => setEditData(prev => ({ ...prev, [field.namaKey]: { ...prev[field.namaKey], foto: '' } }))}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                  <input
                    ref={(el) => { fileRefs.current[field.namaKey] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoChange(field, f); }}
                  />
                </div>

                {/* Fields */}
                <div className="flex-1 min-w-0 space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{field.label}</Label>
                  <Input
                    placeholder={`Nama ${field.label}`}
                    value={d.nama}
                    onChange={(e) => setEditData(prev => ({ ...prev, [field.namaKey]: { ...prev[field.namaKey], nama: e.target.value } }))}
                  />
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <Input
                        placeholder="628xxxxxxxxxx"
                        value={d.wa}
                        onChange={(e) => setEditData(prev => ({ ...prev, [field.namaKey]: { ...prev[field.namaKey], wa: e.target.value } }))}
                        className="pl-8"
                      />
                    </div>
                    {d.wa && (
                      <a
                        href={`https://wa.me/${d.wa.replace(/^0/, '62')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#25D366] text-white hover:bg-[#1ebe57] transition-colors flex-shrink-0"
                        title="Chat WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <button
                    className="bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white font-bold text-xs px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors duration-150 w-fit"
                    onClick={() => handleSave(field, d.nama, d.wa, d.foto)}
                    disabled={isSaving}
                  >
                    {isSaving ? <><RefreshCw className="w-3 h-3 animate-spin" />Menyimpan</> : <><Save className="w-3 h-3" />Simpan</>}
                  </button>
                </div>
              </div>
              {idx < pengurusFields.length - 1 && <Separator className="mt-4" />}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

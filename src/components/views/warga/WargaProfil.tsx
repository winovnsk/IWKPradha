'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Menu, LogOut, LayoutDashboard, Receipt, FileText,
  CalendarDays, Bell, BarChart3, UserCircle,
  Save, User, Mail, Phone, MapPin, Shield, CheckCircle2,
  Camera, X, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAppStore, type ViewType } from '@/lib/store';
import { api } from '@/lib/api';

/* ═══════════════════════════════════════════════════════════ */
/*  TYPES                                                      */
/* ═══════════════════════════════════════════════════════════ */
interface SidebarItem { icon: typeof LayoutDashboard; label: string; view: ViewType; }

/* ═══════════════════════════════════════════════════════════ */
/*  HELPERS                                                    */
/* ═══════════════════════════════════════════════════════════ */
const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

const wargaMenuItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', view: 'warga-dashboard' },
  { icon: Receipt, label: 'Bayar Iuran', view: 'warga-bayar' },
  { icon: FileText, label: 'Riwayat', view: 'warga-riwayat' },
  { icon: CalendarDays, label: 'Kegiatan', view: 'warga-kegiatan' },
  { icon: Bell, label: 'Pengumuman', view: 'warga-pengumuman' },
  { icon: BarChart3, label: 'Laporan', view: 'warga-laporan' },
  { icon: UserCircle, label: 'Profil', view: 'warga-profil' },
];

/* ── Avatar component (reusable) ── */
function Avatar({ foto, nama, size = 'md', className = '' }: { foto?: string; nama?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizeMap = { sm: 'w-9 h-9 text-sm', md: 'w-12 h-12 text-lg', lg: 'w-16 h-16 text-2xl', xl: 'w-20 h-20 text-3xl' };
  const s = sizeMap[size];

  if (foto) {
    return (
      <div className={`${s} rounded-full overflow-hidden border-2 border-white shadow-md flex-shrink-0 ${className}`}>
        <img src={foto} alt={nama || 'Avatar'} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${s} rounded-full bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] flex items-center justify-center font-bold text-white border-2 border-white shadow-md flex-shrink-0 ${className}`}>
      {nama?.[0]?.toUpperCase() || 'U'}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  WARGA PROFIL                                              */
/* ═══════════════════════════════════════════════════════════ */
export default function WargaProfil() {
  const { user, currentView, setView, logout, sidebarOpen, toggleSidebar, setToast, updateUser, settings } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nama: user?.nama || '',
    alamat: user?.alamat || '',
    noHp: user?.noHp || '',
    email: user?.email || '',
    foto: user?.foto || '',
  });

  /* ── Photo Upload Handler ── */
  const handleFotoClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setToast({ message: 'File harus berupa gambar (JPG, PNG, dll)', type: 'error' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setToast({ message: 'Ukuran foto maksimal 2MB', type: 'error' });
      return;
    }

    setUploadingFoto(true);
    try {
      // Compress and resize using canvas
      const compressed = await compressImage(file, 300, 300, 0.8);
      setPreviewFoto(compressed);
      setForm(prev => ({ ...prev, foto: compressed }));
      setToast({ message: 'Foto berhasil dipilih. Klik "Simpan" untuk menyimpan.', type: 'info' });
    } catch {
      setToast({ message: 'Gagal memproses foto', type: 'error' });
    } finally {
      setUploadingFoto(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [setToast]);

  const handleRemoveFoto = useCallback(() => {
    setPreviewFoto(null);
    setForm(prev => ({ ...prev, foto: '' }));
    setToast({ message: 'Foto dihapus. Klik "Simpan" untuk menyimpan.', type: 'info' });
  }, [setToast]);

  /* ── Save Handler ── */
  const handleSave = async () => {
    if (!form.nama || !form.email) {
      setToast({ message: 'Nama dan email wajib diisi', type: 'error' });
      return;
    }
    if (!user?.id) {
      setToast({ message: 'Sesi tidak valid, silakan login ulang', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateProfile(user.id, {
        nama: form.nama,
        alamat: form.alamat,
        noHp: form.noHp,
        email: form.email,
        foto: form.foto,
      });

      if (res.success) {
        // Update Zustand store and localStorage
        updateUser({
          nama: form.nama,
          alamat: form.alamat,
          noHp: form.noHp,
          email: form.email,
          foto: form.foto,
        });
        setPreviewFoto(null);
        setEditing(false);
        setToast({ message: 'Profil berhasil diperbarui', type: 'success' });
      } else {
        setToast({ message: res.message || 'Gagal memperbarui profil', type: 'error' });
      }
    } catch {
      setToast({ message: 'Terjadi kesalahan saat menyimpan', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      nama: user?.nama || '',
      alamat: user?.alamat || '',
      noHp: user?.noHp || '',
      email: user?.email || '',
      foto: user?.foto || '',
    });
    setPreviewFoto(null);
    setEditing(false);
  };

  // Current displayed photo
  const displayFoto = previewFoto || form.foto || user?.foto || '';

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFotoChange}
      />

      {/* SIDEBAR */}
      <aside className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-[#0f1a2e] text-white transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] flex items-center justify-center"><Building2 className="w-5 h-5 text-white" /></div>
          <div><p className="text-sm font-bold">{settings.app_name || 'IWK RT 11'}</p><p className="text-[10px] text-white/40">{settings.alamat_rt || 'Pradha Ciganitri'}</p></div>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-10rem)]">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2 px-3">Menu Utama</p>
          {wargaMenuItems.map(item => (
            <button key={item.view} onClick={() => setView(item.view)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${currentView === item.view ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
              <item.icon className="w-4 h-4" />{item.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[#0f1a2e]">
          <div className="flex items-center gap-3 mb-3">
            <Avatar foto={displayFoto || user?.foto} nama={user?.nama} size="sm" />
            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{user?.nama || 'User'}</p></div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4" />Keluar
          </button>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={toggleSidebar} />}

      {/* MAIN */}
      <main className="lg:ml-64 min-h-screen">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b px-4 sm:px-6 h-16 flex items-center justify-between">
          <button className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 z-[10000] transition-colors duration-150" onClick={toggleSidebar}><Menu className="w-5 h-5" /></button>
          <div><h1 className="text-lg font-bold text-[#1a3c5e]">Profil Saya</h1><p className="text-xs text-gray-400">Informasi akun dan data pribadi</p></div>
          {!editing && (
            <button className="bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white font-bold text-xs px-3 py-1.5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30"
              onClick={() => setEditing(true)}>
              Edit Profil
            </button>
          )}
        </header>

        <motion.div initial="hidden" animate="visible" variants={stagger} className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
          {/* Profile Header Card */}
          <motion.div variants={fadeIn} className="mb-6">
            <Card className="border-0 shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-[#1a3c5e] to-[#2e5a3e] h-28" />
              <CardContent className="p-6 -mt-12">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  {/* Avatar with camera button */}
                  <div className="relative group">
                    <Avatar foto={displayFoto || user?.foto} nama={user?.nama} size="xl" />
                    
                    {/* Camera overlay button */}
                    <button
                      type="button"
                      onClick={handleFotoClick}
                      disabled={uploadingFoto}
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white flex items-center justify-center shadow-lg border-2 border-white transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30 disabled:opacity-60"
                      title="Ubah foto profil"
                    >
                      {uploadingFoto ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>

                    {/* Upload loading overlay */}
                    <AnimatePresence>
                      {uploadingFoto && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center"
                        >
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-gray-900">{form.nama || user?.nama || 'User'}</h2>
                    <p className="text-sm text-gray-500">{form.email || user?.email || 'email@contoh.com'}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge className={`${user?.role === 'admin' ? 'bg-[#1a3c5e]/10 text-[#1a3c5e]' : 'bg-emerald-50 text-emerald-700'} border-0 text-xs`}>
                        <Shield className="w-3 h-3 mr-1" />
                        {user?.role === 'admin' ? 'Admin RT' : 'Warga'}
                      </Badge>
                      <Badge className={`${user?.status === 'active' || user?.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'} border-0 text-xs`}>
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {user?.status === 'active' || user?.status === 'approved' ? 'Aktif' : user?.status || 'Aktif'}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      Klik ikon <Camera className="w-3 h-3 inline mx-0.5" /> untuk mengubah foto
                    </p>
                  </div>
                </div>

                {/* Photo preview strip when editing */}
                <AnimatePresence>
                  {previewFoto && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 overflow-hidden"
                    >
                      <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={previewFoto} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-emerald-800">Foto baru dipilih</p>
                          <p className="text-[10px] text-emerald-600">Klik "Simpan Perubahan" untuk menyimpan foto baru</p>
                        </div>
                        <button
                          onClick={handleRemoveFoto}
                          className="w-7 h-7 rounded-full bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-700 flex items-center justify-center transition-colors flex-shrink-0"
                          title="Hapus foto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Profile Details */}
          <motion.div variants={fadeIn}>
            <Card className="border-0 shadow-md">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2">
                  <User className="w-4 h-4" />Data Pribadi
                </CardTitle>
                {editing && (
                  <button className="text-gray-600 hover:text-[#1a3c5e] hover:bg-gray-100 active:bg-gray-200 font-medium text-xs px-3 py-1.5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={handleCancel}>
                    Batal
                  </button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {/* Nama */}
                  <div>
                    <Label className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
                      <User className="w-3.5 h-3.5" />Nama Lengkap
                    </Label>
                    {editing ? (
                      <Input value={form.nama} onChange={(e) => setForm(p => ({ ...p, nama: e.target.value }))}
                        placeholder="Nama lengkap" className="bg-gray-50" />
                    ) : (
                      <p className="text-sm font-medium text-gray-800 py-2">{user?.nama || '-'}</p>
                    )}
                  </div>

                  <Separator />

                  {/* Alamat */}
                  <div>
                    <Label className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
                      <MapPin className="w-3.5 h-3.5" />Nomor Rumah / Alamat
                    </Label>
                    {editing ? (
                      <Input value={form.alamat} onChange={(e) => setForm(p => ({ ...p, alamat: e.target.value }))}
                        placeholder="Nomor rumah / blok" className="bg-gray-50" />
                    ) : (
                      <p className="text-sm font-medium text-gray-800 py-2">{user?.alamat || '-'}</p>
                    )}
                  </div>

                  <Separator />

                  {/* No HP */}
                  <div>
                    <Label className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
                      <Phone className="w-3.5 h-3.5" />Nomor HP
                    </Label>
                    {editing ? (
                      <Input value={form.noHp} onChange={(e) => setForm(p => ({ ...p, noHp: e.target.value }))}
                        placeholder="08xxxxxxxxxx" className="bg-gray-50" />
                    ) : (
                      <p className="text-sm font-medium text-gray-800 py-2">{user?.noHp || '-'}</p>
                    )}
                  </div>

                  <Separator />

                  {/* Email */}
                  <div>
                    <Label className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
                      <Mail className="w-3.5 h-3.5" />Email
                    </Label>
                    {editing ? (
                      <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                        placeholder="email@contoh.com" className="bg-gray-50" />
                    ) : (
                      <p className="text-sm font-medium text-gray-800 py-2">{user?.email || '-'}</p>
                    )}
                  </div>

                  {editing && (
                    <button className="w-full bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white font-bold py-5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30 mt-4"
                      onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <span className="flex items-center gap-2 justify-center">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Menyimpan...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 justify-center">
                          <Save className="w-4 h-4" />Simpan Perubahan
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Account Info */}
          <motion.div variants={fadeIn} className="mt-6">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2">
                  <Shield className="w-4 h-4" />Informasi Akun
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <p className="text-sm text-gray-500">ID Pengguna</p>
                    <p className="text-sm font-medium text-gray-800 font-mono">{user?.id || '-'}</p>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <p className="text-sm text-gray-500">Peran</p>
                    <Badge className={`${user?.role === 'admin' ? 'bg-[#1a3c5e]/10 text-[#1a3c5e]' : 'bg-emerald-50 text-emerald-700'} border-0 text-xs`}>
                      {user?.role === 'admin' ? 'Admin RT' : 'Warga'}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <p className="text-sm text-gray-500">Status</p>
                    <Badge className={`${user?.status === 'active' || user?.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'} border-0 text-xs`}>
                      {user?.status === 'active' || user?.status === 'approved' ? 'Aktif' : user?.status || 'Aktif'}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <p className="text-sm text-gray-500">Alamat</p>
                    <p className="text-sm font-medium text-gray-800">{user?.alamat || 'Blok -'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  IMAGE COMPRESSOR UTILITY                                   */
/* ═══════════════════════════════════════════════════════════ */
function compressImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Scale down if larger than max dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context not available')); return; }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

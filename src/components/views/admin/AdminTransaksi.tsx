'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Building2, LayoutDashboard, Users, ClipboardList, ShieldCheck,
  CalendarDays, Megaphone, Settings, Menu, LogOut, Plus,
  Trash2, RefreshCw, TrendingUp, TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, getCategoryLabel } from '@/lib/categories';

const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const formatDate = (s: string) => { const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']; const d = new Date(s); return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`; };

interface Transaction { id: string; type: string; categoryId: string; nominal: number; tanggal: string; status: string; deskripsi: string; }

const adminMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', view: 'admin-dashboard' },
  { icon: Users, label: 'Kelola Warga', view: 'admin-users' },
  { icon: ClipboardList, label: 'Transaksi', view: 'admin-transaksi' },
  { icon: ShieldCheck, label: 'Validasi', view: 'admin-validasi' },
  { icon: CalendarDays, label: 'Kegiatan', view: 'admin-kegiatan' },
  { icon: Megaphone, label: 'Pengumuman', view: 'admin-pengumuman' },
  { icon: Settings, label: 'Pengaturan', view: 'admin-settings' },
];

const filterTabs = [
  { label: 'Semua', value: '' },
  { label: 'Pemasukan', value: 'income' },
  { label: 'Pengeluaran', value: 'expense' },
];

const categories = [
  ...INCOME_CATEGORIES.map(c => ({ label: c.label, value: c.id })),
  ...EXPENSE_CATEGORIES.map(c => ({ label: c.label, value: c.id })),
];

export default function AdminTransaksi() {
  const { user, currentView, setView, logout, toggleSidebar, sidebarOpen, setToast, settings } = useAppStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ type: 'income', categoryId: 'IURANBULANAN', nominal: '', tanggal: new Date().toISOString().split('T')[0], deskripsi: '' });

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getTransactions(filter);
      setTransactions(res.data || res || []);
    } catch {
      setToast({ message: 'Gagal memuat data transaksi', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filter, setToast]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleSubmit = async () => {
    if (!form.nominal || !form.tanggal || !form.deskripsi) { setToast({ message: 'Semua field wajib diisi', type: 'error' }); return; }
    setSubmitting(true);
    try {
      const res = await api.gas('createTransaction', { type: form.type, categoryId: form.categoryId, nominal: parseInt(form.nominal), tanggal: form.tanggal, deskripsi: form.deskripsi });
      if (res.success) {
        setToast({ message: 'Transaksi berhasil ditambahkan', type: 'success' });
        setDialogOpen(false);
        setForm({ type: 'income', categoryId: 'IURANBULANAN', nominal: '', tanggal: new Date().toISOString().split('T')[0], deskripsi: '' });
        fetchTransactions();
      } else {
        setToast({ message: res.message || 'Gagal menambahkan transaksi', type: 'error' });
      }
    } catch {
      setToast({ message: 'Terjadi kesalahan', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await api.gas('deleteTransaction', { transactionid: deleteTarget.id });
      if (res.success) {
        setToast({ message: 'Transaksi berhasil dihapus', type: 'success' });
        fetchTransactions();
      } else {
        setToast({ message: res.message || 'Gagal menghapus transaksi', type: 'error' });
      }
    } catch {
      setToast({ message: 'Terjadi kesalahan', type: 'error' });
    } finally {
      setSubmitting(false);
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px]">Approved</Badge>;
      case 'pending': return <Badge className="bg-amber-50 text-amber-700 border-0 text-[10px]">Pending</Badge>;
      case 'rejected': return <Badge className="bg-red-50 text-red-700 border-0 text-[10px]">Rejected</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <aside className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-[#0f1a2e] text-white transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] flex items-center justify-center"><Building2 className="w-5 h-5 text-white" /></div>
          <div><p className="text-sm font-bold">{settings.app_name || 'Admin Panel'}</p><p className="text-[10px] text-white/40">{settings.alamat_rt || 'RT 11 Pradha Ciganitri'}</p></div>
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
          <div><h1 className="text-lg font-bold text-[#1a3c5e]">Transaksi</h1><p className="text-xs text-gray-400">Kelola transaksi keuangan RT 11</p></div>
          <div className="flex items-center gap-2">
            <button className="text-gray-600 hover:text-[#1a3c5e] hover:bg-gray-100 active:bg-gray-200 font-medium px-2 py-1.5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={fetchTransactions}><RefreshCw className="w-4 h-4" /></button>
            <button className="bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white font-bold text-sm px-3 py-1.5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1" />Tambah</button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Filter */}
          <div className="flex gap-1 bg-white rounded-xl shadow-md p-1 w-fit">
            {filterTabs.map(tab => (
              <button key={tab.value} onClick={() => setFilter(tab.value)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === tab.value ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8f9fb] border-b">
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">Tanggal</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">Deskripsi</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">Kategori</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">Tipe</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">Nominal</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Status</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}><td colSpan={7}><Skeleton className="h-14 mx-4 my-2 rounded-lg" /></td></tr>
                    ))
                  ) : transactions.length === 0 ? (
                    <tr><td colSpan={7}><div className="text-center py-16"><ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400 text-sm">Belum ada transaksi</p></div></td></tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{formatDate(t.tanggal)}</td>
                        <td className="py-3 px-4 text-gray-800 font-medium max-w-xs truncate">{t.deskripsi}</td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <Badge className="bg-gray-50 text-gray-600 border-0 text-[10px]">{getCategoryLabel(t.categoryId)}</Badge>
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell">
                          <Badge className={t.type === 'income' ? 'bg-emerald-50 text-emerald-700 border-0 text-[10px]' : 'bg-red-50 text-red-700 border-0 text-[10px]'}>
                            {t.type === 'income' ? <><TrendingUp className="w-3 h-3 mr-1 inline" />Masuk</> : <><TrendingDown className="w-3 h-3 mr-1 inline" />Keluar</>}
                          </Badge>
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {t.type === 'income' ? '+' : '-'}{formatRupiah(t.nominal)}
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">{statusBadge(t.status)}</td>
                        <td className="py-3 px-4 text-right">
                          <button className="h-8 w-8 p-0 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 hover:text-red-600 active:bg-red-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={() => { setDeleteTarget(t); setDeleteOpen(true); }}><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!loading && transactions.length > 0 && (
              <div className="px-4 py-3 bg-gray-50/50 border-t text-xs text-gray-400">
                Menampilkan {transactions.length} transaksi
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Tambah Transaksi</DialogTitle>
            <DialogDescription>Masukkan data transaksi keuangan RT 11</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tipe Transaksi</Label>
              <div className="flex gap-2 mt-1.5">
                <button onClick={() => setForm(p => ({ ...p, type: 'income', categoryId: 'IURANBULANAN' }))} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all border ${form.type === 'income' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}><TrendingUp className="w-4 h-4" />Pemasukan</button>
                <button onClick={() => setForm(p => ({ ...p, type: 'expense', categoryId: 'OPERASIONALRUTIN' }))} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all border ${form.type === 'expense' ? 'bg-red-50 border-red-200 text-red-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}><TrendingDown className="w-4 h-4" />Pengeluaran</button>
              </div>
            </div>
            <div>
              <Label>Kategori</Label>
              <select value={form.categoryId} onChange={(e) => setForm(p => ({ ...p, categoryId: e.target.value }))} className="w-full mt-1.5 px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3c5e]/20 focus:border-[#1a3c5e]">
                <option value="" disabled>Pilih kategori...</option>
                <optgroup label="Pemasukan">
                  {INCOME_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </optgroup>
                <optgroup label="Pengeluaran">
                  {EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </optgroup>
              </select>
            </div>
            <div>
              <Label>Nominal (Rp)</Label>
              <Input type="number" placeholder="100000" value={form.nominal} onChange={(e) => setForm(p => ({ ...p, nominal: e.target.value }))} className="mt-1.5" />
            </div>
            <div>
              <Label>Tanggal</Label>
              <Input type="date" value={form.tanggal} onChange={(e) => setForm(p => ({ ...p, tanggal: e.target.value }))} className="mt-1.5" />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Input placeholder="Deskripsi transaksi" value={form.deskripsi} onChange={(e) => setForm(p => ({ ...p, deskripsi: e.target.value }))} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <button className="border-2 border-[#1a3c5e] text-[#1a3c5e] hover:bg-[#1a3c5e] hover:text-white active:bg-[#1a3c5e]/90 active:text-white font-semibold px-4 py-2 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={() => setDialogOpen(false)}>Batal</button>
            <button className="bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white font-bold px-4 py-2 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Transaksi</AlertDialogTitle>
            <AlertDialogDescription>Apakah Anda yakin ingin menghapus transaksi &quot;{deleteTarget?.deskripsi}&quot;? Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Building2, LayoutDashboard, Users, ClipboardList, ShieldCheck,
  CalendarDays, Megaphone, Settings, Menu, LogOut, CheckCircle2,
  XCircle, RefreshCw, TrendingUp, TrendingDown, Clock,
  Inbox, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api';

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

export default function AdminValidasi() {
  const { user, currentView, setView, logout, toggleSidebar, sidebarOpen, setToast, settings } = useAppStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getTransactions('', 'pending', 100);
      const data = res.data || res || [];
      setTransactions(Array.isArray(data) ? data : []);
    } catch {
      setToast({ message: 'Gagal memuat data transaksi', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [setToast]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleValidate = async (transactionid: string, status: 'approved' | 'rejected') => {
    setActionLoading(transactionid);
    try {
      const res = await api.gas('validateTransaction', { transactionid, status });
      if (res.success) {
        setToast({ message: `Transaksi berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`, type: 'success' });
        fetchPending();
      } else {
        setToast({ message: res.message || 'Gagal memvalidasi transaksi', type: 'error' });
      }
    } catch {
      setToast({ message: 'Terjadi kesalahan', type: 'error' });
    } finally {
      setActionLoading(null);
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
          <div><h1 className="text-lg font-bold text-[#1a3c5e]">Validasi Transaksi</h1><p className="text-xs text-gray-400">Validasi pembayaran iuran warga</p></div>
          <div className="flex items-center gap-2">
            {transactions.length > 0 && <Badge className="bg-amber-50 text-amber-700 border-0 text-xs">{transactions.length} pending</Badge>}
            <button className="text-gray-600 hover:text-[#1a3c5e] hover:bg-gray-100 active:bg-gray-200 font-medium px-2 py-1.5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={fetchPending}><RefreshCw className="w-4 h-4" /></button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Summary */}
          <Card className="border-0 shadow-md bg-gradient-to-r from-amber-500 to-orange-500">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-white" /></div>
              <div>
                <p className="text-white font-bold text-lg">{loading ? '-' : `${transactions.length} transaksi menunggu validasi`}</p>
                <p className="text-white/70 text-sm">Periksa dan validasi pembayaran warga</p>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Cards */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : transactions.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="p-16 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8 text-emerald-400" /></div>
                <h3 className="text-lg font-bold text-gray-700 mb-2">Semua Transaksi Tervalidasi</h3>
                <p className="text-sm text-gray-400 max-w-sm mx-auto">Tidak ada transaksi yang menunggu validasi saat ini. Semua pembayaran sudah diproses.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {transactions.map((t) => (
                <Card key={t.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        {t.type === 'income' ? <TrendingUp className="w-5 h-5 text-emerald-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
                      </div>
                      <Badge className="bg-amber-50 text-amber-700 border-0 text-[10px]">Pending</Badge>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm mb-1">{t.deskripsi}</p>
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs"><Clock className="w-3 h-3" />{formatDate(t.tanggal)}</div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className={`text-lg font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatRupiah(t.nominal)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs px-3 py-1.5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30"
                        onClick={() => handleValidate(t.id, 'approved')}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === t.id ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Proses</> : <><CheckCircle2 className="w-3 h-3 mr-1" />Setujui</>}
                      </button>
                      <button
                        className="flex-1 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 active:bg-red-100 active:text-red-800 font-semibold text-xs px-3 py-1.5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30"
                        onClick={() => handleValidate(t.id, 'rejected')}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === t.id ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Proses</> : <><XCircle className="w-3 h-3 mr-1" />Tolak</>}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

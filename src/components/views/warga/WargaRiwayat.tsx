'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Menu, LogOut, LayoutDashboard, Receipt, FileText,
  CalendarDays, Bell, BarChart3, UserCircle, Filter, Inbox,
  Clock, CheckCircle2, XCircle, RefreshCw, CreditCard, Banknote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore, type ViewType } from '@/lib/store';
import { api } from '@/lib/api';
import { getCategoryLabel } from '@/lib/categories';

/* ═══════════════════════════════════════════════════════════ */
/*  TYPES                                                      */
/* ═══════════════════════════════════════════════════════════ */
interface Transaction {
  id: string; type: string; categoryId: string; nominal: number;
  tanggal: string; status: string; deskripsi: string; userId: string;
}
interface SidebarItem { icon: typeof LayoutDashboard; label: string; view: ViewType; }

/* ═══════════════════════════════════════════════════════════ */
/*  HELPERS                                                    */
/* ═══════════════════════════════════════════════════════════ */
const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const formatDate = (s: string) => {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const d = new Date(s);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

const wargaMenuItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', view: 'warga-dashboard' },
  { icon: Receipt, label: 'Bayar Iuran', view: 'warga-bayar' },
  { icon: FileText, label: 'Riwayat', view: 'warga-riwayat' },
  { icon: CalendarDays, label: 'Kegiatan', view: 'warga-kegiatan' },
  { icon: Bell, label: 'Pengumuman', view: 'warga-pengumuman' },
  { icon: BarChart3, label: 'Laporan', view: 'warga-laporan' },
  { icon: UserCircle, label: 'Profil', view: 'warga-profil' },
];

type FilterTab = 'semua' | 'menunggu' | 'disetujui' | 'ditolak';

const statusConfig: Record<string, { label: string; cls: string; icon: typeof CheckCircle2; desc: string }> = {
  approved: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: CheckCircle2, desc: 'Pembayaran telah divalidasi oleh admin' },
  pending: { label: 'Menunggu Verifikasi', cls: 'bg-amber-50 text-amber-700 border border-amber-200', icon: Clock, desc: 'Menunggu admin memvalidasi bukti pembayaran' },
  rejected: { label: 'Ditolak', cls: 'bg-red-50 text-red-700 border border-red-200', icon: XCircle, desc: 'Bukti pembayaran ditolak oleh admin' },
};

/* ═══════════════════════════════════════════════════════════ */
/*  WARGA RIWAYAT                                              */
/* ═══════════════════════════════════════════════════════════ */
export default function WargaRiwayat() {
  const { user, currentView, setView, logout, sidebarOpen, toggleSidebar, setToast, settings } = useAppStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('semua');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchTransactions = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Hanya ambil transaksi milik user yang sedang login
      const res = await api.getTransactions('income', '', 100, user.id);
      if (res.success) setTransactions(res.data || []);
    } catch (err) {
      console.error('Fetch transactions error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user?.id]);

  const filteredTransactions = activeTab === 'semua'
    ? transactions
    : transactions.filter((t) => {
        if (activeTab === 'menunggu') return t.status === 'pending';
        if (activeTab === 'disetujui') return t.status === 'approved';
        if (activeTab === 'ditolak') return t.status === 'rejected';
        return true;
      });

  const stats = {
    total: transactions.length,
    pending: transactions.filter((t) => t.status === 'pending').length,
    approved: transactions.filter((t) => t.status === 'approved').length,
    rejected: transactions.filter((t) => t.status === 'rejected').length,
    totalNominal: transactions.filter((t) => t.status === 'approved').reduce((sum, t) => sum + t.nominal, 0),
  };

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'semua', label: 'Semua', count: stats.total },
    { key: 'menunggu', label: 'Menunggu', count: stats.pending },
    { key: 'disetujui', label: 'Disetujui', count: stats.approved },
    { key: 'ditolak', label: 'Ditolak', count: stats.rejected },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* SIDEBAR */}
      <aside className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-[#0f1a2e] text-white transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
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
            {user?.foto ? (
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0"><img src={user.foto} alt={user.nama || 'Avatar'} className="w-full h-full object-cover" /></div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] flex items-center justify-center text-sm font-bold flex-shrink-0">{user?.nama?.[0] || 'U'}</div>
            )}
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
          <div><h1 className="text-lg font-bold text-[#1a3c5e]">Riwayat Pembayaran</h1><p className="text-xs text-gray-400">Rekam jejak iuran warga: {user?.nama}</p></div>
          <button className="border border-[#1a3c5e] text-[#1a3c5e] hover:bg-[#1a3c5e] hover:text-white active:bg-[#1a3c5e]/90 active:text-white font-semibold text-xs px-3 py-1.5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30"
            onClick={() => { fetchTransactions(); setToast({ message: 'Data berhasil di-refresh', type: 'info' }); }}>
            <RefreshCw className="w-3 h-3 mr-1" />Refresh
          </button>
        </header>

        <motion.div initial="hidden" animate="visible" variants={stagger} className="p-4 sm:p-6 lg:p-8 space-y-6">

          {/* Summary Cards */}
          <motion.div variants={fadeIn} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-md">
              <CardContent className="p-4 text-center">
                <Receipt className="w-6 h-6 text-[#1a3c5e] mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Total Transaksi</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-4 text-center">
                <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Menunggu Verifikasi</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Disetujui</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-4 text-center">
                <CreditCard className="w-6 h-6 text-[#1a3c5e] mx-auto mb-2" />
                <p className="text-2xl font-bold text-[#1a3c5e]">{formatRupiah(stats.totalNominal)}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Total Dibayarkan</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Filter Tabs */}
          <motion.div variants={fadeIn}>
            <Card className="border-0 shadow-md">
              <CardHeader className="flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Riwayat Iuran
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-1 mb-4 overflow-x-auto">
                  {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                        activeTab === tab.key ? 'bg-white text-[#1a3c5e] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      {tab.label}
                      <Badge variant="secondary" className={`text-[10px] h-5 min-w-5 px-1.5 ${activeTab === tab.key ? 'bg-[#1a3c5e]/10 text-[#1a3c5e]' : 'bg-gray-200/50 text-gray-500'}`}>
                        {tab.count}
                      </Badge>
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <Inbox className="w-10 h-10 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                      {activeTab === 'semua' ? 'Belum ada riwayat pembayaran' : `Tidak ada transaksi ${activeTab}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 mb-6">
                      {activeTab === 'semua' ? 'Silakan bayar iuran melalui menu "Bayar Iuran"' : 'Ubah filter untuk melihat transaksi lainnya'}
                    </p>
                    {activeTab === 'semua' && (
                      <button className="bg-[#1a3c5e] hover:bg-[#2e5a3e] text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                        onClick={() => setView('warga-bayar')}>
                        <CreditCard className="w-4 h-4 mr-1.5" />Bayar Iuran Sekarang
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
                    {filteredTransactions.map((t) => {
                      const sc = statusConfig[t.status] || statusConfig.pending;
                      const isExpanded = expandedId === t.id;
                      const Icon = sc.icon;

                      // Category label
                      const categoryLabel = getCategoryLabel(t.categoryId);
                      // Extract month info from description
                      const monthMatch = t.deskripsi.match(/Iuran\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)/);
                      const monthLabel = monthMatch ? monthMatch[1] : '';
                      const methodMatch = t.deskripsi.match(/-\s*(transfer|QRIS|tunai)/i);
                      const methodLabel = methodMatch ? methodMatch[1].charAt(0).toUpperCase() + methodMatch[1].slice(1) : '';

                      return (
                        <motion.div
                          key={t.id}
                          variants={fadeIn}
                          className={`rounded-xl border-2 overflow-hidden transition-all ${isExpanded ? 'border-[#1a3c5e]/20 bg-white' : 'border-gray-100 hover:border-[#1a3c5e]/20 hover:shadow-md'}`}
                        >
                          {/* Main row */}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : t.id)}
                            className="w-full flex items-center gap-3 p-4 text-left"
                          >
                            {/* Status icon */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              t.status === 'approved' ? 'bg-emerald-50' : t.status === 'pending' ? 'bg-amber-50' : 'bg-red-50'
                            }`}>
                              <Icon className={`w-5 h-5 ${t.status === 'approved' ? 'text-emerald-500' : t.status === 'pending' ? 'text-amber-500' : 'text-red-500'}`} />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] text-[#1a3c5e] bg-[#1a3c5e]/10 rounded px-1.5 py-0.5 font-medium">{categoryLabel}</span>
                                {monthLabel && (
                                  <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{monthLabel}</span>
                                )}
                                {methodLabel && (
                                  <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{methodLabel}</span>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-gray-800 truncate">{t.deskripsi || categoryLabel}</p>
                            </div>

                            {/* Amount */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-base font-bold text-[#1a3c5e]">{formatRupiah(t.nominal)}</p>
                              <p className="text-[10px] text-gray-400">{formatDate(t.tanggal)}</p>
                            </div>

                            {/* Expand arrow */}
                            <div className={`flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </button>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              className="border-t border-gray-100 bg-gray-50/50 px-4 py-3"
                            >
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <p className="text-gray-400 mb-0.5">ID Transaksi</p>
                                  <p className="font-mono text-gray-600 truncate">{t.id}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 mb-0.5">Tanggal</p>
                                  <p className="font-medium text-gray-600">{formatDate(t.tanggal)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 mb-0.5">Kategori</p>
                                  <p className="font-medium text-[#1a3c5e]">{categoryLabel}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 mb-0.5">Nominal</p>
                                  <p className="font-medium text-gray-900">{formatRupiah(t.nominal)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 mb-0.5">Metode</p>
                                  <p className="font-medium text-gray-600">{methodLabel || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 mb-0.5">Bulan</p>
                                  <p className="font-medium text-gray-600">{monthLabel || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-gray-400 mb-0.5">Status Verifikasi</p>
                                  <div className="mt-0.5">
                                    <Badge className={`${sc.cls} text-[10px] flex items-center gap-1 w-fit`}>
                                      <Icon className="w-3 h-3" />
                                      {sc.label}
                                    </Badge>
                                    {t.status === 'pending' && (
                                      <p className="text-[10px] text-amber-600 mt-1">{sc.desc}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

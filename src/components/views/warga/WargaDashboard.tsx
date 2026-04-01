'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Menu, LogOut, LayoutDashboard, Receipt, FileText,
  CalendarDays, Bell, BarChart3, UserCircle, MessageCircle,
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, ListChecks,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore, type ViewType, type User } from '@/lib/store';
import { api } from '@/lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ═══════════════════════════════════════════════════════════ */
/*  TYPES                                                      */
/* ═══════════════════════════════════════════════════════════ */
interface DashboardData {
  totalIncome: number; totalExpense: number; balance: number;
  chartData: { month: string; income: number; expense: number; balance: number }[];
  categoryData: { name: string; value: number }[];
  userCount: number; totalTransactions: number;
}
interface Transaction {
  id: string; type: string; categoryId: string; nominal: number;
  tanggal: string; status: string; deskripsi: string;
}
interface UnpaidMonth { month: string; label: string; nominal: number; }
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

const getMonthLabel = (s: string) => {
  const m = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return m[parseInt(s.split('-')[1]) - 1] || s;
};

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

/* ═══════════════════════════════════════════════════════════ */
/*  WARGA DASHBOARD                                            */
/* ═══════════════════════════════════════════════════════════ */
export default function WargaDashboard() {
  const { user, currentView, setView, logout, sidebarOpen, toggleSidebar, settings } = useAppStore();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unpaid, setUnpaid] = useState<UnpaidMonth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dRes, tRes, uRes] = await Promise.all([
          api.getDashboard(),
          api.getTransactions('', '', 20, user?.id),
          api.getUnpaidMonths(user?.id),
        ]);
        if (dRes.success) setDashboard(dRes.data);
        if (tRes.success) setTransactions(tRes.data || []);
        if (uRes.success) setUnpaid(uRes.data || []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* SIDEBAR */}
      <aside className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-[#0f1a2e] text-white transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold">{settings.app_name || 'IWK RT 11'}</p>
            <p className="text-[10px] text-white/40">{settings.alamat_rt || 'Pradha Ciganitri'}</p>
          </div>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-10rem)]">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2 px-3">Menu Utama</p>
          {wargaMenuItems.map(item => (
            <button key={item.view} onClick={() => setView(item.view)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentView === item.view ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[#0f1a2e]">
          <div className="flex items-center gap-3 mb-3">
            {user?.foto ? (
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0">
                <img src={user.foto} alt={user.nama || 'Avatar'} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] flex items-center justify-center text-sm font-bold flex-shrink-0">
                {user?.nama?.[0] || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.nama || 'User'}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4" />Keluar
          </button>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={toggleSidebar} />}

      {/* MAIN */}
      <main className="lg:ml-64 min-h-screen">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b px-4 sm:px-6 h-16 flex items-center justify-between">
          <button className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 z-[10000] transition-colors duration-150" onClick={toggleSidebar}>
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#1a3c5e]">Dashboard Warga</h1>
            <p className="text-xs text-gray-400">Selamat datang, {user?.nama}!</p>
          </div>
          <Badge variant="outline" className="text-xs">{user?.alamat}</Badge>
        </header>

        <motion.div initial="hidden" animate="visible" variants={stagger} className="p-4 sm:p-6 lg:p-8">
          {/* Summary Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))
              : [
                  { label: 'Pemasukan', value: dashboard ? formatRupiah(dashboard.totalIncome) : '-', icon: TrendingUp, gradient: 'from-emerald-500 to-green-600', badge: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Pengeluaran', value: dashboard ? formatRupiah(dashboard.totalExpense) : '-', icon: TrendingDown, gradient: 'from-red-500 to-rose-600', badge: 'bg-red-50 text-red-700' },
                  { label: 'Saldo Kas', value: dashboard ? formatRupiah(dashboard.balance) : '-', icon: DollarSign, gradient: 'from-[#1a3c5e] to-[#2e5a3e]', badge: 'bg-[#1a3c5e]/5 text-[#1a3c5e]' },
                  { label: 'Belum Bayar', value: String(unpaid.length), icon: AlertTriangle, gradient: 'from-amber-500 to-orange-600', badge: 'bg-amber-50 text-amber-700', action: true },
                ].map((c) => (
                  <motion.div key={c.label} variants={fadeIn}>
                    <Card className={`border-0 shadow-md hover:shadow-lg transition-shadow ${c.action ? 'cursor-pointer' : ''}`}
                      onClick={c.action ? () => setView('warga-bayar') : undefined}>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center`}>
                            <c.icon className="w-5 h-5 text-white" />
                          </div>
                          <Badge className={`${c.badge} border-0 text-[10px]`}>{c.label}</Badge>
                        </div>
                        <p className="text-xl font-bold text-gray-900">{c.value}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {c.action ? 'Bulan yang belum dibayar' : `Total ${c.label.toLowerCase()} RT`}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
          </div>

          {/* Chart + Unpaid */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Unpaid months */}
            <motion.div variants={fadeIn}>
              <Card className="border-0 shadow-md h-full">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2">
                    <ListChecks className="w-4 h-4" />Iuran Belum Dibayar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
                    </div>
                  ) : unpaid.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                        <ListChecks className="w-6 h-6 text-emerald-500" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">Semua iuran sudah lunas!</p>
                      <p className="text-xs text-gray-400 mt-1">Tidak ada tanggungan bulan ini</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {unpaid.map((u) => (
                        <div key={u.month} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{u.label}</p>
                            <p className="text-xs text-gray-500">{formatRupiah(u.nominal)}</p>
                          </div>
                          <button className="bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white font-bold text-xs px-3 py-1.5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30"
                            onClick={() => setView('warga-bayar')}>
                            Bayar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Line Chart */}
            <motion.div variants={fadeIn} className="lg:col-span-2">
              <Card className="border-0 shadow-md h-full">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />Tren Keuangan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-64 rounded-xl" />
                  ) : dashboard && dashboard.chartData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dashboard.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="month" tickFormatter={getMonthLabel} tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false}
                            tickFormatter={(v) => `${(v / 1e6).toFixed(1)}jt`} />
                          <Tooltip formatter={(v: number) => formatRupiah(v)} labelFormatter={(l: string) => getMonthLabel(l)}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                          <Line type="monotone" dataKey="income" stroke="#2e7d32" strokeWidth={2} dot={{ r: 4, fill: '#2e7d32' }} name="Pemasukan" />
                          <Line type="monotone" dataKey="expense" stroke="#c62828" strokeWidth={2} dot={{ r: 4, fill: '#c62828' }} name="Pengeluaran" />
                          <Line type="monotone" dataKey="balance" stroke="#1a3c5e" strokeWidth={2} dot={{ r: 3, fill: '#1a3c5e' }} strokeDasharray="5 5" name="Saldo" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <p className="text-sm text-gray-400">Belum ada data grafik</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recent Transactions */}
          <motion.div variants={fadeIn}>
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2">
                  <Receipt className="w-4 h-4" />Transaksi Terbaru
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-400">Belum ada transaksi</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-2 text-gray-500 font-medium text-xs">Tanggal</th>
                          <th className="text-left py-3 px-2 text-gray-500 font-medium text-xs">Deskripsi</th>
                          <th className="text-left py-3 px-2 text-gray-500 font-medium text-xs">Tipe</th>
                          <th className="text-right py-3 px-2 text-gray-500 font-medium text-xs">Nominal</th>
                          <th className="text-center py-3 px-2 text-gray-500 font-medium text-xs">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.slice(0, 5).map((t) => (
                          <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-2 text-gray-600 whitespace-nowrap">{formatDate(t.tanggal)}</td>
                            <td className="py-3 px-2 text-gray-800 font-medium max-w-[200px] truncate">{t.deskripsi}</td>
                            <td className="py-3 px-2">
                              <Badge className={t.type === 'income'
                                ? 'bg-emerald-50 text-emerald-700 border-0 text-[10px]'
                                : 'bg-red-50 text-red-700 border-0 text-[10px]'}>
                                {t.type === 'income' ? 'Masuk' : 'Keluar'}
                              </Badge>
                            </td>
                            <td className={`py-3 px-2 text-right font-semibold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {t.type === 'income' ? '+' : '-'}{formatRupiah(t.nominal)}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <Badge className={
                                t.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-0 text-[10px]' :
                                t.status === 'pending' ? 'bg-amber-50 text-amber-700 border-0 text-[10px]' :
                                'bg-red-50 text-red-700 border-0 text-[10px]'
                              }>
                                {t.status === 'approved' ? 'Disetujui' : t.status === 'pending' ? 'Pending' : 'Ditolak'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

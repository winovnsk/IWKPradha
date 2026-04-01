'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, LayoutDashboard, Users, ClipboardList, ShieldCheck,
  CalendarDays, Megaphone, Settings, Menu, LogOut, DollarSign,
  TrendingUp, TrendingDown, CircleDollarSign, FileText, RefreshCw,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Phone, Home, Scale, Wallet, Activity, ArrowUpRight, ArrowDownRight,
  Filter, X, Download, FileSpreadsheet, FileDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useAppStore, type Settings, parseBankAccounts } from '@/lib/store';
import { api } from '@/lib/api';

/* ═══════════════════════════════════════════════════════════ */
/*  HELPERS                                                    */
/* ═══════════════════════════════════════════════════════════ */
const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const getMonthLabel = (s: string) => { const m = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']; return m[parseInt(s.split('-')[1]) - 1] || s; };
const getMonthYearLabel = (s: string) => { const m = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']; const parts = s.split('-'); return `${m[parseInt(parts[1]) - 1]} ${parts[0]}`; };
const PIE_COLORS = ['#1a3c5e','#2e7d32','#f9a825','#c62828','#0277bd','#6a1b9a','#00695c','#e65100'];
const MONTH_NAMES_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const formatMonthYear = (ym: string) => { const [year, month] = ym.split('-'); return `${MONTH_NAMES_FULL[parseInt(month) - 1]} ${year}`; };

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

/* ═══════════════════════════════════════════════════════════ */
/*  TYPES                                                      */
/* ═══════════════════════════════════════════════════════════ */
interface DashboardData {
  totalIncome: number; totalExpense: number; balance: number;
  chartData: { month: string; income: number; expense: number; balance: number }[];
  categoryData: { name: string; value: number }[];
  userCount: number; totalTransactions: number;
}
interface Transaction { id: string; type: string; nominal: number; tanggal: string; status: string; deskripsi: string; }
interface WargaUnpaid {
  userId: string; nama: string; alamat: string; noHp: string; foto: string;
  nomorRumah: number; unpaidMonths: { month: string; label: string }[];
  unpaidCount: number; paidCurrentMonth: boolean;
}
interface UnpaidStats {
  totalWarga: number; paidThisMonth: number; unpaidThisMonth: number;
  paidPercent: number; unpaidPercent: number; fullyPaid: number; hasUnpaid: number;
  currentMonthLabel: string;
}

const adminMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', view: 'admin-dashboard' },
  { icon: Users, label: 'Kelola Warga', view: 'admin-users' },
  { icon: ClipboardList, label: 'Transaksi', view: 'admin-transaksi' },
  { icon: ShieldCheck, label: 'Validasi', view: 'admin-validasi' },
  { icon: CalendarDays, label: 'Kegiatan', view: 'admin-kegiatan' },
  { icon: Megaphone, label: 'Pengumuman', view: 'admin-pengumuman' },
  { icon: Settings, label: 'Pengaturan', view: 'admin-settings' },
];

/* ═══════════════════════════════════════════════════════════ */
/*  ADMIN DASHBOARD                                            */
/* ═══════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const { user, currentView, setView, logout, toggleSidebar, sidebarOpen, setToast, settings } = useAppStore();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unpaidWarga, setUnpaidWarga] = useState<WargaUnpaid[]>([]);
  const [unpaidStats, setUnpaidStats] = useState<UnpaidStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedWarga, setExpandedWarga] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Data fetching via refreshKey trigger
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        // Single combined API call (1 DB round-trip instead of 2)
        const res = await api.getLaporanData();
        if (!cancelled && res.success) {
          const d = res.data;
          setDashboard({
            totalIncome: d.totalIncome as number,
            totalExpense: d.totalExpense as number,
            balance: d.balance as number,
            chartData: d.chartData as DashboardData['chartData'],
            categoryData: d.categoryData as DashboardData['categoryData'],
            userCount: 0,
            totalTransactions: d.totalTransactions as number,
          });
          setTransactions((d.transactions || []) as Transaction[]);
        }
      } catch {
        if (!cancelled) setToast({ message: 'Gagal memuat data dashboard', type: 'error' });
      }
      try {
        const res = await apiFetch('/api/admin/unpaid-warga');
        if (!cancelled && res.success) {
          setUnpaidWarga(res.data.wargaList || []);
          setUnpaidStats(res.data.stats || null);
        }
      } catch { /* silent */ }
      if (!cancelled) setLoading(false);
    }

    loadData();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const handleRefresh = () => { setRefreshKey(k => k + 1); };

  const pendingCount = transactions.filter((t) => t.status === 'pending').length;
  const nominal = parseInt(settings.default_iwk_nominal) || 100000;

  const toggleExpand = (userId: string) => {
    setExpandedWarga(prev => prev === userId ? null : userId);
  };

  /* ═══════════════════════════════════════════════════════════ */
  /*  LAPORAN KEUANGAN COMPUTATION                             */
  /* ═══════════════════════════════════════════════════════════ */
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');

  const approvedTx = useMemo(() => transactions.filter(t => t.status === 'approved'), [transactions]);

  const filteredTx = useMemo(() => {
    if (!startMonth && !endMonth) return approvedTx;
    return approvedTx.filter(t => {
      const m = t.tanggal.substring(0, 7);
      if (startMonth && m < startMonth) return false;
      if (endMonth && m > endMonth) return false;
      return true;
    });
  }, [approvedTx, startMonth, endMonth]);

  const filterLabel = useMemo(() => {
    if (startMonth && endMonth) return `${formatMonthYear(startMonth)} — ${formatMonthYear(endMonth)}`;
    if (startMonth) return `${formatMonthYear(startMonth)} — Sekarang`;
    if (endMonth) return `Awal — ${formatMonthYear(endMonth)}`;
    return '';
  }, [startMonth, endMonth]);

  const filteredIncome = useMemo(() => filteredTx.filter(t => t.type === 'income').reduce((s, t) => s + t.nominal, 0), [filteredTx]);
  const filteredExpense = useMemo(() => filteredTx.filter(t => t.type !== 'income').reduce((s, t) => s + t.nominal, 0), [filteredTx]);

  const saldoAwalSeed = Number(settings.saldo_awal) || 0;
  const computedSaldoAwal = useMemo(() => {
    if (!startMonth) return saldoAwalSeed;
    let inc = 0, exp = 0;
    approvedTx.forEach(t => { const m = t.tanggal.substring(0, 7); if (m < startMonth) { if (t.type === 'income') inc += t.nominal; else exp += t.nominal; } });
    return saldoAwalSeed + inc - exp;
  }, [approvedTx, startMonth, saldoAwalSeed]);

  const saldoAwalLabel = useMemo(() => {
    if (!startMonth) return 'Saldo Awal Pertama Kali';
    let lastMonth = '';
    approvedTx.forEach(t => { const m = t.tanggal.substring(0, 7); if (m < startMonth && (!lastMonth || m > lastMonth)) lastMonth = m; });
    return lastMonth ? `Saldo Akhir ${formatMonthYear(lastMonth)}` : 'Saldo Awal Pertama Kali';
  }, [approvedTx, startMonth]);

  const cashFlowData = useMemo(() => {
    const eStart = startMonth || (filteredTx.length > 0 ? filteredTx[0].tanggal.substring(0, 7) : '');
    const eEnd = endMonth || (filteredTx.length > 0 ? filteredTx[filteredTx.length - 1].tanggal.substring(0, 7) : '');
    if (!eStart || !eEnd) return [];
    const months: string[] = [];
    const [sy, sm] = eStart.split('-').map(Number); const [ey, em] = eEnd.split('-').map(Number);
    let curY = sy, curM = sm;
    while (curY < ey || (curY === ey && curM <= em)) { months.push(`${curY}-${String(curM).padStart(2, '0')}`); curM++; if (curM > 12) { curM = 1; curY++; } }
    const txMap: Record<string, { income: number; expense: number }> = {};
    filteredTx.forEach(t => { const m = t.tanggal.substring(0, 7); if (!txMap[m]) txMap[m] = { income: 0, expense: 0 }; if (t.type === 'income') txMap[m].income += t.nominal; else txMap[m].expense += t.nominal; });
    let running = computedSaldoAwal;
    return months.map(month => { const d = txMap[month] || { income: 0, expense: 0 }; const prev = running; running += d.income - d.expense; return { bulan: month, label: formatMonthYear(month), saldoAwal: prev, pemasukan: d.income, pengeluaran: d.expense, net: d.income - d.expense, saldoAkhir: running }; });
  }, [filteredTx, startMonth, endMonth, computedSaldoAwal]);

  const neracaAkhir = cashFlowData.length > 0 ? cashFlowData[cashFlowData.length - 1].saldoAkhir : computedSaldoAwal;

  const handleExport = (fmt: 'pdf' | 'excel' | 'csv') => {
    if (filteredTx.length === 0) return;
    const params = new URLSearchParams({ format: fmt });
    if (startMonth) params.set('startMonth', startMonth);
    if (endMonth) params.set('endMonth', endMonth);
    if (user?.nama) params.set('printedBy', user.nama);
    window.open(`/api/report/export?${params.toString()}`, '_blank');
  };

  const now = new Date();
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  /** Calculate max end month: startMonth + 11 months (total 12 months range) */
  const getMaxEndMonth = (sm: string) => {
    if (!sm) return '';
    const [sy, smm] = sm.split('-').map(Number);
    let my = sy, mm = smm + 11;
    if (mm > 12) { mm -= 12; my++; }
    return `${my}-${String(mm).padStart(2, '0')}`;
  };
  const maxEndMonth = startMonth ? getMaxEndMonth(startMonth) : '';

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-[#0f1a2e] text-white transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] flex items-center justify-center"><Building2 className="w-5 h-5 text-white" /></div>
          <div><p className="text-sm font-bold">{settings.app_name || 'Admin Panel'}</p><p className="text-[10px] text-white/40">{settings.alamat_rt || 'RT 11 Pradha Ciganitri'}</p></div>
        </div>
        <nav className="p-4 space-y-1 sidebar-scroll overflow-y-auto max-h-[calc(100vh-10rem)]">
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

      {/* Main Content */}
      <main className="lg:ml-64">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b px-4 sm:px-6 h-16 flex items-center justify-between">
          <button className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 z-[10000] transition-colors duration-150" onClick={toggleSidebar}><Menu className="w-5 h-5" /></button>
          <div><h1 className="text-lg font-bold text-[#1a3c5e]">Admin Dashboard</h1><p className="text-xs text-gray-400">Panel pengelolaan RT 11</p></div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && <Badge className="bg-amber-50 text-amber-700 border-0 text-xs">{pendingCount} pending</Badge>}
            <button className="text-gray-600 hover:text-[#1a3c5e] hover:bg-gray-100 active:bg-gray-200 font-medium px-2 py-1.5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={handleRefresh}><RefreshCw className="w-4 h-4" /></button>
            <Badge className="bg-red-500/20 text-red-600 border-0 text-xs">Admin</Badge>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* ═══════════════════════════════════════════════ */}
          {/*  SUMMARY CARDS                                   */}
          {/* ═══════════════════════════════════════════════ */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
            ) : (
              <>
                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow"><CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a3c5e] to-[#2e5a3e] flex items-center justify-center"><DollarSign className="w-5 h-5 text-white" /></div></div>
                  <p className="text-2xl font-bold">{dashboard ? formatRupiah(dashboard.balance) : '-'}</p><p className="text-xs text-gray-400 mt-1">Saldo Kas</p>
                </CardContent></Card>
                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow"><CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-white" /></div></div>
                  <p className="text-2xl font-bold">{dashboard ? formatRupiah(dashboard.totalIncome) : '-'}</p><p className="text-xs text-gray-400 mt-1">Total Pemasukan</p>
                </CardContent></Card>
                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow"><CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center"><TrendingDown className="w-5 h-5 text-white" /></div></div>
                  <p className="text-2xl font-bold">{dashboard ? formatRupiah(dashboard.totalExpense) : '-'}</p><p className="text-xs text-gray-400 mt-1">Total Pengeluaran</p>
                </CardContent></Card>
                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setView('admin-users')}><CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f9a825] to-orange-500 flex items-center justify-center"><Users className="w-5 h-5 text-white" /></div></div>
                  <p className="text-2xl font-bold">{dashboard?.userCount || 0}</p><p className="text-xs text-gray-400 mt-1">Warga Terdaftar</p>
                </CardContent></Card>
              </>
            )}
          </div>

          {/* ═══════════════════════════════════════════════ */}
          {/*  KEPEPATAN PEMBAYARAN IURAN (Percentage)        */}
          {/* ═══════════════════════════════════════════════ */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Kepatuhan Pembayaran Iuran
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !unpaidStats ? (
                <Skeleton className="h-36 rounded-xl" />
              ) : (
                <div>
                  {/* Current month label */}
                  <p className="text-xs text-gray-400 mb-4">
                    Periode: <span className="font-semibold text-gray-600">{unpaidStats.currentMonthLabel}</span>
                  </p>

                  <div className="grid sm:grid-cols-3 gap-4 mb-5">
                    {/* Percentage Ring - Paid */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-emerald-50/80 border border-emerald-100">
                      <div className="relative w-20 h-20 mb-2">
                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                          <circle cx="40" cy="40" r="34" fill="none" stroke="#2e7d32" strokeWidth="6" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 34}`}
                            strokeDashoffset={`${2 * Math.PI * 34 * (1 - unpaidStats.paidPercent / 100)}`}
                            className="transition-all duration-700"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold text-[#2e7d32]">{unpaidStats.paidPercent}%</span>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-emerald-700">Sudah Bayar</p>
                      <p className="text-[11px] text-emerald-600/70">{unpaidStats.paidThisMonth} dari {unpaidStats.totalWarga} warga</p>
                    </div>

                    {/* Percentage Ring - Unpaid */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-red-50/80 border border-red-100">
                      <div className="relative w-20 h-20 mb-2">
                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                          <circle cx="40" cy="40" r="34" fill="none" stroke="#c62828" strokeWidth="6" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 34}`}
                            strokeDashoffset={`${2 * Math.PI * 34 * (1 - unpaidStats.unpaidPercent / 100)}`}
                            className="transition-all duration-700"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold text-[#c62828]">{unpaidStats.unpaidPercent}%</span>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-red-700">Belum Bayar</p>
                      <p className="text-[11px] text-red-600/70">{unpaidStats.unpaidThisMonth} dari {unpaidStats.totalWarga} warga</p>
                    </div>

                    {/* Stats Summary */}
                    <div className="flex flex-col justify-center p-4 rounded-xl bg-[#1a3c5e]/5 border border-[#1a3c5e]/10">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span className="text-xs text-gray-600">Lunas semua bulan</span>
                          </div>
                          <span className="text-sm font-bold text-emerald-700">{unpaidStats.fullyPaid}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            <span className="text-xs text-gray-600">Ada tanggungan</span>
                          </div>
                          <span className="text-sm font-bold text-amber-700">{unpaidStats.hasUnpaid}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                          <span className="text-xs font-semibold text-gray-700">Total warga aktif</span>
                          <span className="text-sm font-bold text-[#1a3c5e]">{unpaidStats.totalWarga}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#2e7d32] to-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: `${unpaidStats.paidPercent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-gray-600 mix-blend-multiply">
                        {unpaidStats.paidThisMonth}/{unpaidStats.totalWarga} warga sudah bayar
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ═══════════════════════════════════════════════ */}
          {/*  CHARTS                                           */}
          {/* ═══════════════════════════════════════════════ */}
          <div className="grid lg:grid-cols-5 gap-6">
            <Card className="border-0 shadow-md lg:col-span-3"><CardHeader><CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2"><TrendingUp className="w-4 h-4" />Pemasukan vs Pengeluaran{filterLabel && <Badge className="bg-amber-50 text-amber-700 border-0 text-[10px]">{filterLabel}</Badge>}</CardTitle></CardHeader><CardContent>
              {loading ? <Skeleton className="h-72" /> : dashboard ? (
                <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={dashboard.chartData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="month" tickFormatter={getMonthYearLabel} tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" height={55} /><YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}jt`} /><Tooltip formatter={(v: number) => formatRupiah(v)} labelFormatter={(l: string) => getMonthYearLabel(l)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} /><Bar dataKey="income" fill="#2e7d32" radius={[6,6,0,0]} name="Pemasukan" barSize={20} /><Bar dataKey="expense" fill="#c62828" radius={[6,6,0,0]} name="Pengeluaran" barSize={20} /></BarChart></ResponsiveContainer></div>
              ) : <div className="h-72 flex items-center justify-center text-gray-400">Belum ada data keuangan</div>}
            </CardContent></Card>
            <Card className="border-0 shadow-md lg:col-span-2"><CardHeader><CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2"><CircleDollarSign className="w-4 h-4" />Distribusi Pengeluaran{filterLabel && <Badge className="bg-amber-50 text-amber-700 border-0 text-[10px]">{filterLabel}</Badge>}</CardTitle></CardHeader><CardContent>
              {loading ? <Skeleton className="h-72" /> : dashboard?.categoryData?.length ? (
                <div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dashboard.categoryData} cx="50%" cy="45%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">{dashboard.categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip formatter={(v: number) => formatRupiah(v)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} /><Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={(v: string) => <span className="text-xs text-gray-600">{v}</span>} /></PieChart></ResponsiveContainer></div>
              ) : <div className="h-72 flex items-center justify-center text-gray-400">Belum ada data</div>}
            </CardContent></Card>
          </div>

          {/* ═══════════════════════════════════════════════ */}
          {/*  LAPORAN KEUANGAN                                */}
          {/* ═══════════════════════════════════════════════ */}
          <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
            {/* Filter & Export */}
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Filter className="w-4 h-4 text-[#1a3c5e]" />
                      Filter Rentang Bulan
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 bg-white min-w-[170px]">
                        <CalendarDays className="w-4 h-4 text-[#1a3c5e] flex-shrink-0" />
                        <select value={startMonth || ''} onChange={(e) => { setStartMonth(e.target.value); if (!e.target.value) { setEndMonth(''); return; } const nm = getMaxEndMonth(e.target.value); if (endMonth && endMonth > nm) setEndMonth(nm); else if (endMonth && endMonth < e.target.value) setEndMonth(e.target.value); }}
                          className="text-sm bg-transparent border-0 focus:outline-none focus:ring-0 p-0 text-gray-800 cursor-pointer">
                          <option value="">Bulan Awal</option>
                          {years.map(y => (<optgroup key={y} label={String(y)}>{MONTH_NAMES_FULL.map((m, i) => { const val = `${y}-${String(i + 1).padStart(2, '0')}`; const md = new Date(y, i + 1, 0); if (md > now) return null; return <option key={val} value={val}>{m} {y}</option>; })}</optgroup>))}
                        </select>
                      </div>
                      <span className="text-gray-400 text-sm font-medium">—</span>
                      <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 bg-white min-w-[170px]">
                        <CalendarDays className="w-4 h-4 text-[#1a3c5e] flex-shrink-0" />
                        <select value={endMonth || ''} onChange={(e) => setEndMonth(e.target.value)}
                          className="text-sm bg-transparent border-0 focus:outline-none focus:ring-0 p-0 text-gray-800 cursor-pointer">
                          <option value="">Bulan Akhir</option>
                          {years.map(y => (<optgroup key={y} label={String(y)}>{MONTH_NAMES_FULL.map((m, i) => { const val = `${y}-${String(i + 1).padStart(2, '0')}`; if (startMonth && val < startMonth) return null; if (maxEndMonth && val > maxEndMonth) return null; const md = new Date(y, i + 1, 0); if (md > now) return null; return <option key={val} value={val}>{m} {y}</option>; })}</optgroup>))}
                        </select>
                      </div>
                      {(startMonth || endMonth) && <button onClick={() => { setStartMonth(''); setEndMonth(''); }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" />Reset</button>}
                      {startMonth && endMonth && <span className="text-[10px] text-gray-400">Maks. 12 bulan</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 mr-1">Download:</span>
                    <button onClick={() => handleExport('pdf')} disabled={filteredTx.length === 0} className="flex items-center gap-1.5 text-xs border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"><FileDown className="w-3 h-3" />PDF</button>
                    <button onClick={() => handleExport('excel')} disabled={filteredTx.length === 0} className="flex items-center gap-1.5 text-xs border border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"><FileSpreadsheet className="w-3 h-3" />Excel</button>
                    <button onClick={() => handleExport('csv')} disabled={filteredTx.length === 0} className="flex items-center gap-1.5 text-xs border border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"><FileText className="w-3 h-3" />CSV</button>
                  </div>
                </div>
                {(startMonth || endMonth) && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                    <Badge variant="secondary" className="bg-[#1a3c5e]/5 text-[#1a3c5e] border-0 text-xs gap-1"><CalendarDays className="w-3 h-3" />{filterLabel}</Badge>
                    <span className="text-xs text-gray-500">Menampilkan {filteredTx.length} dari {approvedTx.length} transaksi</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* NERACA SALDO */}
            <motion.div variants={fadeIn}>
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-[#1a3c5e] to-[#2e5a3e] px-5 py-3.5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center"><Scale className="w-4 h-4 text-white" /></div>
                  <div><h3 className="text-sm font-bold text-white">NERACA SALDO</h3><p className="text-[10px] text-white/60">{filterLabel || 'Seluruh Periode'}</p></div>
                  <div className="ml-auto"><Badge className="bg-white/15 text-white border-0 text-[10px]">{cashFlowData.length} bulan</Badge></div>
                </div>
                <CardContent className="p-0">
                  <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                    <div className="p-4 lg:p-5 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-[#1a3c5e]" /><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">{saldoAwalLabel}</span></div>
                      <p className="text-lg font-bold text-[#1a3c5e]">{formatRupiah(computedSaldoAwal)}</p>
                    </div>
                    <div className="p-4 lg:p-5 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5"><ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" /><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">(+) Pendapatan</span></div>
                      <p className="text-lg font-bold text-emerald-700">{formatRupiah(filteredIncome)}</p>
                    </div>
                    <div className="p-4 lg:p-5 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5"><ArrowDownRight className="w-3.5 h-3.5 text-red-500" /><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">(-) Pengeluaran</span></div>
                      <p className="text-lg font-bold text-red-600">{formatRupiah(filteredExpense)}</p>
                    </div>
                    <div className={`p-4 lg:p-5 flex flex-col gap-1.5 ${neracaAkhir >= 0 ? 'bg-emerald-50/50' : 'bg-red-50/50'}`}>
                      <div className="flex items-center gap-1.5"><DollarSign className={`w-3.5 h-3.5 ${neracaAkhir >= 0 ? 'text-emerald-600' : 'text-red-500'}`} /><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">SALDO AKHIR</span></div>
                      <p className={`text-lg font-bold ${neracaAkhir >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatRupiah(neracaAkhir)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ARUS KAS BULANAN */}
            <motion.div variants={fadeIn}>
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-[#1a3c5e] to-[#0f1a2e] px-5 py-3.5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center"><Activity className="w-4 h-4 text-white" /></div>
                  <div><h3 className="text-sm font-bold text-white">ARUS KAS BULANAN</h3><p className="text-[10px] text-white/60">{filterLabel || 'Seluruh Periode'}</p></div>
                </div>
                <CardContent className="p-0">
                  {cashFlowData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500 w-[100px]">Bulan</th>
                          <th className="text-right px-3 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Saldo Awal</th>
                          <th className="text-right px-3 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Pemasukan</th>
                          <th className="text-right px-3 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Pengeluaran</th>
                          <th className="text-right px-3 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Net</th>
                          <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Saldo Akhir</th>
                        </tr></thead>
                        <tbody>
                          {cashFlowData.map((row, idx) => (
                            <tr key={row.bulan} className={`border-b border-gray-50 transition-colors hover:bg-gray-50/50 ${idx === cashFlowData.length - 1 ? 'bg-gray-50/80' : ''}`}>
                              <td className="px-4 py-3 font-semibold text-[#1a3c5e] whitespace-nowrap">{row.label}</td>
                              <td className="text-right px-3 py-3 text-gray-600 tabular-nums">{formatRupiah(row.saldoAwal)}</td>
                              <td className="text-right px-3 py-3 text-emerald-700 tabular-nums">{row.pemasukan > 0 ? `+${formatRupiah(row.pemasukan)}` : '-'}</td>
                              <td className="text-right px-3 py-3 text-red-600 tabular-nums">{row.pengeluaran > 0 ? `-${formatRupiah(row.pengeluaran)}` : '-'}</td>
                              <td className={`text-right px-3 py-3 font-semibold tabular-nums ${row.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{row.net >= 0 ? '+' : ''}{formatRupiah(row.net)}</td>
                              <td className={`text-right px-4 py-3 font-bold tabular-nums ${row.saldoAkhir >= 0 ? 'text-[#1a3c5e]' : 'text-red-600'}`}>{formatRupiah(row.saldoAkhir)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot><tr className="border-t-2 border-[#1a3c5e]/20 bg-[#1a3c5e]/5">
                          <td className="px-4 py-3 font-bold text-[#1a3c5e]">TOTAL</td>
                          <td className="text-right px-3 py-3 text-gray-500 text-xs">—</td>
                          <td className="text-right px-3 py-3 font-semibold text-emerald-700 tabular-nums">{formatRupiah(filteredIncome)}</td>
                          <td className="text-right px-3 py-3 font-semibold text-red-600 tabular-nums">{formatRupiah(filteredExpense)}</td>
                          <td className={`text-right px-3 py-3 font-bold tabular-nums ${filteredIncome - filteredExpense >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{filteredIncome - filteredExpense >= 0 ? '+' : ''}{formatRupiah(filteredIncome - filteredExpense)}</td>
                          <td className={`text-right px-4 py-3 font-bold tabular-nums ${neracaAkhir >= 0 ? 'text-[#1a3c5e]' : 'text-red-600'}`}>{formatRupiah(neracaAkhir)}</td>
                        </tr></tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-400"><Activity className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Belum ada data arus kas</p></div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* ═══════════════════════════════════════════════ */}
          {/*  WARGA BELUM BAYAR (Sorted by Nomor Rumah)      */}
          {/* ═══════════════════════════════════════════════ */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Warga Belum Bayar Iuran
                </CardTitle>
                {!loading && (
                  <Badge className="bg-amber-50 text-amber-700 border-0 text-[10px]">
                    {unpaidWarga.filter(w => w.unpaidCount > 0).length} warga
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
              ) : unpaidWarga.filter(w => w.unpaidCount > 0).length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-600">Semua warga sudah lunas!</p>
                  <p className="text-xs text-gray-400 mt-1">Tidak ada tanggungan iuran bulan ini</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {unpaidWarga
                    .filter(w => w.unpaidCount > 0)
                    .map((w, idx) => {
                      const isExpanded = expandedWarga === w.userId;
                      const severityColor = w.unpaidCount >= 3 ? 'bg-red-50 border-red-100' : w.unpaidCount >= 2 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100';
                      const dotColor = w.unpaidCount >= 3 ? 'bg-red-500' : w.unpaidCount >= 2 ? 'bg-amber-500' : 'bg-yellow-400';
                      const badgeColor = w.unpaidCount >= 3 ? 'bg-red-100 text-red-700' : w.unpaidCount >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700';

                      return (
                        <motion.div
                          key={w.userId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                        >
                          {/* Main row */}
                          <button
                            onClick={() => toggleExpand(w.userId)}
                            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${severityColor} ${isExpanded ? 'ring-1 ring-[#1a3c5e]/20' : 'hover:shadow-sm'}`}
                          >
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                              {w.foto ? (
                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                  <img src={w.foto} alt={w.nama} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                  {w.nama?.[0] || 'W'}
                                </div>
                              )}
                              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${dotColor}`} />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-semibold text-gray-800 truncate">{w.nama}</span>
                                <Badge className={`${badgeColor} border-0 text-[10px] px-1.5 py-0`}>
                                  {w.unpaidCount} bulan
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Home className="w-3 h-3" />
                                <span className="truncate">{w.alamat || 'Alamat tidak tersedia'}</span>
                              </div>
                            </div>

                            {/* Expand icon */}
                            <div className="flex-shrink-0">
                              {isExpanded
                                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                : <ChevronDown className="w-4 h-4 text-gray-400" />
                              }
                            </div>
                          </button>

                          {/* Expanded: unpaid months detail */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="ml-13 mr-2 mb-2 mt-1.5 p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                                  <p className="text-[11px] text-gray-400 mb-2 font-medium uppercase tracking-wider">Bulan yang belum dibayar:</p>
                                  <div className="flex flex-wrap gap-1.5 mb-3">
                                    {w.unpaidMonths.map((m) => (
                                      <span key={m.month} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-100 text-xs font-medium text-red-700">
                                        <CalendarDays className="w-3 h-3 text-red-400" />
                                        {m.label}
                                      </span>
                                    ))}
                                  </div>

                                  {/* Total nominal */}
                                  <div className="p-2.5 rounded-lg bg-gray-50 mb-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-500">Total tagihan ({w.unpaidMonths.length} bulan)</span>
                                      <span className="text-sm font-bold text-red-600">{formatRupiah(w.unpaidMonths.length * nominal)}</span>
                                    </div>
                                  </div>

                                  {/* Contact + WhatsApp */}
                                  {w.noHp && (
                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                      <Phone className="w-3 h-3 text-gray-400" />
                                      <span className="text-xs text-gray-500">{w.noHp}</span>
                                      <a
                                        href={buildWaReminderUrl(w, settings)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-semibold text-white bg-[#25D366] hover:bg-[#1ebe57] px-3 py-1.5 rounded-lg transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                        Kirim Pengingat WA
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ═══════════════════════════════════════════════ */}
          {/*  QUICK STATS                                      */}
          {/* ═══════════════════════════════════════════════ */}
          <div className="grid sm:grid-cols-3 gap-6">
            <Card className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setView('admin-users')}><CardContent className="p-5 text-center"><Users className="w-8 h-8 text-[#1a3c5e] mx-auto mb-3" /><p className="font-bold text-[#1a3c5e] text-xl">{dashboard?.userCount || 0}</p><p className="text-xs text-gray-500">Total Warga</p></CardContent></Card>
            <Card className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setView('admin-transaksi')}><CardContent className="p-5 text-center"><FileText className="w-8 h-8 text-[#1a3c5e] mx-auto mb-3" /><p className="font-bold text-[#1a3c5e] text-xl">{dashboard?.totalTransactions || 0}</p><p className="text-xs text-gray-500">Total Transaksi</p></CardContent></Card>
            <Card className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setView('admin-validasi')}><CardContent className="p-5 text-center"><ClipboardList className="w-8 h-8 text-amber-500 mx-auto mb-3" /><p className="font-bold text-amber-600 text-xl">{pendingCount}</p><p className="text-xs text-gray-500">Menunggu Validasi</p></CardContent></Card>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  HELPERS (module-level)                                    */
/* ═══════════════════════════════════════════════════════════ */
async function apiFetch(url: string) {
  const res = await fetch(url);
  return res.json();
}

/**
 * Build WhatsApp reminder URL with Islamic greeting, unpaid months,
 * bank accounts, website link, and a polite closing.
 */
function buildWaReminderUrl(warga: WargaUnpaid, s: Settings): string {
  const nominal = parseInt(s.default_iwk_nominal) || 100000;
  const total = warga.unpaidMonths.length * nominal;
  const months = warga.unpaidMonths.map(m => `• ${m.label}`).join('\n');
  const rtName = s.alamat_rt || 'RT 11 Komplek Pradha Ciganitri';
  const website = s.link_website || '';

  const banks: string[] = [];
  const bankAccounts = parseBankAccounts(s.bank_accounts);
  for (const ba of bankAccounts) {
    banks.push(`🏦 ${ba.bank}: ${ba.noRekening} a.n. ${ba.atasNama}`);
  }
  // Fallback to old keys if no dynamic banks
  if (banks.length === 0) {
    if (s.bank_bca_no) banks.push(`🏦 BCA: ${s.bank_bca_no} a.n. ${s.bank_bca_name || 'IWK RT 11'}`);
    if (s.bank_bni_no) banks.push(`🏦 BNI: ${s.bank_bni_no} a.n. ${s.bank_bni_name || 'IWK RT 11'}`);
  }
  const bankList = banks.length > 0 ? banks.join('\n') : '(Hubungi bendahara untuk info rekening)';

  const message = [
    `Assalamu'alaikum Warahmatullahi Wabarakatuh, Bapak/Ibu ${warga.nama} yang kami hormati. 🤲`,
    '',
    `Semoga Bapak/Ibu beserta keluarga selalu diberikan kesehatan, keberkahan, dan kemudahan dalam segala urusan. Aamiin.`,
    '',
    `Kami dari Pengurus ${rtName} ingin mengingatkan kembali mengenai iuran wajib bulanan yang belum terbayarkan, yaitu:`,
    '',
    months,
    '',
    `💰 Total tagihan: *${formatRupiah(total)}*`,
    '',
    `Untuk proses pembayaran, silakan transfer ke rekening berikut:`,
    '',
    bankList,
    '',
    website ? `📱 Atau lakukan pembayaran melalui website resmi kami: ${website}` : '',
    '',
    `Setelah melakukan pembayaran, mohon untuk mengirimkan bukti transfer agar dapat kami verifikasi segera.`,
    '',
    `Kami mengucapkan terima kasih yang sebesar-besarnya atas partisipasi dan kesediaan Bapak/Ibu dalam menunaikan iuran wajib ini. Iuran yang terkumpul insya Allah akan kami kelola sebaik-baiknya untuk kemakmuran dan kenyamanan bersama di lingkungan ${rtName}. 🏘️`,
    '',
    `Jazakumullahu Khairan atas perhatian dan kerjasamanya. Apabila ada pertanyaan, jangan ragu untuk menghubungi kami.`,
    '',
    `Wassalamu'alaikum Warahmatullahi Wabarakatuh. 🙏`,
    '',
    `— Pengurus ${rtName} —`,
  ].filter(Boolean).join('\n');

  const phone = warga.noHp.replace(/^0/, '62').replace(/^\+?62/, '62');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Menu, LogOut, LayoutDashboard, Receipt, FileText,
  CalendarDays, Bell, BarChart3, UserCircle,
  TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon,
  Download, FileSpreadsheet, FileDown, Filter, X, ChevronDown,
  Wallet, Activity, ArrowUpRight, ArrowDownRight, Scale,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore, type ViewType } from '@/lib/store';
import { api } from '@/lib/api';
import { getCategoryLabel } from '@/lib/categories';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
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
interface SidebarItem { icon: typeof LayoutDashboard; label: string; view: ViewType; }

/* ═══════════════════════════════════════════════════════════ */
/*  HELPERS                                                    */
/* ═══════════════════════════════════════════════════════════ */
const MONTH_NAMES_FULL = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const formatDate = (s: string) => {
  const d = new Date(s);
  return `${d.getDate()} ${MONTH_NAMES_FULL[d.getMonth()]} ${d.getFullYear()}`;
};

const getMonthLabel = (s: string) => {
  const m = parseInt(s.split('-')[1]) - 1;
  return MONTH_SHORT[m] || s;
};

const getMonthYearLabel = (s: string) => {
  const parts = s.split('-');
  const m = parseInt(parts[1]) - 1;
  return `${MONTH_SHORT[m]} ${parts[0]}`;
};

/** Format "2026-03" → "Maret 2026" */
const formatMonthYear = (ym: string) => {
  const [year, month] = ym.split('-');
  return `${MONTH_NAMES_FULL[parseInt(month) - 1]} ${year}`;
};

const PIE_COLORS = ['#1a3c5e','#2e7d32','#f9a825','#c62828','#0277bd','#6a1b9a','#00695c','#e65100'];

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

const statusConfig: Record<string, { label: string; cls: string }> = {
  approved: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-700 border-0' },
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-0' },
  rejected: { label: 'Ditolak', cls: 'bg-red-50 text-red-700 border-0' },
};

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
/*  MONTH RANGE PICKER COMPONENT                                */
/* ═══════════════════════════════════════════════════════════ */
function MonthRangePicker({
  startMonth, endMonth, onStartChange, onEndChange, onClear,
}: {
  startMonth: string;   // "YYYY-MM"
  endMonth: string;
  onStartChange: (val: string) => void;
  onEndChange: (val: string) => void;
  onClear: () => void;
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  /** Calculate max end month: startMonth + 11 months (total 12 months range) */
  const getMaxEndMonth = (sm: string) => {
    if (!sm) return '';
    const [sy, smm] = sm.split('-').map(Number);
    let my = sy, mm = smm + 11;
    if (mm > 12) { mm -= 12; my++; }
    return `${my}-${String(mm).padStart(2, '0')}`;
  };

  const maxEnd = startMonth ? getMaxEndMonth(startMonth) : '';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Start Month */}
      <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 bg-white min-w-[180px]">
        <CalendarDays className="w-4 h-4 text-[#1a3c5e] flex-shrink-0" />
        <select
          value={startMonth || ''}
          onChange={(e) => {
            onStartChange(e.target.value);
            if (!e.target.value) { onEndChange(''); return; }
            // Auto-adjust: clamp end month to max 12 months from new start
            const newMax = getMaxEndMonth(e.target.value);
            if (endMonth && endMonth > newMax) onEndChange(newMax);
            // Also adjust if end month is before start month
            else if (endMonth && endMonth < e.target.value) onEndChange(e.target.value);
          }}
          className="text-sm bg-transparent border-0 focus:outline-none focus:ring-0 p-0 text-gray-800 cursor-pointer"
        >
          <option value="">Bulan Awal</option>
          {years.map(y => (
            <optgroup key={y} label={String(y)}>
              {MONTH_NAMES_FULL.map((m, i) => {
                const val = `${y}-${String(i + 1).padStart(2, '0')}`;
                // Don't show future months
                const monthDate = new Date(y, i + 1, 0);
                if (monthDate > now) return null;
                return <option key={val} value={val}>{m} {y}</option>;
              })}
            </optgroup>
          ))}
        </select>
      </div>

      <span className="text-gray-400 text-sm font-medium">—</span>

      {/* End Month */}
      <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 bg-white min-w-[180px]">
        <CalendarDays className="w-4 h-4 text-[#1a3c5e] flex-shrink-0" />
        <select
          value={endMonth || ''}
          onChange={(e) => onEndChange(e.target.value)}
          className="text-sm bg-transparent border-0 focus:outline-none focus:ring-0 p-0 text-gray-800 cursor-pointer"
        >
          <option value="">Bulan Akhir</option>
          {years.map(y => (
            <optgroup key={y} label={String(y)}>
              {MONTH_NAMES_FULL.map((m, i) => {
                const val = `${y}-${String(i + 1).padStart(2, '0')}`;
                // Don't show months before startMonth
                if (startMonth && val < startMonth) return null;
                // Max 12 months range
                if (maxEnd && val > maxEnd) return null;
                // Don't show future months
                const monthDate = new Date(y, i + 1, 0);
                if (monthDate > now) return null;
                return <option key={val} value={val}>{m} {y}</option>;
              })}
            </optgroup>
          ))}
        </select>
      </div>

      {(startMonth || endMonth) && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Reset
        </button>
      )}

      {startMonth && endMonth && (
        <span className="text-[10px] text-gray-400">Maks. 12 bulan</span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  WARGA LAPORAN                                             */
/* ═══════════════════════════════════════════════════════════ */
export default function WargaLaporan() {
  const { user, currentView, setView, logout, sidebarOpen, toggleSidebar, settings } = useAppStore();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Month range filter (YYYY-MM format)
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');

  // Fetch data — single combined API call (1 DB round-trip instead of 2)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.getLaporanData();
        if (res.success) {
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
      } catch (err) {
        console.error('Fetch laporan error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const isFiltered = !!(startMonth || endMonth);

  // Filter transactions by month range
  const filteredTransactions = useMemo(() => {
    if (!startMonth && !endMonth) return transactions;
    return transactions.filter((t) => {
      const tMonth = t.tanggal.substring(0, 7); // "YYYY-MM"
      if (startMonth && tMonth < startMonth) return false;
      if (endMonth && tMonth > endMonth) return false;
      return true;
    });
  }, [startMonth, endMonth, transactions]);

  // Computed filtered summary
  const filteredSummary = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.income += t.nominal;
        else acc.expense += t.nominal;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [filteredTransactions]);

  // Clear month filter
  const handleClearFilter = () => {
    setStartMonth('');
    setEndMonth('');
  };

  // Export handler — opens server-side API in new tab
  const handleExport = (exportFormat: 'pdf' | 'excel' | 'csv') => {
    if (filteredTransactions.length === 0) return;
    const params = new URLSearchParams({ format: exportFormat });
    if (startMonth) params.set('startMonth', startMonth);
    if (endMonth) params.set('endMonth', endMonth);
    if (user?.nama) params.set('printedBy', user.nama);
    const url = `/api/report/export?${params.toString()}`;
    window.open(url, '_blank');
  };

  // Computed chart data for filtered range
  const filteredChartData = useMemo(() => {
    const monthlyMap: Record<string, { income: number; expense: number }> = {};
    filteredTransactions.forEach(t => {
      const month = t.tanggal.substring(0, 7);
      if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expense: 0 };
      if (t.type === 'income') monthlyMap[month].income += t.nominal;
      else monthlyMap[month].expense += t.nominal;
    });
    return Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        balance: data.income - data.expense,
      }));
  }, [filteredTransactions]);

  const filteredCategoryData = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.type === 'expense') {
        const name = getCategoryLabel(t.categoryId);
        categoryMap[name] = (categoryMap[name] || 0) + t.nominal;
      }
    });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  // Filter label for display
  const filterLabel = useMemo(() => {
    if (startMonth && endMonth) return `${formatMonthYear(startMonth)} — ${formatMonthYear(endMonth)}`;
    if (startMonth) return `${formatMonthYear(startMonth)} — Sekarang`;
    if (endMonth) return `Awal — ${formatMonthYear(endMonth)}`;
    return '';
  }, [startMonth, endMonth]);

  // ═══════════════════════════════════════════════════════════
  //  NERACA & ARUS KAS COMPUTATION
  // ═══════════════════════════════════════════════════════════
  const saldoAwalSeed = Number(settings.saldo_awal) || 0;

  const computedSaldoAwal = useMemo(() => {
    if (!startMonth) return saldoAwalSeed;
    let inc = 0, exp = 0;
    transactions.forEach(t => {
      const m = t.tanggal.substring(0, 7);
      if (m < startMonth) {
        if (t.type === 'income') inc += t.nominal;
        else exp += t.nominal;
      }
    });
    return saldoAwalSeed + inc - exp;
  }, [transactions, startMonth, saldoAwalSeed]);

  const saldoAwalLabel = useMemo(() => {
    if (!startMonth) return 'Saldo Awal Pertama Kali';
    let lastMonth = '';
    transactions.forEach(t => {
      const m = t.tanggal.substring(0, 7);
      if (m < startMonth && (!lastMonth || m > lastMonth)) lastMonth = m;
    });
    return lastMonth ? `Saldo Akhir ${formatMonthYear(lastMonth)}` : 'Saldo Awal Pertama Kali';
  }, [transactions, startMonth]);

  const cashFlowData = useMemo(() => {
    const effectiveStart = startMonth || (filteredTransactions.length > 0 ? filteredTransactions[0].tanggal.substring(0, 7) : '');
    const effectiveEnd = endMonth || (filteredTransactions.length > 0 ? filteredTransactions[filteredTransactions.length - 1].tanggal.substring(0, 7) : '');
    if (!effectiveStart || !effectiveEnd) return [];

    const months: string[] = [];
    const [sy, sm] = effectiveStart.split('-').map(Number);
    const [ey, em] = effectiveEnd.split('-').map(Number);
    let curY = sy, curM = sm;
    while (curY < ey || (curY === ey && curM <= em)) {
      months.push(`${curY}-${String(curM).padStart(2, '0')}`);
      curM++;
      if (curM > 12) { curM = 1; curY++; }
    }

    const txMap: Record<string, { income: number; expense: number }> = {};
    filteredTransactions.forEach(t => {
      const m = t.tanggal.substring(0, 7);
      if (!txMap[m]) txMap[m] = { income: 0, expense: 0 };
      if (t.type === 'income') txMap[m].income += t.nominal;
      else txMap[m].expense += t.nominal;
    });

    let running = computedSaldoAwal;
    return months.map(month => {
      const d = txMap[month] || { income: 0, expense: 0 };
      const prev = running;
      running += d.income - d.expense;
      return {
        bulan: month,
        label: formatMonthYear(month),
        saldoAwal: prev,
        pemasukan: d.income,
        pengeluaran: d.expense,
        net: d.income - d.expense,
        saldoAkhir: running,
      };
    });
  }, [filteredTransactions, startMonth, endMonth, computedSaldoAwal]);

  const neracaAkhir = cashFlowData.length > 0 ? cashFlowData[cashFlowData.length - 1].saldoAkhir : computedSaldoAwal;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
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
          <div><h1 className="text-lg font-bold text-[#1a3c5e]">Laporan Keuangan</h1><p className="text-xs text-gray-400">Ringkasan keuangan RT 11</p></div>
          <Badge className="bg-[#2e7d32]/5 text-[#2e7d32] border-0 text-xs">Transparan</Badge>
        </header>

        <motion.div initial="hidden" animate="visible" variants={stagger} className="p-4 sm:p-6 lg:p-8">

          {/* Filter & Export Bar */}
          <motion.div variants={fadeIn} className="mb-6">
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Month Range Filter */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Filter className="w-4 h-4 text-[#1a3c5e]" />
                      Filter Rentang Bulan
                    </div>
                    <MonthRangePicker
                      startMonth={startMonth}
                      endMonth={endMonth}
                      onStartChange={setStartMonth}
                      onEndChange={setEndMonth}
                      onClear={handleClearFilter}
                    />
                  </div>

                  {/* Export Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 mr-1">Download:</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#1a3c5e] text-[#1a3c5e] hover:bg-[#1a3c5e] hover:text-white gap-2 text-xs font-semibold"
                          disabled={loading || filteredTransactions.length === 0}
                        >
                          <Download className="w-3.5 h-3.5" />
                          Unduh Laporan
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => handleExport('pdf')}
                          className="gap-2 text-sm cursor-pointer"
                        >
                          <FileDown className="w-4 h-4 text-red-500" />
                          <span>PDF</span>
                          <span className="text-[10px] text-gray-400 ml-auto">.pdf</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleExport('excel')}
                          className="gap-2 text-sm cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                          <span>Excel</span>
                          <span className="text-[10px] text-gray-400 ml-auto">.xlsx</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleExport('csv')}
                          className="gap-2 text-sm cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span>CSV</span>
                          <span className="text-[10px] text-gray-400 ml-auto">.csv</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Quick export buttons */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('pdf')}
                      disabled={loading || filteredTransactions.length === 0}
                      className="gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hidden sm:flex"
                    >
                      <FileDown className="w-3 h-3" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('excel')}
                      disabled={loading || filteredTransactions.length === 0}
                      className="gap-1.5 text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hidden sm:flex"
                    >
                      <FileSpreadsheet className="w-3 h-3" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('csv')}
                      disabled={loading || filteredTransactions.length === 0}
                      className="gap-1.5 text-xs border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hidden sm:flex"
                    >
                      <FileText className="w-3 h-3" />
                      CSV
                    </Button>
                  </div>
                </div>

                {/* Active filter indicator */}
                <AnimatePresence>
                  {isFiltered && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-gray-100"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="secondary" className="bg-[#1a3c5e]/5 text-[#1a3c5e] border-0 text-xs gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {filterLabel}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Menampilkan {filteredTransactions.length} dari {transactions.length} transaksi
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Summary Cards */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
              : [
                  { label: 'Total Pemasukan', value: formatRupiah(isFiltered ? filteredSummary.income : (dashboard?.totalIncome ?? 0)), icon: TrendingUp, gradient: 'from-emerald-500 to-green-600', badge: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Total Pengeluaran', value: formatRupiah(isFiltered ? filteredSummary.expense : (dashboard?.totalExpense ?? 0)), icon: TrendingDown, gradient: 'from-red-500 to-rose-600', badge: 'bg-red-50 text-red-700' },
                  { label: 'Saldo Kas', value: formatRupiah(isFiltered ? filteredSummary.income - filteredSummary.expense : (dashboard?.balance ?? 0)), icon: DollarSign, gradient: 'from-[#1a3c5e] to-[#2e5a3e]', badge: 'bg-[#1a3c5e]/5 text-[#1a3c5e]' },
                ].map((c) => (
                  <motion.div key={c.label} variants={fadeIn}>
                    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center`}>
                            <c.icon className="w-5 h-5 text-white" />
                          </div>
                          <Badge className={`${c.badge} border-0 text-[10px]`}>{c.label}</Badge>
                        </div>
                        <p className="text-xl font-bold text-gray-900">{c.value}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-5 gap-6 mb-8">
            {/* Bar Chart */}
            <motion.div variants={fadeIn} className="lg:col-span-3">
              <Card className="border-0 shadow-md h-full">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />Pemasukan vs Pengeluaran Bulanan
                    {isFiltered && <Badge className="bg-amber-50 text-amber-700 border-0 text-[10px]">{filterLabel}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-72 rounded-xl" />
                  ) : (isFiltered ? filteredChartData : dashboard?.chartData)?.length ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={isFiltered ? filteredChartData : dashboard?.chartData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="month" tickFormatter={getMonthYearLabel} tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" height={55} />
                          <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false}
                            tickFormatter={(v) => `${(v / 1e6).toFixed(1)}jt`} />
                          <Tooltip formatter={(v: number) => formatRupiah(v)} labelFormatter={(l: string) => getMonthYearLabel(l)}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="income" fill="#2e7d32" radius={[6, 6, 0, 0]} name="Pemasukan" barSize={20} />
                          <Bar dataKey="expense" fill="#c62828" radius={[6, 6, 0, 0]} name="Pengeluaran" barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-72 flex items-center justify-center">
                      <p className="text-sm text-gray-400">Belum ada data grafik</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Pie Chart */}
            <motion.div variants={fadeIn} className="lg:col-span-2">
              <Card className="border-0 shadow-md h-full">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4" />Distribusi Pengeluaran
                    {isFiltered && <Badge className="bg-amber-50 text-amber-700 border-0 text-[10px]">{filterLabel}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-72 rounded-xl" />
                  ) : (isFiltered ? filteredCategoryData : dashboard?.categoryData)?.length ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={isFiltered ? filteredCategoryData : dashboard?.categoryData} cx="50%" cy="45%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                            {(isFiltered ? filteredCategoryData : dashboard?.categoryData)?.map((_: unknown, i: number) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatRupiah(v)}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                          <Legend verticalAlign="bottom" iconType="circle" iconSize={8}
                            formatter={(v: string) => <span className="text-xs text-gray-600">{v}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-72 flex items-center justify-center">
                      <p className="text-sm text-gray-400">Belum ada data kategori</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ═══ NERACA SALDO ═══ */}
          <motion.div variants={fadeIn} className="mb-6">
            <Card className="border-0 shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-[#1a3c5e] to-[#2e5a3e] px-5 py-3.5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <Scale className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">NERACA SALDO</h3>
                  <p className="text-[10px] text-white/60">{filterLabel || 'Seluruh Periode'}</p>
                </div>
                <div className="ml-auto">
                  <Badge className="bg-white/15 text-white border-0 text-[10px]">{cashFlowData.length} bulan</Badge>
                </div>
              </div>
              <CardContent className="p-0">
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                  {/* Saldo Awal */}
                  <div className="p-4 lg:p-5 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-[#1a3c5e]" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">{saldoAwalLabel}</span>
                    </div>
                    <p className="text-lg font-bold text-[#1a3c5e]">{formatRupiah(computedSaldoAwal)}</p>
                  </div>
                  {/* Pendapatan */}
                  <div className="p-4 lg:p-5 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">(+) Pendapatan</span>
                    </div>
                    <p className="text-lg font-bold text-emerald-700">{formatRupiah(filteredSummary.income)}</p>
                  </div>
                  {/* Pengeluaran */}
                  <div className="p-4 lg:p-5 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">(-) Pengeluaran</span>
                    </div>
                    <p className="text-lg font-bold text-red-600">{formatRupiah(filteredSummary.expense)}</p>
                  </div>
                  {/* Saldo Akhir */}
                  <div className={`p-4 lg:p-5 flex flex-col gap-1.5 ${neracaAkhir >= 0 ? 'bg-emerald-50/50' : 'bg-red-50/50'}`}>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className={`w-3.5 h-3.5 ${neracaAkhir >= 0 ? 'text-emerald-600' : 'text-red-500'}`} />
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">SALDO AKHIR</span>
                    </div>
                    <p className={`text-lg font-bold ${neracaAkhir >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatRupiah(neracaAkhir)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ═══ ARUS KAS BULANAN ═══ */}
          <motion.div variants={fadeIn} className="mb-8">
            <Card className="border-0 shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-[#1a3c5e] to-[#0f1a2e] px-5 py-3.5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">ARUS KAS BULANAN</h3>
                  <p className="text-[10px] text-white/60">{filterLabel || 'Seluruh Periode'}</p>
                </div>
              </div>
              <CardContent className="p-0">
                {cashFlowData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500 w-[100px]">Bulan</th>
                          <th className="text-right px-3 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Saldo Awal</th>
                          <th className="text-right px-3 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Pemasukan</th>
                          <th className="text-right px-3 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Pengeluaran</th>
                          <th className="text-right px-3 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Net</th>
                          <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-500">Saldo Akhir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashFlowData.map((row, idx) => (
                          <tr key={row.bulan} className={`border-b border-gray-50 transition-colors hover:bg-gray-50/50 ${idx === cashFlowData.length - 1 ? 'bg-gray-50/80' : ''}`}>
                            <td className="px-4 py-3 font-semibold text-[#1a3c5e] whitespace-nowrap">
                              {row.label}
                            </td>
                            <td className="text-right px-3 py-3 text-gray-600 tabular-nums">
                              {formatRupiah(row.saldoAwal)}
                            </td>
                            <td className="text-right px-3 py-3 text-emerald-700 tabular-nums">
                              {row.pemasukan > 0 ? `+${formatRupiah(row.pemasukan)}` : '-'}
                            </td>
                            <td className="text-right px-3 py-3 text-red-600 tabular-nums">
                              {row.pengeluaran > 0 ? `-${formatRupiah(row.pengeluaran)}` : '-'}
                            </td>
                            <td className={`text-right px-3 py-3 font-semibold tabular-nums ${row.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                              {row.net >= 0 ? '+' : ''}{formatRupiah(row.net)}
                            </td>
                            <td className={`text-right px-4 py-3 font-bold tabular-nums ${row.saldoAkhir >= 0 ? 'text-[#1a3c5e]' : 'text-red-600'}`}>
                              {formatRupiah(row.saldoAkhir)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Footer totals */}
                      <tfoot>
                        <tr className="border-t-2 border-[#1a3c5e]/20 bg-[#1a3c5e]/5">
                          <td className="px-4 py-3 font-bold text-[#1a3c5e]">TOTAL</td>
                          <td className="text-right px-3 py-3 text-gray-500 text-xs">—</td>
                          <td className="text-right px-3 py-3 font-semibold text-emerald-700 tabular-nums">{formatRupiah(filteredSummary.income)}</td>
                          <td className="text-right px-3 py-3 font-semibold text-red-600 tabular-nums">{formatRupiah(filteredSummary.expense)}</td>
                          <td className={`text-right px-3 py-3 font-bold tabular-nums ${filteredSummary.income - filteredSummary.expense >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {filteredSummary.income - filteredSummary.expense >= 0 ? '+' : ''}{formatRupiah(filteredSummary.income - filteredSummary.expense)}
                          </td>
                          <td className={`text-right px-4 py-3 font-bold tabular-nums ${neracaAkhir >= 0 ? 'text-[#1a3c5e]' : 'text-red-600'}`}>
                            {formatRupiah(neracaAkhir)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Belum ada data arus kas</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Laporan Transparan Info Card */}
          <motion.div variants={fadeIn} className="mt-6">
            <Card className="border-0 shadow-sm bg-gradient-to-r from-[#1a3c5e]/5 to-[#2e7d32]/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1a3c5e]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Download className="w-4 h-4 text-[#1a3c5e]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1a3c5e]">Laporan Transparan</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Unduh laporan keuangan dalam format PDF, Excel, atau CSV. Gunakan filter rentang bulan untuk memilih periode yang diinginkan.
                      Laporan mencakup seluruh data pemasukan dan pengeluaran yang telah disetujui.
                    </p>
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

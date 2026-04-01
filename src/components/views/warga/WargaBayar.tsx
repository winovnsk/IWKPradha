'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Menu, LogOut, LayoutDashboard, Receipt, FileText,
  CalendarDays, Bell, BarChart3, UserCircle, Clock,
  CheckCircle2, ArrowLeft, ArrowRight, Upload, Banknote,
  QrCode, Wallet, CreditCard, MessageCircle, X, ImageIcon,
  Check, Square, ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore, type ViewType } from '@/lib/store';
import { api } from '@/lib/api';

/* ═══════════════════════════════════════════════════════════ */
/*  TYPES                                                      */
/* ═══════════════════════════════════════════════════════════ */
interface UnpaidMonth { month: string; label: string; nominal: number; }
interface SidebarItem { icon: typeof LayoutDashboard; label: string; view: ViewType; }

/* ═══════════════════════════════════════════════════════════ */
/*  HELPERS                                                    */
/* ═══════════════════════════════════════════════════════════ */
const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const MONTH_NAMES: Record<string, string> = {
  '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
  '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
  '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember',
};

const getMonthLabel = (monthKey: string) => {
  const mm = monthKey.substring(5, 7);
  const yyyy = monthKey.substring(0, 4);
  return `${MONTH_NAMES[mm] || mm} ${yyyy}`;
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

const paymentMethods = [
  { id: 'transfer', label: 'Transfer Bank', icon: Banknote, desc: 'BCA / BNI / Mandiri', color: 'from-blue-500 to-blue-600' },
  { id: 'qris', label: 'QRIS', icon: QrCode, desc: 'Scan QR Code', color: 'from-purple-500 to-purple-600' },
  { id: 'tunai', label: 'Tunai', icon: Wallet, desc: 'Bayar langsung ke bendahara', color: 'from-emerald-500 to-emerald-600' },
];

const steps = [
  { label: 'Pilih Bulan' },
  { label: 'Metode Bayar' },
  { label: 'Detail Bayar' },
  { label: 'Upload Bukti' },
];

/* ═══════════════════════════════════════════════════════════ */
/*  WARGA BAYAR                                                */
/* ═══════════════════════════════════════════════════════════ */
export default function WargaBayar() {
  const { user, currentView, setView, logout, sidebarOpen, toggleSidebar, setToast, settings } = useAppStore();
  const [unpaid, setUnpaid] = useState<UnpaidMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // MULTI-MONTH selection: array of selected months
  const [selectedMonths, setSelectedMonths] = useState<UnpaidMonth[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nominal = parseInt(settings.default_iwk_nominal) || 100000;

  /* ── Fetch unpaid months ── */
  const fetchUnpaid = async () => {
    try {
      const res = await api.getUnpaidMonths(user?.id);
      if (res.success) setUnpaid(res.data || []);
    } catch (err) {
      console.error('Fetch unpaid error:', err);
    }
  };

  useEffect(() => {
    const load = async () => { setLoading(true); await fetchUnpaid(); setLoading(false); };
    load();
  }, []);

  /* ── Toggle month selection ── */
  const toggleMonth = (m: UnpaidMonth) => {
    setSelectedMonths(prev => {
      const exists = prev.find(p => p.month === m.month);
      if (exists) return prev.filter(p => p.month !== m.month);
      return [...prev, m];
    });
  };

  /* ── Select all / deselect all ── */
  const selectAll = () => setSelectedMonths([...unpaid]);
  const deselectAll = () => setSelectedMonths([]);

  const totalNominal = selectedMonths.length * nominal;

  /* ── File upload ── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setProofPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  /* ── Submit payment for ALL selected months ── */
  const handleSubmit = async () => {
    if (selectedMonths.length === 0 || !selectedMethod) return;
    setSubmitting(true);
    try {
      const res = await api.gas('submitPayment', {
        bulanIuran: selectedMonths.map(m => m.month),
        nominal,
        metodePembayaran: selectedMethod,
        userId: user?.id || '',
      });
      if (res.success) {
        setSuccess(true);
        setToast({
          message: `${selectedMonths.length} pembayaran berhasil dikirim! Menunggu validasi admin.`,
          type: 'success',
        });
        // Remove paid months from local unpaid list immediately
        const paidKeys = new Set(selectedMonths.map(m => m.month));
        setUnpaid(prev => prev.filter(u => !paidKeys.has(u.month)));
      } else {
        setToast({ message: res.message || 'Gagal mengirim pembayaran', type: 'error' });
      }
    } catch {
      setToast({ message: 'Terjadi kesalahan koneksi', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Reset form & re-fetch unpaid (for "Bayar Lagi") ── */
  const resetForm = async () => {
    setCurrentStep(0);
    setSelectedMonths([]);
    setSelectedMethod('');
    setProofFile(null);
    setProofPreview(null);
    setSuccess(false);
    // Re-fetch from server so paid months don't reappear
    setLoading(true);
    await fetchUnpaid();
    setLoading(false);
  };

  /* ── WhatsApp URL ── */
  const monthLabels = selectedMonths.map(m => getMonthLabel(m.month)).join(', ');
  const waUrl = `https://wa.me/628568999001?text=${encodeURIComponent(
    `Halo Admin RT 11, saya ${user?.nama} ingin mengkonfirmasi pembayaran iuran ${monthLabels} sebesar ${formatRupiah(totalNominal)} via ${selectedMethod.toUpperCase()}.`
  )}`;

  const canProceed = selectedMonths.length > 0;

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
          <div><h1 className="text-lg font-bold text-[#1a3c5e]">Bayar Iuran</h1><p className="text-xs text-gray-400">Pembayaran iuran bulanan RT 11</p></div>
          {!success && currentStep > 0 && (
            <button className="text-gray-600 hover:text-[#1a3c5e] hover:bg-gray-100 active:bg-gray-200 font-medium text-sm px-3 py-1.5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={() => setCurrentStep(s => s - 1)}>
              <ArrowLeft className="w-4 h-4 mr-1" />Kembali
            </button>
          )}
        </header>

        <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
          {/* ═══════════════════════════════════════════════════════ */}
          {/*  SUCCESS STATE                                        */}
          {/* ═══════════════════════════════════════════════════════ */}
          {success ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold text-[#1a3c5e] mb-2">Pembayaran Berhasil Dikirim!</h2>
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-sm font-semibold text-amber-700">Menunggu Validasi Admin</span>
              </div>

              {/* List of months paid */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 max-w-sm mx-auto text-left">
                <p className="text-xs text-gray-400 mb-2">Bulan yang dibayarkan:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedMonths.map(m => (
                    <Badge key={m.month} className="bg-[#1a3c5e]/10 text-[#1a3c5e] border-0 text-xs">
                      {getMonthLabel(m.month)}
                    </Badge>
                  ))}
                </div>
              </div>

              <p className="text-gray-500 mb-1">Total: <span className="font-bold">{formatRupiah(totalNominal)}</span></p>
              <p className="text-sm text-gray-400 mb-2">Metode: <span className="font-medium text-gray-600">{paymentMethods.find(m => m.id === selectedMethod)?.label}</span></p>
              <p className="text-sm text-gray-400 mb-8">Status akan berubah menjadi "Disetujui" setelah admin memvalidasi bukti pembayaran Anda.</p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button className="bg-[#2e7d32] hover:bg-[#1a6b2c] active:bg-[#14532d] text-white font-bold px-4 py-2 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30"
                  onClick={() => window.open(waUrl, '_blank')}>
                  <MessageCircle className="w-4 h-4 mr-2" />Konfirmasi via WhatsApp
                </button>
                <button className="border-2 border-[#1a3c5e] text-[#1a3c5e] hover:bg-[#1a3c5e] hover:text-white active:bg-[#1a3c5e]/90 active:text-white font-semibold px-4 py-2 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={resetForm}>Bayar Lagi</button>
                <button className="border-2 border-[#1a3c5e] text-[#1a3c5e] hover:bg-[#1a3c5e] hover:text-white active:bg-[#1a3c5e]/90 active:text-white font-semibold px-4 py-2 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={() => setView('warga-dashboard')}>Ke Dashboard</button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Progress Steps */}
              <div className="mb-8">
                <div className="flex items-center justify-between relative">
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0">
                    <div className="h-full bg-gradient-to-r from-[#1a3c5e] to-[#2e7d32] transition-all duration-500"
                      style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }} />
                  </div>
                  {steps.map((step, i) => (
                    <div key={i} className="relative z-10 flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                        i <= currentStep
                          ? 'bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] text-white shadow-lg'
                          : 'bg-white text-gray-400 border-2 border-gray-200'
                      }`}>
                        {i < currentStep ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                      </div>
                      <p className={`text-[11px] mt-2 font-medium whitespace-nowrap ${i <= currentStep ? 'text-[#1a3c5e]' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {/* ═══════════════════════════════════════════════════════ */}
                {/*  STEP 0: Select Month(s) — MULTI-SELECT              */}
                {/* ═══════════════════════════════════════════════════════ */}
                {currentStep === 0 && (
                  <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <Card className="border-0 shadow-md">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2">
                            <CalendarDays className="w-4 h-4" />Pilih Bulan Iuran
                          </CardTitle>
                          {unpaid.length > 0 && (
                            <button onClick={selectedMonths.length === unpaid.length ? deselectAll : selectAll}
                              className="text-xs font-semibold text-[#1a3c5e] hover:bg-[#1a3c5e]/5 px-3 py-1.5 rounded-lg transition-colors">
                              {selectedMonths.length === unpaid.length ? 'Batal Semua' : 'Pilih Semua'}
                            </button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {loading ? (
                          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
                        ) : unpaid.length === 0 ? (
                          <div className="text-center py-8">
                            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 font-medium">Semua iuran sudah lunas!</p>
                            <p className="text-xs text-gray-400 mt-1">Tidak ada tanggungan bulan ini</p>
                          </div>
                        ) : (
                          <>
                            {/* Selection summary bar */}
                            {selectedMonths.length > 0 && (
                              <div className="mb-4 p-3 rounded-xl bg-[#1a3c5e]/5 border border-[#1a3c5e]/10 flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-gray-500">
                                    {selectedMonths.length} bulan dipilih
                                  </p>
                                  <p className="text-sm font-bold text-[#1a3c5e]">
                                    Total: {formatRupiah(totalNominal)}
                                  </p>
                                </div>
                                <div className="flex gap-1 flex-wrap max-w-[180px] justify-end">
                                  {selectedMonths.slice(0, 3).map(m => (
                                    <Badge key={m.month} className="bg-[#1a3c5e] text-white border-0 text-[10px]">
                                      {MONTH_NAMES[m.month.substring(5, 7)] || m.month}
                                    </Badge>
                                  ))}
                                  {selectedMonths.length > 3 && (
                                    <Badge className="bg-gray-200 text-gray-600 border-0 text-[10px]">
                                      +{selectedMonths.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="space-y-2 max-h-[calc(100vh-360px)] overflow-y-auto pr-1">
                              {unpaid.map((u) => {
                                const isSelected = selectedMonths.some(s => s.month === u.month);
                                return (
                                  <button key={u.month} onClick={() => toggleMonth(u)}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                                      isSelected
                                        ? 'border-[#1a3c5e] bg-[#1a3c5e]/5 shadow-sm'
                                        : 'border-gray-100 hover:border-[#1a3c5e]/30 hover:bg-gray-50'
                                    }`}>
                                    <div className="flex items-center gap-3">
                                      {/* Checkbox indicator */}
                                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                        isSelected
                                          ? 'bg-[#1a3c5e] border-[#1a3c5e]'
                                          : 'border-gray-300 bg-white'
                                      }`}>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                      </div>
                                      <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                                        <CalendarDays className={`w-5 h-5 ${isSelected ? 'text-[#1a3c5e]' : 'text-amber-600'}`} />
                                      </div>
                                      <div>
                                        <p className={`font-semibold text-sm ${isSelected ? 'text-[#1a3c5e]' : 'text-gray-800'}`}>{u.label}</p>
                                        <p className="text-xs text-gray-400">Iuran bulanan wajib</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className={`font-bold text-sm ${isSelected ? 'text-[#1a3c5e]' : 'text-gray-600'}`}>{formatRupiah(u.nominal)}</p>
                                      <Badge className={`${isSelected ? 'bg-[#1a3c5e] text-white' : 'bg-red-50 text-red-600'} border-0 text-[10px] mt-1`}>
                                        {isSelected ? 'Dipilih' : 'Belum Bayar'}
                                      </Badge>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Proceed button */}
                            <button
                              className={`w-full mt-4 font-bold py-4 rounded-lg transition-all duration-150 flex items-center justify-center gap-2 ${
                                canProceed
                                  ? 'bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white shadow-md'
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                              disabled={!canProceed}
                              onClick={() => canProceed && setCurrentStep(1)}
                            >
                              Lanjut Pilih Metode
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/*  STEP 1: Select Method                                 */}
                {/* ═══════════════════════════════════════════════════════ */}
                {currentStep === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <Card className="border-0 shadow-md">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />Pilih Metode Pembayaran
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {paymentMethods.map((method) => (
                          <button key={method.id} onClick={() => { setSelectedMethod(method.id); setCurrentStep(2); }}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                              selectedMethod === method.id
                                ? 'border-[#1a3c5e] bg-[#1a3c5e]/5'
                                : 'border-gray-100 hover:border-[#1a3c5e]/30 hover:bg-gray-50'
                            }`}>
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center flex-shrink-0`}>
                              <method.icon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">{method.label}</p>
                              <p className="text-xs text-gray-400">{method.desc}</p>
                            </div>
                          </button>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/*  STEP 2: Payment Summary                              */}
                {/* ═══════════════════════════════════════════════════════ */}
                {currentStep === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <Card className="border-0 shadow-md">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2">
                          <Banknote className="w-4 h-4" />Detail Pembayaran
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {/* Summary */}
                        <div className="bg-gradient-to-r from-[#1a3c5e] to-[#2e5a3e] rounded-xl p-5 text-white">
                          <p className="text-sm text-white/70 mb-3">Iuran untuk bulan:</p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {selectedMonths.map(m => (
                              <span key={m.month} className="bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                                {getMonthLabel(m.month)}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-white/70">Metode</p>
                            <p className="font-semibold">{paymentMethods.find(m => m.id === selectedMethod)?.label}</p>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-white/70">Jumlah Bulan</p>
                            <p className="font-semibold">{selectedMonths.length} bulan</p>
                          </div>
                          <div className="border-t border-white/20 pt-3 mt-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-white/70">Total Bayar</p>
                              <p className="text-2xl font-bold">{formatRupiah(totalNominal)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Bank Details */}
                        {selectedMethod === 'transfer' && (
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-700">Transfer ke rekening berikut:</p>
                            {(() => {
                              let bankList: { bank: string; noRekening: string; atasNama: string }[] = [];
                              try { bankList = JSON.parse(settings.bank_accounts || '[]'); } catch { bankList = []; }
                              if (bankList.length === 0) return (
                                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                                  <p className="text-xs text-amber-700">Info rekening belum diatur oleh admin. Hubungi bendahara RT.</p>
                                </div>
                              );
                              return bankList.map((b) => (
                                <div key={b.bank} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs text-gray-400">Bank {b.bank}</p>
                                    <Badge className="bg-[#1a3c5e]/5 text-[#1a3c5e] border-0 text-[10px]">{b.bank}</Badge>
                                  </div>
                                  <p className="text-lg font-bold text-gray-800 tracking-wider">{b.noRekening}</p>
                                  <p className="text-xs text-gray-500 mt-1">a.n. {b.atasNama}</p>
                                </div>
                              ));
                            })()}
                            {settings.link_website && (
                              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                <p className="text-xs text-blue-700">
                                  <span className="font-semibold">Info:</span> Anda juga bisa melakukan pembayaran melalui website:{' '}
                                  <a href={settings.link_website} target="_blank" rel="noopener noreferrer" className="underline font-semibold">{settings.link_website}</a>
                                </p>
                              </div>
                            )}
                            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                              <p className="text-xs text-amber-700">
                                <span className="font-semibold">Penting:</span> Cantumkan nama Anda di berita transfer. Upload bukti transfer pada langkah berikutnya.
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedMethod === 'qris' && (
                          <div className="text-center py-4">
                            <div className="w-48 h-48 bg-gray-100 rounded-2xl flex flex-col items-center justify-center mx-auto mb-4">
                              <QrCode className="w-24 h-24 text-gray-300" />
                              <p className="text-xs text-gray-400 mt-2">QR Code placeholder</p>
                            </div>
                            <p className="text-sm text-gray-500">Scan QR Code di atas untuk membayar</p>
                          </div>
                        )}

                        {selectedMethod === 'tunai' && (
                          <div className="text-center py-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                              <Wallet className="w-8 h-8 text-emerald-500" />
                            </div>
                            <p className="text-sm text-gray-600 mb-2">Serahkan pembayaran tunai kepada bendahara RT</p>
                            <p className="text-xs text-gray-400">Bendahara akan mengkonfirmasi pembayaran Anda</p>
                            <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                              <p className="text-xs text-blue-700">Setelah menyerahkan uang, upload foto bukti penyerahan pada langkah berikutnya.</p>
                            </div>
                          </div>
                        )}

                        <button className="w-full bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white font-bold py-5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30"
                          onClick={() => setCurrentStep(3)}>
                          Lanjut Upload Bukti <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/*  STEP 3: Upload Proof                                  */}
                {/* ═══════════════════════════════════════════════════════ */}
                {currentStep === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <Card className="border-0 shadow-md">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold text-[#1a3c5e] flex items-center gap-2">
                          <Upload className="w-4 h-4" />Upload Bukti Pembayaran
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {/* Payment summary */}
                        <div className="p-4 rounded-xl bg-gray-50">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-[#1a3c5e]/10 flex items-center justify-center">
                              <Receipt className="w-5 h-5 text-[#1a3c5e]" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">
                                {selectedMonths.length} bulan iuran
                              </p>
                              <p className="text-xs text-gray-400">
                                {paymentMethods.find(m => m.id === selectedMethod)?.label}
                              </p>
                            </div>
                            <p className="font-bold text-[#1a3c5e]">{formatRupiah(totalNominal)}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedMonths.map(m => (
                              <Badge key={m.month} className="bg-white text-gray-600 border border-gray-200 text-[10px]">
                                {getMonthLabel(m.month)}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Upload area */}
                        <div>
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                          {proofPreview ? (
                            <div className="relative rounded-xl overflow-hidden border-2 border-gray-200">
                              <img src={proofPreview} alt="Bukti bayar" className="w-full h-64 object-cover" />
                              <button onClick={() => { setProofPreview(null); setProofFile(null); }}
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => fileInputRef.current?.click()}
                              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-[#1a3c5e] hover:bg-[#1a3c5e]/5 transition-all">
                              <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-sm font-medium text-gray-500 mb-1">Klik untuk upload bukti pembayaran</p>
                              <p className="text-xs text-gray-400">Format: JPG, PNG (Maks. 5MB)</p>
                            </button>
                          )}
                        </div>

                        {!proofFile && (
                          <button className="w-full bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white font-bold py-5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30"
                            onClick={() => fileInputRef.current?.click()}>
                            <Upload className="w-4 h-4 mr-2" />Pilih File
                          </button>
                        )}

                        {proofFile && (
                          <button className="w-full bg-[#2e7d32] hover:bg-[#1a6b2c] active:bg-[#14532d] text-white font-bold py-5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30"
                            onClick={handleSubmit} disabled={submitting}>
                            {submitting ? (
                              <span className="flex items-center gap-2 justify-center">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Mengirim {selectedMonths.length} pembayaran...
                              </span>
                            ) : (
                              <span className="flex items-center gap-2 justify-center">
                                <CheckCircle2 className="w-4 h-4" />
                                Kirim Pembayaran ({formatRupiah(totalNominal)})
                              </span>
                            )}
                          </button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

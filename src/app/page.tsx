'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Wallet, CalendarDays, Megaphone, CreditCard, Phone, MapPin,
  ChevronRight, ChevronDown, Menu, X, TrendingUp, TrendingDown, DollarSign,
  Users, ArrowRight, ArrowLeft, Clock, Banknote, QrCode, Upload, CheckCircle2,
  MessageCircle, Shield, Eye, BarChart3, Heart, Star, ChevronUp, LogOut,
  LayoutDashboard, Receipt, UserCircle, Bell, FileText, Settings, UserPlus,
  AlertTriangle, Search, Filter, Download, ChevronLeft, ListChecks,
  ClipboardList, CircleDollarSign, CircleCheck, CircleX, RefreshCw, ImageIcon, Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { useAppStore, type ViewType, type User, type Settings } from '@/lib/store';
import WargaDashboard from '@/components/views/warga/WargaDashboard';
import WargaBayar from '@/components/views/warga/WargaBayar';
import WargaRiwayat from '@/components/views/warga/WargaRiwayat';
import WargaKegiatan from '@/components/views/warga/WargaKegiatan';
import WargaPengumuman from '@/components/views/warga/WargaPengumuman';
import WargaLaporan from '@/components/views/warga/WargaLaporan';
import WargaProfil from '@/components/views/warga/WargaProfil';
import AdminDashboard from '@/components/views/admin/AdminDashboard';
import AdminUsers from '@/components/views/admin/AdminUsers';
import AdminTransaksi from '@/components/views/admin/AdminTransaksi';
import AdminValidasi from '@/components/views/admin/AdminValidasi';
import AdminKegiatan from '@/components/views/admin/AdminKegiatan';
import AdminPengumuman from '@/components/views/admin/AdminPengumuman';
import AdminSettings from '@/components/views/admin/AdminSettings';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */
interface Announcement { id: string; title: string; content: string; tanggal: string; isActive: boolean; images?: string[]; attachments?: { name: string; url: string; size: number }[]; }
interface EventItem { id: string; title: string; description: string; tanggalMulai: string; tanggalSelesai: string; lokasi: string; fotoUrl: string; isActive: boolean; images?: string[]; attachments?: { name: string; url: string; size: number }[]; }
interface DashboardData { totalIncome: number; totalExpense: number; balance: number; chartData: { month: string; income: number; expense: number; balance: number }[]; categoryData: { name: string; value: number }[]; userCount: number; totalTransactions: number; }
interface Transaction { id: string; type: string; categoryId: string; nominal: number; tanggal: string; status: string; deskripsi: string; }
interface UnpaidMonth { month: string; label: string; nominal: number; }

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const formatDate = (s: string) => {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const d = new Date(s);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const getMonthLabel = (s: string) => {
  const m = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return m[parseInt(s.split('-')[1]) - 1] || s;
};

const PIE_COLORS = ['#1a3c5e','#2e7d32','#f9a825','#c62828','#0277bd','#6a1b9a','#00695c','#e65100'];

/* ═══════════════════════════════════════════════════════════
   ANIMATION
   ═══════════════════════════════════════════════════════════ */
const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };
const slideIn = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3 } } };

/* ─── Image Carousel Component ─── */
function ImgCarousel({ images, id }: { images: string[]; id: string }) {
  const [idx, setIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const curX = useRef(0);
  const dragging = useRef(false);

  const go = (n: number) => setIdx((p) => (p + n + images.length) % images.length);

  /* Touch events for swipe */
  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; curX.current = 0; dragging.current = true; };
  const onTouchMove = (e: React.TouchEvent) => { if (!dragging.current) return; curX.current = e.touches[0].clientX - startX.current; };
  const onTouchEnd = () => { if (!dragging.current) return; dragging.current = false; if (Math.abs(curX.current) > 50) go(curX.current < 0 ? 1 : -1); curX.current = 0; };

  /* Mouse/pointer fallback */
  const onPMDown = (e: React.PointerEvent) => { startX.current = e.clientX; curX.current = 0; dragging.current = true; };
  const onPMMove = (e: React.PointerEvent) => { if (!dragging.current) return; curX.current = e.clientX - startX.current; };
  const onPMUp = () => { if (!dragging.current) return; dragging.current = false; if (Math.abs(curX.current) > 50) go(curX.current < 0 ? 1 : -1); curX.current = 0; };

  if (images.length <= 1) return <img src={images[0]} alt="" className="w-full h-full object-cover" />;

  return (
    <div className="relative w-full h-full overflow-hidden rounded-t-2xl" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onPointerDown={onPMDown} onPointerMove={onPMMove} onPointerUp={onPMUp} style={{ touchAction: 'pan-y' }}>
      <div ref={trackRef} className="flex h-full" style={{ transform: `translateX(calc(-${idx * 100}% + ${curX.current}px))`, transition: dragging.current ? 'none' : 'transform 300ms ease-out' }}>
        {images.map((src, i) => <img key={i} src={src} alt="" className="w-full h-full object-cover flex-shrink-0" draggable={false} />)}
      </div>
      <button onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-20 shadow"><ChevronLeft className="w-5 h-5" /></button>
      <button onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-20 shadow"><ChevronRight className="w-5 h-5" /></button>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {images.map((_, i) => <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }} className={`h-2 rounded-full transition-all duration-200 ${i === idx ? 'bg-white w-6 shadow' : 'bg-white/40 hover:bg-white/60 w-2'}`} />)}
      </div>
      <div className="absolute top-3 right-3 bg-black/60 text-white text-[11px] px-2.5 py-1 rounded-full z-20 font-medium shadow">{idx + 1} / {images.length}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════ */
function LandingView({ settings, announcements, events, dashboard, loading }: {
  settings: Settings; announcements: Announcement[]; events: EventItem[]; dashboard: DashboardData | null; loading: boolean;
}) {
  const { setView } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(false);

  useEffect(() => {
    const h = () => setScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
      setMobileOpen(false);
    }
  }, []);

  const waUrl = settings.whatsapp_admin ? `https://wa.me/${settings.whatsapp_admin}` : '#';

  const navLinks = [
    { label: 'Beranda', id: 'hero' }, { label: 'Tentang', id: 'about' },
    { label: 'Keuangan', id: 'finance' }, { label: 'Kegiatan', id: 'events-section' },
    { label: 'Pengumuman', id: 'announcements' }, { label: 'Cara Bayar', id: 'howtopay' },
    { label: 'Kontak', id: 'contact' },
  ];

  const steps = [
    { icon: CalendarDays, t: 'Pilih Bulan', d: 'Pilih bulan iuran' },
    { icon: CreditCard, t: 'Pilih Metode', d: 'Transfer/QRIS/Tunai' },
    { icon: Banknote, t: 'Bayar', d: 'Transfer ke rekening RT' },
    { icon: Upload, t: 'Upload Bukti', d: 'Upload bukti transfer' },
    { icon: CheckCircle2, t: 'Konfirmasi', d: 'Tunggu validasi admin' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7fa]">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-[9999] bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => scrollTo('hero')} role="button" tabIndex={0} aria-label="Kembali ke beranda">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] flex items-center justify-center"><Building2 className="w-5 h-5 text-white" /></div>
              <div className="hidden sm:block"><p className="text-sm font-bold text-[#1a3c5e] leading-tight">{settings.app_name || 'IWK RT 11'}</p><p className="text-[10px] text-gray-400 leading-tight">{settings.alamat_rt || 'Komplek Pradha Ciganitri'}</p></div>
            </div>
            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((l) => (
                <button key={l.id} onClick={() => scrollTo(l.id)} className="relative px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-[#1a3c5e] rounded-lg transition-colors duration-200 active:text-[#1a3c5e] active:bg-[#1a3c5e]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30">{l.label}</button>
              ))}
            </div>
            {/* Desktop CTA */}
            <div className="hidden sm:flex items-center gap-2">
              <button onClick={() => scrollTo('contact')} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#1a3c5e] border-2 border-[#1a3c5e] rounded-lg hover:bg-[#1a3c5e] hover:text-white active:bg-[#1a3c5e]/90 active:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30"><MessageCircle className="w-4 h-4" /><span>Hubungi</span></button>
              <button onClick={() => setView('login')} className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-[#1a3c5e] rounded-lg hover:bg-[#2e5a3e] active:bg-[#0f2438] transition-colors duration-150 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30"><span>Masuk</span><ArrowRight className="w-4 h-4" /></button>
            </div>
            {/* Hamburger */}
            <button className="lg:hidden relative z-[10000] w-11 h-11 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors" onClick={(e) => { e.stopPropagation(); setMobileOpen(!mobileOpen); }} aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={mobileOpen}>
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {/* Mobile overlay */}
        {mobileOpen && <div className="fixed inset-0 top-16 z-[9998] bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
        {/* Mobile menu - NO overflow-hidden, NO height animation */}
        {mobileOpen && (
          <div className="fixed top-16 left-0 right-0 z-[9999] bg-white border-b border-gray-200 shadow-xl lg:hidden">
            <div className="max-h-[calc(100vh-4rem)] overflow-y-auto px-4 py-4 space-y-1">
              {navLinks.map((l) => (
                <button key={l.id} onClick={() => scrollTo(l.id)} className="block w-full text-left px-4 py-3 text-[15px] font-semibold text-gray-700 hover:text-[#1a3c5e] hover:bg-[#1a3c5e]/5 active:bg-[#1a3c5e]/10 rounded-lg transition-colors">{l.label}</button>
              ))}
              <Separator className="my-3" />
              <div className="flex gap-3 pt-1 pb-2">
                <button onClick={() => scrollTo('contact')} className="flex-1 py-3 text-sm font-semibold text-[#1a3c5e] border-2 border-[#1a3c5e] rounded-lg hover:bg-[#1a3c5e] hover:text-white active:bg-[#1a3c5e]/90 active:text-white transition-colors">Hubungi</button>
                <button onClick={() => setView('login')} className="flex-1 py-3 text-sm font-bold text-white bg-[#1a3c5e] rounded-lg hover:bg-[#2e5a3e] active:bg-[#0f2438] transition-colors">Masuk</button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0"><img src="/hero-bg.png" alt="Hero" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-[#1a3c5e]/90 via-[#1a3c5e]/70 to-[#2e7d32]/50" /><div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" /></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" /><div className="absolute bottom-20 left-10 w-96 h-96 bg-[#2e7d32]/10 rounded-full blur-3xl" />
        <motion.div initial="hidden" animate="visible" variants={stagger} className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center pt-20">
          <motion.div variants={fadeIn}><Badge className="bg-white/15 text-white border-white/20 backdrop-blur-sm px-4 py-1.5 text-sm mb-6"><Star className="w-3.5 h-3.5 mr-1.5 text-yellow-300" />Transparansi 100% — Keuangan Warga</Badge></motion.div>
          <motion.h1 variants={fadeIn} className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6 tracking-tight">Sistem Iuran & <span className="bg-gradient-to-r from-green-300 to-emerald-400 bg-clip-text text-transparent">Manajemen Kegiatan</span><br /><span className="text-3xl sm:text-4xl md:text-5xl font-bold">RT 11 Pradha Ciganitri</span></motion.h1>
          <motion.p variants={fadeIn} className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">Kelola iuran wajib komplek dengan mudah, transparan, dan terorganisir. Semua informasi keuangan dan kegiatan RT tersedia secara real-time.</motion.p>
          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => setView('register')} className="inline-flex items-center justify-center gap-2 bg-white text-[#1a3c5e] hover:bg-gray-100 active:bg-gray-200 font-bold px-7 py-3.5 text-sm rounded-xl shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"><ArrowRight className="w-4 h-4" />Daftar Sekarang</button>
            <button onClick={() => scrollTo('finance')} className="inline-flex items-center justify-center gap-2 border-2 border-white/40 text-white hover:bg-white/15 active:bg-white/25 backdrop-blur-sm font-bold px-7 py-3.5 text-sm rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"><Eye className="w-4 h-4" />Lihat Transparansi</button>
          </motion.div>
          {dashboard && (<motion.div variants={stagger} className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[{ l: 'Total Warga', v: dashboard.userCount, i: Users },{ l: 'Saldo Kas', v: formatRupiah(dashboard.balance), i: Wallet },{ l: 'Kegiatan', v: events.length, i: CalendarDays },{ l: 'Transaksi', v: dashboard.totalTransactions, i: BarChart3 }].map((s) => (
              <motion.div key={s.l} variants={fadeIn} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center"><s.i className="w-5 h-5 text-green-300 mx-auto mb-2" /><p className="text-xl sm:text-2xl font-bold text-white">{s.v}</p><p className="text-xs text-white/60 mt-1">{s.l}</p></motion.div>
            ))}
          </motion.div>)}
        </motion.div>
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute bottom-8 left-1/2 -translate-x-1/2"><ChevronDown className="w-6 h-6 text-white/50" /></motion.div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger} className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div variants={stagger}>
              <Badge className="bg-[#1a3c5e]/10 text-[#1a3c5e] border-[#1a3c5e]/20 mb-4"><Building2 className="w-3.5 h-3.5 mr-1.5" />Tentang Kami</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1a3c5e] mb-6">RT 11 Komplek Pradha Ciganitri</h2>
              <p className="text-gray-600 leading-relaxed mb-4">RT 11 Komplek Pradha Ciganitri merupakan lingkungan perumahan di kawasan Bandung. Kami berkomitmen menciptakan lingkungan yang aman, nyaman, dan harmonis bagi seluruh warga.</p>
              <p className="text-gray-600 leading-relaxed mb-8">Sistem IWK RT 11 hadir sebagai solusi digital untuk mengelola iuran wajib komplek, kegiatan sosial, dan transparansi keuangan RT secara real-time.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[{ icon: Shield, t: 'Aman & Terpercaya', d: 'Data terenkripsi' },{ icon: Eye, t: '100% Transparan', d: 'Keuangan terbuka' },{ icon: BarChart3, t: 'Laporan Otomatis', d: 'Download kapan saja' },{ icon: Heart, t: 'Kegiatan Sosial', d: 'Beragam kegiatan warga' }].map((f) => (
                  <motion.div key={f.t} variants={fadeIn} className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#f5f7fa] transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-[#1a3c5e]/10 flex items-center justify-center flex-shrink-0"><f.icon className="w-5 h-5 text-[#1a3c5e]" /></div>
                    <div><p className="font-semibold text-gray-800 text-sm">{f.t}</p><p className="text-xs text-gray-500">{f.d}</p></div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeIn} className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl"><img src="/community-illustration.png" alt="Komunitas" className="w-full h-auto" /></div>
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 bg-white rounded-xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] flex items-center justify-center"><Users className="w-6 h-6 text-white" /></div><div><p className="font-bold text-[#1a3c5e]">{dashboard?.userCount || '-'}</p><p className="text-xs text-gray-500">Warga Terdaftar</p></div></div>
              </motion.div>
            </motion.div>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mt-24">
            <div className="text-center mb-10">
              <Badge className="bg-[#1a3c5e]/10 text-[#1a3c5e] border-[#1a3c5e]/20 mb-3"><Users className="w-3.5 h-3.5 mr-1.5" />Pengurus RT</Badge>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#1a3c5e]">Pengurus RT 11</h3>
              <p className="text-sm text-gray-400 mt-1">Pelayanan terbaik untuk warga</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { role: 'Ketua RT', name: settings.ketua_rt || 'Belum diatur', wa: settings.ketua_wa, foto: settings.ketua_foto },
                { role: 'Sekretaris', name: settings.sekretaris_rt || 'Belum diatur', wa: settings.sekretaris_wa, foto: settings.sekretaris_foto },
                { role: 'Bendahara', name: settings.bendahara_rt || 'Belum diatur', wa: settings.bendahara_wa, foto: settings.bendahara_foto },
              ].map((p) => (
                <motion.div key={p.role} variants={fadeIn} className="relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group">
                  {/* Top accent bar */}
                  <div className="h-1.5 bg-gradient-to-r from-[#1a3c5e] to-[#2e7d32]" />
                  <div className="p-6 text-center">
                    {/* Photo */}
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden border-4 border-[#f5f7fa] shadow-md group-hover:border-[#1a3c5e]/20 transition-colors">
                      {p.foto ? (
                        <img src={p.foto} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] flex items-center justify-center">
                          <span className="text-3xl font-bold text-white">{(p.name || p.role)[0]}</span>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <p className="font-bold text-[#1a3c5e]">{p.name}</p>
                    <Badge className="mt-2 bg-[#1a3c5e]/8 text-[#1a3c5e] border-[#1a3c5e]/15 text-[10px] font-medium">{p.role}</Badge>
                    {/* WhatsApp Button */}
                    {p.wa && (
                      <a
                        href={`https://wa.me/${p.wa.replace(/^0/, '62')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white font-semibold text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/30"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        Chat WhatsApp
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FINANCE */}
      <section id="finance" className="py-20 lg:py-28 bg-gradient-to-br from-[#f5f7fa] via-white to-[#f5f7fa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <Badge className="bg-[#2e7d32]/10 text-[#2e7d32] border-[#2e7d32]/20 mb-4"><Wallet className="w-3.5 h-3.5 mr-1.5" />Transparansi Keuangan</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a3c5e] mb-4">Laporan Keuangan RT 11</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Data keuangan transparan dan dapat diakses seluruh warga</p>
          </motion.div>
          {loading ? <div className="grid sm:grid-cols-3 gap-6"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /></div> : dashboard ? (<>
            <motion.div variants={stagger} className="grid sm:grid-cols-3 gap-6 mb-12">
              {[
                { t: 'Total Pemasukan', v: formatRupiah(dashboard.totalIncome), i: TrendingUp, c: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50', tc: 'text-emerald-700' },
                { t: 'Total Pengeluaran', v: formatRupiah(dashboard.totalExpense), i: TrendingDown, c: 'from-red-500 to-rose-600', bg: 'bg-red-50', tc: 'text-red-700' },
                { t: 'Saldo Kas', v: formatRupiah(dashboard.balance), i: DollarSign, c: 'from-[#1a3c5e] to-[#2e5a3e]', bg: 'bg-[#1a3c5e]/5', tc: 'text-[#1a3c5e]' },
              ].map((c) => (
                <motion.div key={c.t} variants={fadeIn}><Card className="border-0 shadow-lg hover:shadow-xl transition-shadow overflow-hidden"><CardContent className="p-6"><div className="flex items-center justify-between mb-4"><div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.c} flex items-center justify-center`}><c.i className="w-6 h-6 text-white" /></div><Badge className={`${c.bg} ${c.tc} border-0 text-xs font-medium`}>Real-time</Badge></div><p className="text-sm text-gray-500 mb-1">{c.t}</p><p className="text-2xl font-bold text-gray-900">{c.v}</p></CardContent></Card></motion.div>
              ))}
            </motion.div>
            <div className="grid lg:grid-cols-5 gap-6">
              <motion.div variants={fadeIn} className="lg:col-span-3"><Card className="border-0 shadow-lg h-full"><CardHeader><CardTitle className="text-lg font-semibold text-[#1a3c5e] flex items-center gap-2"><BarChart3 className="w-5 h-5" />Pemasukan vs Pengeluaran</CardTitle></CardHeader><CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={dashboard.chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="month" tickFormatter={getMonthLabel} tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}jt`} /><Tooltip formatter={(v: number) => formatRupiah(v)} labelFormatter={(l: string) => getMonthLabel(l)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} /><Bar dataKey="income" fill="#2e7d32" radius={[6,6,0,0]} name="Pemasukan" barSize={20} /><Bar dataKey="expense" fill="#c62828" radius={[6,6,0,0]} name="Pengeluaran" barSize={20} /></BarChart></ResponsiveContainer></div></CardContent></Card></motion.div>
              <motion.div variants={fadeIn} className="lg:col-span-2"><Card className="border-0 shadow-lg h-full"><CardHeader><CardTitle className="text-lg font-semibold text-[#1a3c5e] flex items-center gap-2"><PieChart className="w-5 h-5" />Distribusi Pengeluaran</CardTitle></CardHeader><CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dashboard.categoryData} cx="50%" cy="45%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">{dashboard.categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip formatter={(v: number) => formatRupiah(v)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} /><Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={(v: string) => <span className="text-xs text-gray-600">{v}</span>} /></PieChart></ResponsiveContainer></div></CardContent></Card></motion.div>
            </div>
          </>) : <Card className="max-w-md mx-auto text-center p-8"><CardContent><p className="text-gray-400">Belum ada data keuangan</p></CardContent></Card>}
        </div>
      </section>

      {/* EVENTS */}
      <section id="events-section" className="py-16 lg:py-24 bg-[#f0f2f5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-10">
            <Badge className="bg-[#1a3c5e]/10 text-[#1a3c5e] border-[#1a3c5e]/20 mb-4"><CalendarDays className="w-3.5 h-3.5 mr-1.5" />Jadwal Kegiatan</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a3c5e] mb-3">Kegiatan RT 11</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">Jadwal kegiatan dan acara warga RT 11 Pradha Ciganitri</p>
          </motion.div>
          {events.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow border border-gray-100"><CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500 font-medium">Belum ada kegiatan terjadwal</p></div>
          ) : (
            <motion.div variants={stagger} className="space-y-4">
              {events.slice(0, 6).map((ev) => {
                const imgs = Array.isArray(ev.images) && ev.images.length > 0 ? ev.images : [];
                const attachments = Array.isArray(ev.attachments) ? ev.attachments : [];
                const isExpanded = expanded === ev.id;
                const d = new Date(ev.tanggalMulai);
                const isMultiDay = ev.tanggalSelesai && ev.tanggalMulai !== ev.tanggalSelesai;
                const past = d < new Date();
                return (
                  <motion.div key={ev.id} variants={fadeIn}>
                    <div className={`rounded-2xl shadow-lg border border-gray-200 overflow-hidden bg-white ${past ? 'opacity-50' : ''}`}>
                      {/* Left accent bar */}
                      <div className="h-1 bg-gradient-to-r from-[#1a3c5e] via-[#2e7d32] to-[#1a3c5e]" />
                      {/* Image Carousel */}
                      {imgs.length > 0 && (
                        <div className="relative h-48 sm:h-56 bg-gray-300">
                          <ImgCarousel images={imgs} id={ev.id} />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-10 pb-3 px-4 pointer-events-none">
                            <div className="flex items-center gap-2 text-white text-xs">
                              <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="font-medium drop-shadow">{formatDate(ev.tanggalMulai)}{isMultiDay ? ` — ${formatDate(ev.tanggalSelesai)}` : ''}</span>
                              {ev.lokasi && <><span className="text-white/40">·</span><MapPin className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate drop-shadow">{ev.lokasi}</span></>}
                            </div>
                          </div>
                          {!past && <div className="absolute top-3 left-3 pointer-events-none"><span className="bg-emerald-500 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow">Mendatang</span></div>}
                        </div>
                      )}
                      {/* Content */}
                      <div className="p-4 sm:p-5">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">{ev.title}</h3>
                        {imgs.length === 0 && (
                          <div className="flex items-center gap-3 mt-2.5 text-gray-500 text-xs flex-wrap">
                            <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{formatDate(ev.tanggalMulai)}{isMultiDay ? ` — ${formatDate(ev.tanggalSelesai)}` : ''}</span>
                            {ev.lokasi && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{ev.lokasi}</span>}
                            {!past && <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200">Mendatang</span>}
                          </div>
                        )}
                        {ev.description && <p className={`text-sm text-gray-600 leading-relaxed mt-3 ${isExpanded ? '' : 'line-clamp-2'}`}>{ev.description}</p>}
                        {ev.description && (
                          <button onClick={() => setExpanded(isExpanded ? null : ev.id)} className="mt-2 text-xs text-[#1a3c5e] font-semibold hover:underline flex items-center gap-1">
                            {isExpanded ? <><ChevronUp className="w-3 h-3" />Tutup</> : <><ChevronDown className="w-3 h-3" />Baca selengkapnya</>}
                          </button>
                        )}
                        {attachments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-1.5 mb-2 text-gray-500 text-xs font-semibold"><Paperclip className="w-3.5 h-3.5" />{attachments.length} Lampiran</div>
                            <div className="space-y-1.5">
                              {attachments.map((att, idx) => (
                                <a key={idx} href={att.url} download={att.name} className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-50 border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-colors group">
                                  <div className="w-7 h-7 rounded bg-red-100 flex items-center justify-center flex-shrink-0"><FileText className="w-3.5 h-3.5 text-red-500" /></div>
                                  <span className="text-xs text-gray-600 group-hover:text-blue-700 font-medium truncate flex-1">{att.name}</span>
                                  <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* ANNOUNCEMENTS */}
      <section id="announcements" className="py-16 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-10">
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 mb-4"><Megaphone className="w-3.5 h-3.5 mr-1.5" />Pengumuman</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a3c5e] mb-3">Informasi Terbaru</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">Pengumuman resmi dari pengurus RT 11</p>
          </motion.div>
          {announcements.length === 0 ? (
            <div className="text-center py-16 bg-amber-50/50 rounded-2xl border border-amber-100"><Megaphone className="w-12 h-12 text-amber-200 mx-auto mb-4" /><p className="text-gray-500 font-medium">Belum ada pengumuman</p></div>
          ) : (
            <motion.div variants={stagger} className="space-y-4">
              {announcements.slice(0, 6).map((a) => {
                const imgs = Array.isArray(a.images) && a.images.length > 0 ? a.images : [];
                const isExpanded = expanded === a.id;
                return (
                  <motion.div key={a.id} variants={fadeIn}>
                    <div className="rounded-2xl shadow-lg border border-gray-200 overflow-hidden bg-white">
                      {/* Top accent bar */}
                      <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
                      {/* Image Carousel */}
                      {imgs.length > 0 && (
                        <div className="relative h-48 sm:h-56 bg-gray-300">
                          <ImgCarousel images={imgs} id={a.id} />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-10 pb-3 px-4 pointer-events-none">
                            <div className="flex items-center gap-1.5 text-white text-xs"><Clock className="w-3.5 h-3.5 flex-shrink-0" /><span className="font-medium drop-shadow">{formatDate(a.tanggal)}</span></div>
                          </div>
                        </div>
                      )}
                      {/* Content */}
                      <div className="p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mt-0.5"><Megaphone className="w-4 h-4 text-white" /></div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">{a.title}</h3>
                            <div className="flex items-center gap-1.5 mt-1 text-gray-500 text-xs"><Clock className="w-3 h-3" />{formatDate(a.tanggal)}</div>
                          </div>
                        </div>
                        <p className={`text-sm text-gray-600 leading-relaxed mt-3 ${isExpanded ? '' : 'line-clamp-2'}`}>{a.content}</p>
                        {a.content && (
                          <button onClick={() => setExpanded(isExpanded ? null : a.id)} className="mt-2 text-xs text-[#1a3c5e] font-semibold hover:underline flex items-center gap-1">
                            {isExpanded ? <><ChevronUp className="w-3 h-3" />Tutup</> : <><ChevronDown className="w-3 h-3" />Baca selengkapnya</>}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* HOW TO PAY */}
      <section id="howtopay" className="py-20 lg:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <Badge className="bg-[#f9a825]/10 text-[#b8860b] border-[#f9a825]/20 mb-4"><CreditCard className="w-3.5 h-3.5 mr-1.5" />Cara Pembayaran</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a3c5e] mb-4">Bayar Iuran dengan Mudah</h2>
          </motion.div>
          <motion.div variants={stagger} className="relative">
            <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#1a3c5e]/20 via-[#2e7d32]/30 to-[#1a3c5e]/20 -translate-y-1/2 z-0" />
            <div className="grid sm:grid-cols-5 gap-6 relative z-10">
              {steps.map((s, i) => (
                <motion.div key={s.t} variants={fadeIn} className="text-center group">
                  <div className="relative inline-flex mb-5"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1a3c5e] to-[#2e5a3e] flex items-center justify-center shadow-lg group-hover:scale-110 transition-all"><s.icon className="w-7 h-7 text-white" /></div><div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#2e7d32] text-white text-xs font-bold flex items-center justify-center">{i + 1}</div></div>
                  <h4 className="font-bold text-[#1a3c5e] text-sm">{s.t}</h4><p className="text-xs text-gray-500 mt-1">{s.d}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
          <motion.div variants={fadeIn} className="mt-12 text-center"><Card className="inline-block border-0 shadow-lg bg-gradient-to-r from-[#1a3c5e] to-[#2e5a3e]"><CardContent className="p-6 sm:p-8"><p className="text-white/70 text-sm mb-1">Nominal Iuran Bulanan</p><p className="text-3xl sm:text-4xl font-extrabold text-white">{formatRupiah(parseInt(settings.default_iwk_nominal) || 100000)}</p><p className="text-white/50 text-xs mt-2">Per bulan per KK</p></CardContent></Card></motion.div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-20 lg:py-28 bg-[#f5f7fa]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <Badge className="bg-green-50 text-green-700 border-green-200 mb-4"><Phone className="w-3.5 h-3.5 mr-1.5" />Hubungi Kami</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a3c5e] mb-4">Kontak & Lokasi</h2>
          </motion.div>
          <motion.div variants={stagger} className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { i: MapPin, t: 'Alamat', d: settings.alamat_rt || 'Komplek Pradha Ciganitri, Bandung' },
              { i: MessageCircle, t: 'WhatsApp', d: <a href={waUrl} target="_blank" rel="noopener noreferrer" className="text-[#2e7d32] font-medium hover:underline flex items-center gap-1">Chat Admin <ArrowRight className="w-3 h-3" /></a> },
              { i: Clock, t: 'Jam Operasional', d: 'Senin - Jumat\n08:00 - 17:00 WIB' },
            ].map((c) => (
              <motion.div key={c.t} variants={fadeIn}><Card className="border-0 shadow-md h-full text-center hover:shadow-lg transition-all p-6"><div className="w-14 h-14 rounded-xl bg-[#1a3c5e]/10 flex items-center justify-center mx-auto mb-4"><c.i className="w-7 h-7 text-[#1a3c5e]" /></div><h4 className="font-bold text-[#1a3c5e] mb-2">{c.t}</h4><p className="text-sm text-gray-500 whitespace-pre-line">{c.d as string}</p></Card></motion.div>
            ))}
          </motion.div>
          <motion.div variants={fadeIn} className="mt-12 text-center"><button onClick={() => window.open(waUrl, '_blank', 'noopener')} className="inline-flex items-center justify-center gap-2 bg-[#2e7d32] hover:bg-[#1a6b2c] active:bg-[#14532d] text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400/50"><MessageCircle className="w-5 h-5" />Hubungi via WhatsApp</button></motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0f1a2e] text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] flex items-center justify-center"><Building2 className="w-5 h-5 text-white" /></div><div><p className="font-bold text-white">{settings.app_name || 'IWK RT 11'}</p><p className="text-[10px] text-white/40">{settings.alamat_rt || 'Pradha Ciganitri'}</p></div></div>
              <p className="text-sm text-white/50 leading-relaxed">Sistem informasi keuangan dan manajemen kegiatan RT 11. Transparansi 100% untuk warga.</p>
            </div>
            <div><h4 className="font-bold text-white mb-4 text-sm">Tautan Cepat</h4><div className="grid grid-cols-2 gap-x-3 gap-y-1.5">{[{ l: 'Beranda', id: 'hero' },{ l: 'Tentang', id: 'about' },{ l: 'Keuangan', id: 'finance' },{ l: 'Kegiatan', id: 'events-section' },{ l: 'Pengumuman', id: 'announcements' },{ l: 'Cara Bayar', id: 'howtopay' },{ l: 'Kontak', id: 'contact' }].map((item) => <button key={item.l} onClick={() => scrollTo(item.id)} className="text-sm text-white/50 hover:text-white active:text-green-300 transition-colors flex items-center gap-1.5 py-0.5"><ChevronRight className="w-3 h-3" />{item.l}</button>)}</div></div>
            <div><h4 className="font-bold text-white mb-4 text-sm">Informasi</h4><ul className="space-y-2.5"><li className="text-sm text-white/50 flex items-center gap-2"><MapPin className="w-3.5 h-3.5 flex-shrink-0" />{settings.alamat_rt || 'Komplek Pradha Ciganitri'}</li><li className="text-sm text-white/50 flex items-center gap-2"><Phone className="w-3.5 h-3.5 flex-shrink-0" />{settings.whatsapp_admin || '-'}</li></ul></div>
            <div><h4 className="font-bold text-white mb-4 text-sm">Statistik</h4>{dashboard && <div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-white/50">Warga Aktif</span><span className="font-bold text-green-400">{dashboard.userCount}</span></div><div className="flex justify-between text-sm"><span className="text-white/50">Saldo Kas</span><span className="font-bold text-green-400">{formatRupiah(dashboard.balance)}</span></div></div>}</div>
          </div>
          <Separator className="bg-white/10 my-10" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4"><p className="text-xs text-white/40">&copy; {new Date().getFullYear()} {settings.app_name || 'IWK RT 11'}. All rights reserved.</p></div>
        </div>
      </footer>

      {scrollTop && <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-6 right-6 z-[9990] w-12 h-12 rounded-full bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white shadow-xl hover:shadow-2xl transition-all duration-150 flex items-center justify-center active:scale-95 focus-visible:outline-none" aria-label="Kembali ke atas"><ChevronUp className="w-5 h-5" /></button>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LOGIN VIEW
   ═══════════════════════════════════════════════════════════ */
function LoginView() {
  const { setView, login, setToast, settings } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setToast({ message: 'Email dan password harus diisi', type: 'error' }); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: email, password }) });
      const data = await res.json();
      if (data.success) { login(data.data.user, data.data.token); setToast({ message: 'Login berhasil! Selamat datang.', type: 'success' }); }
      else { setToast({ message: data.message, type: 'error' }); }
    } catch { setToast({ message: 'Terjadi kesalahan koneksi', type: 'error' }); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f5f7fa] to-white p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <button onClick={() => setView('landing')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1a3c5e] mb-8 transition-colors"><ArrowLeft className="w-4 h-4" />Kembali ke Beranda</button>
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#1a3c5e] to-[#2e5a3e] p-8 text-center"><div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center mx-auto mb-4"><Building2 className="w-8 h-8 text-white" /></div><h1 className="text-2xl font-bold text-white">Masuk ke {settings.app_name || 'IWK RT 11'}</h1><p className="text-white/60 text-sm mt-1">Sistem Iuran & Manajemen Kegiatan</p></div>
          <CardContent className="p-8"><form onSubmit={handleLogin} className="space-y-5">
            <div><Label htmlFor="email">Email / No. HP</Label><Input id="email" type="text" placeholder="email@contoh.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" /></div>
            <div><Label htmlFor="password">Password</Label><Input id="password" type="password" placeholder="Minimal 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" /></div>
            <button type="submit" className="w-full inline-flex items-center justify-center bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white font-bold py-4 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" disabled={loading}>{loading ? 'Memproses...' : 'Masuk'}</button>
          </form>
            <Separator className="my-6" />
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-3">Belum punya akun?</p>
              <button onClick={() => setView('register')} className="w-full py-3 text-sm font-semibold text-[#1a3c5e] border-2 border-[#1a3c5e] rounded-lg hover:bg-[#1a3c5e] hover:text-white active:bg-[#1a3c5e]/90 active:text-white transition-colors duration-150">Daftar Sekarang</button>
            </div>
            <div className="mt-6 p-3 rounded-lg bg-amber-50 border border-amber-200"><p className="text-xs text-amber-700 text-center">Demo: login dengan email terdaftar + password min 6 karakter</p></div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   REGISTER VIEW
   ═══════════════════════════════════════════════════════════ */
function RegisterView() {
  const { setView, setToast } = useAppStore();
  const [form, setForm] = useState({ nama: '', alamat: '', noHp: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama || !form.email || !form.noHp || !form.password) { setToast({ message: 'Semua field wajib diisi', type: 'error' }); return; }
    if (form.password !== form.confirmPassword) { setToast({ message: 'Password tidak cocok', type: 'error' }); return; }
    if (form.password.length < 6) { setToast({ message: 'Password minimal 6 karakter', type: 'error' }); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { setToast({ message: data.message, type: 'success' }); setView('login'); }
      else { setToast({ message: data.message, type: 'error' }); }
    } catch { setToast({ message: 'Terjadi kesalahan koneksi', type: 'error' }); }
    finally { setLoading(false); }
  };

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f5f7fa] to-white p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <button onClick={() => setView('landing')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1a3c5e] mb-8 transition-colors"><ArrowLeft className="w-4 h-4" />Kembali ke Beranda</button>
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#2e7d32] to-[#1a6b2c] p-8 text-center"><div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center mx-auto mb-4"><UserPlus className="w-8 h-8 text-white" /></div><h1 className="text-2xl font-bold text-white">Daftar Akun Baru</h1><p className="text-white/60 text-sm mt-1">Bergabung sebagai warga RT 11</p></div>
          <CardContent className="p-8"><form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Nama Lengkap</Label><Input placeholder="Nama lengkap" value={form.nama} onChange={(e) => update('nama', e.target.value)} className="mt-1" /></div>
            <div><Label>Nomor Rumah (Blok)</Label><Input placeholder="Contoh: 12" value={form.alamat} onChange={(e) => update('alamat', e.target.value)} className="mt-1" /></div>
            <div><Label>Nomor HP</Label><Input placeholder="08xxxxxxxxxx" value={form.noHp} onChange={(e) => update('noHp', e.target.value)} className="mt-1" /></div>
            <div><Label>Email</Label><Input type="email" placeholder="email@contoh.com" value={form.email} onChange={(e) => update('email', e.target.value)} className="mt-1" /></div>
            <div><Label>Password</Label><Input type="password" placeholder="Minimal 6 karakter" value={form.password} onChange={(e) => update('password', e.target.value)} className="mt-1" /></div>
            <div><Label>Konfirmasi Password</Label><Input type="password" placeholder="Ulangi password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} className="mt-1" /></div>
            <button type="submit" className="w-full inline-flex items-center justify-center bg-[#2e7d32] hover:bg-[#1a6b2c] active:bg-[#14532d] text-white font-bold py-4 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400/30" disabled={loading}>{loading ? 'Memproses...' : 'Daftar Sekarang'}</button>
          </form>
            <Separator className="my-6" />
            <p className="text-sm text-gray-500 text-center">Sudah punya akun? <button onClick={() => setView('login')} className="text-[#1a3c5e] font-semibold hover:underline">Masuk</button></p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   NOTE: Dashboard views are in /components/views/ (self-contained)
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   TOAST NOTIFICATION
   ═══════════════════════════════════════════════════════════ */
function Toast() {
  const { toast, setToast } = useAppStore();
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast, setToast]);
  return (
    <AnimatePresence>{toast && (
      <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className={`fixed top-20 left-1/2 z-[100] px-5 py-3 rounded-xl shadow-xl text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-[#1a3c5e] text-white'}`}>
        {toast.message}
      </motion.div>
    )}</AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN APP (SPA Router)
   ═══════════════════════════════════════════════════════════ */
export default function Home() {
  const { currentView, isAuthenticated, user, settings, fetchSettings } = useAppStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unpaid, setUnpaid] = useState<UnpaidMonth[]>([]);
  const [loading, setLoading] = useState(true);

  // Restore session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const u = localStorage.getItem('iwk_user');
      const t = localStorage.getItem('iwk_token');
      if (u && t) {
        try {
          const parsed = JSON.parse(u);
          useAppStore.getState().login(parsed, t);
        } catch { localStorage.removeItem('iwk_user'); localStorage.removeItem('iwk_token'); }
      }
    }
  }, []);

  // Fetch public data (settings from global store)
  useEffect(() => {
    const fetchPublic = async () => {
      try {
        await fetchSettings(); // Fetches settings into global store
        const [a, e, d] = await Promise.all([
          fetch('/api/announcements?limit=5'),
          fetch('/api/events?limit=8'),
          fetch('/api/dashboard'),
        ]);
        const [ad, ed, dd] = await Promise.all([a.json(), e.json(), d.json()]);
        if (ad.success) setAnnouncements(ad.data);
        if (ed.success) setEvents(ed.data);
        if (dd.success) setDashboard(dd.data);
      } catch (err) { console.error('Fetch error:', err); }
      finally { setLoading(false); }
    };
    fetchPublic();
  }, [fetchSettings]);

  // Re-fetch settings when navigating back to landing page
  useEffect(() => {
    if (currentView === 'landing') {
      fetchSettings();
    }
  }, [currentView, fetchSettings]);

  // Fetch authenticated data
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchAuth = async () => {
      try {
        const [t, u] = await Promise.all([fetch('/api/transactions?limit=20'), fetch('/api/users/unpaid')]);
        const [td, ud] = await Promise.all([t.json(), u.json()]);
        if (td.success) setTransactions(td.data);
        if (ud.success) setUnpaid(ud.data);
      } catch (err) { console.error('Auth fetch error:', err); }
    };
    fetchAuth();
  }, [isAuthenticated]);

  // Route to correct view based on auth
  const renderView = () => {
    switch (currentView) {
      // Public
      case 'landing':
        return <LandingView settings={settings} announcements={announcements} events={events} dashboard={dashboard} loading={loading} />;
      case 'login':
        return <LoginView />;
      case 'register':
        return <RegisterView />;
      // Warga
      case 'warga-dashboard':
        return <WargaDashboard />;
      case 'warga-bayar':
        return <WargaBayar />;
      case 'warga-riwayat':
        return <WargaRiwayat />;
      case 'warga-kegiatan':
        return <WargaKegiatan />;
      case 'warga-pengumuman':
        return <WargaPengumuman />;
      case 'warga-laporan':
        return <WargaLaporan />;
      case 'warga-profil':
        return <WargaProfil />;
      // Admin
      case 'admin-dashboard': return <AdminDashboard />;
      case 'admin-users': return <AdminUsers />;
      case 'admin-transaksi': return <AdminTransaksi />;
      case 'admin-validasi': return <AdminValidasi />;
      case 'admin-kegiatan': return <AdminKegiatan />;
      case 'admin-pengumuman': return <AdminPengumuman />;
      case 'admin-settings': return <AdminSettings />;
      default:
        return <LandingView settings={settings} announcements={announcements} events={events} dashboard={dashboard} loading={loading} />;
    }
  };

  return (
    <>
      <Toast />
      <AnimatePresence mode="wait">
        <motion.div key={currentView} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Menu, LogOut, LayoutDashboard, Receipt, FileText,
  CalendarDays, Bell, BarChart3, UserCircle, Megaphone, Clock,
  ChevronDown, Inbox, Info,
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
interface Announcement {
  id: string; title: string; content: string; tanggal: string; isActive: boolean;
}
interface SidebarItem { icon: typeof LayoutDashboard; label: string; view: ViewType; }

/* ═══════════════════════════════════════════════════════════ */
/*  HELPERS                                                    */
/* ═══════════════════════════════════════════════════════════ */
const formatDate = (s: string) => {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const d = new Date(s);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
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
/*  WARGA PENGUMUMAN                                           */
/* ═══════════════════════════════════════════════════════════ */
export default function WargaPengumuman() {
  const { user, currentView, setView, logout, sidebarOpen, toggleSidebar, settings } = useAppStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await api.getAnnouncements(20);
        if (res.success) setAnnouncements(res.data || []);
      } catch (err) {
        console.error('Fetch announcements error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

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
          <div><h1 className="text-lg font-bold text-[#1a3c5e]">Pengumuman</h1><p className="text-xs text-gray-400">Informasi terbaru dari pengurus RT</p></div>
          <Badge className="bg-[#1a3c5e]/5 text-[#1a3c5e] border-0 text-xs">{announcements.length} pengumuman</Badge>
        </header>

        <motion.div initial="hidden" animate="visible" variants={stagger} className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
          {loading ? (
            <div className="space-y-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Megaphone className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Belum Ada Pengumuman</h3>
              <p className="text-sm text-gray-400">Pengumuman terbaru akan ditampilkan di sini</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((a) => {
                const isExpanded = expanded === a.id;
                return (
                  <motion.div key={a.id} variants={fadeIn}>
                    <Card className="border-0 shadow-md hover:shadow-lg transition-all overflow-hidden">
                      <CardContent className="p-0">
                        <button onClick={() => setExpanded(isExpanded ? null : a.id)}
                          className="w-full text-left">
                          <div className="flex items-start gap-4 p-5">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1a3c5e] to-[#2e5a3e] flex items-center justify-center flex-shrink-0">
                              <Megaphone className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <h3 className="font-semibold text-gray-800 text-sm leading-tight">{a.title}</h3>
                                <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <p className="text-xs text-gray-400">{formatDate(a.tanggal)}</p>
                                {a.isActive && (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[9px] ml-1">Aktif</Badge>
                                )}
                              </div>
                              <p className={`text-sm text-gray-600 leading-relaxed mt-3 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                {a.content}
                              </p>
                            </div>
                          </div>
                          {isExpanded && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                              className="px-5 pb-4 border-t border-gray-50 pt-3">
                              <div className="flex items-start gap-2 p-3 rounded-lg bg-[#1a3c5e]/5">
                                <Info className="w-4 h-4 text-[#1a3c5e] mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-gray-600 leading-relaxed">{a.content}</p>
                              </div>
                            </motion.div>
                          )}
                        </button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

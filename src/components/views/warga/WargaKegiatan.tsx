'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Menu, LogOut, LayoutDashboard, Receipt, FileText,
  CalendarDays, Bell, BarChart3, UserCircle, MapPin, Clock,
  CalendarCheck, Users, ImageIcon, Paperclip, Download,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAppStore, type ViewType } from '@/lib/store';
import { api } from '@/lib/api';

/* ═══════════════════════════════════════════════════════════ */
/*  TYPES                                                      */
/* ═══════════════════════════════════════════════════════════ */
interface AttachmentItem {
  name: string;
  url: string;
  size: number;
}

interface EventItem {
  id: string; title: string; description: string;
  tanggalMulai: string; tanggalSelesai: string;
  lokasi: string;
  images: string[];
  attachments: AttachmentItem[];
  isActive: boolean;
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

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
/*  WARGA KEGIATAN                                             */
/* ═══════════════════════════════════════════════════════════ */
export default function WargaKegiatan() {
  const { user, currentView, setView, logout, sidebarOpen, toggleSidebar, settings } = useAppStore();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* ─── Lightbox state ─── */
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = useCallback((images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setLightboxImages([]);
    setLightboxIndex(0);
  }, []);

  const lightboxPrev = useCallback(() => {
    setLightboxIndex(prev => (prev > 0 ? prev - 1 : lightboxImages.length - 1));
  }, [lightboxImages.length]);

  const lightboxNext = useCallback(() => {
    setLightboxIndex(prev => (prev < lightboxImages.length - 1 ? prev + 1 : 0));
  }, [lightboxImages.length]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.getEvents(50);
        if (res.success) setEvents(res.data || []);
      } catch (err) {
        console.error('Fetch events error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.tanggalMulai) >= now);
  const pastEvents = events.filter(e => new Date(e.tanggalMulai) < now);

  const renderEventCard = (ev: EventItem, isPast: boolean) => {
    const d = new Date(ev.tanggalMulai);
    const day = d.getDate();
    const monthShort = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()];
    const isMultiDay = ev.tanggalSelesai && ev.tanggalMulai !== ev.tanggalSelesai;

    return (
      <Card className={`border-0 shadow-md hover:shadow-lg transition-all h-full overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
        <div className="bg-gradient-to-r from-[#1a3c5e] to-[#2e5a3e] px-5 py-4 text-white">
          <div className="flex items-center gap-4">
            <div className="text-center flex-shrink-0">
              <p className="text-3xl font-extrabold leading-none">{day}</p>
              <p className="text-xs font-medium text-white/70 mt-1">{monthShort}</p>
            </div>
            <Separator orientation="vertical" className="bg-white/20 h-12" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight truncate">{ev.title}</p>
              <p className="text-[11px] text-white/60 mt-1">{formatDate(ev.tanggalMulai)}</p>
              {isMultiDay && <p className="text-[11px] text-white/60">s/d {formatDate(ev.tanggalSelesai)}</p>}
            </div>
            {!isPast && (
              <Badge className="bg-white/20 text-white border-0 text-[10px] flex-shrink-0">Mendatang</Badge>
            )}
          </div>
        </div>
        <CardContent className="p-5">
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-4">{ev.description}</p>
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-gray-400">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <p className="text-xs truncate">{ev.lokasi || 'Akan diinformasikan'}</p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <p className="text-xs">{formatDate(ev.tanggalMulai)}</p>
            </div>
          </div>

          {/* ─── Image Gallery ─── */}
          {ev.images && ev.images.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2 text-gray-500">
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{ev.images.length} foto</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ev.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => openLightbox(ev.images, idx)}
                    className="rounded-lg overflow-hidden hover:opacity-80 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1a3c5e]/30"
                  >
                    <img
                      src={img}
                      alt={`${ev.title} - foto ${idx + 1}`}
                      className="w-full h-24 object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Attachments ─── */}
          {ev.attachments && ev.attachments.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-gray-500">
                <Paperclip className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{ev.attachments.length} lampiran</span>
              </div>
              <div className="space-y-1.5">
                {ev.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    download={att.name}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                  >
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 truncate group-hover:text-[#1a3c5e] transition-colors">{att.name}</p>
                      <p className="text-[10px] text-gray-400">{formatFileSize(att.size)}</p>
                    </div>
                    <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#1a3c5e] transition-colors flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

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
          <div><h1 className="text-lg font-bold text-[#1a3c5e]">Kegiatan RT 11</h1><p className="text-xs text-gray-400">Jadwal kegiatan dan acara warga</p></div>
          <Badge className="bg-[#1a3c5e]/5 text-[#1a3c5e] border-0 text-xs">{events.length} kegiatan</Badge>
        </header>

        <motion.div initial="hidden" animate="visible" variants={stagger} className="p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <CalendarCheck className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Belum Ada Kegiatan</h3>
              <p className="text-sm text-gray-400">Kegiatan RT 11 akan segera diinformasikan</p>
            </div>
          ) : (
            <>
              {/* Upcoming Events */}
              {upcomingEvents.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <CalendarCheck className="w-5 h-5 text-[#2e7d32]" />
                    <h2 className="text-base font-semibold text-[#1a3c5e]">Kegiatan Mendatang</h2>
                    <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px]">{upcomingEvents.length}</Badge>
                  </div>
                  <motion.div variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upcomingEvents.map(ev => (
                      <motion.div key={ev.id} variants={fadeIn}>{renderEventCard(ev, false)}</motion.div>
                    ))}
                  </motion.div>
                </div>
              )}

              {/* Past Events */}
              {pastEvents.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <h2 className="text-base font-semibold text-gray-500">Kegiatan Selesai</h2>
                    <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px]">{pastEvents.length}</Badge>
                  </div>
                  <motion.div variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastEvents.map(ev => (
                      <motion.div key={ev.id} variants={fadeIn}>{renderEventCard(ev, true)}</motion.div>
                    ))}
                  </motion.div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </main>

      {/* ─── Image Lightbox Dialog ─── */}
      <Dialog open={lightboxOpen} onOpenChange={(open) => { if (!open) closeLightbox(); }}>
        <DialogContent className="sm:max-w-4xl max-w-[calc(100%-2rem)] p-0 bg-black/95 border-white/10 overflow-hidden">
          <DialogTitle className="sr-only">
            Foto {lightboxIndex + 1} dari {lightboxImages.length}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Navigasi menggunakan tombol panah kiri dan kanan
          </DialogDescription>
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>

          {/* Image counter */}
          <div className="absolute top-3 left-3 z-10 text-white/60 text-xs font-medium bg-black/40 px-2.5 py-1 rounded-full">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>

          {/* Image */}
          <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px] p-4">
            {lightboxImages[lightboxIndex] && (
              <img
                src={lightboxImages[lightboxIndex]}
                alt={`Foto ${lightboxIndex + 1}`}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>

          {/* Prev / Next buttons */}
          {lightboxImages.length > 1 && (
            <>
              <button
                onClick={lightboxPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="Foto sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={lightboxNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="Foto berikutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

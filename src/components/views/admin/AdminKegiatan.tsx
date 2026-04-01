'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Building2, LayoutDashboard, Users, ClipboardList, ShieldCheck,
  CalendarDays, Megaphone, Settings, Menu, LogOut, Plus,
  Trash2, RefreshCw, MapPin, Pencil, Paperclip, ImagePlus,
  FileText, X, Upload, Loader2, ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api';

// ── Helpers ──
const formatDate = (s: string) => {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const d = new Date(s);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

// ── Types ──
interface AttachmentItem {
  name: string;
  url: string;
  size: number;
}

interface EventItem {
  id: string;
  title: string;
  description: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  lokasi: string;
  fotoUrl: string;
  images: string[];
  attachments: AttachmentItem[];
  isActive: boolean;
  createdAt: string;
}

interface FormState {
  title: string;
  description: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  lokasi: string;
}

const emptyForm: FormState = {
  title: '',
  description: '',
  tanggalMulai: '',
  tanggalSelesai: '',
  lokasi: '',
};

// ── Menu Config ──
const adminMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', view: 'admin-dashboard' },
  { icon: Users, label: 'Kelola Warga', view: 'admin-users' },
  { icon: ClipboardList, label: 'Transaksi', view: 'admin-transaksi' },
  { icon: ShieldCheck, label: 'Validasi', view: 'admin-validasi' },
  { icon: CalendarDays, label: 'Kegiatan', view: 'admin-kegiatan' },
  { icon: Megaphone, label: 'Pengumuman', view: 'admin-pengumuman' },
  { icon: Settings, label: 'Pengaturan', view: 'admin-settings' },
];

const MAX_IMAGES = 5;
const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/gif,image/webp';
const ACCEPTED_FILES = '.pdf,.doc,.docx,.xls,.xlsx,.txt';

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function AdminKegiatan() {
  const { user, currentView, setView, logout, toggleSidebar, sidebarOpen, setToast, settings } = useAppStore();

  // ── Data State ──
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Dialog State ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Delete State ──
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);

  // ── Lightbox State ──
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // ── Form State ──
  const [form, setForm] = useState<FormState>(emptyForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<AttachmentItem[]>([]);
  const [uploading, setUploading] = useState(false);

  // ── Refs ──
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageDropRef = useRef<HTMLDivElement>(null);

  // ────────────────────────────────────────────────────────
  // FETCH
  // ────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getEvents(100);
      const data = res.data || res || [];
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setToast({ message: 'Gagal memuat data kegiatan', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [setToast]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ────────────────────────────────────────────────────────
  // RESET FORM
  // ────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setImageFiles([]);
    setExistingImages([]);
    setAttachmentFiles([]);
    setExistingAttachments([]);
    setEditingEvent(null);
    setUploading(false);
  }, []);

  // ────────────────────────────────────────────────────────
  // OPEN DIALOG — CREATE
  // ────────────────────────────────────────────────────────
  const openCreateDialog = useCallback(() => {
    resetForm();
    setDialogOpen(true);
  }, [resetForm]);

  // ────────────────────────────────────────────────────────
  // OPEN DIALOG — EDIT
  // ────────────────────────────────────────────────────────
  const openEditDialog = useCallback((ev: EventItem) => {
    setEditingEvent(ev);
    setForm({
      title: ev.title,
      description: ev.description || '',
      tanggalMulai: ev.tanggalMulai,
      tanggalSelesai: ev.tanggalSelesai || '',
      lokasi: ev.lokasi || '',
    });
    setExistingImages(Array.isArray(ev.images) ? [...ev.images] : []);
    setExistingAttachments(Array.isArray(ev.attachments) ? [...ev.attachments] : []);
    setImageFiles([]);
    setAttachmentFiles([]);
    setDialogOpen(true);
  }, []);

  // ────────────────────────────────────────────────────────
  // CLOSE DIALOG
  // ────────────────────────────────────────────────────────
  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    resetForm();
  }, [resetForm]);

  // ────────────────────────────────────────────────────────
  // IMAGE HANDLING
  // ────────────────────────────────────────────────────────
  const handleImageSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    const fileArr = Array.from(files);
    const currentTotal = existingImages.length + imageFiles.length;
    const remaining = MAX_IMAGES - currentTotal;

    if (remaining <= 0) {
      setToast({ message: `Maksimal ${MAX_IMAGES} gambar`, type: 'error' });
      return;
    }

    const validFiles: File[] = [];
    for (const f of fileArr.slice(0, remaining)) {
      if (!ACCEPTED_IMAGES.split(',').includes(f.type)) {
        setToast({ message: `${f.name}: Format tidak didukung`, type: 'error' });
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        setToast({ message: `${f.name}: Ukuran maksimal 5MB`, type: 'error' });
        continue;
      }
      validFiles.push(f);
    }
    setImageFiles(prev => [...prev, ...validFiles]);
  }, [existingImages.length, imageFiles.length, setToast]);

  const removeImageFile = useCallback((index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeExistingImage = useCallback((index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ────────────────────────────────────────────────────────
  // ATTACHMENT HANDLING
  // ────────────────────────────────────────────────────────
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    const fileArr = Array.from(files);
    const currentTotal = existingAttachments.length + attachmentFiles.length;
    const remaining = MAX_ATTACHMENTS - currentTotal;

    if (remaining <= 0) {
      setToast({ message: `Maksimal ${MAX_ATTACHMENTS} lampiran`, type: 'error' });
      return;
    }

    const validFiles: File[] = [];
    const validExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'];
    for (const f of fileArr.slice(0, remaining)) {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      if (!validExts.includes(ext)) {
        setToast({ message: `${f.name}: Format tidak didukung`, type: 'error' });
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        setToast({ message: `${f.name}: Ukuran maksimal 5MB`, type: 'error' });
        continue;
      }
      validFiles.push(f);
    }
    setAttachmentFiles(prev => [...prev, ...validFiles]);
  }, [existingAttachments.length, attachmentFiles.length, setToast]);

  const removeAttachmentFile = useCallback((index: number) => {
    setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeExistingAttachment = useCallback((index: number) => {
    setExistingAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ────────────────────────────────────────────────────────
  // SUBMIT (CREATE / UPDATE)
  // ────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!form.title || !form.tanggalMulai || !form.lokasi) {
      setToast({ message: 'Judul, tanggal mulai, dan lokasi wajib diisi', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      // 1) Upload new images
      let uploadedImageUrls = [...existingImages];
      if (imageFiles.length > 0) {
        setUploading(true);
        try {
          const imgRes = await api.uploadFiles(imageFiles);
          if (imgRes.success && imgRes.data) {
            uploadedImageUrls = [...uploadedImageUrls, ...imgRes.data.map(f => f.url)];
          } else {
            setToast({ message: 'Gagal mengunggah gambar', type: 'error' });
            setSubmitting(false);
            setUploading(false);
            return;
          }
        } catch {
          setToast({ message: 'Gagal mengunggah gambar', type: 'error' });
          setSubmitting(false);
          setUploading(false);
          return;
        }
      }

      // 2) Upload new attachments
      let uploadedAttachments = [...existingAttachments];
      if (attachmentFiles.length > 0) {
        try {
          const attRes = await api.uploadFiles(attachmentFiles);
          if (attRes.success && attRes.data) {
            uploadedAttachments = [
              ...uploadedAttachments,
              ...attRes.data.map(f => ({ name: f.name, url: f.url, size: f.size })),
            ];
          } else {
            setToast({ message: 'Gagal mengunggah lampiran', type: 'error' });
            setSubmitting(false);
            setUploading(false);
            return;
          }
        } catch {
          setToast({ message: 'Gagal mengunggah lampiran', type: 'error' });
          setSubmitting(false);
          setUploading(false);
          return;
        }
      }

      setUploading(false);

      // 3) Create or update event
      const payload = {
        title: form.title,
        description: form.description,
        tanggalMulai: form.tanggalMulai,
        tanggalSelesai: form.tanggalSelesai || form.tanggalMulai,
        lokasi: form.lokasi,
        images: uploadedImageUrls,
        attachments: uploadedAttachments,
      };

      let res;
      if (editingEvent) {
        res = await api.updateEvent({ ...payload, id: editingEvent.id });
      } else {
        res = await api.createEvent(payload);
      }

      if (res.success) {
        setToast({
          message: editingEvent ? 'Kegiatan berhasil diperbarui' : 'Kegiatan berhasil ditambahkan',
          type: 'success',
        });
        closeDialog();
        fetchEvents();
      } else {
        setToast({ message: res.message || 'Gagal menyimpan kegiatan', type: 'error' });
      }
    } catch {
      setToast({ message: 'Terjadi kesalahan', type: 'error' });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }, [form, editingEvent, existingImages, imageFiles, existingAttachments, attachmentFiles, setToast, closeDialog, fetchEvents]);

  // ────────────────────────────────────────────────────────
  // DELETE
  // ────────────────────────────────────────────────────────
  const openDeleteDialog = useCallback((ev: EventItem) => {
    setDeleteTarget(ev);
    setDeleteOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await api.deleteEvent(deleteTarget.id);
      if (res.success) {
        setToast({ message: 'Kegiatan berhasil dihapus', type: 'success' });
        fetchEvents();
      } else {
        setToast({ message: res.message || 'Gagal menghapus kegiatan', type: 'error' });
      }
    } catch {
      setToast({ message: 'Terjadi kesalahan', type: 'error' });
    } finally {
      setSubmitting(false);
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, setToast, fetchEvents]);

  // ────────────────────────────────────────────────────────
  // LIGHTBOX
  // ────────────────────────────────────────────────────────
  const openLightbox = useCallback((images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const lightboxPrev = useCallback(() => {
    setLightboxIndex(prev => (prev > 0 ? prev - 1 : lightboxImages.length - 1));
  }, [lightboxImages.length]);

  const lightboxNext = useCallback(() => {
    setLightboxIndex(prev => (prev < lightboxImages.length - 1 ? prev + 1 : 0));
  }, [lightboxImages.length]);

  // ────────────────────────────────────────────────────────
  // DRAG & DROP for images
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = imageDropRef.current;
    if (!el) return;

    const handleDragOver = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleImageSelect(e.dataTransfer?.files || null);
    };
    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('drop', handleDrop);
    return () => {
      el.removeEventListener('dragover', handleDragOver);
      el.removeEventListener('drop', handleDrop);
    };
  }, [handleImageSelect]);

  // ────────────────────────────────────────────────────────
  // COMPUTED
  // ────────────────────────────────────────────────────────
  const totalImages = existingImages.length + imageFiles.length;
  const totalAttachments = existingAttachments.length + attachmentFiles.length;
  const isFormValid = form.title.trim() !== '' && form.tanggalMulai !== '' && form.lokasi.trim() !== '';

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* ── SIDEBAR ── */}
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

      {/* ── MAIN ── */}
      <main className="lg:ml-64">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b px-4 sm:px-6 h-16 flex items-center justify-between">
          <button className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 z-[10000] transition-colors duration-150" onClick={toggleSidebar}><Menu className="w-5 h-5" /></button>
          <div><h1 className="text-lg font-bold text-[#1a3c5e]">Kegiatan RT</h1><p className="text-xs text-gray-400">Kelola jadwal kegiatan RT 11</p></div>
          <div className="flex items-center gap-2">
            <button className="text-gray-600 hover:text-[#1a3c5e] hover:bg-gray-100 active:bg-gray-200 font-medium px-2 py-1.5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={fetchEvents}><RefreshCw className="w-4 h-4" /></button>
            <button className="inline-flex items-center gap-1.5 bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white font-semibold text-xs px-2.5 py-1.5 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={openCreateDialog}><Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Tambah</span></button>
          </div>
        </header>

        {/* ── CONTENT ── */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
            </div>
          ) : events.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="p-16 text-center">
                <div className="w-16 h-16 rounded-full bg-[#1a3c5e]/10 flex items-center justify-center mx-auto mb-4"><CalendarDays className="w-8 h-8 text-[#1a3c5e]/30" /></div>
                <h3 className="text-lg font-bold text-gray-700 mb-2">Belum Ada Kegiatan</h3>
                <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">Mulai tambahkan kegiatan RT 11 untuk menginformasikan jadwal kepada warga.</p>
                <button className="inline-flex items-center gap-1.5 bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={openCreateDialog}><Plus className="w-3.5 h-3.5" />Tambah Kegiatan</button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((ev) => {
                const d = new Date(ev.tanggalMulai);
                const day = d.getDate();
                const ms = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()];
                const images = Array.isArray(ev.images) ? ev.images : [];
                const attachments = Array.isArray(ev.attachments) ? ev.attachments : [];

                return (
                  <Card key={ev.id} className="border-0 shadow-md hover:shadow-lg transition-all overflow-hidden group">
                    {/* ── Gradient Header ── */}
                    <div className="bg-gradient-to-r from-[#1a3c5e] to-[#2e5a3e] px-5 py-4 text-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center"><p className="text-3xl font-extrabold leading-none">{day}</p><p className="text-xs font-medium text-white/70 mt-1">{ms}</p></div>
                          <Separator orientation="vertical" className="bg-white/20 h-10" />
                          <p className="font-bold text-sm leading-tight flex-1">{ev.title}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            className="h-7 w-7 p-0 flex items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-white/15 active:bg-white/25 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                            onClick={() => openEditDialog(ev)}
                            title="Edit"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            className="h-7 w-7 p-0 flex items-center justify-center rounded-md text-white/70 hover:text-red-200 hover:bg-red-500/30 active:bg-red-500/50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                            onClick={() => openDeleteDialog(ev)}
                            title="Hapus"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ── Card Body ── */}
                    <CardContent className="p-5 space-y-3">
                      {ev.description && (
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">{ev.description}</p>
                      )}

                      {ev.lokasi && (
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <p className="text-xs truncate">{ev.lokasi}</p>
                        </div>
                      )}

                      {ev.tanggalSelesai && ev.tanggalSelesai !== ev.tanggalMulai && (
                        <div className="text-xs text-gray-400">{formatDate(ev.tanggalMulai)} — {formatDate(ev.tanggalSelesai)}</div>
                      )}

                      {/* ── Image Thumbnails ── */}
                      {images.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1">
                          {images.slice(0, 3).map((img, idx) => (
                            <button
                              key={idx}
                              className="w-12 h-12 rounded-md overflow-hidden border border-gray-200 hover:border-[#1a3c5e] transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30"
                              onClick={() => openLightbox(images, idx)}
                            >
                              <img src={img} alt={`${ev.title} ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                          {images.length > 3 && (
                            <button
                              className="w-12 h-12 rounded-md bg-gray-100 hover:bg-gray-200 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30"
                              onClick={() => openLightbox(images, 3)}
                            >
                              +{images.length - 3}
                            </button>
                          )}
                        </div>
                      )}

                      {/* ── Attachment Badge ── */}
                      {attachments.length > 0 && (
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="text-xs">{attachments.length} lampiran</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CREATE / EDIT DIALOG                                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Kegiatan' : 'Tambah Kegiatan'}</DialogTitle>
            <DialogDescription>{editingEvent ? 'Perbarui detail kegiatan RT 11' : 'Tambahkan jadwal kegiatan baru RT 11'}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div>
              <Label>Judul Kegiatan <span className="text-red-500">*</span></Label>
              <Input placeholder="Contoh: Kerja Bakti Bulanan" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} className="mt-1.5" />
            </div>

            {/* Description */}
            <div>
              <Label>Deskripsi</Label>
              <Textarea placeholder="Detail kegiatan (opsional)" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} className="mt-1.5 min-h-[80px] resize-y" rows={3} />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tanggal Mulai <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.tanggalMulai} onChange={(e) => setForm(p => ({ ...p, tanggalMulai: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Tanggal Selesai</Label>
                <Input type="date" value={form.tanggalSelesai} onChange={(e) => setForm(p => ({ ...p, tanggalSelesai: e.target.value }))} className="mt-1.5" min={form.tanggalMulai} />
              </div>
            </div>

            {/* Location */}
            <div>
              <Label>Lokasi <span className="text-red-500">*</span></Label>
              <Input placeholder="Contoh: Lapangan RT 11" value={form.lokasi} onChange={(e) => setForm(p => ({ ...p, lokasi: e.target.value }))} className="mt-1.5" />
            </div>

            <Separator />

            {/* ── Image Upload Section ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" />
                  Gambar ({totalImages}/{MAX_IMAGES})
                </Label>
                {totalImages < MAX_IMAGES && (
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => imageInputRef.current?.click()}>
                    <Upload className="w-3 h-3" /> Pilih Gambar
                  </Button>
                )}
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept={ACCEPTED_IMAGES}
                multiple
                className="hidden"
                onChange={(e) => { handleImageSelect(e.target.files); e.target.value = ''; }}
              />

              {/* Drop Zone */}
              {totalImages < MAX_IMAGES && (
                <div
                  ref={imageDropRef}
                  className="border-2 border-dashed border-gray-200 hover:border-[#1a3c5e]/40 rounded-lg p-4 text-center cursor-pointer transition-colors"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImagePlus className="w-8 h-8 mx-auto text-gray-300 mb-1" />
                  <p className="text-xs text-gray-400">Seret & lepas gambar di sini, atau klik untuk memilih</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">JPG, PNG, GIF, WebP • Maks 5MB per gambar</p>
                </div>
              )}

              {/* Existing Images Preview */}
              {existingImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {existingImages.map((url, idx) => (
                    <div key={`existing-${idx}`} className="relative group/thumb w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:bg-red-600"
                        onClick={() => removeExistingImage(idx)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* New Image Files Preview */}
              {imageFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {imageFiles.map((file, idx) => {
                    const previewUrl = URL.createObjectURL(file);
                    return (
                      <div key={`new-${idx}`} className="relative group/thumb w-20 h-20 rounded-lg overflow-hidden border border-blue-200 bg-blue-50">
                        <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[9px] text-white text-center truncate px-1">{file.name}</div>
                        <button
                          type="button"
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:bg-red-600"
                          onClick={() => removeImageFile(idx)}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {totalImages >= MAX_IMAGES && (
                <p className="text-xs text-amber-600 mt-1">Batas {MAX_IMAGES} gambar tercapai</p>
              )}
            </div>

            <Separator />

            {/* ── File Attachment Section ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Lampiran ({totalAttachments}/{MAX_ATTACHMENTS})
                </Label>
                {totalAttachments < MAX_ATTACHMENTS && (
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-3 h-3" /> Pilih File
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILES}
                multiple
                className="hidden"
                onChange={(e) => { handleFileSelect(e.target.files); e.target.value = ''; }}
              />

              {/* Existing Attachments */}
              {existingAttachments.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {existingAttachments.map((att, idx) => (
                    <div key={`att-existing-${idx}`} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{att.name}</p>
                        <p className="text-[10px] text-gray-400">{formatFileSize(att.size)}</p>
                      </div>
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#1a3c5e] hover:underline flex-shrink-0">Lihat</a>
                      <button
                        type="button"
                        className="w-5 h-5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors flex-shrink-0"
                        onClick={() => removeExistingAttachment(idx)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* New Attachment Files */}
              {attachmentFiles.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {attachmentFiles.map((file, idx) => (
                    <div key={`att-new-${idx}`} className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                      <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{file.name}</p>
                        <p className="text-[10px] text-gray-400">{formatFileSize(file.size)}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-600 border-0 flex-shrink-0">Baru</Badge>
                      <button
                        type="button"
                        className="w-5 h-5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors flex-shrink-0"
                        onClick={() => removeAttachmentFile(idx)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {totalAttachments >= MAX_ATTACHMENTS && (
                <p className="text-xs text-amber-600 mt-1">Batas {MAX_ATTACHMENTS} lampiran tercapai</p>
              )}

              {totalAttachments < MAX_ATTACHMENTS && (
                <p className="text-[10px] text-gray-300 mt-1">PDF, DOC, DOCX, XLS, XLSX, TXT • Maks 5MB per file</p>
              )}
            </div>
          </div>

          {/* ── Dialog Footer ── */}
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <button
              className="flex-1 sm:flex-none border-2 border-[#1a3c5e] text-[#1a3c5e] hover:bg-[#1a3c5e] hover:text-white active:bg-[#1a3c5e]/90 active:text-white font-semibold px-4 py-2 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30"
              onClick={closeDialog}
              disabled={submitting || uploading}
            >
              Batal
            </button>
            <button
              className="flex-1 sm:flex-none bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white font-bold px-4 py-2 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30 disabled:opacity-50 flex items-center justify-center gap-2"
              onClick={handleSubmit}
              disabled={submitting || uploading || !isFormValid}
            >
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploading ? 'Mengunggah...' : submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DELETE CONFIRMATION                                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kegiatan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kegiatan &quot;{deleteTarget?.title}&quot;? Tindakan ini tidak dapat dibatalkan. Semua gambar dan lampiran terkait juga akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-red-600 hover:bg-red-700">
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* IMAGE LIGHTBOX                                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="rounded-xl max-w-3xl w-full p-0 overflow-hidden bg-black/95 border-none">
          <DialogTitle className="sr-only">Preview Gambar</DialogTitle>
          <DialogDescription className="sr-only">Preview gambar kegiatan</DialogDescription>
          <div className="relative flex items-center justify-center min-h-[300px] max-h-[80vh]">
            {/* Previous */}
            {lightboxImages.length > 1 && (
              <button
                className="absolute left-2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                onClick={lightboxPrev}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
            )}

            {/* Image */}
            <img
              src={lightboxImages[lightboxIndex]}
              alt={`Gambar ${lightboxIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain"
            />

            {/* Next */}
            {lightboxImages.length > 1 && (
              <button
                className="absolute right-2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                onClick={lightboxNext}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            )}

            {/* Counter + Close */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <span className="text-white/70 text-xs bg-black/40 px-2 py-1 rounded-full">
                {lightboxIndex + 1} / {lightboxImages.length}
              </span>
            </div>
            <button
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

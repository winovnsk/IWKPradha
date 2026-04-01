'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Building2, LayoutDashboard, Users, ClipboardList, ShieldCheck,
  CalendarDays, Megaphone, Settings, Menu, LogOut, Plus,
  Trash2, Edit, RefreshCw, Clock, Paperclip, X, ImageIcon,
  Upload, Eye, Loader2, Volume2, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api';

const formatDate = (s: string) => {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const d = new Date(s);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface Announcement {
  id: string;
  title: string;
  content: string;
  tanggal: string;
  images: string[];
  attachments: { name: string; url: string; size: number }[];
  isActive: boolean;
  createdAt: string;
}

interface FormData {
  title: string;
  content: string;
  tanggal: string;
  images: string[];       // URLs of uploaded images
  attachments: { name: string; url: string; size: number }[];
}

const EMPTY_FORM: FormData = {
  title: '',
  content: '',
  tanggal: new Date().toISOString().split('T')[0],
  images: [],
  attachments: [],
};

const MAX_IMAGES = 5;
const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const adminMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', view: 'admin-dashboard' },
  { icon: Users, label: 'Kelola Warga', view: 'admin-users' },
  { icon: ClipboardList, label: 'Transaksi', view: 'admin-transaksi' },
  { icon: ShieldCheck, label: 'Validasi', view: 'admin-validasi' },
  { icon: CalendarDays, label: 'Kegiatan', view: 'admin-kegiatan' },
  { icon: Megaphone, label: 'Pengumuman', view: 'admin-pengumuman' },
  { icon: Settings, label: 'Pengaturan', view: 'admin-settings' },
];

export default function AdminPengumuman() {
  const { user, currentView, setView, logout, toggleSidebar, sidebarOpen, setToast, settings } = useAppStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAnnouncements(50);
      const data = res.data || res || [];
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch {
      setToast({ message: 'Gagal memuat data pengumuman', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [setToast]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  // ── Image lightbox navigation ──
  const openLightbox = useCallback((images: string[], idx: number) => {
    setLightboxImages(images);
    setLightboxIndex(idx);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setLightboxImages([]);
    setLightboxIndex(0);
  }, []);

  const lightboxPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : lightboxImages.length - 1));
  }, [lightboxImages.length]);

  const lightboxNext = useCallback(() => {
    setLightboxIndex((prev) => (prev < lightboxImages.length - 1 ? prev + 1 : 0));
  }, [lightboxImages.length]);

  // ── Dialog open/close ──
  const openCreateDialog = useCallback(() => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((a: Announcement) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      content: a.content,
      tanggal: a.tanggal,
      images: [...a.images],
      attachments: a.attachments.map(att => ({ ...att })),
    });
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }, []);

  // ── Image upload handler ──
  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Validate count
    const remaining = MAX_IMAGES - form.images.length;
    if (remaining <= 0) {
      setToast({ message: `Maksimal ${MAX_IMAGES} gambar`, type: 'error' });
      return;
    }

    const selected = files.slice(0, remaining);

    // Validate file types and sizes
    for (const f of selected) {
      if (!f.type.startsWith('image/')) {
        setToast({ message: `${f.name} bukan file gambar`, type: 'error' });
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        setToast({ message: `${f.name} melebihi 5MB`, type: 'error' });
        return;
      }
    }

    setUploading(true);
    try {
      const res = await api.uploadFiles(selected);
      if (res.success && res.data) {
        const newUrls = res.data.map((d) => d.url);
        setForm((prev) => ({ ...prev, images: [...prev.images, ...newUrls] }));
      } else {
        setToast({ message: 'Gagal mengunggah gambar', type: 'error' });
      }
    } catch {
      setToast({ message: 'Gagal mengunggah gambar', type: 'error' });
    } finally {
      setUploading(false);
    }

    // Reset input so same file can be re-selected
    if (imageInputRef.current) imageInputRef.current.value = '';
  }, [form.images.length, setToast]);

  const removeImage = useCallback((index: number) => {
    const removedUrl = form.images[index];
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    // Delete from server (fire-and-forget, no await)
    api.deleteFiles([removedUrl]).catch(() => {});
  }, [form.images]);

  // ── File attachment handler ──
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_FILES - form.attachments.length;
    if (remaining <= 0) {
      setToast({ message: `Maksimal ${MAX_FILES} lampiran`, type: 'error' });
      return;
    }

    const selected = files.slice(0, remaining);

    // Validate sizes
    for (const f of selected) {
      if (f.size > MAX_FILE_SIZE) {
        setToast({ message: `${f.name} melebihi 5MB`, type: 'error' });
        return;
      }
    }

    setUploading(true);
    try {
      const res = await api.uploadFiles(selected);
      if (res.success && res.data) {
        const newAttachments = res.data.map((d) => ({
          name: d.name,
          url: d.url,
          size: d.size,
        }));
        setForm((prev) => ({
          ...prev,
          attachments: [...prev.attachments, ...newAttachments],
        }));
      } else {
        setToast({ message: 'Gagal mengunggah lampiran', type: 'error' });
      }
    } catch {
      setToast({ message: 'Gagal mengunggah lampiran', type: 'error' });
    } finally {
      setUploading(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [form.attachments.length, setToast]);

  const removeAttachment = useCallback((index: number) => {
    const removedUrl = form.attachments[index].url;
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
    api.deleteFiles([removedUrl]).catch(() => {});
  }, [form.attachments]);

  // ── Submit handler (Create or Update) ──
  const handleSubmit = useCallback(async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setToast({ message: 'Judul dan konten wajib diisi', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        content: form.content,
        tanggal: form.tanggal,
        images: form.images,
        attachments: form.attachments,
      };

      let res;
      if (editingId) {
        payload.id = editingId;
        res = await api.updateAnnouncement(payload);
      } else {
        res = await api.createAnnouncement(payload);
      }

      if (res.success) {
        setToast({
          message: editingId ? 'Pengumuman berhasil diperbarui' : 'Pengumuman berhasil ditambahkan',
          type: 'success',
        });
        closeDialog();
        fetchAnnouncements();
      } else {
        setToast({ message: (res.message as string) || 'Gagal menyimpan pengumuman', type: 'error' });
      }
    } catch {
      setToast({ message: 'Terjadi kesalahan', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [form, editingId, setToast, closeDialog, fetchAnnouncements]);

  // ── Delete handler ──
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      // Delete associated files from server (fire-and-forget)
      const allUrls = [...deleteTarget.images, ...deleteTarget.attachments.map(a => a.url)];
      if (allUrls.length > 0) {
        api.deleteFiles(allUrls).catch(() => {});
      }

      const res = await api.deleteAnnouncement(deleteTarget.id);
      if (res.success) {
        setToast({ message: 'Pengumuman berhasil dihapus', type: 'success' });
        fetchAnnouncements();
      } else {
        setToast({ message: (res.message as string) || 'Gagal menghapus pengumuman', type: 'error' });
      }
    } catch {
      setToast({ message: 'Terjadi kesalahan', type: 'error' });
    } finally {
      setSubmitting(false);
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, setToast, fetchAnnouncements]);

  // ── Keyboard support for lightbox ──
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') lightboxPrev();
      if (e.key === 'ArrowRight') lightboxNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen, closeLightbox, lightboxPrev, lightboxNext]);

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* ── Sidebar ── */}
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

      {/* ── Main Content ── */}
      <main className="lg:ml-64">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b px-4 sm:px-6 h-16 flex items-center justify-between">
          <button className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 z-[10000] transition-colors duration-150" onClick={toggleSidebar}><Menu className="w-5 h-5" /></button>
          <div><h1 className="text-lg font-bold text-[#1a3c5e]">Pengumuman</h1><p className="text-xs text-gray-400">Kelola pengumuman untuk warga RT 11</p></div>
          <div className="flex items-center gap-2">
            <button className="text-gray-600 hover:text-[#1a3c5e] hover:bg-gray-100 active:bg-gray-200 font-medium px-2 py-1.5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={fetchAnnouncements}><RefreshCw className="w-4 h-4" /></button>
            <button className="inline-flex items-center gap-1.5 bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white font-semibold text-xs px-2.5 py-1.5 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={openCreateDialog}><Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Tambah</span></button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : announcements.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="p-16 text-center">
                <div className="w-16 h-16 rounded-full bg-[#1a3c5e]/10 flex items-center justify-center mx-auto mb-4"><Volume2 className="w-8 h-8 text-[#1a3c5e]/30" /></div>
                <h3 className="text-lg font-bold text-gray-700 mb-2">Belum Ada Pengumuman</h3>
                <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">Buat pengumuman untuk menyampaikan informasi penting kepada warga RT 11.</p>
                <button className="inline-flex items-center gap-1.5 bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={openCreateDialog}><Plus className="w-3.5 h-3.5" />Buat Pengumuman</button>
              </CardContent>
            </Card>
          ) : (
            announcements.map((a) => (
              <Card key={a.id} className="border-0 shadow-md hover:shadow-lg transition-all group">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a3c5e] to-[#2e5a3e] flex items-center justify-center flex-shrink-0">
                      <Megaphone className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Title row with action buttons */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-gray-800 text-sm">{a.title}</h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button className="h-7 w-7 p-0 flex items-center justify-center rounded-md text-gray-400 hover:text-[#1a3c5e] hover:bg-[#1a3c5e]/10 active:bg-[#1a3c5e]/20 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={() => openEditDialog(a)} title="Edit"><Edit className="w-3 h-3" /></button>
                          <button className="h-7 w-7 p-0 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={() => { setDeleteTarget(a); setDeleteOpen(true); }} title="Hapus"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>

                      {/* Date + status */}
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-3">
                        <Clock className="w-3 h-3" />{formatDate(a.tanggal)}
                        {a.isActive && <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px] ml-2">Aktif</Badge>}
                      </div>

                      {/* Content */}
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{a.content}</p>

                      {/* Image thumbnails */}
                      {a.images && a.images.length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {a.images.slice(0, 3).map((img, idx) => (
                            <button
                              key={img}
                              onClick={() => openLightbox(a.images, idx)}
                              className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-lg overflow-hidden border border-gray-200 hover:border-[#1a3c5e] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30 flex-shrink-0"
                            >
                              <img src={img} alt={`Gambar ${idx + 1}`} className="object-cover w-full h-full" />
                              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                                <Eye className="w-4 h-4 text-white opacity-0 hover:opacity-100 transition-opacity" />
                              </div>
                            </button>
                          ))}
                          {a.images.length > 3 && (
                            <button
                              onClick={() => openLightbox(a.images, 3)}
                              className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-medium hover:border-[#1a3c5e] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30 flex-shrink-0"
                            >
                              +{a.images.length - 3}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Attachment indicators */}
                      {a.attachments && a.attachments.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-500 font-medium">{a.attachments.length} lampiran</span>
                          </div>
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {a.attachments.map((att, idx) => (
                              <a
                                key={att.url || idx}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-gray-500 hover:text-[#1a3c5e] transition-colors truncate max-w-xs"
                              >
                                <FileText className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{att.name}</span>
                                <span className="text-gray-300 flex-shrink-0">({formatFileSize(att.size)})</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* ═══════════════ Create/Edit Dialog ═══════════════ */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="rounded-xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Pengumuman' : 'Tambah Pengumuman'}</DialogTitle>
            <DialogDescription>{editingId ? 'Perbarui pengumuman untuk warga RT 11' : 'Buat pengumuman baru untuk warga RT 11'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Title */}
            <div>
              <Label>Judul Pengumuman <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Contoh: Jadwal Kerja Bakti Bulan Ini"
                value={form.title}
                onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                className="mt-1.5"
              />
            </div>

            {/* Date */}
            <div>
              <Label>Tanggal</Label>
              <Input
                type="date"
                value={form.tanggal}
                onChange={(e) => setForm(p => ({ ...p, tanggal: e.target.value }))}
                className="mt-1.5"
              />
            </div>

            {/* Content */}
            <div>
              <Label>Konten Pengumuman <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Tulis isi pengumuman di sini..."
                rows={5}
                value={form.content}
                onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))}
                className="mt-1.5 resize-none"
              />
            </div>

            {/* ── Image Upload Section ── */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" />
                  Gambar ({form.images.length}/{MAX_IMAGES})
                </Label>
                {form.images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploading}
                    className="text-xs text-[#1a3c5e] hover:underline font-medium disabled:opacity-50 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30 rounded"
                  >
                    <Upload className="w-3 h-3" />
                    {uploading ? 'Mengunggah...' : 'Tambah Gambar'}
                  </button>
                )}
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
              {form.images.length === 0 ? (
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-[#1a3c5e] hover:bg-[#1a3c5e]/5 transition-colors"
                >
                  <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Klik atau seret gambar ke sini</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">Maks. {MAX_IMAGES} gambar, {MAX_FILE_SIZE / 1024 / 1024}MB per gambar</p>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {form.images.map((img, idx) => (
                    <div key={img} className="relative h-20 w-20 rounded-lg overflow-hidden border border-gray-200 group/img flex-shrink-0">
                      <img src={img} alt={`Preview ${idx + 1}`} className="object-cover w-full h-full" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── File Attachment Section ── */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4" />
                  Lampiran ({form.attachments.length}/{MAX_FILES})
                </Label>
                {form.attachments.length < MAX_FILES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-xs text-[#1a3c5e] hover:underline font-medium disabled:opacity-50 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30 rounded"
                  >
                    <Upload className="w-3 h-3" />
                    {uploading ? 'Mengunggah...' : 'Tambah Lampiran'}
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              {form.attachments.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-[#1a3c5e] hover:bg-[#1a3c5e]/5 transition-colors"
                >
                  <Paperclip className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Klik untuk pilih file lampiran</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">Maks. {MAX_FILES} file, {MAX_FILE_SIZE / 1024 / 1024}MB per file</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {form.attachments.map((att, idx) => (
                    <div key={att.url} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 group/file">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{att.name}</p>
                        <p className="text-[10px] text-gray-400">{formatFileSize(att.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="h-5 w-5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <button className="border-2 border-[#1a3c5e] text-[#1a3c5e] hover:bg-[#1a3c5e] hover:text-white active:bg-[#1a3c5e]/90 active:text-white font-semibold px-4 py-2 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={closeDialog}>Batal</button>
            <button className="bg-[#1a3c5e] hover:bg-[#2e5a3e] active:bg-[#0f2438] text-white font-bold px-4 py-2 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30 disabled:opacity-50" onClick={handleSubmit} disabled={submitting || uploading}>
              {submitting ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</span>
              ) : (
                editingId ? 'Simpan Perubahan' : 'Publikasikan'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ Delete Confirmation ═══════════════ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengumuman</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengumuman &quot;{deleteTarget?.title}&quot;?
              {deleteTarget && (deleteTarget.images.length > 0 || deleteTarget.attachments.length > 0) && (
                <span className="block mt-1 text-red-500 font-medium">
                  Semua gambar ({deleteTarget.images.length}) dan lampiran ({deleteTarget.attachments.length}) juga akan dihapus.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-red-600 hover:bg-red-700">
              {submitting ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Menghapus...</span>
              ) : (
                'Hapus'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════ Image Lightbox ═══════════════ */}
      <Dialog open={lightboxOpen} onOpenChange={(open) => { if (!open) closeLightbox(); }}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none rounded-xl overflow-hidden">
          <div className="relative flex items-center justify-center min-h-[60vh] max-h-[85vh]">
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Previous button */}
            {lightboxImages.length > 1 && (
              <button
                onClick={lightboxPrev}
                className="absolute left-3 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}

            {/* Image */}
            <img
              src={lightboxImages[lightboxIndex]}
              alt={`Gambar ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain"
            />

            {/* Next button */}
            {lightboxImages.length > 1 && (
              <button
                onClick={lightboxNext}
                className="absolute right-3 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            )}

            {/* Counter */}
            {lightboxImages.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white/80">
                {lightboxIndex + 1} / {lightboxImages.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

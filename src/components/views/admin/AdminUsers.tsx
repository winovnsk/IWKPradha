'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Building2, LayoutDashboard, Users, ClipboardList, ShieldCheck,
  CalendarDays, Megaphone, Settings, Menu, LogOut, Search,
  CheckCircle2, XCircle, Trash2, RefreshCw, UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppStore, type ViewType } from '@/lib/store';
import { api } from '@/lib/api';

interface UserData { id: string; nama: string; alamat: string; noHp: string; email: string; role: string; status: string; }

const adminMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', view: 'admin-dashboard' },
  { icon: Users, label: 'Kelola Warga', view: 'admin-users' },
  { icon: ClipboardList, label: 'Transaksi', view: 'admin-transaksi' },
  { icon: ShieldCheck, label: 'Validasi', view: 'admin-validasi' },
  { icon: CalendarDays, label: 'Kegiatan', view: 'admin-kegiatan' },
  { icon: Megaphone, label: 'Pengumuman', view: 'admin-pengumuman' },
  { icon: Settings, label: 'Pengaturan', view: 'admin-settings' },
];

const tabs = [
  { label: 'Semua', value: '' },
  { label: 'Approved', value: 'approved' },
  { label: 'Pending', value: 'pending' },
  { label: 'Rejected', value: 'rejected' },
];

export default function AdminUsers() {
  const { user, currentView, setView, logout, toggleSidebar, sidebarOpen, setToast, settings } = useAppStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [search, setSearch] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'reject' | 'delete'; userid: string; nama: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.gas('getUsers', { status: activeTab, search });
      const data = res.data || res;
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setToast({ message: 'Gagal memuat data warga', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, setToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      const action = confirmAction.type === 'reject' ? 'rejectUser' : 'deleteUser';
      const res = await api.gas(action, { userid: confirmAction.userid });
      if (res.success) {
        setToast({ message: `${confirmAction.type === 'reject' ? 'Warga ditolak' : 'Warga dihapus'} berhasil`, type: 'success' });
        fetchUsers();
      } else {
        setToast({ message: res.message || 'Gagal melakukan aksi', type: 'error' });
      }
    } catch {
      setToast({ message: 'Terjadi kesalahan', type: 'error' });
    } finally {
      setActionLoading(false);
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  };

  const handleApprove = async (userid: string) => {
    try {
      const res = await api.gas('approveUser', { userid });
      if (res.success) {
        setToast({ message: 'Warga disetujui berhasil', type: 'success' });
        fetchUsers();
      } else {
        setToast({ message: res.message || 'Gagal menyetujui', type: 'error' });
      }
    } catch {
      setToast({ message: 'Terjadi kesalahan', type: 'error' });
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px]">Approved</Badge>;
      case 'pending': return <Badge className="bg-amber-50 text-amber-700 border-0 text-[10px]">Pending</Badge>;
      case 'rejected': return <Badge className="bg-red-50 text-red-700 border-0 text-[10px]">Rejected</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
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

      <main className="lg:ml-64">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b px-4 sm:px-6 h-16 flex items-center justify-between">
          <button className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 z-[10000] transition-colors duration-150" onClick={toggleSidebar}><Menu className="w-5 h-5" /></button>
          <div><h1 className="text-lg font-bold text-[#1a3c5e]">Kelola Warga</h1><p className="text-xs text-gray-400">Manajemen data warga RT 11</p></div>
          <button className="text-gray-600 hover:text-[#1a3c5e] hover:bg-gray-100 active:bg-gray-200 font-medium px-2 py-1.5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={fetchUsers}><RefreshCw className="w-4 h-4" /></button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Cari nama, email, atau alamat..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 border-0 shadow-md" />
            </div>
            <div className="flex gap-1 bg-white rounded-xl shadow-md p-1">
              {tabs.map(tab => (
                <button key={tab.value} onClick={() => setActiveTab(tab.value)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.value ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8f9fb] border-b">
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">Nama</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Alamat</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">Email</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">No HP</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">Role</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b last:border-0"><td colSpan={7}><Skeleton className="h-14 mx-4 my-2 rounded-lg" /></td></tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr><td colSpan={7}><div className="text-center py-16"><Users className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400 text-sm">Tidak ada data warga ditemukan</p></div></td></tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a3c5e] to-[#2e7d32] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{u.nama?.[0] || 'U'}</div>
                            <div><p className="font-medium text-gray-800">{u.nama}</p><p className="text-xs text-gray-400 md:hidden">{u.alamat}</p></div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 hidden md:table-cell">{u.alamat || '-'}</td>
                        <td className="py-3 px-4 text-gray-600 hidden lg:table-cell">{u.email || '-'}</td>
                        <td className="py-3 px-4 text-gray-600 hidden lg:table-cell">{u.noHp || '-'}</td>
                        <td className="py-3 px-4"><Badge variant="outline" className="text-[10px]">{u.role || 'warga'}</Badge></td>
                        <td className="py-3 px-4">{statusBadge(u.status)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            {u.status === 'pending' && (
                              <>
                                <button className="h-8 w-8 p-0 flex items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 active:bg-emerald-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={() => handleApprove(u.id)} title="Setujui"><CheckCircle2 className="w-4 h-4" /></button>
                                <button className="h-8 w-8 p-0 flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-50 hover:text-amber-700 active:bg-amber-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={() => { setConfirmAction({ type: 'reject', userid: u.id, nama: u.nama }); setConfirmOpen(true); }} title="Tolak"><UserX className="w-4 h-4" /></button>
                              </>
                            )}
                            <button className="h-8 w-8 p-0 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 hover:text-red-600 active:bg-red-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c5e]/30" onClick={() => { setConfirmAction({ type: 'delete', userid: u.id, nama: u.nama }); setConfirmOpen(true); }} title="Hapus"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!loading && users.length > 0 && (
              <div className="px-4 py-3 bg-gray-50/50 border-t text-xs text-gray-400">
                Menampilkan {users.length} warga
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'delete' ? 'Hapus Warga' : 'Tolak Pendaftaran'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'delete'
                ? `Apakah Anda yakin ingin menghapus "${confirmAction?.nama}"? Tindakan ini tidak dapat dibatalkan.`
                : `Apakah Anda yakin ingin menolak pendaftaran "${confirmAction?.nama}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={actionLoading} className={confirmAction?.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}>
              {actionLoading ? 'Memproses...' : confirmAction?.type === 'delete' ? 'Hapus' : 'Tolak'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

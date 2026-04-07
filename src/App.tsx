import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Home, 
  ShieldAlert, 
  GraduationCap, 
  Plus, 
  Search, 
  AlertTriangle,
  ChevronRight,
  LogOut,
  Menu,
  X,
  FileSpreadsheet,
  Edit2,
  Settings,
  Trash2,
  Download,
  FileText
} from 'lucide-react';
import { read, utils, writeFileXLSX } from 'xlsx';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useLocation,
  useNavigate
} from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  getDoc,
  setDoc,
  deleteDoc,
  doc, 
  getDocs,
  Timestamp,
  writeBatch,
  limit
} from 'firebase/firestore';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Terjadi kesalahan pada aplikasi.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error && parsed.error.includes('insufficient permissions')) {
          displayMessage = "Anda tidak memiliki izin untuk melakukan operasi ini. Pastikan Anda masuk dengan akun yang benar.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Oops! Ada Masalah</h2>
            <p className="text-slate-600 mb-6">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all"
            >
              Muat Ulang Aplikasi
            </button>
            {process.env.NODE_ENV !== 'production' && (
              <pre className="mt-6 p-4 bg-slate-100 rounded-lg text-left text-xs overflow-auto max-h-40 text-slate-500">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Components ---

const Sidebar = ({ isOpen, toggle, userRole }: { isOpen: boolean; toggle: () => void; userRole: string | null }) => {
  const location = useLocation();
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Data Santri', path: '/students', icon: Users },
    { name: 'Asrama', path: '/dorms', icon: Home },
    { name: 'Kedisiplinan', path: '/discipline', icon: ShieldAlert },
    { name: 'Katalog Poin', path: '/catalog', icon: Settings },
    { name: 'Laporan Poin', path: '/reports', icon: FileText },
    { name: 'Kenaikan Kelas', path: '/promotion', icon: GraduationCap },
  ];

  if (userRole === 'admin') {
    menuItems.push({ name: 'Manajemen Staff', path: '/staff', icon: Settings });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={toggle}
        />
      )}
      
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-lg text-white">S</div>
            <span className="font-bold text-lg tracking-tight">SahlDev</span>
          </div>
          <button onClick={toggle} className="lg:hidden p-1 hover:bg-slate-800 rounded">
            <X size={20} />
          </button>
        </div>
        
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => window.innerWidth < 1024 && toggle()}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                location.pathname === item.path 
                  ? "bg-emerald-600 text-white" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
        
        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-slate-800">
          <button 
            onClick={() => signOut(auth)}
            className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Keluar</span>
          </button>
        </div>
      </aside>
    </>
  );
};

const Header = ({ toggleSidebar, userRole }: { toggleSidebar: () => void; userRole: string | null }) => {
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="lg:hidden p-2 hover:bg-slate-100 rounded-md">
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-semibold text-slate-800 hidden sm:block">Modul Kesantrian</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <div className="flex items-center justify-end gap-2">
            <p className="text-sm font-medium text-slate-900">{user?.displayName || 'Staff'}</p>
            {userRole && (
              <span className={cn(
                "text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded",
                userRole === 'admin' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
              )}>
                {userRole}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <img 
          src={user?.photoURL || 'https://ui-avatars.com/api/?name=Staff'} 
          alt="Avatar" 
          className="h-10 w-10 rounded-full border border-slate-200"
          referrerPolicy="no-referrer"
        />
      </div>
    </header>
  );
};

// --- Pages ---

const Dashboard = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [monthlyLogs, setMonthlyLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'students'), where('status', '==', 'Active'));
    const unsubscribeStudents = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch logs for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const logsQuery = query(
      collection(db, 'pointLogs'), 
      where('date', '>=', Timestamp.fromDate(startOfMonth)),
      orderBy('date', 'desc')
    );

    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      setMonthlyLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubscribeStudents();
      unsubscribeLogs();
    };
  }, []);

  const alertStudents = students.filter(s => s.currentPoints <= -50);

  const monthlyMerit = monthlyLogs.filter(l => l.points > 0).reduce((acc, curr) => acc + curr.points, 0);
  const monthlyDemerit = monthlyLogs.filter(l => l.points < 0).reduce((acc, curr) => acc + Math.abs(curr.points), 0);

  const stats = [
    { name: 'Total Santri', value: students.length, color: 'bg-blue-500' },
    { name: 'Peringatan (Threshold)', value: alertStudents.length, color: 'bg-red-500' },
    { name: 'Prestasi (Bulan Ini)', value: `+${monthlyMerit}`, color: 'bg-emerald-500' },
    { name: 'Pelanggaran (Bulan Ini)', value: `-${monthlyDemerit}`, color: 'bg-amber-500' },
  ];

  const seedCatalog = async () => {
    try {
      const catalogRef = collection(db, 'pointCatalog');
      const snap = await getDocs(query(catalogRef, limit(1)));
      
      if (snap.empty) {
        const items = [
          { title: 'Melanggar Jam Malam', points: -10, category: 'Pelanggaran' },
          { title: 'Tidak Mengikuti Shalat Berjamaah', points: -5, category: 'Pelanggaran' },
          { title: 'Merokok', points: -50, category: 'Pelanggaran' },
          { title: 'Berkelahi', points: -100, category: 'Pelanggaran' },
          { title: 'Juara Kelas', points: 20, category: 'Prestasi' },
          { title: 'Hafal 1 Juz Baru', points: 50, category: 'Prestasi' },
          { title: 'Membantu Kebersihan Pondok', points: 10, category: 'Prestasi' },
          { title: 'Sopan Santun Teladan', points: 15, category: 'Prestasi' },
        ];

        const batch = writeBatch(db);
        for (const item of items) {
          const newDoc = doc(catalogRef);
          batch.set(newDoc, item);
        }
        await batch.commit();
        alert('Katalog Poin berhasil diinisialisasi!');
      } else {
        alert('Katalog Poin sudah terisi.');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'pointCatalog');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard Utama</h2>
        <button 
          onClick={seedCatalog}
          className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-600 px-3 py-1 rounded transition-colors"
        >
          Inisialisasi Katalog Poin
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{stat.name}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
            <div className={cn("mt-4 h-1 w-full rounded-full", stat.color)} />
          </div>
        ))}
      </div>

      {alertStudents.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3 text-red-800 mb-4">
            <AlertTriangle size={24} />
            <h2 className="text-lg font-bold">Peringatan Threshold Poin (-50)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alertStudents.map(student => (
              <div key={student.id} className="bg-white p-4 rounded-lg border border-red-200 shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900">{student.name}</p>
                  <p className="text-sm text-slate-500">{student.level} {student.class} - {student.dorm}</p>
                </div>
                <div className="text-red-600 font-bold text-xl">{student.currentPoints}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StudentsPage = ({ userRole }: { userRole: string | null }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', nis: '', level: 'MTW', class: '1', dorm: '', musyrif: '', status: 'Active'
  });
  const [importLoading, setImportLoading] = useState(false);

  // Sorting & Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterDorm, setFilterDorm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  useEffect(() => {
    const q = query(collection(db, 'students'), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredStudents = React.useMemo(() => {
    let result = [...students];

    // Search filter
    if (searchTerm) {
      result = result.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.nis.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Class filter
    if (filterClass) {
      result = result.filter(s => s.class === filterClass);
    }

    // Dorm filter
    if (filterDorm) {
      result = result.filter(s => s.dorm === filterDorm);
    }

    // Status filter
    if (filterStatus) {
      result = result.filter(s => s.status === filterStatus);
    }

    // Sorting
    result.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle null/undefined
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [students, searchTerm, filterClass, filterDorm, filterStatus, sortConfig]);

  const uniqueClasses = Array.from(new Set(students.map(s => s.class))).sort();
  const uniqueDorms = Array.from(new Set(students.map(s => s.dorm))).filter(Boolean).sort();
  const uniqueStatuses = Array.from(new Set(students.map(s => s.status))).sort();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Check for duplicate NIS
      const duplicateNis = students.find(s => s.nis === formData.nis && s.id !== editingId);
      if (duplicateNis) {
        alert(`NIS ${formData.nis} sudah digunakan oleh ${duplicateNis.name}. Silakan gunakan NIS lain.`);
        return;
      }

      if (editingId) {
        const studentRef = doc(db, 'students', editingId);
        await updateDoc(studentRef, {
          ...formData,
          updatedAt: Timestamp.now()
        });
      } else {
        await addDoc(collection(db, 'students'), {
          ...formData,
          currentPoints: 0,
          createdAt: Timestamp.now()
        });
      }
      closeModal();
    } catch (err) {
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, `students/${editingId || ''}`);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', nis: '', level: 'MTW', class: '1', dorm: '', musyrif: '', status: 'Active' });
  };

  const handleEdit = (student: any) => {
    setEditingId(student.id);
    setFormData({
      name: student.name,
      nis: student.nis,
      level: student.level,
      class: student.class,
      dorm: student.dorm || '',
      musyrif: student.musyrif || '',
      status: student.status
    });
    setIsModalOpen(true);
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = utils.sheet_to_json(worksheet);

      const batch = writeBatch(db);
      let skippedCount = 0;
      let importedCount = 0;

      jsonData.forEach((row) => {
        const nis = String(row.NIS || row.nis || '').trim();
        const name = String(row.Nama || row.name || '').trim();
        
        if (!nis || !name) {
          skippedCount++;
          return;
        }

        // Check if NIS already exists in current state
        if (students.some(s => s.nis === nis)) {
          skippedCount++;
          return;
        }

        const studentRef = doc(collection(db, 'students'));
        batch.set(studentRef, {
          name: name,
          nis: nis,
          level: String(row.Jenjang || row.level || 'MTW').trim(),
          class: String(row.Kelas || row.class || '1').trim(),
          dorm: String(row.Kamar || row.dorm || '').trim(),
          musyrif: String(row.Musyrif || row.musyrif || '').trim(),
          status: 'Active',
          currentPoints: 0,
          createdAt: Timestamp.now()
        });
        importedCount++;
      });

      if (importedCount > 0) {
        await batch.commit();
        alert(`Berhasil mengimpor ${importedCount} data santri!${skippedCount > 0 ? ` (${skippedCount} data dilewati karena NIS duplikat atau data tidak lengkap)` : ''}`);
      } else {
        alert('Tidak ada data baru yang diimpor. Pastikan NIS belum terdaftar.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal mengimpor file Excel. Pastikan format benar.');
    } finally {
      setImportLoading(false);
      e.target.value = '';
    }
  };

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const handleDelete = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Data Santri',
      message: `Apakah Anda yakin ingin menghapus data santri: ${name}? Semua riwayat poin juga akan terhapus.`,
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          
          // Delete student document
          batch.delete(doc(db, 'students', id));
          
          // Delete related point logs
          const logsQuery = query(collection(db, 'pointLogs'), where('studentId', '==', id));
          const logsSnap = await getDocs(logsQuery);
          logsSnap.docs.forEach(logDoc => {
            batch.delete(logDoc.ref);
          });

          await batch.commit();
          setConfirmModal(null);
          alert('Data santri berhasil dihapus.');
        } catch (err: any) {
          console.error('Delete error:', err);
          let msg = 'Gagal menghapus data santri.';
          if (err.message?.includes('permission-denied')) {
            msg = 'Anda tidak memiliki izin (Permission Denied). Pastikan akun Anda adalah Admin.';
          }
          alert(msg + '\n' + (err.message || ''));
        }
      }
    });
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        Nama: 'Contoh Nama Santri',
        NIS: '12345',
        Jenjang: 'MTW',
        Kelas: '1',
        Kamar: 'Abu Bakar 01',
        Musyrif: 'Ustadz Fulan'
      }
    ];
    const worksheet = utils.json_to_sheet(templateData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Template Santri');
    writeFileXLSX(workbook, 'Template_Import_Santri.xlsx');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Manajemen Santri</h2>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={downloadTemplate}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
          >
            <Download size={18} />
            <span>Template Excel</span>
          </button>
          <label className={cn(
            "bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer text-sm font-medium",
            importLoading && "opacity-50 cursor-not-allowed"
          )}>
            <FileSpreadsheet size={18} />
            <span>{importLoading ? 'Mengimpor...' : 'Import Excel'}</span>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              onChange={handleExcelImport}
              disabled={importLoading}
            />
          </label>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            <span>Tambah Santri</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari Nama atau NIS..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
          value={filterClass}
          onChange={e => setFilterClass(e.target.value)}
        >
          <option value="">Semua Kelas</option>
          {uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}
        </select>
        <select 
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
          value={filterDorm}
          onChange={e => setFilterDorm(e.target.value)}
        >
          <option value="">Semua Asrama</option>
          {uniqueDorms.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select 
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">Semua Status</option>
          {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th 
                  className="px-6 py-4 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Nama / NIS
                    {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('class')}
                >
                  <div className="flex items-center gap-2">
                    Jenjang / Kelas
                    {sortConfig.key === 'class' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('dorm')}
                >
                  <div className="flex items-center gap-2">
                    Asrama / Musyrif
                    {sortConfig.key === 'dorm' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('currentPoints')}
                >
                  <div className="flex items-center gap-2">
                    Poin
                    {sortConfig.key === 'currentPoints' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{student.name}</p>
                    <p className="text-xs text-slate-500">{student.nis}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {student.level} {student.class}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-700">{student.dorm || '-'}</p>
                    <p className="text-xs text-slate-500">{student.musyrif || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "font-bold",
                      student.currentPoints < 0 ? "text-red-600" : "text-emerald-600"
                    )}>
                      {student.currentPoints}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-bold",
                      student.status === 'Active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                    )}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button 
                      onClick={() => handleEdit(student)}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    {userRole === 'admin' && (
                      <button 
                        onClick={() => handleDelete(student.id, student.name)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">
                {editingId ? 'Edit Data Santri' : 'Tambah Santri Baru'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">NIS</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.nis}
                    onChange={e => setFormData({...formData, nis: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jenjang</label>
                  <select 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.level}
                    onChange={e => setFormData({...formData, level: e.target.value})}
                  >
                    <option value="IL">IL (Persiapan)</option>
                    <option value="MTW">MTW (SMP)</option>
                    <option value="TSN">TSN (SMA)</option>
                    <option value="MAL">MAL (Kuliah)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kelas</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.class}
                    onChange={e => setFormData({...formData, class: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kamar Asrama</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.dorm}
                    onChange={e => setFormData({...formData, dorm: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Musyrif</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.musyrif}
                    onChange={e => setFormData({...formData, musyrif: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="Active">Aktif</option>
                    <option value="ST1">ST1 (Surat Teguran 1)</option>
                    <option value="ST2">ST2 (Surat Teguran 2)</option>
                    <option value="ST3">ST3 (Surat Teguran 3)</option>
                    <option value="SP1">SP1 (Surat Peringatan 1)</option>
                    <option value="SP2">SP2 (Surat Peringatan 2)</option>
                    <option value="SP3">SP3 (Surat Peringatan 3)</option>
                    <option value="Graduated">Lulus</option>
                    <option value="Inactive">Tidak Aktif</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors mt-4"
              >
                {editingId ? 'Simpan Perubahan' : 'Simpan Data'}
              </button>
            </form>
          </div>
        </div>
      )}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmModal.title}</h3>
            <p className="text-slate-600 mb-6">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-bold text-slate-700"
              >
                Batal
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-bold"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DisciplinePage = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedPoint, setSelectedPoint] = useState('');
  const [description, setDescription] = useState('');
  const [occurrenceDate, setOccurrenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [filterLevel, setFilterLevel] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');

  useEffect(() => {
    const qS = query(collection(db, 'students'), where('status', '==', 'Active'), orderBy('name'));
    const qC = query(collection(db, 'pointCatalog'), orderBy('category'));
    
    const unsubS = onSnapshot(qS, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubC = onSnapshot(qC, (snap) => setCatalog(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    return () => { unsubS(); unsubC(); };
  }, []);

  const filteredStudents = students.filter(s => {
    const matchLevel = filterLevel ? s.level === filterLevel : true;
    const matchClass = filterClass ? s.class === filterClass : true;
    return matchLevel && matchClass;
  });

  const filteredCatalog = catalog.filter(c => 
    c.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    c.category.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedPoint) return;
    
    setLoading(true);
    try {
      const student = students.find(s => s.id === selectedStudent);
      const pointItem = catalog.find(c => c.id === selectedPoint);
      
      const batch = writeBatch(db);
      
      // Add Log
      const logRef = doc(collection(db, 'pointLogs'));
      batch.set(logRef, {
        studentId: selectedStudent,
        catalogId: selectedPoint,
        points: pointItem.points,
        description,
        date: Timestamp.fromDate(new Date(occurrenceDate + 'T12:00:00')), // Use midday to avoid timezone issues
        createdAt: Timestamp.now(),
        levelAtTime: student.level,
        classAtTime: student.class,
        isArchived: false,
        staffId: auth.currentUser?.uid,
        staffName: auth.currentUser?.displayName
      });
      
      // Update Student Points
      const studentRef = doc(db, 'students', selectedStudent);
      batch.update(studentRef, {
        currentPoints: (student.currentPoints || 0) + pointItem.points
      });
      
      await batch.commit();
      
      setSelectedStudent('');
      setSelectedPoint('');
      setDescription('');
      alert('Poin berhasil diinput!');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Input Poin Kedisiplinan</h2>
      
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Filter Jenjang</label>
              <select 
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                value={filterLevel}
                onChange={e => { setFilterLevel(e.target.value); setSelectedStudent(''); }}
              >
                <option value="">Semua Jenjang</option>
                <option value="IL">IL (Persiapan)</option>
                <option value="MTW">MTW (SMP)</option>
                <option value="TSN">TSN (SMA)</option>
                <option value="MAL">MAL (Kuliah)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Filter Kelas</label>
              <input 
                type="text"
                placeholder="Misal: 7A"
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                value={filterClass}
                onChange={e => { setFilterClass(e.target.value); setSelectedStudent(''); }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Santri ({filteredStudents.length} ditemukan)</label>
            <select 
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              value={selectedStudent}
              onChange={e => setSelectedStudent(e.target.value)}
            >
              <option value="">-- Pilih Santri --</option>
              {filteredStudents.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.level} {s.class})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Kejadian</label>
            <input 
              required
              type="date"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              value={occurrenceDate}
              onChange={e => setOccurrenceDate(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Pelanggaran / Prestasi</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </div>
              <input 
                type="text"
                placeholder="Cari poin (misal: merokok, juara...)"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm mb-2"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
              />
            </div>
            <select 
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              value={selectedPoint}
              onChange={e => setSelectedPoint(e.target.value)}
            >
              <option value="">-- Pilih Katalog Poin --</option>
              {filteredCatalog.map(c => (
                <option key={c.id} value={c.id}>
                  [{c.category}] {c.title} ({c.points > 0 ? '+' : ''}{c.points})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kronologi / Keterangan</label>
            <textarea 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none h-32"
              placeholder="Tuliskan kronologi kejadian secara singkat..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          
          <button 
            disabled={loading}
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Input Poin Sekarang'}
          </button>
        </form>
      </div>
      
      {/* Quick Catalog Info */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <p className="text-xs text-slate-500 italic">
          * Poin pelanggaran akan mengurangi akumulasi poin santri. Jika mencapai -50, alert merah akan muncul di dashboard.
        </p>
      </div>
    </div>
  );
};

const PromotionPage = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'students'), where('status', '==', 'Active'), orderBy('level'), orderBy('class'));
    return onSnapshot(q, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const handlePromotion = async (studentId: string, type: 'Naik Kelas' | 'Naik Jenjang') => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    if (!confirm(`Apakah Anda yakin ingin memproses ${type} untuk ${student.name}?`)) return;

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const studentRef = doc(db, 'students', studentId);

      if (type === 'Naik Kelas') {
        // Just increment class
        const nextClass = (parseInt(student.class) + 1).toString();
        batch.update(studentRef, { class: nextClass });
      } else {
        // Naik Jenjang: Reset points and archive logs
        const nextLevelMap: any = { 'IL': 'MTW', 'MTW': 'TSN', 'TSN': 'MAL', 'MAL': 'Graduated' };
        const nextLevel = nextLevelMap[student.level];
        
        if (nextLevel === 'Graduated') {
          batch.update(studentRef, { status: 'Graduated' });
        } else {
          batch.update(studentRef, { 
            level: nextLevel, 
            class: '1', 
            currentPoints: 0 
          });
        }

        // Archive logs
        const logsQuery = query(collection(db, 'pointLogs'), where('studentId', '==', studentId), where('isArchived', '==', false));
        const logsSnap = await getDocs(logsQuery);
        logsSnap.docs.forEach(logDoc => {
          batch.update(logDoc.ref, { isArchived: true });
        });
      }

      await batch.commit();
      alert('Proses berhasil!');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Kenaikan Kelas & Jenjang</h2>
        <p className="text-sm text-slate-500">Proses akhir tahun akademik</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Santri</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Posisi Saat Ini</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Poin</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{student.level} Kelas {student.class}</td>
                <td className="px-6 py-4 font-bold text-slate-700">{student.currentPoints}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button 
                    onClick={() => handlePromotion(student.id, 'Naik Kelas')}
                    className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold transition-colors"
                  >
                    Naik Kelas
                  </button>
                  <button 
                    onClick={() => handlePromotion(student.id, 'Naik Jenjang')}
                    className="text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-bold transition-colors"
                  >
                    Naik Jenjang
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


const CatalogPage = ({ userRole }: { userRole: string | null }) => {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '', points: 0, category: 'Pelanggaran'
  });
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'pointCatalog'), orderBy('category'), orderBy('title'));
    return onSnapshot(q, (snap) => setCatalog(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Check for duplicate title
      const duplicateTitle = catalog.find(item => item.title.toLowerCase() === formData.title.toLowerCase() && item.id !== editingId);
      if (duplicateTitle) {
        alert(`Item dengan judul "${formData.title}" sudah ada di katalog.`);
        return;
      }

      if (editingId) {
        await updateDoc(doc(db, 'pointCatalog', editingId), formData);
      } else {
        await addDoc(collection(db, 'pointCatalog'), formData);
      }
      closeModal();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = utils.sheet_to_json(worksheet);

      const batch = writeBatch(db);
      let skippedCount = 0;
      let importedCount = 0;

      jsonData.forEach((row) => {
        const title = String(row.Judul || row.title || '').trim();
        const points = Number(row.Poin || row.points || 0);
        const category = String(row.Kategori || row.category || 'Pelanggaran').trim();
        
        if (!title) {
          skippedCount++;
          return;
        }

        // Check for duplicate title in current state
        if (catalog.some(item => item.title.toLowerCase() === title.toLowerCase())) {
          skippedCount++;
          return;
        }

        const catalogRef = doc(collection(db, 'pointCatalog'));
        batch.set(catalogRef, {
          title,
          points,
          category: ['Prestasi', 'Pelanggaran'].includes(category) ? category : 'Pelanggaran'
        });
        importedCount++;
      });

      if (importedCount > 0) {
        await batch.commit();
        alert(`Berhasil mengimpor ${importedCount} item katalog!${skippedCount > 0 ? ` (${skippedCount} data dilewati karena judul duplikat atau data tidak lengkap)` : ''}`);
      } else {
        alert('Tidak ada data baru yang diimpor. Pastikan judul belum terdaftar.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal mengimpor file Excel. Pastikan format benar.');
    } finally {
      setImportLoading(false);
      e.target.value = '';
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        Judul: 'Contoh Pelanggaran',
        Poin: -10,
        Kategori: 'Pelanggaran'
      },
      {
        Judul: 'Contoh Prestasi',
        Poin: 20,
        Kategori: 'Prestasi'
      }
    ];
    const worksheet = utils.json_to_sheet(templateData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Template Katalog');
    writeFileXLSX(workbook, 'Template_Import_Katalog.xlsx');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ title: '', points: 0, category: 'Pelanggaran' });
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({ title: item.title, points: item.points, category: item.category });
    setIsModalOpen(true);
  };

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const handleDelete = async (id: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Item Katalog',
      message: `Apakah Anda yakin ingin menghapus item katalog: ${title}?`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'pointCatalog', id));
          setConfirmModal(null);
          alert('Item katalog berhasil dihapus.');
        } catch (err: any) {
          console.error('Delete error:', err);
          let msg = 'Gagal menghapus item katalog.';
          if (err.message?.includes('permission-denied')) {
            msg = 'Anda tidak memiliki izin (Permission Denied). Pastikan akun Anda adalah Admin.';
          }
          alert(msg + '\n' + (err.message || ''));
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Katalog Poin</h2>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={downloadTemplate}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
          >
            <Download size={18} />
            <span>Template Excel</span>
          </button>
          <label className={cn(
            "bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer text-sm font-medium",
            importLoading && "opacity-50 cursor-not-allowed"
          )}>
            <FileSpreadsheet size={18} />
            <span>{importLoading ? 'Mengimpor...' : 'Import Excel'}</span>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              onChange={handleExcelImport}
              disabled={importLoading}
            />
          </label>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            <span>Tambah Item</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {['Pelanggaran', 'Prestasi'].map(cat => (
          <div key={cat} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={cn(
              "px-6 py-4 border-b border-slate-200 font-bold",
              cat === 'Pelanggaran' ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"
            )}>
              {cat}
            </div>
            <div className="divide-y divide-slate-100">
              {catalog.filter(item => item.category === cat).map(item => (
                <div key={item.id} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className={cn(
                      "text-sm font-bold",
                      item.points < 0 ? "text-red-600" : "text-emerald-600"
                    )}>
                      {item.points > 0 ? '+' : ''}{item.points} Poin
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleEdit(item)}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    {userRole === 'admin' && (
                      <button 
                        onClick={() => handleDelete(item.id, item.title)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {catalog.filter(item => item.category === cat).length === 0 && (
                <div className="px-6 py-8 text-center text-slate-400 italic text-sm">
                  Belum ada data {cat.toLowerCase()}.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">
                {editingId ? 'Edit Item Katalog' : 'Tambah Item Katalog'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pelanggaran / Prestasi</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                <select 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Pelanggaran">Pelanggaran</option>
                  <option value="Prestasi">Prestasi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Jumlah Poin {formData.category === 'Pelanggaran' ? '(Gunakan tanda minus, misal: -10)' : '(Positif, misal: 20)'}
                </label>
                <input 
                  required
                  type="number" 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.points}
                  onChange={e => setFormData({...formData, points: parseInt(e.target.value) || 0})}
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors mt-4"
              >
                Simpan Item
              </button>
            </form>
          </div>
        </div>
      )}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmModal.title}</h3>
            <p className="text-slate-600 mb-6">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-bold text-slate-700"
              >
                Batal
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-bold"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ReportsPage = ({ userRole }: { userRole: string | null }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'history' | 'summary'>('history');
  
  const [editingLog, setEditingLog] = useState<any | null>(null);
  const [confirmDeleteLog, setConfirmDeleteLog] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({ points: 0, description: '', date: '' });

  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterLevel, setFilterLevel] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStudent, setFilterStudent] = useState('');

  useEffect(() => {
    const qS = query(collection(db, 'students'), orderBy('name'));
    const unsubS = onSnapshot(qS, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsubS();
  }, []);

  const summaryData = React.useMemo(() => {
    if (viewMode !== 'summary') return [];
    const summary: { [key: string]: any } = {};
    logs.forEach(log => {
      if (!summary[log.studentId]) {
        summary[log.studentId] = {
          studentId: log.studentId,
          studentName: log.studentName,
          studentLevel: log.studentLevel,
          studentClass: log.studentClass,
          totalPoints: 0
        };
      }
      summary[log.studentId].totalPoints += log.points;
    });
    return Object.values(summary).sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [logs, viewMode]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const start = Timestamp.fromDate(new Date(startDate + 'T00:00:00'));
      const end = Timestamp.fromDate(new Date(endDate + 'T23:59:59'));
      
      let q = query(
        collection(db, 'pointLogs'),
        where('date', '>=', start),
        where('date', '<=', end),
        orderBy('date', 'desc')
      );

      const snap = await getDocs(q);
      let results: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Client side filtering for student/class/level if needed
      if (filterStudent) {
        results = results.filter(r => r.studentId === filterStudent);
        setViewMode('history');
      }
      
      // Join with student data to get names and current class
      const enrichedResults = results.map(log => {
        const student = students.find(s => s.id === log.studentId);
        return {
          ...log,
          studentName: student?.name || 'N/A',
          studentLevel: student?.level || 'N/A',
          studentClass: student?.class || 'N/A',
          formattedDate: log.date?.toDate().toLocaleString('id-ID')
        };
      });

      let finalResults = enrichedResults;
      if (filterLevel) {
        finalResults = finalResults.filter(r => r.studentLevel === filterLevel);
      }
      if (filterClass) {
        finalResults = finalResults.filter(r => r.studentClass.toLowerCase().includes(filterClass.toLowerCase()));
      }

      setLogs(finalResults);
    } catch (err) {
      console.error(err);
      alert('Gagal mengambil data laporan.');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (logs.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    let exportData = [];
    let fileName = `Laporan_Poin_${startDate}_ke_${endDate}`;

    if (viewMode === 'summary') {
      exportData = summaryData.map(s => ({
        Nama: s.studentName,
        Jenjang: s.studentLevel,
        Kelas: s.studentClass,
        'Total Akumulasi Poin': s.totalPoints
      }));
      fileName = `Rekap_Akumulasi_Poin_${startDate}_ke_${endDate}`;
    } else {
      exportData = logs.map(log => ({
        Tanggal: log.formattedDate,
        Nama: log.studentName,
        Jenjang: log.studentLevel,
        Kelas: log.studentClass,
        Poin: log.points,
        Keterangan: log.description || '-',
        Petugas: log.staffName || 'Sistem'
      }));
    }

    const worksheet = utils.json_to_sheet(exportData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Laporan Poin');
    writeFileXLSX(workbook, `${fileName}.xlsx`);
  };

  const handleDeleteLog = async () => {
    if (!confirmDeleteLog) return;
    try {
      const batch = writeBatch(db);
      const studentRef = doc(db, 'students', confirmDeleteLog.studentId);
      const studentSnap = await getDoc(studentRef);
      
      if (studentSnap.exists()) {
        const currentPoints = studentSnap.data().currentPoints || 0;
        batch.update(studentRef, {
          currentPoints: currentPoints - confirmDeleteLog.points
        });
      }
      
      batch.delete(doc(db, 'pointLogs', confirmDeleteLog.id));
      await batch.commit();
      
      setLogs(logs.filter(l => l.id !== confirmDeleteLog.id));
      setConfirmDeleteLog(null);
      alert('Laporan berhasil dihapus.');
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus laporan.');
    }
  };

  const handleUpdateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    try {
      const batch = writeBatch(db);
      const studentRef = doc(db, 'students', editingLog.studentId);
      const studentSnap = await getDoc(studentRef);
      
      if (studentSnap.exists()) {
        const currentPoints = studentSnap.data().currentPoints || 0;
        const pointDiff = editFormData.points - editingLog.points;
        batch.update(studentRef, {
          currentPoints: currentPoints + pointDiff
        });
      }
      
      batch.update(doc(db, 'pointLogs', editingLog.id), {
        points: editFormData.points,
        description: editFormData.description,
        date: Timestamp.fromDate(new Date(editFormData.date + 'T12:00:00')),
        updatedAt: Timestamp.now()
      });
      
      await batch.commit();
      
      fetchLogs();
      setEditingLog(null);
      alert('Laporan berhasil diperbarui.');
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui laporan.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Rekapitulasi Poin</h2>
        <button 
          onClick={exportToExcel}
          disabled={logs.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Download size={20} />
          <span>Ekspor Excel</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-4 mb-4">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('history')}
              className={cn(
                "px-4 py-1.5 text-sm font-bold rounded-md transition-all",
                viewMode === 'history' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Riwayat Detail
            </button>
            <button 
              onClick={() => setViewMode('summary')}
              disabled={!!filterStudent}
              className={cn(
                "px-4 py-1.5 text-sm font-bold rounded-md transition-all",
                viewMode === 'summary' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700",
                !!filterStudent && "opacity-50 cursor-not-allowed"
              )}
            >
              Rekap Akumulasi
            </button>
          </div>
          {filterStudent && (
            <p className="text-xs text-amber-600 font-medium italic">
              * Mode Rekap dinonaktifkan saat memfilter santri spesifik.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dari Tanggal</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sampai Tanggal</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jenjang</label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
            >
              <option value="">Semua</option>
              <option value="IL">IL</option>
              <option value="MTW">MTW</option>
              <option value="TSN">TSN</option>
              <option value="MAL">MAL</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kelas</label>
            <input 
              type="text" 
              placeholder="Misal: 7A"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={fetchLogs}
              disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Search size={18} />
              <span>Tampilkan</span>
            </button>
          </div>
        </div>
        
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cari Santri Spesifik</label>
          <select 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            value={filterStudent}
            onChange={e => setFilterStudent(e.target.value)}
          >
            <option value="">-- Semua Santri --</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.level} {s.class})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {viewMode === 'history' ? (
                  <>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Tanggal</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nama Santri</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Kelas</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Poin</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Keterangan</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Aksi</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nama Santri</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Jenjang</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Kelas</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Total Akumulasi Poin</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {viewMode === 'history' ? (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{log.formattedDate}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{log.studentName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{log.studentLevel} {log.studentClass}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${log.points < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {log.points > 0 ? '+' : ''}{log.points}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={log.description}>
                      {log.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditingLog(log);
                          setEditFormData({
                            points: log.points,
                            description: log.description || '',
                            date: log.date?.toDate().toISOString().split('T')[0]
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      {userRole === 'admin' && (
                        <button 
                          onClick={() => setConfirmDeleteLog(log)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                summaryData.map(s => (
                  <tr key={s.studentId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{s.studentName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{s.studentLevel}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{s.studentClass}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${s.totalPoints < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {s.totalPoints > 0 ? '+' : ''}{s.totalPoints}
                    </td>
                  </tr>
                ))
              )}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={viewMode === 'history' ? 5 : 4} className="px-6 py-12 text-center text-slate-400 italic">
                    Klik "Tampilkan" untuk memuat data laporan.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={viewMode === 'history' ? 5 : 4} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
                      <span>Memuat data...</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Edit Laporan Poin</h3>
              <button onClick={() => setEditingLog(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateLog} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Santri</label>
                <p className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-medium">
                  {editingLog.studentName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Kejadian</label>
                <input 
                  required
                  type="date" 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={editFormData.date}
                  onChange={e => setEditFormData({...editFormData, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Poin</label>
                <input 
                  required
                  type="number" 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={editFormData.points}
                  onChange={e => setEditFormData({...editFormData, points: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan</label>
                <textarea 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                  value={editFormData.description}
                  onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors mt-4"
              >
                Simpan Perubahan
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDeleteLog && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Hapus Laporan Poin</h3>
            <p className="text-slate-600 mb-6">
              Apakah Anda yakin ingin menghapus laporan poin untuk <strong>{confirmDeleteLog.studentName}</strong>? 
              Poin santri akan dikembalikan secara otomatis.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDeleteLog(null)}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-bold text-slate-700"
              >
                Batal
              </button>
              <button 
                onClick={handleDeleteLog}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-bold"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StaffManagementPage = ({ userRole }: { userRole: string | null }) => {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole !== 'admin') return;
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [userRole]);

  const toggleRole = async (userId: string, currentRole: string) => {
    if (userId === auth.currentUser?.uid) {
      alert('Anda tidak bisa mengubah role Anda sendiri.');
      return;
    }
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      alert(`Role berhasil diubah menjadi ${newRole}`);
    } catch (err) {
      console.error(err);
      alert('Gagal mengubah role.');
    }
  };

  if (userRole !== 'admin') {
    return <div className="p-8 text-center text-red-600 font-bold">Akses Ditolak. Halaman ini hanya untuk Admin.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Manajemen Staff & Admin</h2>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nama</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Email</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Role</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">
                        {s.name?.charAt(0) || '?'}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{s.email}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded",
                      s.role === 'admin' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {s.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => toggleRole(s.id, s.role)}
                      disabled={s.id === auth.currentUser?.uid}
                      className={cn(
                        "text-xs font-bold px-3 py-1.5 rounded-lg transition-all",
                        s.role === 'admin' 
                          ? "text-slate-600 hover:bg-slate-100" 
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      )}
                    >
                      {s.role === 'admin' ? 'Jadikan User' : 'Jadikan Admin'}
                    </button>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">Memuat data staff...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const LoginPage = () => {
  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl text-center">
        <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center font-bold text-4xl text-white mx-auto mb-6">S</div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Sistem Kesantrian</h1>
        <p className="text-slate-500 mb-8 font-medium">Engineering Simplicity</p>
        
        <button 
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-4 rounded-2xl transition-all"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
          Masuk dengan Google
        </button>
        
        <p className="mt-8 text-xs text-slate-400 uppercase tracking-widest font-bold">Internal Access Only</p>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userRef = doc(db, 'users', u.uid);
        try {
          // Check if user document exists
          const userSnap = await getDoc(userRef);
          const isAdminEmail = u.email === 'suyonoalfajar@gmail.com';
          
          if (!userSnap.exists()) {
            const newUser = {
              name: u.displayName,
              email: u.email,
              role: isAdminEmail ? 'admin' : 'user',
              createdAt: Timestamp.now()
            };
            await setDoc(userRef, newUser);
            setUserRole(newUser.role);
          } else {
            const currentData = userSnap.data();
            // Force update to admin if email matches but role is not admin
            if (isAdminEmail && currentData?.role !== 'admin') {
              await updateDoc(userRef, { role: 'admin' });
              setUserRole('admin');
            } else {
              setUserRole(currentData?.role || 'user');
            }
          }
        } catch (err) {
          console.error('Error syncing user:', err);
        }
      } else {
        setUserRole(null);
      }
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  if (!authReady) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  );

  if (!user) return <LoginPage />;

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-slate-50">
          <Sidebar isOpen={isSidebarOpen} toggle={() => setIsSidebarOpen(!isSidebarOpen)} userRole={userRole} />
          
          <div className="lg:pl-64 flex flex-col min-h-screen">
            <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} userRole={userRole} />
            
            <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/students" element={<StudentsPage userRole={userRole} />} />
                <Route path="/discipline" element={<DisciplinePage />} />
                <Route path="/catalog" element={<CatalogPage userRole={userRole} />} />
                <Route path="/reports" element={<ReportsPage userRole={userRole} />} />
                <Route path="/promotion" element={<PromotionPage />} />
                <Route path="/staff" element={<StaffManagementPage userRole={userRole} />} />
                <Route path="/dorms" element={<div className="p-8 text-center text-slate-500">Fitur Manajemen Asrama sedang dalam pengembangan.</div>} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

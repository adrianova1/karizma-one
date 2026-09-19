import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, Activity, FileSpreadsheet, RefreshCw, 
  Check, X, Eye, AlertCircle, Database, CheckCircle2, ChevronDown,
  CreditCard, DollarSign, Clock, ShieldAlert, CheckCircle, Search,
  Calendar, Phone, UserCheck, ArrowUpRight, ArrowDownLeft, Save,
  Sparkles, Layers, KeyRound, Trash2, UserPlus
} from 'lucide-react';
import { User, Receipt, AuditLog, Role } from '../types.js';
import { parseSafeJson } from '../lib/api.js';
import AdminScenarioManagement from './AdminScenarioManagement.js';

interface AdminPanelViewProps {
  token: string;
  currentUserId: string;
}

interface BankCardConfig {
  cardNumber: string;
  cardOwner: string;
  cardBank: string;
}

interface BankDeposit {
  id: string;
  senderCard: string;
  amount: number;
  isAssigned: boolean;
  createdAt: string;
  assignedReceiptId?: string;
}

export default function AdminPanelView({ token, currentUserId }: AdminPanelViewProps) {
  const [activeTab, setActiveTab] = useState<'receipts' | 'card_settings' | 'bank_deposits' | 'users' | 'scenarios' | 'audits'>('receipts');
  
  // Data lists
  const [users, setUsers] = useState<User[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [bankDeposits, setBankDeposits] = useState<BankDeposit[]>([]);
  
  // Bank Card Settings state
  const [cardConfig, setCardConfig] = useState<BankCardConfig>({
    cardNumber: '6037-9911-2233-4455',
    cardOwner: 'مدیریت مرکز کاریزما',
    cardBank: 'بانک ملی ایران',
    supportReceiptUrl: '',
    supportReceiptTitle: 'ارسال فیش و اسکرین‌شات به پشتیبانی'
  });
  const [cardSaving, setCardSaving] = useState(false);
  const [cardSaveMsg, setCardSaveMsg] = useState('');

  // Bank Deposit Form
  const [depositSenderCard, setDepositSenderCard] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositMsg, setDepositMsg] = useState('');

  // Filtering & Search
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'pending' | 'success' | 'failed'>('all');
  const [receiptSearch, setReceiptSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // User Management modals state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<Role>(Role.USER);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState('');

  const [passwordResetUserId, setPasswordResetUserId] = useState<string | null>(null);
  const [resetTargetUsername, setResetTargetUsername] = useState('');
  const [targetNewPassword, setTargetNewPassword] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');

  // Confirmation Modals State (to replace window.confirm for iframe safety)
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: string; username: string } | null>(null);
  const [confirmDeclineReceiptId, setConfirmDeclineReceiptId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Actions state
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusError, setStatusError] = useState('');

  // Load all admin data
  const loadData = async () => {
    setLoading(true);
    setStatusMsg('');
    setStatusError('');
    try {
      const [usersRes, receiptsRes, auditsRes, cardRes, depositsRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/receipts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/audits', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/settings/card', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/bank-deposits', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (usersRes.ok) {
        const u = await parseSafeJson(usersRes);
        if (Array.isArray(u)) setUsers(u);
      }
      if (receiptsRes.ok) {
        const r = await parseSafeJson(receiptsRes);
        if (Array.isArray(r)) setReceipts(r);
      }
      if (auditsRes.ok) {
        const a = await parseSafeJson(auditsRes);
        if (Array.isArray(a)) setAudits(a);
      }
      if (cardRes.ok) {
        const c = await parseSafeJson(cardRes);
        if (c && c.cardNumber) {
          setCardConfig(c);
        }
      }
      if (depositsRes.ok) {
        const d = await parseSafeJson(depositsRes);
        if (Array.isArray(d)) setBankDeposits(d);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Approve Receipt
  const handleApproveReceipt = async (receiptId: string) => {
    setActionLoadingId(receiptId);
    setStatusMsg('');
    setStatusError('');
    try {
      const res = await fetch(`/api/admin/receipts/${receiptId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await parseSafeJson(res);
      if (res.ok) {
        setStatusMsg('رسید با موفقیت تایید و اشتراک کاربر بلافاصله فعال شد.');
        loadData();
      } else {
        setStatusError(data.error || 'خطا در تایید رسید');
      }
    } catch (err: any) {
      setStatusError(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Decline Receipt Execution
  const executeDeclineReceipt = async (receiptId: string) => {
    setActionLoadingId(receiptId);
    setStatusMsg('');
    setStatusError('');
    try {
      const res = await fetch(`/api/admin/receipts/${receiptId}/decline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await parseSafeJson(res);
      if (res.ok) {
        setStatusMsg('فیش واریزی با موفقیت رد شد.');
        loadData();
      } else {
        setStatusError(data.error || 'خطا در رد رسید');
      }
    } catch (err: any) {
      setStatusError(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setActionLoadingId(null);
      setConfirmDeclineReceiptId(null);
    }
  };

  // Save Destination Card Settings
  const handleSaveCardSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardSaving(true);
    setCardSaveMsg('');
    try {
      const res = await fetch('/api/admin/settings/card', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(cardConfig)
      });
      const data = await parseSafeJson(res);
      if (res.ok) {
        setCardSaveMsg('اطلاعات کارت بانکی جهت واریز کاربران با موفقیت ذخیره شد.');
      } else {
        setCardSaveMsg(data.error || 'خطا در ذخیره مشخصات کارت');
      }
    } catch (err: any) {
      setCardSaveMsg(err.message || 'خطای شبکه در ذخیره');
    } finally {
      setCardSaving(false);
    }
  };

  // Submit Bank Deposit (for auto matching)
  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositSenderCard || !depositAmount) return;
    setDepositSubmitting(true);
    setDepositMsg('');
    try {
      const res = await fetch('/api/admin/bank-deposits', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          senderCard: depositSenderCard,
          amount: Number(depositAmount)
        })
      });
      const data = await parseSafeJson(res);
      if (res.ok) {
        setDepositMsg(data.matched 
          ? 'واریزی با فیش در انتظار کاربر تطابق یافت و اشتراک او خودکار فعال شد!' 
          : 'واریزی بانکی ثبت شد و در انتظار ثبت فیش کاربر قرار گرفت.'
        );
        setDepositSenderCard('');
        setDepositAmount('');
        loadData();
      } else {
        setDepositMsg(data.error || 'خطا در ثبت واریزی');
      }
    } catch (err: any) {
      setDepositMsg(err.message || 'خطای ارتباط با سرور');
    } finally {
      setDepositSubmitting(false);
    }
  };

  // Grant Manual VIP Subscription to a User
  const handleGrantSubscription = async (userId: string, durationDays: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ durationDays, planId: 'p3' })
      });
      if (res.ok) {
        setStatusMsg(`اشتراک ${durationDays} روزه VIP با موفقیت به کاربر اعطا شد.`);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Change User Role
  const handleChangeRole = async (userId: string, newRole: Role) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setStatusMsg(`نقش کاربر به ${newRole} تغییر یافت.`);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Admin Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) {
      setCreateUserError('نام کاربری و رمز عبور الزامی است.');
      return;
    }
    setCreateUserLoading(true);
    setCreateUserError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          phoneNumber: newPhone.trim() || undefined,
          role: newRole
        })
      });
      const data = await parseSafeJson(res);
      if (res.ok) {
        setStatusMsg(`کاربر جدید "${newUsername.trim()}" با موفقیت ایجاد شد.`);
        setShowCreateUserModal(false);
        setNewUsername('');
        setNewPassword('');
        setNewPhone('');
        setNewRole(Role.USER);
        loadData();
      } else {
        setCreateUserError(data.error || 'خطا در ایجاد کاربر');
      }
    } catch (err: any) {
      setCreateUserError(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setCreateUserLoading(false);
    }
  };

  // Admin Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetUserId || !targetNewPassword) {
      setResetPasswordError('کلمه عبور جدید الزامی است.');
      return;
    }
    setResetPasswordLoading(true);
    setResetPasswordError('');
    try {
      const res = await fetch(`/api/admin/users/${passwordResetUserId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: targetNewPassword })
      });
      const data = await parseSafeJson(res);
      if (res.ok) {
        setStatusMsg(data.message || 'کلمه عبور کاربر با موفقیت بازنشانی شد.');
        setPasswordResetUserId(null);
        setTargetNewPassword('');
        setResetTargetUsername('');
        loadData();
      } else {
        setResetPasswordError(data.error || 'خطا در تغییر رمز عبور');
      }
    } catch (err: any) {
      setResetPasswordError(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  // Admin Delete User Execution
  const executeDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${confirmDeleteUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await parseSafeJson(res);
      if (res.ok) {
        setStatusMsg(data.message || `کاربر ${confirmDeleteUser.username} با موفقیت حذف شد.`);
        setConfirmDeleteUser(null);
        loadData();
      } else {
        setStatusError(data.error || 'خطا در حذف کاربر');
      }
    } catch (err: any) {
      setStatusError(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Computed summary stats
  const pendingReceiptsCount = receipts.filter(r => r.status === 'pending').length;
  const approvedReceiptsCount = receipts.filter(r => r.status === 'success').length;
  const totalIncome = receipts
    .filter(r => r.status === 'success')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // Filtered Receipts
  const filteredReceipts = receipts.filter(r => {
    if (receiptFilter !== 'all' && r.status !== receiptFilter) return false;
    if (receiptSearch.trim()) {
      const q = receiptSearch.toLowerCase();
      const matchUser = (r as any).username?.toLowerCase().includes(q);
      const matchCard = r.senderCard?.toLowerCase().includes(q);
      const matchTrace = r.traceNumber?.toLowerCase().includes(q);
      const matchPlan = (r as any).planName?.toLowerCase().includes(q);
      return matchUser || matchCard || matchTrace || matchPlan;
    }
    return true;
  });

  // Filtered Users
  const filteredUsers = users.filter(u => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return u.username.toLowerCase().includes(q) || (u.phoneNumber && u.phoneNumber.includes(q));
  });

  return (
    <div className="p-4 space-y-4 select-none pb-28 text-right dir-rtl" style={{ direction: 'rtl' }}>
      
      {/* 1. Dashboard Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-emerald-400">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white">پنل مدیریت جامع مرکز کاریزما</h2>
            <span className="text-[10px] text-slate-400">مدیریت مالی، واریزها، شماره کارت، کاربران و سناریوها</span>
          </div>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-slate-300 text-xs font-bold transition cursor-pointer active:scale-95 shadow-sm"
          title="بروزرسانی داده‌ها"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>بروزرسانی</span>
        </button>
      </div>

      {/* 2. Global Feedback Alerts */}
      {statusMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-bold flex items-center justify-between animate-fade-in shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
          <button type="button" onClick={() => setStatusMsg('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {statusError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-bold flex items-center justify-between animate-fade-in shadow-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{statusError}</span>
          </div>
          <button type="button" onClick={() => setStatusError('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Executive Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#0b0f19] border border-slate-800/90 rounded-2xl p-3 space-y-1 shadow-md">
          <span className="text-[10px] text-slate-400 font-medium">فیش‌های در انتظار بررسی:</span>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-black text-amber-400">{pendingReceiptsCount}</span>
            {pendingReceiptsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
        </div>

        <div className="bg-[#0b0f19] border border-slate-800/90 rounded-2xl p-3 space-y-1 shadow-md">
          <span className="text-[10px] text-slate-400 font-medium">فیش‌های تایید شده:</span>
          <div className="text-lg font-black text-emerald-400">{approvedReceiptsCount}</div>
        </div>

        <div className="bg-[#0b0f19] border border-slate-800/90 rounded-2xl p-3 space-y-1 shadow-md">
          <span className="text-[10px] text-slate-400 font-medium">کل واریزی‌های موفق:</span>
          <div className="text-xs sm:text-sm font-black text-white truncate">
            {totalIncome.toLocaleString('fa-IR')} <span className="text-[10px] text-slate-400 font-normal">تومان</span>
          </div>
        </div>

        <div className="bg-[#0b0f19] border border-slate-800/90 rounded-2xl p-3 space-y-1 shadow-md">
          <span className="text-[10px] text-slate-400 font-medium">کاربران ثبت‌نامی:</span>
          <div className="text-lg font-black text-sky-400">{users.length}</div>
        </div>
      </div>

      {/* 4. Tab Navigation Menu */}
      <div className="flex gap-1.5 p-1 bg-[#0b0f19] border border-slate-800/90 rounded-2xl overflow-x-auto no-scrollbar shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('receipts')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'receipts' 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>فیش‌ها و واریزها</span>
          {pendingReceiptsCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black text-[9px] rounded-full">
              {pendingReceiptsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('card_settings')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'card_settings' 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>تنظیمات کارت بانکی</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bank_deposits')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'bank_deposits' 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>تطابق پیامک بانک</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'users' 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>کاربران ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scenarios')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'scenarios' 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>سناریوها و اکسل</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audits')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'audits' 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>لاگ‌های سیستم</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: RECEIPTS & PAYMENTS MANAGEMENT */}
      {/* ============================================================== */}
      {activeTab === 'receipts' && (
        <div className="space-y-3 animate-fade-in">
          
          {/* Filter Bar & Search */}
          <div className="bg-[#0b0f19] border border-slate-800/90 rounded-2xl p-3 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
            <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto">
              {[
                { id: 'all', label: 'همه فیش‌ها' },
                { id: 'pending', label: 'در انتظار تایید', badge: pendingReceiptsCount },
                { id: 'success', label: 'تایید شده' },
                { id: 'failed', label: 'رد شده' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setReceiptFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    receiptFilter === f.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{f.label}</span>
                  {f.badge !== undefined && f.badge > 0 && (
                    <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-black">
                      {f.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={receiptSearch}
                onChange={(e) => setReceiptSearch(e.target.value)}
                placeholder="جستجو در فیش‌ها (نام، شماره کارت، کد)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Receipts List */}
          {filteredReceipts.length === 0 ? (
            <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400 space-y-1">
              <CreditCard className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
              <p>هیچ فیش پرداختی در این دسته‌بندی یافت نشد.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredReceipts.map((r: any) => {
                const isPending = r.status === 'pending';
                const isApproved = r.status === 'success';
                const isDeclined = r.status === 'failed';
                const isProcessingThis = actionLoadingId === r.id;

                return (
                  <div
                    key={r.id}
                    className={`bg-[#0b0f19] border rounded-2xl p-3.5 space-y-3 transition shadow-md ${
                      isPending 
                        ? 'border-amber-500/40 bg-amber-500/[0.02]' 
                        : isApproved 
                          ? 'border-slate-800/90' 
                          : 'border-rose-500/30 bg-rose-500/[0.02]'
                    }`}
                  >
                    {/* Top Row: User & Plan info & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">{r.username || 'کاربر سیستم'}</span>
                          <span className="text-[10px] text-slate-500">#{r.id.substring(0, 8)}</span>
                        </div>
                        <div className="text-[11px] text-sky-400 font-bold">
                          طرح انتخابی: {r.planName || r.planId || 'اشتراک ویژه'}
                        </div>
                      </div>

                      {/* Status Tag */}
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 flex items-center gap-1 ${
                        isPending 
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                          : isApproved 
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      }`}>
                        {isPending && <Clock className="w-3 h-3 text-amber-400 animate-pulse" />}
                        {isApproved && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                        {isDeclined && <AlertCircle className="w-3 h-3 text-rose-400" />}
                        <span>
                          {isPending ? 'در انتظار بررسی' : isApproved ? 'تایید و فعال شده' : 'رد شده'}
                        </span>
                      </span>
                    </div>

                    {/* Middle Row: Payment Financial Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">مبلغ واریزی:</span>
                        <span className="font-black text-amber-300 text-xs">
                          {Number(r.amount).toLocaleString('fa-IR')} تومان
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">کارت واریزکننده (مبدأ):</span>
                        <span className="font-mono text-slate-200 font-bold dir-ltr inline-block">
                          {r.senderCard || 'ثبت نشده'}
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-500 block text-[10px]">کد پیگیری / ارجاع:</span>
                        <span className="font-mono text-slate-300">
                          {r.traceNumber || 'بدون کد'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Timestamp and Action Buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                      <span className="text-[10px] text-slate-500">
                        تاریخ ثبت: {new Date(r.createdAt).toLocaleString('fa-IR')}
                      </span>

                      {/* Actions */}
                      {isPending && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isProcessingThis}
                            onClick={() => setConfirmDeclineReceiptId(r.id)}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-bold transition cursor-pointer active:scale-95"
                          >
                            رد فیش
                          </button>

                          <button
                            type="button"
                            disabled={isProcessingThis}
                            onClick={() => handleApproveReceipt(r.id)}
                            className="px-3.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl transition cursor-pointer active:scale-95 flex items-center gap-1 shadow-md shadow-emerald-950/30"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isProcessingThis ? 'در حال ثبت...' : 'تایید و فعال‌سازی فوری'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: DESTINATION BANK CARD SETTINGS */}
      {/* ============================================================== */}
      {activeTab === 'card_settings' && (
        <div className="space-y-4 animate-fade-in">
          
          <div className="bg-[#0b0f19] border border-slate-800/90 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>تنظیم شماره کارت بانکی جهت دریافت واریزهای اشتراک</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                این اطلاعات در پاپ‌آپ پرداخت کاربران نمایش داده می‌شود تا مبلغ را کارت‌به‌کارت کنند.
              </p>
            </div>

            {cardSaveMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold">
                {cardSaveMsg}
              </div>
            )}

            {/* Visual Live Card Preview */}
            <div className="max-w-md mx-auto">
              <span className="text-[10px] text-slate-500 mb-1.5 block font-bold">پیش‌نمایش کارت در صفحه پرداخت کاربران:</span>
              <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 rounded-2xl p-5 text-slate-950 shadow-xl space-y-4 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black tracking-wider uppercase opacity-80">بانک صادرکننده</span>
                    <h4 className="font-extrabold text-sm">{cardConfig.cardBank || 'بانک مقصد'}</h4>
                  </div>
                  <div className="w-9 h-7 bg-amber-300/40 rounded-md border border-amber-900/20" />
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold opacity-75">شماره کارت:</span>
                  <div className="text-base sm:text-lg font-mono font-black tracking-widest text-slate-950 dir-ltr text-center bg-black/10 py-1.5 rounded-xl">
                    {cardConfig.cardNumber || '---- ---- ---- ----'}
                  </div>
                </div>

                <div className="flex justify-between items-end text-xs font-bold pt-1">
                  <div>
                    <span className="text-[9px] opacity-75 block">صاحب کارت / حساب:</span>
                    <span>{cardConfig.cardOwner || 'نام مدیر'}</span>
                  </div>
                  <span className="text-[10px] opacity-75">مرکز کاریزما</span>
                </div>
              </div>
            </div>

            {/* Edit Card Form */}
            <form onSubmit={handleSaveCardSettings} className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">شماره کارت ۱۶ رقمی:</label>
                <input
                  type="text"
                  value={cardConfig.cardNumber}
                  onChange={(e) => setCardConfig({ ...cardConfig, cardNumber: e.target.value })}
                  placeholder="مثال: 6037-9911-2233-4455"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white font-mono dir-ltr outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">نام صاحب حساب / کارت:</label>
                  <input
                    type="text"
                    value={cardConfig.cardOwner}
                    onChange={(e) => setCardConfig({ ...cardConfig, cardOwner: e.target.value })}
                    placeholder="مثال: مدیریت مرکز کاریزما"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">نام بانک:</label>
                  <input
                    type="text"
                    value={cardConfig.cardBank}
                    onChange={(e) => setCardConfig({ ...cardConfig, cardBank: e.target.value })}
                    placeholder="مثال: بانک ملی ایران"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    required
                  />
                </div>
              </div>

              {/* Support & Screenshot Link Setting */}
              <div className="p-3.5 bg-slate-900/80 border border-sky-500/30 rounded-2xl space-y-2.5 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sky-400">
                    <span className="text-sm">📸</span>
                    <label className="text-xs font-bold text-white">لینک ارسال اسکرین‌شات / رسید پرداخت به پشتیبانی:</label>
                  </div>
                  {cardConfig.supportReceiptUrl && (
                    <a
                      href={cardConfig.supportReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-sky-400 hover:text-sky-300 underline font-bold"
                    >
                      تست لینک ↗
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  value={cardConfig.supportReceiptUrl || ''}
                  onChange={(e) => setCardConfig({ ...cardConfig, supportReceiptUrl: e.target.value })}
                  placeholder="مثال: https://t.me/admin_support یا https://rubika.ir/admin یا لینک چت"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white font-mono dir-ltr outline-none text-left"
                />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  این لینک به عنوان یک دکمه مجزا در پاپ‌آپ پرداخت نمایش داده می‌شود تا کاربر بتواند با زدن روی آن مستقیماً تصویر یا اسکرین‌شات رسید کارت‌به‌کارت خود را در تلگرام، روبیکا یا پیام‌رسان دلخواه برای شما بفرستد.
                </p>

                <div className="pt-1">
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">متن روی دکمه (اختیاری):</label>
                  <input
                    type="text"
                    value={cardConfig.supportReceiptTitle || ''}
                    onChange={(e) => setCardConfig({ ...cardConfig, supportReceiptTitle: e.target.value })}
                    placeholder="پیش‌فرض: ارسال فیش و اسکرین‌شات به پشتیبانی"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={cardSaving}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>{cardSaving ? 'در حال ذخیره...' : 'ذخیره مشخصات کارت'}</span>
                </button>
              </div>
            </form>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: BANK SMS & AUTO-MATCHING DEPOSITS */}
      {/* ============================================================== */}
      {activeTab === 'bank_deposits' && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Form to Register Deposit */}
          <div className="bg-[#0b0f19] border border-slate-800/90 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl">
            <div className="border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                <span>ثبت پیامک واریز بانکی و تطابق خودکار با رسید کاربران</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                با وارد کردن مشخصات پیامک بانک، چنانچه کاربری با این کارت و مبلغ فیش ثبت کرده باشد، اشتراک او آنی فعال می‌شود.
              </p>
            </div>

            {depositMsg && (
              <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-300 text-xs font-bold">
                {depositMsg}
              </div>
            )}

            <form onSubmit={handleSubmitDeposit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">شماره کارت واریزکننده (فرستنده):</label>
                <input
                  type="text"
                  value={depositSenderCard}
                  onChange={(e) => setDepositSenderCard(e.target.value)}
                  placeholder="۴ رقم آخر یا ۱۶ رقم کارت"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white font-mono dir-ltr outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">مبلغ واریزی (تومان):</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="مثال: 199000"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  required
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={depositSubmitting || !depositSenderCard || !depositAmount}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer active:scale-95 shadow-md flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{depositSubmitting ? 'در حال بررسی...' : 'ثبت و تطابق آنی'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of Registered Bank Deposits */}
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-300 block">
              تاریخچه واریزی‌های بانکی ثبت‌شده ({bankDeposits.length}):
            </span>
            {bankDeposits.length === 0 ? (
              <div className="p-6 bg-[#0b0f19] border border-slate-800 rounded-2xl text-center text-xs text-slate-500">
                هنوز هیچ واریزی بانکی ثبت نشده است.
              </div>
            ) : (
              bankDeposits.map((d) => (
                <div 
                  key={d.id} 
                  className="p-3 bg-[#0b0f19] border border-slate-800 rounded-2xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5 text-right">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white font-bold dir-ltr">{d.senderCard}</span>
                      <span className="text-[10px] text-slate-500">#{d.id}</span>
                    </div>
                    <span className="text-[11px] text-amber-300 font-bold">
                      {Number(d.amount).toLocaleString('fa-IR')} تومان
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      d.isAssigned 
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {d.isAssigned ? 'تطابق یافته' : 'در انتظار کاربر'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: USERS MANAGEMENT & VIP GRANTING */}
      {/* ============================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-3 animate-fade-in">
          
          {/* User Search & Add User */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="جستجو در کاربران بر اساس نام کاربری یا شماره موبایل..."
                className="w-full bg-[#0b0f19] border border-slate-800 rounded-2xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCreateUserModal(true);
                setCreateUserError('');
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-2xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md shadow-emerald-500/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>ایجاد کاربر جدید</span>
            </button>
          </div>

          <div className="space-y-2">
            {filteredUsers.map(u => {
              const hasActiveSub = (u as any).subscription?.isActive;

              return (
                <div 
                  key={u.id} 
                  className="p-3.5 bg-[#0b0f19] border border-slate-800 hover:border-slate-700 rounded-2xl space-y-2.5 transition text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 text-right">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{u.username}</span>
                        {u.role === Role.ADMIN && (
                          <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[9px] font-black">
                            مدیر کل
                          </span>
                        )}
                        {u.role === Role.MODERATOR && (
                          <span className="px-1.5 py-0.2 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded text-[9px] font-black">
                            ناظر
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{u.phoneNumber || 'شماره تلفن ثبت نشده'}</span>
                      </div>
                    </div>

                    {/* Subscription status */}
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                      u.role === Role.ADMIN
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : hasActiveSub 
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}>
                      {u.role === Role.ADMIN ? '👑 مادام‌العمر / نامحدود (VIP ادمین)' : hasActiveSub ? `👑 ${(u as any).subscription.planName}` : 'اشتراک رایگان'}
                    </span>
                  </div>

                  {/* Actions: Grant VIP, Change Role, Reset Password, Delete */}
                  <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">اعطای اشتراک:</span>
                      <button
                        type="button"
                        onClick={() => handleGrantSubscription(u.id, 7)}
                        className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-[10px] border border-slate-800 transition cursor-pointer"
                      >
                        ۷ روزه
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGrantSubscription(u.id, 30)}
                        className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[10px] border border-amber-500/30 transition cursor-pointer font-bold"
                      >
                        ۳۰ روزه VIP
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Change Role Button (Admins only) */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">نقش:</span>
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u.id, e.target.value as Role)}
                          className="bg-slate-950 border border-slate-800 text-[10px] text-slate-300 rounded-lg px-2 py-0.5 outline-none cursor-pointer"
                        >
                          <option value={Role.USER}>کاربر عادی</option>
                          <option value={Role.MODERATOR}>ناظر</option>
                          <option value={Role.ADMIN}>مدیر کل</option>
                        </select>
                      </div>

                      {/* Reset Password Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordResetUserId(u.id);
                          setResetTargetUsername(u.username);
                          setTargetNewPassword('');
                          setResetPasswordError('');
                        }}
                        title="تغییر یا بازنشانی رمز عبور"
                        className="p-1 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition cursor-pointer border border-transparent hover:border-amber-400/20"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete User Button */}
                      {u.id !== currentUserId && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteUser({ id: u.id, username: u.username })}
                          title="حذف کاربر"
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition cursor-pointer border border-transparent hover:border-rose-400/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Create User Modal */}
          {showCreateUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" style={{ direction: 'rtl' }}>
              <div className="bg-[#0b0f19] border border-emerald-500/30 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <UserPlus className="w-5 h-5" />
                    <h3 className="text-sm font-black text-white">ایجاد کاربر جدید</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(false)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {createUserError && (
                  <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{createUserError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="space-y-2.5">
                  <div className="space-y-1 text-right">
                    <label className="text-[11px] font-bold text-slate-300 block">نام کاربری (انگلیسی):</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      placeholder="مثال: amirali"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 font-mono dir-ltr text-right"
                      required
                    />
                  </div>

                  <div className="space-y-1 text-right">
                    <label className="text-[11px] font-bold text-slate-300 block">کلمه عبور:</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="حداقل ۴ کاراکتر"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 font-mono dir-ltr text-right"
                      required
                    />
                  </div>

                  <div className="space-y-1 text-right">
                    <label className="text-[11px] font-bold text-slate-300 block">شماره تماس (اختیاری):</label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      placeholder="مثال: 09121234567"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 font-mono dir-ltr text-right"
                    />
                  </div>

                  <div className="space-y-1 text-right">
                    <label className="text-[11px] font-bold text-slate-300 block">نقش کاربر:</label>
                    <select
                      value={newRole}
                      onChange={e => setNewRole(e.target.value as Role)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value={Role.USER}>کاربر عادی</option>
                      <option value={Role.MODERATOR}>ناظر</option>
                      <option value={Role.ADMIN}>مدیر کل</option>
                    </select>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={createUserLoading}
                      className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {createUserLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>ثبت کاربر</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateUserModal(false)}
                      className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs rounded-xl transition cursor-pointer"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Reset Password Modal */}
          {passwordResetUserId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" style={{ direction: 'rtl' }}>
              <div className="bg-[#0b0f19] border border-amber-500/30 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 text-amber-400">
                    <KeyRound className="w-5 h-5" />
                    <h3 className="text-sm font-black text-white">تغییر رمز کاربر: {resetTargetUsername}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPasswordResetUserId(null)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {resetPasswordError && (
                  <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{resetPasswordError}</span>
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-3">
                  <div className="space-y-1 text-right">
                    <label className="text-[11px] font-bold text-slate-300 block">کلمه عبور جدید:</label>
                    <input
                      type="password"
                      value={targetNewPassword}
                      onChange={e => setTargetNewPassword(e.target.value)}
                      placeholder="رمز عبور جدید را وارد کنید..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 font-mono dir-ltr text-right"
                      required
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={resetPasswordLoading}
                      className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
                    >
                      {resetPasswordLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>ذخیره رمز جدید</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasswordResetUserId(null)}
                      className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs rounded-xl transition cursor-pointer"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: SCENARIOS & EXCEL MANAGEMENT */}
      {/* ============================================================== */}
      {activeTab === 'scenarios' && (
        <div className="animate-fade-in">
          <AdminScenarioManagement token={token} />
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: AUDIT & SECURITY LOGS */}
      {/* ============================================================== */}
      {activeTab === 'audits' && (
        <div className="space-y-2 animate-fade-in">
          <span className="text-xs font-bold text-slate-300 block">
            گزارش ۱۰۰ لاگ اخیر فعالیت‌های سیستم:
          </span>
          {audits.length === 0 ? (
            <div className="p-6 bg-[#0b0f19] border border-slate-800 rounded-2xl text-center text-xs text-slate-500">
              هیچ لاگی ثبت نشده است.
            </div>
          ) : (
            audits.slice(0, 50).map(a => (
              <div key={a.id} className="p-3 bg-[#0b0f19] border border-slate-800 rounded-2xl text-xs space-y-1">
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span className="font-bold text-sky-400">{a.username} ({a.action})</span>
                  <span>{new Date(a.createdAt).toLocaleString('fa-IR')}</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{a.details}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* ================= CONFIRM DELETE USER MODAL ================= */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="bg-[#0b0f19] border border-rose-500/40 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400 border-b border-slate-800/80 pb-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-white">تایید حذف کاربر</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              آیا از حذف کامل حساب کاربری <span className="text-rose-400 font-bold">«{confirmDeleteUser.username}»</span> و لغو تمامی دسترسی‌ها و سوابق آن اطمینان دارید؟ این عملیات غیرقابل بازگشت است.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setConfirmDeleteUser(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={executeDeleteUser}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-950/40"
              >
                {deleteLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{deleteLoading ? 'در حال حذف...' : 'بله، حذف شود'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONFIRM DECLINE RECEIPT MODAL ================= */}
      {confirmDeclineReceiptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="bg-[#0b0f19] border border-rose-500/40 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400 border-b border-slate-800/80 pb-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-white">تایید رد فیش پرداختی</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              آیا از رد کردن این فیش واریزی اطمینان دارید؟ وضعیت فیش به «رد شده» تغییر یافته و اشتراک کاربر فعال نخواهد شد.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                disabled={actionLoadingId === confirmDeclineReceiptId}
                onClick={() => setConfirmDeclineReceiptId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={actionLoadingId === confirmDeclineReceiptId}
                onClick={() => executeDeclineReceipt(confirmDeclineReceiptId)}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-950/40"
              >
                {actionLoadingId === confirmDeclineReceiptId && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{actionLoadingId === confirmDeclineReceiptId ? 'در حال رد فیش...' : 'رد فیش واریزی'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

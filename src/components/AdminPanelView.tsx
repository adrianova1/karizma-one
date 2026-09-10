import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, Activity, FileSpreadsheet, RefreshCw, 
  Check, X, Eye, AlertCircle, Database, CheckCircle2, ChevronDown
} from 'lucide-react';
import { User, Receipt, AuditLog, Role } from '../types.js';
import { parseSafeJson } from '../lib/api.js';
import AdminScenarioManagement from './AdminScenarioManagement.js';

interface AdminPanelViewProps {
  token: string;
  currentUserId: string;
}

export default function AdminPanelView({ token, currentUserId }: AdminPanelViewProps) {
  const [activeTab, setActiveTab] = useState<'scenarios' | 'users' | 'receipts' | 'audits'>('scenarios');
  const [users, setUsers] = useState<User[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, receiptsRes, auditsRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/receipts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/audits', { headers: { Authorization: `Bearer ${token}` } })
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
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleApproveReceipt = async (receiptId: string) => {
    try {
      const res = await fetch(`/api/admin/receipts/${receiptId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setStatusMsg('رسید با موفقیت تایید و اشتراک فعال شد.');
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 space-y-4 select-none pb-24 text-right dir-rtl" style={{ direction: 'rtl' }}>
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-emerald-400">
          <Shield className="w-5 h-5" />
          <h2 className="text-sm font-black text-white">پنل مدیریت جامع سیستم</h2>
        </div>
        <button
          onClick={loadData}
          className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-slate-300 transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
          {statusMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('scenarios')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'scenarios' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400'
          }`}
        >
          مدیریت سناریوها و اکسل
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'users' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400'
          }`}
        >
          کاربران ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('receipts')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'receipts' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400'
          }`}
        >
          رسیدها ({receipts.length})
        </button>
        <button
          onClick={() => setActiveTab('audits')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'audits' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400'
          }`}
        >
          گزارش لاگ‌ها
        </button>
      </div>

      {activeTab === 'scenarios' && (
        <AdminScenarioManagement token={token} />
      )}

      {activeTab === 'users' && (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="p-3 bg-[#0b0f19] border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-white">{u.username}</span>
                <span className="text-[10px] text-slate-500 mr-2">({u.phoneNumber || 'بدون شماره'})</span>
              </div>
              <span className="bg-slate-900 px-2 py-0.5 rounded text-[10px] text-slate-300">
                {u.role}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'receipts' && (
        <div className="space-y-2">
          {receipts.map(r => (
            <div key={r.id} className="p-3 bg-[#0b0f19] border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-white">رسید شماره: {r.receiptNumber}</div>
                <div className="text-[10px] text-slate-400">مبلغ: {r.amount} تومان | وضعیت: {r.status}</div>
              </div>
              {r.status === 'pending' && (
                <button
                  onClick={() => handleApproveReceipt(r.id)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs"
                >
                  تایید و فعال‌سازی
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'audits' && (
        <div className="space-y-2">
          {audits.slice(0, 30).map(a => (
            <div key={a.id} className="p-2.5 bg-[#0b0f19] border border-slate-800 rounded-xl text-xs space-y-1">
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>{a.username} ({a.action})</span>
                <span>{new Date(a.createdAt).toLocaleDateString('fa-IR')}</span>
              </div>
              <p className="text-slate-300">{a.details}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

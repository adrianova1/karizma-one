import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Users, UserPlus, Trash2, Edit, Shield, Activity, BarChart3, CloudUpload,
  Layers, CheckCircle, AlertTriangle, FileSpreadsheet, KeyRound, Play, RefreshCw, CreditCard, Coins, Check, X, Plus, Receipt,
  Sparkles, Bot, Cpu, Zap, Youtube, Instagram, Smartphone, MessageSquare, MessagesSquare, Video, Tv, Send, Brain
} from 'lucide-react';
import { Role, User as UserType, AuditLog } from '../types.js';
import { parseSafeJson } from '../lib/api.js';

import KnowledgeBaseView from './KnowledgeBaseView.js';
import AdminScenarioManagement from './AdminScenarioManagement.js';

interface AdminPanelViewProps {
  token: string;
  currentUserId: string;
}

export default function AdminPanelView({ token, currentUserId }: AdminPanelViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'users' | 'scenarios_mgmt' | 'import' | 'payments' | 'audit' | 'ai_settings' | 'plans' | 'channel_settings' | 'tickets' | 'knowledge_cards'>('stats');

  // Educational Channel Links State (2-Option Architecture: Telegram + Alternative Channel)
  const [channelForm, setChannelForm] = useState({
    telegramUrl: 'https://t.me/Karizma_Academy',
    alternativeUrl: 'https://youtube.com/@Karizma_Center',
    alternativeTitle: 'کانال ارتباطی و دوره‌های جایگزین',
    alternativeDesc: 'دسترسی جایگزین به دوره‌ها، آموزش‌های تصویری، کانال‌های داخلی یا شبکه‌های اجتماعی در صورت عدم دسترسی به تلگرام',
    alternativePlatformName: 'یوتیوب / دوره‌ها / کانال جایگزین',
    channelTitle: 'کانال‌های آموزشی و ارتباطی کاریزما',
    channelDescription: 'دسترسی مستقیم به کانال اصلی تلگرام و بستر ارتباطی جایگزین جهت دریافت دوره‌های آموزشی، تحلیل سناریوها، پشتیبانی و کتاب‌ها'
  });
  const [channelSaveLoading, setChannelSaveLoading] = useState(false);
  const [channelSaveStatus, setChannelSaveStatus] = useState('');

  // Tickets State
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [viewingTicket, setViewingTicket] = useState<any | null>(null);
  const [viewingTicketMessages, setViewingTicketMessages] = useState<any[]>([]);
  const [viewingTicketLoading, setViewingTicketLoading] = useState(false);
  const [ticketReplyText, setTicketReplyText] = useState('');

  const handleOpenAdminTicket = async (ticket: any) => {
    setViewingTicket(ticket);
    setViewingTicketLoading(true);
    setViewingTicketMessages([]);
    setTicketReplyText('');
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (data && data.messages) {
          setViewingTicketMessages(data.messages);
          if (data.ticket) {
            setViewingTicket({ ...ticket, ...data.ticket });
          }
        }
      }
    } catch (e) {
      console.error('Error fetching ticket messages:', e);
    } finally {
      setViewingTicketLoading(false);
    }
  };

  const handleToggleAdminTicketStatus = async (ticketId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'closed' ? 'open' : 'closed';
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await fetchTickets();
        if (viewingTicket && viewingTicket.id === ticketId) {
          setViewingTicket((prev: any) => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (e) {
      console.error('Error toggling ticket status:', e);
    }
  };

  const fetchChannelSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/educational-channel', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (data && data.telegramUrl) {
          setChannelForm(data);
        }
      }
    } catch (e) {
      console.error('Error loading channel settings:', e);
    }
  };

  const handleSaveChannelSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setChannelSaveLoading(true);
    setChannelSaveStatus('');
    try {
      const res = await fetch('/api/admin/settings/educational-channel', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(channelForm)
      });
      if (res.ok) {
        setChannelSaveStatus('تنظیمات کانال آموزشی با موفقیت ذخیره شد.');
        setTimeout(() => setChannelSaveStatus(''), 3000);
      }
    } catch (e: any) {
      setChannelSaveStatus('خطا در ذخیره تنظیمات.');
    } finally {
      setChannelSaveLoading(false);
    }
  };

  const fetchTickets = async () => {
    setTicketsLoading(true);
    try {
      const res = await fetch('/api/admin/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (Array.isArray(data)) {
          setTickets(data);
        }
      }
    } catch (e) {
      console.error('Error fetching tickets:', e);
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'channel_settings') {
      fetchChannelSettings();
    } else if (activeSubTab === 'tickets') {
      fetchTickets();
    }
  }, [activeSubTab]);

  // Subscription Plans Management State
  const [plans, setPlans] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const planFormRef = useRef<HTMLDivElement>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planStatusMsg, setPlanStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    price: 0,
    description: '',
    maxQueries: 100,
    maxKnowledgeCards: 500,
    durationDays: 30,
    maxScenarios: 100,
    quizLimitPerDay: 20,
    academyAccess: 'unlimited',
    badge: ''
  });
  const [overrideUserId, setOverrideUserId] = useState('');
  const [overridePlanId, setOverridePlanId] = useState('');
  const [overrideDuration, setOverrideDuration] = useState(30);
  const [overrideStatusMsg, setOverrideStatusMsg] = useState('');

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (Array.isArray(data)) {
          setPlans(data);
        } else if (data && data.plans) {
          setPlans(data.plans);
        }
      }
    } catch (e) {
      console.error('Error fetching plans:', e);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'plans') {
      fetchPlans();
    }
  }, [activeSubTab]);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanLoading(true);
    setPlanStatusMsg(null);
    try {
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';
      const method = editingPlan ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...planForm,
          price: Number(planForm.price) || 0,
          durationDays: Number(planForm.durationDays) || 30,
          maxQueries: Number(planForm.maxQueries) || 100,
          maxKnowledgeCards: Number(planForm.maxKnowledgeCards) || 500,
          maxScenarios: Number(planForm.maxScenarios) || 100,
          quizLimitPerDay: Number(planForm.quizLimitPerDay) || 20
        })
      });

      const data = await parseSafeJson(res);
      if (res.ok) {
        setPlanStatusMsg({
          type: 'success',
          text: editingPlan ? `تغییرات طرح «${planForm.name}» با موفقیت ذخیره شد.` : `طرح جدید «${planForm.name}» با موفقیت ایجاد شد.`
        });
        setEditingPlan(null);
        setPlanForm({ name: '', price: 0, description: '', maxQueries: 100, maxKnowledgeCards: 500, durationDays: 30, maxScenarios: 100, quizLimitPerDay: 20, academyAccess: 'unlimited', badge: '' });
        await fetchPlans();
        setTimeout(() => setPlanStatusMsg(null), 4000);
      } else {
        setPlanStatusMsg({
          type: 'error',
          text: data?.error || 'خطا در ذخیره‌سازی طرح اشتراک.'
        });
      }
    } catch (e: any) {
      console.error('Error saving plan:', e);
      setPlanStatusMsg({
        type: 'error',
        text: e?.message || 'خطا در ارتباط با سرور.'
      });
    } finally {
      setPlanLoading(false);
    }
  };

  const handleDeletePlan = async (planId: string, planName: string) => {
    if (!window.confirm(`آیا از حذف طرح «${planName}» اطمینان دارید؟`)) return;
    try {
      const res = await fetch(`/api/admin/plans/${planId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (editingPlan && editingPlan.id === planId) {
          setEditingPlan(null);
        }
        await fetchPlans();
        setPlanStatusMsg({ type: 'success', text: `طرح «${planName}» با موفقیت حذف شد.` });
        setTimeout(() => setPlanStatusMsg(null), 3000);
      }
    } catch (e) {
      console.error('Error deleting plan:', e);
    }
  };

  const handleOverrideSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideUserId || !overridePlanId) return;
    try {
      const res = await fetch('/api/admin/subscriptions/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: overrideUserId,
          planId: overridePlanId,
          durationDays: overrideDuration
        })
      });
      const data = await parseSafeJson(res);
      if (res.ok) {
        setOverrideStatusMsg('اشتراک با موفقیت به کاربر اعطا شد.');
        setTimeout(() => setOverrideStatusMsg(''), 3000);
      } else {
        setOverrideStatusMsg(data?.error || 'خطا در ثبت اعطای اشتراک');
      }
    } catch (e: any) {
      setOverrideStatusMsg(e.message || 'خطا در ارتباط با سرور');
    }
  };

  // 7. AI API Keys & System Prompt State
  const [geminiKey, setGeminiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [aiKeySaveLoading, setAiKeySaveLoading] = useState(false);
  const [aiKeySaveSuccess, setAiKeySaveSuccess] = useState('');
  const [aiKeySaveError, setAiKeySaveError] = useState('');

  const [aiTestLoading, setAiTestLoading] = useState(false);
  const [aiTestResults, setAiTestResults] = useState<any>(null);

  const [activePromptId, setActivePromptId] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [templateText, setTemplateText] = useState('');
  const [promptSaveLoading, setPromptSaveLoading] = useState(false);
  const [promptSaveSuccess, setPromptSaveSuccess] = useState('');
  const [promptSaveError, setPromptSaveError] = useState('');

  const fetchAISettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/ai', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseSafeJson(res);
      if (data) {
        if (data.gemini_api_key) setGeminiKey(data.gemini_api_key);
        if (data.groq_api_key) setGroqKey(data.groq_api_key);
        if (data.openrouter_api_key) setOpenrouterKey(data.openrouter_api_key);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPrompts = async () => {
    try {
      const res = await fetch('/api/prompts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseSafeJson(res);
      if (Array.isArray(data) && data.length > 0) {
        const active = data.find((p: any) => p.isActive) || data[0];
        setActivePromptId(active.id);
        setSystemInstruction(active.systemInstruction);
        setTemplateText(active.templateText);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAIKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiKeySaveLoading(true);
    setAiKeySaveSuccess('');
    setAiKeySaveError('');
    try {
      const res = await fetch('/api/admin/ai/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ geminiKey, groqKey, openRouterKey, customBaseUrl, customKey, customModel })
      });
      const data = await parseSafeJson(res);
      if (data?.success) {
        setAiKeySaveSuccess('تنظیمات با موفقیت ذخیره شد.');
      } else {
        setAiKeySaveError(data?.error || 'خطا در ذخیره تنظیمات');
      }
    } catch (err: any) {
      setAiKeySaveError(err.message || 'خطا در شبکه');
    } finally {
      setAiKeySaveLoading(false);
    }
  };

  const handleTestAIConnection = async () => {
    setAiTestLoading(true);
    setAiTestResults(null);
    try {
      const res = await fetch('/api/admin/ai/test', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseSafeJson(res);
      if (data?.success) {
        setAiTestResults(data.results);
      } else {
        setAiTestResults({ error: data?.error || 'تست ناموفق بود.' });
      }
    } catch (err: any) {
      setAiTestResults({ error: err.message || 'خطا در شبکه' });
    } finally {
      setAiTestLoading(false);
    }
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePromptId) return;
    setPromptSaveLoading(true);
    setPromptSaveSuccess('');
    setPromptSaveError('');
    try {
      const res = await fetch(`/api/prompts/${activePromptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          systemInstruction,
          templateText,
          isActive: true
        })
      });
      const data = await parseSafeJson(res);
      if (!res.ok) throw new Error(data?.error || 'خطا در بروزرسانی پرامپت.');
      setPromptSaveSuccess('دستورالعمل هوش مصنوعی مرکز کاریزما با موفقیت ذخیره شد.');
    } catch (err: any) {
      setPromptSaveError(err.message);
    } finally {
      setPromptSaveLoading(false);
    }
  };

  // 1. Users CRUD state
  const [users, setUsers] = useState<any[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [userPhone, setUserPhone] = useState('');
  const [userError, setUserError] = useState('');

  // 2. Statistics state
  const [stats, setStats] = useState<any>({
    totalCards: 0,
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    totalQueries: 0,
    popularCards: [],
    roleStats: { admin: 0, moderator: 0, user: 0 },
    totalAuditLogs: 0
  });

  // 3. Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // 4. Excel/CSV Import state
  const [importFileName, setImportFileName] = useState('Karizma_Knowledge_Seeding_1405.csv');
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [rollbackOnDuplicate, setRollbackOnDuplicate] = useState(false);
  const [importPayloadText, setImportPayloadText] = useState(
`[
  { "title": "قانون ۳ ثانیه در باز کردن گفتگو", "content": "این قانون بر اهمیت شروع مکالمه در ۳ ثانیه نخست برخورد بدون تردید تاکید دارد تا ذهن فرصت ساختن سناریوهای استرس‌زا نداشته باشد.", "category": "شروع مکالمه", "keywords": "شروع مکالمه، ۳ ثانیه، جسارت" },
  { "title": "ترفند پاسخ به کنایه‌های کلامی در رابطه", "content": "بجای گارد دفاعی، توپ را به زمین حریف برگردانید و با سوال معکوس فضا را مجددا با کاریزما مدیریت کنید.", "category": "حاضرجوابی", "keywords": "حاضرجوابی، رابطه، کنترل مکالمه" }
]`
  );

  // 5. Manual Payments Reconciliation State
  const [receipts, setReceipts] = useState<any[]>([]);
  const [bankDeposits, setBankDeposits] = useState<any[]>([]);
  const [depSenderCard, setDepSenderCard] = useState('');
  const [depAmount, setDepAmount] = useState('');
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  // 6. Default Bank Card Management State
  const [adminCardNumber, setAdminCardNumber] = useState('6037-9911-2233-4455');
  const [adminCardOwner, setAdminCardOwner] = useState('مدیریت مرکز کاریزما');
  const [adminCardBank, setAdminCardBank] = useState('بانک ملی ایران');
  const [cardSaveLoading, setCardSaveLoading] = useState(false);
  const [cardSaveSuccess, setCardSaveSuccess] = useState('');
  const [cardSaveError, setCardSaveError] = useState('');

  
  useEffect(() => {
    if (activeSubTab === 'ai_settings') {
      fetchPrompts();
      fetch('/api/admin/ai/keys', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(async (res) => {
          if (!res.ok) return null;
          return parseSafeJson(res);
        })
        .then(data => {
          if (data) {
            setGeminiKey(data.geminiKey || '');
            setGroqKey(data.groqKey || '');
            setOpenRouterKey(data.openRouterKey || '');
            setCustomBaseUrl(data.customBaseUrl || '');
            setCustomKey(data.customKey || '');
            setCustomModel(data.customModel || '');
          }
        }).catch(console.error);
    }
  }, [activeSubTab, token]);

  const fetchAdminCardSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/card', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (data) {
          if (data.cardNumber) setAdminCardNumber(data.cardNumber);
          if (data.cardOwner) setAdminCardOwner(data.cardOwner);
          if (data.cardBank) setAdminCardBank(data.cardBank);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAdminCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardSaveLoading(true);
    setCardSaveSuccess('');
    setCardSaveError('');
    try {
      const res = await fetch('/api/admin/settings/card', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cardNumber: adminCardNumber,
          cardOwner: adminCardOwner,
          cardBank: adminCardBank
        })
      });
      const data = await parseSafeJson(res);
      if (!res.ok) {
        throw new Error(data?.error || 'خطا در بروزرسانی شماره کارت.');
      }
      setCardSaveSuccess('شماره کارت با موفقیت ذخیره شد و در فرم پرداخت کاربران اعمال گردید.');
    } catch (err: any) {
      setCardSaveError(err.message);
    } finally {
      setCardSaveLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (Array.isArray(data)) {
          setUsers(data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/statistics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (data) {
          setStats(data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (Array.isArray(data)) {
          setAuditLogs(data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReceipts = async () => {
    try {
      const res = await fetch('/api/admin/receipts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (Array.isArray(data)) {
          setReceipts(data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBankDeposits = async () => {
    try {
      const res = await fetch('/api/admin/bank-deposits', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (Array.isArray(data)) {
          setBankDeposits(data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
    if (activeSubTab === 'users') fetchUsers();
    if (activeSubTab === 'audit') fetchAuditLogs();
    if (activeSubTab === 'payments') {
      fetchReceipts();
      fetchBankDeposits();
      fetchAdminCardSettings();
    }
    if (activeSubTab === 'ai_settings') {
      fetchAISettings();
      fetchPrompts();
    }
  }, [activeSubTab]);

  const handleApproveReceipt = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/receipts/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchReceipts();
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeclineReceipt = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/receipts/${id}/decline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchReceipts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddBankDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError('');
    setPaySuccess('');
    if (!depSenderCard || !depAmount) {
      setPayError('وارد کردن شماره کارت و مبلغ الزامی است.');
      return;
    }
    setPayLoading(true);
    try {
      const res = await fetch('/api/admin/bank-deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ senderCard: depSenderCard, amount: Number(depAmount) })
      });
      const data = await parseSafeJson(res);
      if (!res.ok) {
        throw new Error(data?.error || 'خطا در ثبت واریزی بانک.');
      }
      
      if (data?.matched) {
        setPaySuccess(`تراکنش بانکی ثبت شد! یک رسید معلق متناظر یافت شد و اشتراک کاربر ${data.matchedUser || 'مورد نظر'} به صورت خودکار فعال گردید.`);
      } else {
        setPaySuccess('واریزی با موفقیت ثبت گردید و در بانک ذخیره شد.');
      }
      setDepSenderCard('');
      setDepAmount('');
      fetchBankDeposits();
      fetchReceipts();
      fetchStats();
    } catch (err: any) {
      setPayError(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  // Handle User Save CRUD
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername || (!editingUser && !password)) {
      setUserError('نام کاربری و کلمه عبور الزامی است.');
      return;
    }

    if (!editingUser) {
      if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(cleanUsername)) {
        setUserError('نام کاربری باید حتماً با یک حرف انگلیسی آغاز شود و نمی‌تواند فقط عدد باشد (مثال: adri12).');
        return;
      }
      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        setUserError('نام کاربری باید بین ۳ تا ۳۰ کاراکتر باشد.');
        return;
      }
    }

    try {
      const payload = {
        username: cleanUsername,
        role,
        phoneNumber: userPhone.trim() || undefined,
        ...(password ? { password } : {})
      };

      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await parseSafeJson(res);
        throw new Error(errData?.error || 'خطایی رخ داد.');
      }

      setIsUserModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setUserError(err.message);
    }
  };

  const handleEditUserClick = (user: any) => {
    setEditingUser(user);
    setUsername(user.username);
    setRole(user.role);
    setUserPhone(user.phoneNumber || '');
    setPassword('');
    setUserError('');
    setIsUserModalOpen(true);
  };

  const handleCreateUserClick = () => {
    setEditingUser(null);
    setUsername('');
    setRole('user');
    setUserPhone('');
    setPassword('');
    setUserError('');
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUserId) {
      alert('شما نمی‌توانید حساب کاربری جاری خودتان را حذف کنید!');
      return;
    }
    if (!window.confirm('آیا مایل به حذف دائم این حساب کاربری از پایگاه داده مرکز کاریزما هستید؟')) return;

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await parseSafeJson(res);
        throw new Error(errData?.error || 'خطا در حذف کاربر.');
      }
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = '';
    
    // Strip BOM if present
    const cleanText = text.replace(/^\uFEFF/, '');
    
    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentValue);
        currentValue = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        row.push(currentValue);
        lines.push(row);
        row = [];
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    if (currentValue || row.length > 0) {
      row.push(currentValue);
      lines.push(row);
    }
    return lines;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      try {
        let parsed: any[] = [];
        if (file.name.endsWith('.json')) {
          parsed = JSON.parse(text);
        } else {
          const rawLines = parseCSV(text);
          if (rawLines.length > 1) {
            const headers = rawLines[0].map(h => h.replace(/^"|"$/g, '').trim());
            parsed = rawLines.slice(1).map(rowCols => {
              const obj: any = {};
              headers.forEach((h, i) => {
                if (h) obj[h] = rowCols[i] !== undefined ? rowCols[i] : '';
              });
              return obj;
            });
          }
        }
        setImportPayloadText(JSON.stringify(parsed, null, 2));
      } catch (err) {
        alert('خطا در پردازش فایل. لطفاً فرمت فایل را بررسی کنید.');
      }
    };
    reader.onerror = () => {
      alert('خطا در خواندن فایل از سیستم.');
    };
    reader.readAsText(file);
    
    // reset input value so the same file can be uploaded again if needed
    e.target.value = '';
  };

  // Simulated Massive CSV / Excel Import Engine
  const handleStartImport = async () => {
    setImportStatus('processing');
    setImportProgress(10);
    setImportLogs(['آماده‌سازی لودر بارگذاری داده...', 'بررسی فایل بافر موقت اکسل...']);

    try {
      const parsedRows = JSON.parse(importPayloadText);
      if (!Array.isArray(parsedRows)) {
        throw new Error('قالب داده ارسالی باید به شکل آرایه جی‌سان باشد.');
      }

      setTimeout(() => {
        setImportProgress(40);
        setImportLogs(prev => [...prev, `بارگیری موفقیت‌آمیز ${parsedRows.length} ردیف داده...`, 'شروع اعتبارسنجی تکرارها در دیتابیس...']);
      }, 800);

      setTimeout(async () => {
        setImportProgress(75);
        try {
          const res = await fetch('/api/import/process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              fileName: importFileName,
              dataRows: parsedRows,
              rollbackOnDuplicate
            })
          });

          const data = await parseSafeJson(res);
          if (!res.ok) {
            throw new Error(data?.error || 'فرآیند لغو شد.');
          }

          setImportProgress(100);
          setImportStatus(data?.status === 'completed' ? 'completed' : 'failed');
          setImportLogs(prev => [...prev, ...(data?.logMessages || [])]);
          fetchStats(); // Update stats summary
        } catch (err: any) {
          setImportStatus('failed');
          setImportLogs(prev => [...prev, `🛑 خطا در پردازش دسته: ${err.message}`, 'کل فرآیند ایمپورت ریست شد.']);
        }
      }, 1600);

    } catch (e: any) {
      setImportStatus('failed');
      setImportLogs(['🛑 قالب داده JSON نامعتبر است! لطفاً قالب داده ورودی را اصلاح کنید.']);
    }
  };

  return (
    <div className="p-6 md:p-8 text-slate-100 font-sans" style={{ direction: 'rtl' }}>
      
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">پنل مدیریت سیستمی کاریزما</h1>
          <p className="text-xs text-slate-400">نظارت بر فرآیندهای امنیتی، آمار پایگاه دانش، کاربران و درون‌ریزی فایل‌های حجیم اکسل</p>
        </div>

        {/* Sub-Tabs Switchers */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 bg-slate-900/50 border border-slate-800 rounded-2xl p-2 gap-2 shadow-inner">
          {[
            { id: 'stats', label: 'داشبورد و آمار', icon: BarChart3 },
            { id: 'users', label: 'مدیریت کاربران', icon: Users },
            { id: 'scenarios_mgmt', label: 'بانک سناریوها و اکسل', icon: MessagesSquare },
            { id: 'knowledge_cards', label: 'پایگاه دانش هوش مصنوعی', icon: Brain },
            { id: 'ai_settings', label: 'تنظیمات مربی (AI)', icon: Sparkles },
            { id: 'channel_settings', label: 'لینک‌های کانال VIP', icon: Send },
            { id: 'plans', label: 'تعرفه‌ها و اشتراک', icon: Coins },
            { id: 'payments', label: 'تراکنش‌های مالی', icon: CreditCard },
            { id: 'tickets', label: 'پشتیبانی و تیکت', icon: MessageSquare },
            { id: 'audit', label: 'لاگ‌های امنیتی', icon: Activity },
          ].map(subTab => {
            const Icon = subTab.icon;
            const active = activeSubTab === subTab.id;
            return (
              <button
                key={subTab.id}
                onClick={() => setActiveSubTab(subTab.id as any)}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                  active ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 border border-sky-400/50' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{subTab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TAB CONTENTS */}

      {/* SCENARIO BANK & EXCEL IMPORT MANAGEMENT */}
      {activeSubTab === 'scenarios_mgmt' && (
        <AdminScenarioManagement token={token} />
      )}

      {/* EDUCATIONAL CHANNEL SETTINGS (2 OPTIONS: TELEGRAM + ALTERNATIVE CHANNEL) */}
      {activeSubTab === 'channel_settings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-right space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <Send className="w-5 h-5 text-sky-400" />
                <span>مدیریت کانال‌های آموزشی و ارتباطی (تلگرام و جایگزین)</span>
              </h2>
              <p className="text-xs text-slate-400">لینک‌ها و عناوین وارد شده در این بخش در برگه کانال آموزشی به صورت ۲ گزینه‌ی مجزا به کاربران نمایش داده می‌شوند.</p>
            </div>
            <span className="text-[11px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-1 rounded-full font-bold">
              ۲ بستر ارتباطی (تلگرام + جایگزین)
            </span>
          </div>

          {channelSaveStatus && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{channelSaveStatus}</span>
            </div>
          )}

          <form onSubmit={handleSaveChannelSettings} className="space-y-6">
            
            {/* 1. General Header Info */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 md:p-5 space-y-4">
              <h3 className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>اطلاعات کلی سربرگ کانال‌ها</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان کلی صفحه</label>
                  <input
                    type="text"
                    value={channelForm.channelTitle}
                    onChange={(e) => setChannelForm({ ...channelForm, channelTitle: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">توضیحات معرفی و راهنمای دسترسی</label>
                  <textarea
                    value={channelForm.channelDescription}
                    onChange={(e) => setChannelForm({ ...channelForm, channelDescription: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white h-20 resize-none leading-relaxed"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 2. OPTION 1: Primary Telegram Channel & Bot */}
            <div className="bg-slate-950/60 border border-sky-500/30 rounded-2xl p-4 md:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-sky-300 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-sky-400" />
                  <span>گزینه اول: کانال تلگرام و ربات کاریزما (اصلی)</span>
                </h3>
                <span className="text-[10px] bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold">
                  بستر اصلی
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-sky-300 mb-1">لینک مستقیم کانال / ربات تلگرام</label>
                <input
                  type="url"
                  value={channelForm.telegramUrl}
                  onChange={(e) => setChannelForm({ ...channelForm, telegramUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-sky-300 font-mono text-left"
                  placeholder="https://t.me/Karizma_Academy"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">این کارت شامل توضیحات ارائه دوره‌ها، پشتیبانی چت‌ها و اتصال به ربات هوشمند کتاب‌هاست.</p>
              </div>
            </div>

            {/* 3. OPTION 2: Alternative Communication Channel / Custom Link */}
            <div className="bg-slate-950/60 border border-purple-500/30 rounded-2xl p-4 md:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                  <Play className="w-4 h-4 text-purple-400 fill-current" />
                  <span>گزینه دوم: کانال ارتباطی یا دوره‌های جایگزین (لینک دلخواه)</span>
                </h3>
                <span className="text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                  بستر جایگزین
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان کارت جایگزین</label>
                  <input
                    type="text"
                    value={channelForm.alternativeTitle}
                    onChange={(e) => setChannelForm({ ...channelForm, alternativeTitle: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                    placeholder="مثال: کانال ارتباطی و دوره‌های جایگزین"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">نام بستر / برچسب پلتفرم</label>
                  <input
                    type="text"
                    value={channelForm.alternativePlatformName}
                    onChange={(e) => setChannelForm({ ...channelForm, alternativePlatformName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-purple-300"
                    placeholder="مثال: یوتیوب / روبیکا / بله / ایتا / اینستاگرام"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-purple-300 mb-1">لینک مستقیم بستر جایگزین (هر آدرس دلخواه)</label>
                  <input
                    type="url"
                    value={channelForm.alternativeUrl}
                    onChange={(e) => setChannelForm({ ...channelForm, alternativeUrl: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-purple-300 font-mono text-left"
                    placeholder="https://youtube.com/@Karizma_Center یا https://spotplayer.ir یا https://rubika.ir/..."
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">توضیحات کارت جایگزین</label>
                  <textarea
                    value={channelForm.alternativeDesc}
                    onChange={(e) => setChannelForm({ ...channelForm, alternativeDesc: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white h-20 resize-none leading-relaxed"
                    placeholder="توضیحات راهنمای دسترسی کاربران به بستر جایگزین..."
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={channelSaveLoading}
                className="w-full sm:w-auto bg-gradient-to-l from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs px-8 py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 active:scale-98"
              >
                {channelSaveLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>ذخیره و به‌روزرسانی تنظیمات کانال‌های آموزشی</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* USER SKILL REPORTS */}
      {activeSubTab === 'tickets' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-right space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">سیستم پشتیبانی (تیکت‌ها)</h2>
              <p className="text-sm text-slate-400">درخواست‌ها و مشکلات ارسال شده توسط کاربران برای مدیر سیستم.</p>
            </div>
            <button
              onClick={fetchTickets}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors border border-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${ticketsLoading ? 'animate-spin' : ''}`} />
              <span>بروزرسانی لیست</span>
            </button>
          </div>
          
          {tickets.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
              هنوز هیچ تیکتی ثبت نشده است.
            </div>
          ) : (
            <div className="overflow-x-auto bg-slate-950/30 rounded-2xl border border-slate-800">
              <table className="w-full text-right text-sm text-slate-300">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4 font-semibold whitespace-nowrap">کاربر</th>
                    <th className="p-4 font-semibold whitespace-nowrap">موضوع</th>
                    <th className="p-4 font-semibold whitespace-nowrap">وضعیت</th>
                    <th className="p-4 font-semibold whitespace-nowrap">تاریخ ایجاد</th>
                    <th className="p-4 font-semibold text-left whitespace-nowrap">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-bold text-white flex items-center gap-2 whitespace-nowrap">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="whitespace-nowrap">{t.username}</span>
                      </td>
                      <td className="p-4 text-slate-300 font-medium whitespace-nowrap max-w-[200px] truncate" title={t.subject}>{t.subject}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${
                          t.status === 'open' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                          t.status === 'answered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {t.status === 'open' ? 'باز (منتظر پاسخ)' : t.status === 'answered' ? 'پاسخ داده شده' : 'بسته شده'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString('fa-IR')}
                      </td>
                      <td className="p-4 text-left whitespace-nowrap">
                        <button 
                          onClick={() => handleOpenAdminTicket(t)}
                          className="text-sky-400 hover:text-sky-300 text-xs font-bold px-4 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          مشاهده و گفتگو
                        </button>
                        <button 
                          onClick={() => handleToggleAdminTicketStatus(t.id, t.status)}
                          className={`mr-2 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                            t.status === 'closed'
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                          }`}
                        >
                          {t.status === 'closed' ? 'بازگشایی' : 'بستن تیکت'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 1. STATS VIEW */}
      {activeSubTab === 'stats' && (
        <div className="space-y-6">
          {/* Key Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card rounded-2xl p-5 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-500 font-bold block mb-1">کل اسناد پایگاه دانش</span>
              <span className="text-2xl font-black text-white">{stats.totalCards} کارت</span>
            </div>
            <div className="glass-card rounded-2xl p-5 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-500 font-bold block mb-1">مجموع اشتراک‌های فعال</span>
              <span className="text-2xl font-black text-purple-400">{stats.activeSubscriptions} اشتراک</span>
            </div>
            <div className="glass-card rounded-2xl p-5 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-500 font-bold block mb-1">مجموع درآمدهای جذب شده</span>
              <span className="text-2xl font-black text-emerald-400">{(stats.totalRevenue).toLocaleString('fa-IR')} تومان</span>
            </div>
            <div className="glass-card rounded-2xl p-5 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-500 font-bold block mb-1">کل پرس‌وجوهای هوشمند RAG</span>
              <span className="text-2xl font-black text-sky-400">{stats.totalQueries} سرچ</span>
            </div>
          </div>

          {/* Interactive SVG Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SVG views per card */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 mb-4 text-right">محبوب‌ترین مباحث و اسناد پایگاه دانش</h3>
              
              <div className="space-y-3">
                {stats.popularCards.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">آماری یافت نشد.</div>
                ) : (
                  stats.popularCards.map((card: any, idx: number) => (
                    <div key={idx} className="space-y-1.5 text-right">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-300 truncate max-w-[200px] font-medium">{card.title}</span>
                        <span className="text-sky-400 font-bold font-mono">{card.views} بازدید</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-sky-500 to-purple-600 h-2 rounded-full transition-all" 
                          style={{ width: `${Math.min(100, (card.views / 150) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* SVG user roles and system status */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-300 mb-4 text-right">سهم نقش‌های فعال سیستم</h3>
                <div className="flex justify-around items-center py-4">
                  {/* Circular visual slices */}
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-black text-red-400">{stats.roleStats.admin}</span>
                    <span className="text-[10px] text-slate-500">مدیران سیستم</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-black text-amber-400">{stats.roleStats.moderator}</span>
                    <span className="text-[10px] text-slate-500">اپراتورهای ممیزی</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-black text-emerald-400">{stats.roleStats.user}</span>
                    <span className="text-[10px] text-slate-500">کاربران عادی</span>
                  </div>
                </div>
              </div>

              {/* Status flags */}
              <div className="border-t border-slate-800 pt-4 text-xs space-y-2 text-right">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">امکان استفاده از هوش مصنوعی:</span>
                  <span className="text-emerald-400 font-bold">بله، فعال</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">تعداد کدهای ممیزی ثبت شده:</span>
                  <span className="text-slate-300 font-mono">{stats.totalAuditLogs} لاگ</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'knowledge_cards' && (
        <KnowledgeBaseView token={token} userRole="admin" onChangeTab={() => {}} />
      )}

      {/* 2. USER MANAGEMENT CRUD */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400">فهرست کل حساب‌های کاربری فعال در مرکز کاریزما</span>
            <button
              onClick={handleCreateUserClick}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700/80 text-white font-semibold text-[11px] py-2 px-4 rounded-xl cursor-pointer flex items-center gap-1.5 transition"
            >
              <UserPlus className="w-3.5 h-3.5 text-sky-400" />
              <span>ایجاد حساب کاربری تستی</span>
            </button>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-4 px-6">نام کاربری</th>
                    <th className="py-4 px-6">شماره تماس</th>
                    <th className="py-4 px-6">سطح دسترسی (نقش)</th>
                    <th className="py-4 px-6">تاریخ عضویت</th>
                    <th className="py-4 px-6 text-center">عملیات ممیزی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-4 px-6 font-semibold text-white">{u.username}</td>
                      <td className="py-4 px-6 font-mono text-[11px]">
                        {u.phoneNumber ? (
                          <span className="text-sky-400 font-semibold bg-sky-950/40 border border-sky-800/40 px-2 py-0.5 rounded-lg">{u.phoneNumber}</span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">ثبت نشده</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          u.role === Role.ADMIN ? 'bg-red-500/15 text-red-400 border-red-500/25' :
                          u.role === Role.MODERATOR ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' :
                          'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                        }`}>
                          {u.role === Role.ADMIN ? 'مدیر سیستم' :
                           u.role === Role.MODERATOR ? 'اپراتور ارشد' : 'کاربر عمومی'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400 font-mono text-[10px]">
                        {new Date(u.createdAt).toLocaleDateString('fa-IR')}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditUserClick(u)}
                            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800/40 rounded-lg transition cursor-pointer"
                            title="ویرایش کاربر"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800/40 rounded-lg transition cursor-pointer"
                            title="حذف حساب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. EXCEL/CSV MASS IMPORT ENGINE */}
      {activeSubTab === 'import' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 text-right">
          
          <div className="lg:col-span-3 space-y-4">
            <div className="glass-card rounded-2xl p-6 border border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 mb-4 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                <span>شبیه‌ساز پیشرفته درون‌ریزی انبوه اکسل / CSV</span>
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1.5">انتخاب فایل از سیستم (CSV یا JSON)</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".csv,.json,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="انتخاب فایل"
                      />
                      <div className="w-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700 border-dashed rounded-xl px-4 py-2 text-xs text-sky-400 text-center flex items-center justify-center gap-2 transition-colors">
                        <CloudUpload className="w-4 h-4" />
                        <span>برای انتخاب فایل کلیک کنید</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1.5">نام فایل</label>
                    <input
                      type="text"
                      value={importFileName}
                      onChange={(e) => setImportFileName(e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Rollback duplicate boolean */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="rollback"
                    checked={rollbackOnDuplicate}
                    onChange={(e) => setRollbackOnDuplicate(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-900 text-sky-500 focus:ring-0 w-4 h-4"
                  />
                  <label htmlFor="rollback" className="text-[11px] text-slate-300 cursor-pointer">
                    توقف فرآیند و رول‌بک در صورت تشخیص رکورد تکراری
                  </label>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1.5">دیتا رکوردهای اکسل ورودی (آرایه JSON معتبر)</label>
                  <textarea
                    value={importPayloadText}
                    onChange={(e) => setImportPayloadText(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-[10px] font-mono text-slate-300 h-44 text-left focus:outline-none focus:border-sky-500/40"
                    style={{ direction: 'ltr' }}
                  />
                </div>

                <button
                  onClick={handleStartImport}
                  disabled={importStatus === 'processing'}
                  className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs py-3.5 rounded-xl transition shadow-lg shadow-sky-500/10 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>آغاز فرآیند دسته‌ای درون‌ریزی (Batch Import)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Import engine logs stream (Right Panel) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass-card rounded-2xl p-6 border border-slate-800 h-full flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-4">لاگ مانیتورینگ موتور ایمپورت کاریزما</h4>
                
                {/* Progress bar */}
                {importStatus === 'processing' && (
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-sky-400">{importProgress}% پردازش شد</span>
                      <span className="text-slate-500">دسته ۳ ردیف</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-sky-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* Log Screen Output */}
                <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-4 font-mono text-[9px] text-slate-300 space-y-1.5 max-h-[220px] overflow-y-auto text-right">
                  {importLogs.length === 0 ? (
                    <div className="text-slate-600 text-center py-12">در انتظار شروع فرآیند...</div>
                  ) : (
                    importLogs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed border-b border-slate-900/40 pb-1">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Status Icon Indicator */}
              <div className="border-t border-slate-900 pt-4 mt-4 flex items-center justify-between text-[11px] text-slate-400">
                <span>وضعیت فرآیند:</span>
                {importStatus === 'idle' && <span className="text-slate-500">آماده به کار</span>}
                {importStatus === 'processing' && <span className="text-sky-400 animate-pulse font-bold">در حال پردازش دسته‌ای...</span>}
                {importStatus === 'completed' && <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> موفقیت‌آمیز</span>}
                {importStatus === 'failed' && <span className="text-red-400 font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> با خطا مواجه شد</span>}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 4. SECURITY & AUDIT LOGS LEDGER */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4 text-right">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400">دفترچه لاگ امنیتی (Audit Trail Ledger)</span>
            <button
              onClick={fetchAuditLogs}
              className="text-xs text-sky-400 hover:text-sky-300 transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>بروزرسانی لاگ‌ها</span>
            </button>
          </div>

          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="py-4 px-6">کاربر</th>
                    <th className="py-4 px-6">عملیات انجام شده</th>
                    <th className="py-4 px-6">آدرس IP کلاینت</th>
                    <th className="py-4 px-6">جزئیات عملیاتی</th>
                    <th className="py-4 px-6">زمان دقیق ثبت لاگ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">هیچ لاگ امنیتی ثبت نشده است.</td>
                    </tr>
                  ) : (
                    auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-900/30 transition text-[11px]">
                        <td className="py-3 px-6 font-semibold text-white">{log.username}</td>
                        <td className="py-3 px-6 text-sky-400">{log.action}</td>
                        <td className="py-3 px-6 font-mono text-[10px] text-slate-500">{log.ip}</td>
                        <td className="py-3 px-6 text-slate-400">{log.details}</td>
                        <td className="py-3 px-6 font-mono text-[10px] text-slate-500">
                          {new Date(log.createdAt).toLocaleString('fa-IR')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. PAYMENTS & RECONCILIATION TAB */}
      {activeSubTab === 'payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 text-right">
          
          {/* User Receipts Left Panel */}
          <div className="lg:col-span-3 space-y-4">
            <div className="glass-card rounded-2xl p-6 border border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-purple-400" />
                  <span>رسیدهای پرداخت ثبت شده توسط کاربران</span>
                </h3>
                <button
                  onClick={fetchReceipts}
                  className="text-[10px] text-sky-400 hover:text-sky-300 transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>بروزرسانی رسیدها</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">کاربر</th>
                      <th className="py-3 px-4">کارت مبدأ</th>
                      <th className="py-3 px-4">مبلغ (تومان)</th>
                      <th className="py-3 px-4">کد پیگیری</th>
                      <th className="py-3 px-4">وضعیت</th>
                      <th className="py-3 px-4 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {receipts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 text-[11px]">هیچ رسید تراکنشی ثبت نشده است.</td>
                      </tr>
                    ) : (
                      receipts.map(rec => (
                        <tr key={rec.id} className="hover:bg-slate-900/30 transition text-[11px]">
                          <td className="py-3 px-4 font-semibold text-white">{rec.username}</td>
                          <td className="py-3 px-4 font-mono text-[10px]">{rec.senderCard}</td>
                          <td className="py-3 px-4 font-bold text-white">{(rec.amount).toLocaleString('fa-IR')}</td>
                          <td className="py-3 px-4 font-mono text-slate-400">{rec.traceNumber || '---'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${
                              rec.status === 'success' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
                              rec.status === 'failed' ? 'bg-red-500/15 text-red-400 border-red-500/20' :
                              'bg-amber-500/15 text-amber-400 border-amber-500/20'
                            }`}>
                              {rec.status === 'success' ? 'تایید شده' :
                               rec.status === 'failed' ? 'رد شده' : 'معلق'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {rec.status === 'pending' ? (
                              <div className="flex justify-center gap-1.5">
                                <button
                                  onClick={() => handleApproveReceipt(rec.id)}
                                  className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded cursor-pointer transition"
                                  title="تایید و فعال‌سازی"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeclineReceipt(rec.id)}
                                  className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded cursor-pointer transition"
                                  title="رد درخواست"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500">نهایی شده</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bank Simulator Right Panel */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Card Settings Management Form */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>تنظیمات شماره کارت پیش‌فرض واریز</span>
              </h3>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                شماره کارت، نام صاحب حساب و نام بانک مقصد که به کاربران جهت خرید اشتراک نمایش داده می‌شود را از این بخش ویرایش کنید.
              </p>

              {cardSaveError && (
                <div className="mb-3 p-3 bg-red-950/40 border border-red-500/30 text-red-400 text-[10px] rounded-xl">
                  {cardSaveError}
                </div>
              )}
              {cardSaveSuccess && (
                <div className="mb-3 p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px] rounded-xl leading-relaxed">
                  {cardSaveSuccess}
                </div>
              )}

              <form onSubmit={handleSaveAdminCard} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">شماره کارت مقصد (۱۶ رقمی):</label>
                  <input
                    type="text"
                    required
                    placeholder="۶۰۳۷-۹۹۱۱-۲۲۳۳-۴۴۵۵"
                    value={adminCardNumber}
                    onChange={(e) => setAdminCardNumber(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white text-left font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">نام صاحب حساب / کارت:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: مدیریت مرکز کاریزما"
                    value={adminCardOwner}
                    onChange={(e) => setAdminCardOwner(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">نام بانک صادرکننده:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: بانک ملی ایران"
                    value={adminCardBank}
                    onChange={(e) => setAdminCardBank(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={cardSaveLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{cardSaveLoading ? 'در حال ذخیره‌سازی...' : 'ذخیره و بروزرسانی شماره کارت'}</span>
                </button>
              </form>
            </div>

            {/* Simulation Form */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-sky-400" />
                <span>شبیه‌ساز واریزی‌های بانکی (تراکنش مقصد)</span>
              </h3>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                تراکنش‌های ورودی بانک ادمین را شبیه‌سازی کنید. در صورت تطابق با رسیدهای معلق کاربران، سیستم آن را به‌طور اتوماتیک فعال خواهد کرد.
              </p>

              {payError && (
                <div className="mb-3 p-3 bg-red-950/40 border border-red-500/30 text-red-400 text-[10px] rounded-xl">
                  {payError}
                </div>
              )}
              {paySuccess && (
                <div className="mb-3 p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px] rounded-xl leading-relaxed">
                  {paySuccess}
                </div>
              )}

              <form onSubmit={handleAddBankDeposit} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">شماره کارت واریز کننده (۱۶ رقمی مبدأ):</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ۵۰۲۲-۲۹۱۰-۱۲۳۴-۵۶۷۸"
                    value={depSenderCard}
                    onChange={(e) => setDepSenderCard(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white text-left font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">مبلغ واریز شده به حساب شما (تومان):</label>
                  <input
                    type="number"
                    required
                    placeholder="مثال: ۲۵۰۰۰۰"
                    value={depAmount}
                    onChange={(e) => setDepAmount(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white text-left font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={payLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 font-bold text-xs py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  <span>ثبت تراکنش بانکی جدید</span>
                </button>
              </form>
            </div>

            {/* Simulated Bank records list */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-slate-300">سوابق تراکنش‌های رسمی بانک ادمین</h4>
                <button
                  onClick={fetchBankDeposits}
                  className="text-[9px] text-slate-400 hover:text-white transition"
                >
                  بروزرسانی بانک
                </button>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto text-xs font-mono">
                {bankDeposits.length === 0 ? (
                  <div className="text-center py-8 text-slate-600 text-[11px]">هیچ واریزی بانکی ثبت نشده است.</div>
                ) : (
                  bankDeposits.map((dep: any) => (
                    <div key={dep.id} className="bg-slate-950/80 border border-slate-900 p-2.5 rounded-xl flex justify-between items-center text-right">
                      <div className="space-y-1">
                        <div className="text-[10px] text-slate-400">کارت: <span className="text-white">{dep.senderCard}</span></div>
                        <div className="text-[10px] text-slate-400">مبلغ: <span className="text-emerald-400 font-bold">{(dep.amount).toLocaleString('fa-IR')} تومان</span></div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                        dep.isAssigned ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {dep.isAssigned ? 'تطبیق شده' : 'آزاد'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 6. AI & PROMPTS MANAGEMENT VIEW */}
      {activeSubTab === 'ai_settings' && (
        <div className="space-y-6 text-right">
          
          {/* Top Banner */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 bg-gradient-to-l from-slate-900 via-slate-900 to-sky-950/40">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-5 h-5 text-sky-400" />
              <h2 className="text-sm font-bold text-white">تنظیمات هوش مصنوعی مرکز کاریزما (Gemini / Groq / OpenRouter)</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              در این بخش می‌توانید کلیدهای API سرویس‌های مختلف هوش مصنوعی را تنظیم کرده، اتصال را تست کنید و دستورالعمل سیستم (System Instruction) مرکز کاریزما را به‌روزرسانی نمایید.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* AI API KEYS & DIAGNOSTICS CARD */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white">کلیدهای API ارائه‌دهندگان هوش مصنوعی</h3>
                </div>
                <button
                  type="button"
                  onClick={handleTestAIConnection}
                  disabled={aiTestLoading}
                  className="bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-300 font-semibold text-[11px] py-1.5 px-3 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${aiTestLoading ? 'animate-spin' : ''}`} />
                  <span>{aiTestLoading ? 'در حال تست...' : 'تست اتصال زنده'}</span>
                </button>
              </div>

              {aiKeySaveSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{aiKeySaveSuccess}</span>
                </div>
              )}

              {aiKeySaveError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{aiKeySaveError}</span>
                </div>
              )}

              {/* LIVE DIAGNOSTICS TEST RESULTS */}
              {aiTestResults && (
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <span className="font-bold text-slate-300 block mb-1">نتیجه تست اتصال ارائه‌دهندگان:</span>
                  {aiTestResults.error ? (
                    <div className="text-red-400 font-semibold">{aiTestResults.error}</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {['gemini', 'groq', 'openrouter', 'custom'].map(prov => {
                        const item = aiTestResults[prov];
                        const isOk = item?.status === 'ok';
                        if (prov === 'custom' && !customBaseUrl) return null;
                        return (
                          <div key={prov} className={`p-2.5 rounded-lg border text-center space-y-1 ${
                            isOk ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border-red-500/30 text-red-300'
                          }`}>
                            <span className="font-bold uppercase text-[10px] block">{prov}</span>
                            <span className="text-[11px] font-semibold block">{isOk ? 'اتصال برقرار' : 'قطع / خطا'}</span>
                            {item?.message && (
                              <span className="text-[10px] text-slate-300 block truncate" title={item.message}>{item.message}</span>
                            )}
                            {item?.modelUsed && (
                              <span className="text-[9px] text-slate-400 block font-mono truncate">{item.modelUsed}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSaveAIKeys} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">کلید API گوگل (Gemini API Key)</label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono dir-ltr"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">پشتیبانی از مدل‌های رسمی gemini-3.7-flash و gemini-3.1-flash-lite</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">کلید API گروک (Groq Cloud API Key)</label>
                  <input
                    type="password"
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono dir-ltr"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">پشتیبانی از Llama-3.3-70b با سرعت فراخوانی بالا</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">API جایگزین (سفارشی) - Base URL</label>
                  <input
                    type="text"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className="w-full bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono dir-ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">API جایگزین - کلید (API Key)</label>
                  <input
                    type="password"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono dir-ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">API جایگزین - نام مدل (Model)</label>
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="gpt-4o-mini"
                    className="w-full bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono dir-ltr"
                  />
                </div>


                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">کلید API اوپن‌روتر (OpenRouter API Key)</label>
                  <input
                    type="password"
                    value={openrouterKey}
                    onChange={(e) => setOpenrouterKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono dir-ltr"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">درگاه پشتیبان چندمدله (DeepSeek, Llama 3.3, Gemini)</span>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={aiKeySaveLoading}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{aiKeySaveLoading ? 'در حال ذخیره‌سازی...' : 'ذخیره کلیدهای API'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* SYSTEM PROMPT & INSTRUCTION EDIT CARD */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Bot className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold text-white">دستورالعمل سیستم و پرامپت هوشمند مرکز کاریزما</h3>
              </div>

              {promptSaveSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{promptSaveSuccess}</span>
                </div>
              )}

              {promptSaveError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{promptSaveError}</span>
                </div>
              )}

              <form onSubmit={handleSavePrompt} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">دستورالعمل هویت هوش مصنوعی (System Instruction)</label>
                  <textarea
                    rows={5}
                    value={systemInstruction}
                    onChange={(e) => setSystemInstruction(e.target.value)}
                    className="w-full bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-xs text-white leading-relaxed font-sans"
                    placeholder="تعریف هویت، لحن کاریزماتیک، اصول پاسخگویی..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الگوی پرامپت ترکیبی (Template Text)</label>
                  <textarea
                    rows={6}
                    value={templateText}
                    onChange={(e) => setTemplateText(e.target.value)}
                    className="w-full bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-xs text-white leading-relaxed font-mono"
                    placeholder="از متغیرهای {{CONTEXT}} و {{QUESTION}} استفاده کنید..."
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">متغیرهای مجاز: <code className="text-sky-400 font-mono">&#123;&#123;CONTEXT&#125;&#125;</code> برای کارت‌های دانش و <code className="text-sky-400 font-mono">&#123;&#123;QUESTION&#125;&#125;</code> برای سوال کاربر</span>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={promptSaveLoading}
                    className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{promptSaveLoading ? 'در حال ذخیره‌سازی...' : 'ذخیره دستورالعمل و پرامپت'}</span>
                  </button>
                </div>
              </form>
            </div>

          </div>

        </div>
      )}

      {/* 6. SUBSCRIPTION PLANS MANAGEMENT TAB */}
      {activeSubTab === 'plans' && (
        <div className="space-y-6 text-right">
          
          {/* Top Banner & Override Action */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Override Subscription to User */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 lg:col-span-1">
              <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>اعطای دستی اشتراک به کاربر</span>
              </h3>
              <p className="text-[10px] text-slate-400 mb-4">
                بدون نیاز به واریز، طرح اشتراکی مشخصی را با مهلت دلخواه به کاربر اعطا کنید.
              </p>

              {overrideStatusMsg && (
                <div className="mb-3 p-3 bg-slate-900 border border-slate-700 text-sky-400 text-[11px] rounded-xl font-medium">
                  {overrideStatusMsg}
                </div>
              )}

              <form onSubmit={handleOverrideSubscription} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">نام کاربری یا شناسه کاربر</label>
                  <input
                    type="text"
                    value={overrideUserId}
                    onChange={(e) => setOverrideUserId(e.target.value)}
                    placeholder="مثلاً: user_123 یا admin"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">انتخاب طرح</label>
                  <select
                    value={overridePlanId}
                    onChange={(e) => setOverridePlanId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                    required
                  >
                    <option value="">-- انتخاب طرح --</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.price.toLocaleString('fa-IR')} تومان)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">مدت اعتبار (روز)</label>
                  <input
                    type="number"
                    value={overrideDuration}
                    onChange={(e) => setOverrideDuration(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    min={1}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer mt-2"
                >
                  اعطای اشتراک دستی
                </button>
              </form>
            </div>

            {/* Plan Create / Edit Form */}
            <div 
              ref={planFormRef} 
              className={`glass-card rounded-2xl p-6 border transition-all duration-300 lg:col-span-2 ${
                editingPlan ? 'border-sky-500/60 shadow-xl shadow-sky-500/10 bg-slate-900/40' : 'border-slate-800'
              }`}
            >
              <div className="flex justify-between items-center mb-4 border-b border-slate-800/80 pb-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Edit className={`w-4 h-4 ${editingPlan ? 'text-amber-400 animate-pulse' : 'text-sky-400'}`} />
                  <span>{editingPlan ? `ویرایش طرح: ${editingPlan.name}` : 'تعریف طرح اشتراک جدید'}</span>
                </h3>
                {editingPlan && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPlan(null);
                      setPlanForm({ name: '', price: 0, description: '', maxQueries: 100, maxKnowledgeCards: 500, durationDays: 30, maxScenarios: 100, quizLimitPerDay: 20, academyAccess: 'unlimited', badge: '' });
                      setPlanStatusMsg(null);
                    }}
                    className="text-[10px] text-amber-400 hover:text-white underline cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    انصراف از ویرایش
                  </button>
                )}
              </div>

              {planStatusMsg && (
                <div className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  planStatusMsg.type === 'success' 
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                    : 'bg-red-950/40 border-red-500/30 text-red-300'
                }`}>
                  {planStatusMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                  <span>{planStatusMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleSavePlan} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-medium">عنوان طرح <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({...planForm, name: e.target.value})}
                    placeholder="مثلاً: اشتراک طلایی کاریزما"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-medium">قیمت (تومان) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({...planForm, price: Number(e.target.value)})}
                    placeholder="0 یعنی رایگان"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none transition"
                    required
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">مدت زمان اعتبار (روز)</label>
                  <input
                    type="number"
                    value={planForm.durationDays}
                    onChange={(e) => setPlanForm({...planForm, durationDays: Number(e.target.value)})}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none transition"
                    min={1}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">سقف پرس‌وجوی RAG روزانه</label>
                  <input
                    type="number"
                    value={planForm.maxQueries}
                    onChange={(e) => setPlanForm({...planForm, maxQueries: Number(e.target.value)})}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none transition"
                    min={1}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">سقف کارت‌های لایتنر/دانش</label>
                  <input
                    type="number"
                    value={planForm.maxKnowledgeCards}
                    onChange={(e) => setPlanForm({...planForm, maxKnowledgeCards: Number(e.target.value)})}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none transition"
                    min={1}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">سقف سناریوهای تمرینی</label>
                  <input
                    type="number"
                    value={planForm.maxScenarios}
                    onChange={(e) => setPlanForm({...planForm, maxScenarios: Number(e.target.value)})}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none transition"
                    min={1}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">سطح دسترسی آکادمی</label>
                  <select
                    value={planForm.academyAccess}
                    onChange={(e) => setPlanForm({...planForm, academyAccess: e.target.value as any})}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none transition"
                  >
                    <option value="unlimited">کامل و نامحدود</option>
                    <option value="pro">حرفه‌ای (Pro)</option>
                    <option value="basic">پایه (Basic)</option>
                    <option value="none">غیرفعال</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">نشان ویژه (Badge)</label>
                  <input
                    type="text"
                    value={planForm.badge}
                    onChange={(e) => setPlanForm({...planForm, badge: e.target.value})}
                    placeholder="مثلاً: محبوب‌ترین، ویژه VIP"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none transition"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] text-slate-400 mb-1">توضیحات طرح</label>
                  <input
                    type="text"
                    value={planForm.description}
                    onChange={(e) => setPlanForm({...planForm, description: e.target.value})}
                    placeholder="خلاصه ویژگی‌ها و مزایای طرح..."
                    className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none transition"
                  />
                </div>

                <div className="md:col-span-2 pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={planLoading}
                    className={`flex-1 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-lg flex items-center justify-center gap-2 ${
                      editingPlan 
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20' 
                        : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/20'
                    }`}
                  >
                    {planLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : editingPlan ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>ذخیره تغییرات تعرفه</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>ایجاد طرح اشتراک جدید</span>
                      </>
                    )}
                  </button>

                  {editingPlan && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlan(null);
                        setPlanForm({ name: '', price: 0, description: '', maxQueries: 100, maxKnowledgeCards: 500, durationDays: 30, maxScenarios: 100, quizLimitPerDay: 20, academyAccess: 'unlimited', badge: '' });
                        setPlanStatusMsg(null);
                      }}
                      className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                    >
                      انصراف
                    </button>
                  )}
                </div>
              </form>
            </div>

          </div>

          {/* Existing Plans Cards List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-300">لیست تعرفه‌ها و طرح‌های فعال سیستم ({plans.length})</h3>
              <span className="text-[10px] text-slate-500">برای ویرایش، روی دکمه «ویرایش تعرفه» در هر کارت کلیک کنید</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map(p => {
                const isSelectedForEdit = editingPlan && editingPlan.id === p.id;
                return (
                  <div 
                    key={p.id} 
                    className={`glass-card rounded-2xl p-5 border relative flex flex-col justify-between space-y-4 transition-all duration-300 ${
                      isSelectedForEdit 
                        ? 'border-amber-500/70 bg-amber-500/5 ring-1 ring-amber-500/30' 
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-sm text-white flex items-center gap-2">
                          <span>{p.name}</span>
                          {isSelectedForEdit && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                              در حال ویرایش
                            </span>
                          )}
                        </h4>
                        {p.badge && (
                          <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-black text-emerald-400 font-mono mb-1">
                        {p.price > 0 ? `${p.price.toLocaleString('fa-IR')} تومان` : 'رایگان'}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{p.description || 'بدون توضیح'}</p>

                      <div className="mt-4 space-y-1.5 text-[11px] text-slate-300 border-t border-slate-800/60 pt-3">
                        <div className="flex justify-between">
                          <span className="text-slate-500">مدت اعتبار:</span>
                          <span className="font-mono">{p.durationDays || 30} روز</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">سقف پرس و جوی RAG:</span>
                          <span className="font-mono">{p.maxQueries} پرسش</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">سقف کارت‌های لایتنر:</span>
                          <span className="font-mono">{p.maxKnowledgeCards} کارت</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">سقف سناریوها:</span>
                          <span className="font-mono">{p.maxScenarios || 100} سناریو</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-800/40">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlan(p);
                          setPlanForm({
                            name: p.name,
                            price: p.price,
                            description: p.description || '',
                            maxQueries: p.maxQueries,
                            maxKnowledgeCards: p.maxKnowledgeCards,
                            durationDays: p.durationDays || 30,
                            maxScenarios: p.maxScenarios || 100,
                            quizLimitPerDay: p.quizLimitPerDay || 20,
                            academyAccess: p.academyAccess || 'unlimited',
                            badge: p.badge || ''
                          });
                          setPlanStatusMsg(null);
                          setTimeout(() => {
                            planFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 50);
                        }}
                        className={`flex-1 font-bold text-xs py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          isSelectedForEdit
                            ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                            : 'bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-800'
                        }`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>{isSelectedForEdit ? 'در حال ویرایش فرم بالا' : 'ویرایش تعرفه'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePlan(p.id, p.name)}
                        title="حذف طرح"
                        className="p-2 bg-slate-900 hover:bg-red-950/60 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-500/30 rounded-xl transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 pb-24 sm:pb-28 z-[60] animate-fade-in">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-right">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">
                {editingUser ? 'بروزرسانی مشخصات و نقش کاربر' : 'ایجاد حساب کاربری جدید تستی'}
              </h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-white p-1 text-lg">×</button>
            </div>

            {userError && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl">
                {userError}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-300">نام کاربری</label>
                  {!editingUser && (
                    <span className="text-[10px] text-sky-400 font-mono">فقط حروف و اعداد انگلیسی</span>
                  )}
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: admin_user"
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white text-left ltr font-mono"
                  style={{ direction: 'ltr' }}
                  disabled={!!editingUser}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">کلمه عبور (خالی بگذارید تا تغییر نکند)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                  placeholder={editingUser ? 'رمز جدید را وارد نمایید...' : 'حداقل ۶ کاراکتر'}
                  required={!editingUser}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-300">شماره تلفن همراه (موبایل)</label>
                  <span className="text-[10px] text-slate-400 font-mono">اختیاری (مثال: 09123456789)</span>
                </div>
                <input
                  type="tel"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="09123456789"
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white text-left ltr font-mono"
                  style={{ direction: 'ltr' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">نقش دسترسی (RBAC)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200"
                >
                  <option value="user">کاربر عادی (User)</option>
                  <option value="moderator">اپراتور ارشد (Moderator)</option>
                  <option value="admin">مدیر سیستم (Admin)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-5 py-2 rounded-xl text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs px-6 py-2 rounded-xl transition"
                >
                  ثبت حساب کاربری
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Ticket View/Reply Modal */}
      {viewingTicket && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 pb-24 sm:pb-28 z-[60] animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-right flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    تیکت: {viewingTicket.subject}
                  </h3>
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <span className="text-slate-400">کاربر: <strong className="text-white">{viewingTicket.username || 'کاربر سیستم'}</strong></span>
                    <span className="text-slate-600">•</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      viewingTicket.status === 'open' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                      viewingTicket.status === 'answered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}>
                      {viewingTicket.status === 'open' ? 'در انتظار پاسخ' : viewingTicket.status === 'answered' ? 'پاسخ داده شده' : 'بسته شده'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleAdminTicketStatus(viewingTicket.id, viewingTicket.status)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    viewingTicket.status === 'closed'
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {viewingTicket.status === 'closed' ? 'بازگشایی تیکت' : 'بستن این تیکت'}
                </button>
                <button 
                  onClick={() => setViewingTicket(null)} 
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="بستن پنجره"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-4">
              {viewingTicketLoading ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-400" />
                  <span>در حال دریافت پیام‌های تیکت...</span>
                </div>
              ) : viewingTicketMessages.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs bg-slate-900/40 rounded-2xl p-4">
                  پیامی برای این تیکت بارگذاری نشد.
                </div>
              ) : (
                viewingTicketMessages.map((msg: any, idx: number) => {
                  const isAdmin = msg.senderRole === 'admin' || msg.senderRole === 'moderator';
                  return (
                    <div key={msg.id || idx} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${
                        isAdmin 
                          ? 'bg-sky-950/40 border border-sky-500/30 text-slate-200' 
                          : 'bg-slate-900 border border-slate-800 text-white'
                      }`}>
                        <div className="flex justify-between items-center gap-4 mb-1">
                          <span className={`text-[11px] font-bold ${isAdmin ? 'text-sky-400' : 'text-orange-400'}`}>
                            {isAdmin ? 'پاسخ شما (مدیریت)' : `کاربر (${viewingTicket.username || 'کاربر'})`}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {new Date(msg.createdAt).toLocaleString('fa-IR')}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="shrink-0 border-t border-slate-800 pt-4 mt-2">
              <label className="block text-xs font-semibold text-slate-300 mb-2">ارسال پاسخ جدید به کاربر</label>
              <textarea
                rows={3}
                value={ticketReplyText}
                onChange={(e) => setTicketReplyText(e.target.value)}
                placeholder="متن پاسخ خود را اینجا بنویسید..."
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500/50 resize-none mb-3"
              />
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setViewingTicket(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  بستن پنجره
                </button>
                <button
                  disabled={!ticketReplyText.trim()}
                  onClick={async () => {
                    if (!ticketReplyText.trim()) return;
                    try {
                      const res = await fetch(`/api/admin/tickets/${viewingTicket.id}/reply`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ message: ticketReplyText.trim() })
                      });
                      if (res.ok) {
                        setTicketReplyText('');
                        await handleOpenAdminTicket(viewingTicket);
                        await fetchTickets();
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl transition shadow-lg shadow-sky-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ارسال پاسخ به تیکت</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


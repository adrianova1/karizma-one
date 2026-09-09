import React, { useState, useEffect, useRef } from 'react';
import { 
  MessagesSquare, Plus, Search, Edit2, Trash2, CloudUpload, FileSpreadsheet, 
  Check, X, RefreshCw, AlertCircle, Layers, Filter, Eye, ChevronDown, CheckCircle2,
  Sparkles, Flame, Smile, Heart, Brain, Shield, ArrowRight, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ScenarioItem } from '../types.js';
import { MASTER_CATEGORIES, getMasterCategoryTitle } from '../data/scenarios.js';
import { parseSafeJson } from '../lib/api.js';

interface AdminScenarioManagementProps {
  token: string;
}

export default function AdminScenarioManagement({ token }: AdminScenarioManagementProps) {
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [totalCount, setTotalCount] = useState(0);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<ScenarioItem | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    situation: '',
    opponentLine: '',
    triggers: '',
    keywords: '',
    environment: MASTER_CATEGORIES[0].title,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    goal: 'جذابیت و کنترل مکالمه',
    charismatic: '',
    funny: '',
    confident: '',
    mysterious: '',
    mature: '',
    technique: '',
    bodyLanguage: '',
    teachingNote: ''
  });

  // Excel / CSV Import & Export State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importDefaultCategory, setImportDefaultCategory] = useState(MASTER_CATEGORIES[0].title);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ message: string; importedCount: number; updatedCount: number } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCategoryBadgeClass = (categoryTitle: string) => {
    const c = categoryTitle || '';
    if (c.includes('پوش')) return 'bg-amber-500/15 border-amber-500/30 text-amber-300';
    if (c.includes('شیت')) return 'bg-rose-500/15 border-rose-500/30 text-rose-300';
    if (c.includes('زبون') || c.includes('حاضر')) return 'bg-orange-500/15 border-orange-500/30 text-orange-300';
    if (c.includes('آلفا') || c.includes('پرستیژ')) return 'bg-purple-500/15 border-purple-500/30 text-purple-300';
    if (c.includes('استوری') || c.includes('استارتر')) return 'bg-sky-500/15 border-sky-500/30 text-sky-300';
    if (c.includes('سردی') || c.includes('مدیریت')) return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
    return 'bg-slate-500/15 border-slate-500/30 text-slate-300';
  };

  useEffect(() => {
    fetchScenarios();
  }, [searchQuery, selectedCategory]);

  const fetchScenarios = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedCategory !== 'all') {
        const catObj = MASTER_CATEGORIES.find(c => c.id === selectedCategory);
        if (catObj) params.append('category', catObj.title);
      }
      params.append('limit', '200');

      const res = await fetch(`/api/scenarios?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (data) {
          setScenarios(data.scenarios || []);
          setTotalCount(data.total || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching scenarios:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingScenario(null);
    setFormData({
      title: '',
      situation: '',
      opponentLine: '',
      triggers: '',
      keywords: '',
      environment: MASTER_CATEGORIES[0].title,
      difficulty: 'medium',
      goal: 'جذابیت و کنترل مکالمه',
      charismatic: '',
      funny: '',
      confident: '',
      mysterious: '',
      mature: '',
      technique: '',
      bodyLanguage: '',
      teachingNote: ''
    });
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (scen: ScenarioItem) => {
    const toText = (val: string | string[] | undefined) => {
      if (!val) return '';
      if (Array.isArray(val)) return val.join('\n');
      return String(val);
    };

    setEditingScenario(scen);
    setFormData({
      title: scen.title || '',
      situation: scen.situation || '',
      opponentLine: scen.opponentLine || '',
      triggers: Array.isArray(scen.triggers) ? scen.triggers.join('، ') : (scen.triggers || ''),
      keywords: Array.isArray(scen.keywords) ? scen.keywords.join('، ') : (scen.keywords || ''),
      environment: getMasterCategoryTitle(scen.environment || ''),
      difficulty: scen.difficulty || 'medium',
      goal: scen.goal || 'جذابیت و کنترل مکالمه',
      charismatic: toText(scen.responses?.charismatic),
      funny: toText(scen.responses?.funny),
      confident: toText(scen.responses?.confident),
      mysterious: toText(scen.responses?.mysterious),
      mature: toText(scen.responses?.mature),
      technique: scen.technique || '',
      bodyLanguage: scen.bodyLanguage || '',
      teachingNote: scen.teachingNote || ''
    });
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleSaveScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.situation.trim()) {
      setFormError('شرح موقعیت سناریو الزامی است.');
      return;
    }

    setFormSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const payload = {
        title: formData.title.trim() || formData.situation.trim().slice(0, 60),
        situation: formData.situation.trim(),
        opponentLine: formData.opponentLine ? formData.opponentLine.trim() : undefined,
        environment: formData.environment,
        difficulty: formData.difficulty,
        goal: formData.goal,
        triggers: formData.triggers ? formData.triggers.split(/[,\n;|،]+/).map(t => t.trim()).filter(Boolean) : undefined,
        keywords: formData.keywords ? formData.keywords.split(/[,\n;|،]+/).map(k => k.trim()).filter(Boolean) : undefined,
        responses: {
          charismatic: formData.charismatic,
          funny: formData.funny,
          confident: formData.confident,
          mysterious: formData.mysterious,
          mature: formData.mature
        },
        technique: formData.technique,
        bodyLanguage: formData.bodyLanguage,
        teachingNote: formData.teachingNote
      };

      const url = editingScenario ? `/api/scenarios/${editingScenario.id}` : '/api/scenarios';
      const method = editingScenario ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setFormSuccess(editingScenario ? 'سناریو با موفقیت ویرایش شد.' : 'سناریو جدید با موفقیت ایجاد گردید.');
        setTimeout(() => {
          setIsModalOpen(false);
          fetchScenarios();
        }, 1200);
      } else {
        const data = await parseSafeJson(res);
        setFormError(data?.error || 'خطا در ذخیره‌سازی اطلاعات.');
      }
    } catch (err: any) {
      setFormError('خطا در ارتباط با سرور: ' + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteScenario = async (id: string, title: string) => {
    if (!window.confirm(`آیا از حذف سناریو «${title}» اطمینان دارید؟`)) return;

    try {
      const res = await fetch(`/api/scenarios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchScenarios();
      } else {
        alert('خطا در حذف سناریو.');
      }
    } catch (err) {
      console.error('Error deleting scenario:', err);
    }
  };

  // Excel / CSV / JSON File Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportResult(null);

    const reader = new FileReader();

    if (file.name.toLowerCase().endsWith('.json')) {
      reader.onload = (evt) => {
        try {
          const content = evt.target?.result as string;
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            setParsedRows(parsed);
          } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.scenarios)) {
            setParsedRows(parsed.scenarios);
          } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
            setParsedRows(parsed.items);
          } else {
            alert('فرمت فایل جیسون باید یک آرایه از سناریوها باشد: [{ title, situation, responses: {...} }]');
          }
        } catch (err: any) {
          console.error('Error reading JSON file:', err);
          alert('خطا در خواندن فایل JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsName = wb.SheetNames[0];
          const ws = wb.Sheets[wsName];
          const data = XLSX.utils.sheet_to_json(ws);
          setParsedRows(data);
        } catch (err) {
          console.error('Error reading Excel file:', err);
          alert('خطا در خواندن فایل اکسل. لطفاً فرمت فایل را بررسی فرمایید.');
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedRows || parsedRows.length === 0) {
      alert('هیچ سطری برای ایمپورت یافت نشد.');
      return;
    }

    setImportLoading(true);
    setImportResult(null);
    setImportProgress(null);

    const CHUNK_SIZE = 4000;
    const totalRows = parsedRows.length;
    let totalImported = 0;
    let totalUpdated = 0;

    try {
      if (totalRows <= CHUNK_SIZE) {
        setImportProgress(`در حال پردازش ${totalRows.toLocaleString('fa-IR')} سطر...`);
        const res = await fetch('/api/scenarios/import-excel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            rows: parsedRows,
            defaultCategory: importDefaultCategory
          })
        });

        if (res.ok) {
          const data = await parseSafeJson(res);
          if (data) {
            setImportResult(data);
            fetchScenarios();
          }
        } else {
          const data = await parseSafeJson(res);
          alert(data?.error || 'خطا در درون‌ریزی فایل.');
        }
      } else {
        // Multi-chunk sequential import for large files (e.g., 23,000+ scenarios)
        for (let offset = 0; offset < totalRows; offset += CHUNK_SIZE) {
          const chunk = parsedRows.slice(offset, offset + CHUNK_SIZE);
          const currentEnd = Math.min(offset + CHUNK_SIZE, totalRows);
          setImportProgress(`در حال پردازش و ثبت سطرهای ${offset + 1} تا ${currentEnd} از ${totalRows.toLocaleString('fa-IR')}...`);

          const res = await fetch('/api/scenarios/import-excel', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              rows: chunk,
              defaultCategory: importDefaultCategory
            })
          });

          if (!res.ok) {
            const data = await parseSafeJson(res);
            throw new Error(data?.error || `خطا در پردازش سطر ${offset + 1}`);
          }

          const data = await parseSafeJson(res);
          if (data) {
            totalImported += data.importedCount || 0;
            totalUpdated += data.updatedCount || 0;
          }
        }

        setImportResult({
          message: `عملیات کامل شد. مجموعاً ${totalImported.toLocaleString('fa-IR')} سناریوی جدید افزوده و ${totalUpdated.toLocaleString('fa-IR')} سناریو به‌روزرسانی شد.`,
          importedCount: totalImported,
          updatedCount: totalUpdated
        });
        fetchScenarios();
      }
    } catch (err: any) {
      alert('خطا در ارسال داده‌ها: ' + err.message);
    } finally {
      setImportLoading(false);
      setImportProgress(null);
    }
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const res = await fetch('/api/scenarios?limit=50000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('خطا در دریافت اطلاعات سناریوها');
      const data = await parseSafeJson(res);
      const list = data?.scenarios || [];
      if (list.length === 0) {
        alert('هیچ سناریویی برای خروجی گرفتن وجود ندارد.');
        return;
      }
      const exportRows = list.map((s: ScenarioItem) => ({
        'شناسه': s.id,
        'عنوان سناریو': s.title,
        'موقعیت': s.situation,
        'پیام مخاطب': s.opponentLine || '',
        'دسته‌بندی': s.environment || '',
        'سطح دشواری': s.difficulty || 'medium',
        'هدف مکالمه': s.goal || '',
        'عبارت‌های جستجو (تریگرها)': Array.isArray(s.triggers) ? s.triggers.join(', ') : '',
        'کلمات کلیدی': Array.isArray(s.keywords) ? s.keywords.join(', ') : '',
        'پاسخ کاریزماتیک': typeof s.responses?.charismatic === 'string' ? s.responses.charismatic : '',
        'پاسخ شوخ‌طبع': typeof s.responses?.funny === 'string' ? s.responses.funny : '',
        'پاسخ مقتدر': typeof s.responses?.confident === 'string' ? s.responses.confident : '',
        'پاسخ مرموز': typeof s.responses?.mysterious === 'string' ? s.responses.mysterious : '',
        'پاسخ متین': typeof s.responses?.mature === 'string' ? s.responses.mature : '',
        'تکنیک': s.technique || '',
        'زبان بدن': s.bodyLanguage || '',
        'نکته آموزشی': s.teachingNote || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Scenarios');
      XLSX.writeFile(wb, `karizma_scenarios_${Date.now()}.xlsx`);
    } catch (err: any) {
      console.error('Export error:', err);
      alert('خطا در دانلود فایل اکسل: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header and Actions */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessagesSquare className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">مدیریت بانک جامع سناریوها</h2>
          </div>
          <p className="text-xs text-slate-400">
            ایجاد، ویرایش، حذف و درون‌ریزی دسته‌ای سناریوها از طریق فایل‌های اکسل در دسته‌بندی‌های استاندارد.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={exportLoading}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm disabled:opacity-50"
            title="دانلود بانک سناریوها در قالب فایل اکسل استاندارد"
          >
            {exportLoading ? <RefreshCw className="w-4 h-4 animate-spin text-sky-400" /> : <Download className="w-4 h-4 text-sky-400" />}
            <span>{exportLoading ? 'در حال آماده‌سازی...' : 'خروجی اکسل (Export)'}</span>
          </button>

          <button
            onClick={() => { setIsImportOpen(true); setImportResult(null); setParsedRows([]); setImportFile(null); }}
            className="px-4 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm"
          >
            <CloudUpload className="w-4 h-4" />
            <span>درون‌ریزی فایل (Excel / JSON)</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer active:scale-95 shadow-md shadow-sky-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن سناریوی جدید</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Category Filter */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در متن سناریو، موقعیت یا پاسخ‌ها..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-500/50 outline-none"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-sky-500/50 outline-none"
            >
              <option value="all">همه دسته‌بندی‌ها ({totalCount})</option>
              {MASTER_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-900">
          <span>نمایش <strong className="text-sky-400">{scenarios.length}</strong> از <strong className="text-white">{totalCount}</strong> سناریو موجود در دیتابیس</span>
          <button onClick={fetchScenarios} className="hover:text-white flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            <span>بروزرسانی جدول</span>
          </button>
        </div>
      </div>

      {/* 3. Scenarios Data Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
            <span className="text-xs">در حال بارگذاری اطلاعات سناریوها...</span>
          </div>
        ) : scenarios.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-2">
            <MessagesSquare className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-xs">هیچ سناریویی با فیلتر جاری یافت نشد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3.5 w-12 text-center text-slate-500 font-mono">#</th>
                  <th className="p-3.5">عنوان دسته‌بندی</th>
                  <th className="p-3.5">سطح دشواری</th>
                  <th className="p-3.5">هدف مکالمه</th>
                  <th className="p-3.5">آمار (بازدید / لایک)</th>
                  <th className="p-3.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {scenarios.map((scen, idx) => {
                  const masterTitle = getMasterCategoryTitle(scen.environment || scen.category || '');
                  const badgeClass = getCategoryBadgeClass(masterTitle);
                  return (
                    <tr key={scen.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 text-center text-slate-500 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold shadow-sm w-fit ${badgeClass}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            <span>{masterTitle}</span>
                          </span>
                          {scen.opponentLine ? (
                            <span className="text-[11px] text-slate-400 truncate max-w-[280px]">
                              «{scen.opponentLine}»
                            </span>
                          ) : scen.situation ? (
                            <span className="text-[11px] text-slate-500 truncate max-w-[280px]">
                              {scen.situation}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          scen.difficulty === 'hard' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : scen.difficulty === 'easy' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                        }`}>
                          {scen.difficulty === 'hard' ? 'چالش‌برانگیز' : scen.difficulty === 'easy' ? 'آسان' : 'متوسط'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 text-xs max-w-[180px] truncate">
                        {scen.goal || 'جذابیت و کنترل مکالمه'}
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                        👁️ {scen.views || 0} | ❤️ {scen.likes || 0}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(scen)}
                            className="px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 rounded-lg transition flex items-center gap-1.5 text-[11px] font-bold cursor-pointer"
                            title="ویرایش و مشاهده سناریو"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>ویرایش</span>
                          </button>
                          <button
                            onClick={() => handleDeleteScenario(scen.id, masterTitle)}
                            className="p-1.5 text-rose-400 hover:bg-rose-500/15 rounded-lg transition cursor-pointer"
                            title="حذف سناریو"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Add / Edit Scenario Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>{editingScenario ? 'ویرایش اطلاعات سناریو' : 'افزودن سناریوی جدید به بانک'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveScenario} className="p-6 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-bold">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-bold">
                  {formSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">دسته‌بندی تخصصی *</label>
                  <select
                    value={formData.environment}
                    onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {MASTER_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.title}>{cat.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">سطح دشواری</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="easy">آسان</option>
                    <option value="medium">متوسط</option>
                    <option value="hard">چالش‌برانگیز</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">هدف روانشناسی مکالمه</label>
                  <input
                    type="text"
                    value={formData.goal}
                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                    placeholder="مثلاً: حفظ احترام و کنترل فضا"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-slate-300 font-bold mb-1">موقعیت و شرح سناریو *</label>
                  <textarea
                    rows={3}
                    value={formData.situation}
                    onChange={(e) => setFormData({ ...formData, situation: e.target.value })}
                    placeholder="شرح دقیق وضعیت، مخاطب و آنچه رخ داده است..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white"
                    required
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-slate-300 font-bold mb-1">پیام یا جمله مخاطب (اختیاری)</label>
                  <input
                    type="text"
                    value={formData.opponentLine}
                    onChange={(e) => setFormData({ ...formData, opponentLine: e.target.value })}
                    placeholder="کلام یا پیامی که شخص مقابل گفته است"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sky-400 font-bold mb-1">
                    🎯 عبارت‌های جستجوی کاربر (تریگرها / Triggers) - با کاما جدا کنید
                  </label>
                  <input
                    type="text"
                    value={formData.triggers}
                    onChange={(e) => setFormData({ ...formData, triggers: e.target.value })}
                    placeholder="مثال: حقوقت چقدره، چقدر حقوق میگیری، درآمدم، سوال درباره درآمد"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    اگر کاربر این عبارات را در هوش مصنوعی یا بخش چی بگم سرچ کند، این سناریو مستقیماً با اولویت بالا شناسایی می‌شود.
                  </p>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-purple-400 font-bold mb-1">
                    🏷️ کلمات کلیدی سناریو (Keywords) - با کاما جدا کنید
                  </label>
                  <input
                    type="text"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder="مثال: درآمد، فضولی، مرزبندی مالی، خط قرمز، کار"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 text-xs"
                  />
                </div>
              </div>

              {/* 5 Tone Responses Input Section */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <span className="font-bold text-sky-400 block">پاسخ‌های ۵ لحن کاریزماتیک:</span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-amber-400 font-bold mb-1">🔥 ۱. لحن قاطع و آلفا (حفظ چارچوب قدرتمند)</label>
                    <input
                      type="text"
                      value={formData.charismatic}
                      onChange={(e) => setFormData({ ...formData, charismatic: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-emerald-400 font-bold mb-1">😏 ۲. لحن شوخ‌طبع و رندانه (چاشنی طنز و کل‌کل)</label>
                    <input
                      type="text"
                      value={formData.funny}
                      onChange={(e) => setFormData({ ...formData, funny: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-rose-400 font-bold mb-1">❤️ ۳. لحن صمیمی و همدلانه (اتصال عاطفی گرم)</label>
                    <input
                      type="text"
                      value={formData.confident}
                      onChange={(e) => setFormData({ ...formData, confident: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-purple-400 font-bold mb-1">🧠 ۴. لحن عمیق و روانشناختی (هدایت ناخودآگاه)</label>
                    <input
                      type="text"
                      value={formData.mysterious}
                      onChange={(e) => setFormData({ ...formData, mysterious: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sky-400 font-bold mb-1">💼 ۵. لحن دیپلماتیک و باوقار (مدیریت منطقی)</label>
                    <input
                      type="text"
                      value={formData.mature}
                      onChange={(e) => setFormData({ ...formData, mature: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Analysis & Instructions */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">تحلیل روانشناسی و تکنیک</label>
                  <textarea
                    rows={2}
                    value={formData.technique}
                    onChange={(e) => setFormData({ ...formData, technique: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">زبان بدن و لحن بیان</label>
                  <textarea
                    rows={2}
                    value={formData.bodyLanguage}
                    onChange={(e) => setFormData({ ...formData, bodyLanguage: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">گام بعدی و نکته آموزشی</label>
                  <textarea
                    rows={2}
                    value={formData.teachingNote}
                    onChange={(e) => setFormData({ ...formData, teachingNote: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl transition flex items-center gap-2"
                >
                  {formSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingScenario ? 'بروزرسانی سناریو' : 'ثبت در دیتابیس'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Excel / JSON Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
            
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>درون‌ریزی فایل (Excel / JSON) به بانک سناریوها</span>
              </h3>
              <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-400 leading-relaxed">
                می‌توانید فایل‌های اکسل (<code className="text-emerald-400">.xlsx</code>, <code className="text-emerald-400">.xls</code>, <code className="text-emerald-400">.csv</code>) یا فایل‌های داده <code className="text-sky-400">.json</code> را مستقیماً آپلود کنید. فیلدها و ستون‌های ۵ لحن و اطلاعات روانشناسی به صورت هوشمند شناسایی و در بانک ذخیره خواهند شد.
              </p>

              <div>
                <label className="block text-slate-300 font-bold mb-1">دسته‌بندی پیش‌فرض (در صورت عدم وجود ستون در فایل):</label>
                <select
                  value={importDefaultCategory}
                  onChange={(e) => setImportDefaultCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {MASTER_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.title}>{cat.title}</option>
                  ))}
                </select>
              </div>

              {/* File Dropzone / Select */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/60 rounded-2xl p-6 text-center cursor-pointer transition space-y-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <CloudUpload className="w-8 h-8 text-emerald-400 mx-auto" />
                <span className="text-slate-300 font-bold block">
                  {importFile ? importFile.name : 'انتخاب یا رها کردن فایل اکسل یا جیسون'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {parsedRows.length > 0 ? `${parsedRows.length} مورد شناسایی شد.` : 'فرمت‌های پشتیبانی‌شده: .xlsx , .xls , .csv , .json'}
                </span>
              </div>

              {/* Import Progress Notification */}
              {importProgress && (
                <div className="p-3 bg-sky-500/15 border border-sky-500/30 text-sky-300 rounded-2xl flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                  <span className="text-[12px] font-medium">{importProgress}</span>
                </div>
              )}

              {/* Import Result Notification */}
              {importResult && (
                <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-2xl space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>درون‌ریزی تکمیل شد</span>
                  </span>
                  <p className="text-[11px]">{importResult.message}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition"
                >
                  بستن
                </button>
                <button
                  type="button"
                  disabled={parsedRows.length === 0 || importLoading}
                  onClick={handleExecuteImport}
                  className={`px-5 py-2 font-bold rounded-xl transition flex items-center gap-2 ${
                    parsedRows.length > 0 && !importLoading
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {importLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>شروع درون‌ریزی ({parsedRows.length} مورد)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

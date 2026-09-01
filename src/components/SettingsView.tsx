import React, { useState, useEffect } from 'react';
import { 
  Settings2, HelpCircle, Save, CheckCircle, RefreshCw, AlertCircle, Sparkles
} from 'lucide-react';
import { PromptTemplate } from '../types.js';
import { parseSafeJson } from '../lib/api.js';

interface SettingsViewProps {
  token: string;
}

export default function SettingsView({ token }: SettingsViewProps) {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  // Selected template fields
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [name, setName] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [templateText, setTemplateText] = useState('');

  // Search Thresholds
  const [searchThreshold, setSearchThreshold] = useState(0.25);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/prompts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseSafeJson(res);
      if (Array.isArray(data)) {
        setPrompts(data);
        if (data.length > 0) {
          const active = data.find(p => p.isActive) || data[0];
          handleSelectPrompt(active);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleSelectPrompt = (p: PromptTemplate) => {
    setSelectedPromptId(p.id);
    setName(p.name);
    setSystemInstruction(p.systemInstruction);
    setTemplateText(p.templateText);
  };

  const handlePromptSelectChange = (id: string) => {
    const p = prompts.find(pr => pr.id === id);
    if (p) {
      handleSelectPrompt(p);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setError('');

    const payload = {
      name,
      systemInstruction,
      templateText,
      isActive: true
    };

    try {
      const res = await fetch(`/api/prompts/${selectedPromptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await parseSafeJson(res);
      if (!res.ok) {
        throw new Error(data?.error || 'خطا در ذخیره‌سازی الگو.');
      }

      setSuccessMsg('قوانین پرامپت و تنظیمات موتور RAG با موفقیت بر روی فایل سرور بازنویسی شد.');
      fetchPrompts(); // Refresh
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6 md:p-8 text-slate-100 font-sans" style={{ direction: 'rtl' }}>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">تنظیمات سیستمی پرامپت و فیلتراسیون</h1>
          <p className="text-xs text-slate-400">کوک کردن فونداسیون سیستم RAG و پرامپت مهندسی هلدینگ کاریزما سنتر</p>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl text-right flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl text-right flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-right">
        
        {/* Settings Form */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-3xl p-6 border border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 mb-6 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-sky-400" />
              <span>پیکربندی قالب فعال موتور جستجوی هوشمند RAG</span>
            </h3>

            {loading ? (
              <div className="text-center py-8 text-slate-400 text-xs">در حال بارگذاری الگوها...</div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-5">
                
                {/* Template selection dropdown */}
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1.5">انتخاب سناریو قالب پرامپت</label>
                  <select
                    value={selectedPromptId}
                    onChange={(e) => handlePromptSelectChange(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200"
                  >
                    {prompts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.isActive ? '(فعال)' : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1.5">دستورالعمل سیستمی مرجع (System Instruction)</label>
                  <textarea
                    value={systemInstruction}
                    onChange={(e) => setSystemInstruction(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 h-28 focus:outline-none focus:border-sky-500/30"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1.5">طرح ساختاری کوئری (Prompt Template Text)</label>
                  <textarea
                    value={templateText}
                    onChange={(e) => setTemplateText(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 font-mono h-40 text-left focus:outline-none focus:border-sky-500/30"
                    style={{ direction: 'ltr' }}
                    required
                  />
                  <span className="text-[9px] text-slate-500 block mt-1.5 text-right">
                    متغیرهای <code className="text-sky-400">{"{{CONTEXT}}"}</code> و <code className="text-sky-400">{"{{QUESTION}}"}</code> به صورت خودکار توسط موتور بازیابی در طول سرچ جاگذاری می‌شوند.
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-lg shadow-sky-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>ذخیره تغییرات و بازنشانی موتور</span>
                </button>

              </form>
            )}

          </div>
        </div>

        {/* Informational Help card */}
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-200">کالیبره‌سازی آستانه شباهت BM25</h4>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-slate-400">آستانه فیلتر (Relevance Cutoff)</span>
                <span className="text-sky-400 font-bold">{searchThreshold}</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.90"
                step="0.05"
                value={searchThreshold}
                onChange={(e) => setSearchThreshold(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed">
              مقادیر بالاتر باعث سخت‌گیری بیشتر در انتخاب مستندات می‌شود و در صورتی که تطابق بالایی یافت نشود، مستقیماً به هوش مصنوعی عمومی سوئیچ خواهد کرد.
            </p>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-slate-800 text-xs space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              <span>خط لوله RAG کاریزما چیست؟</span>
            </h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              موتور جستجوی اختصاصی کاریزما سنتر در مرحله اول متن کاربر را با قواعد زبان فارسی (ی و ک عربی، حذف دیامترها، نیم‌فاصله‌ها) هماهنگ می‌سازد. سپس با استفاده از الگوریتم BM25 و فرمول برداری کاراکترهای Trigram کارت‌های مستندات منطبق را رتبه‌بندی می‌نماید. اسناد منتخب در آخر درون کانتکست پرامپت قرار گرفته و به هوش جنراتور ارسال می‌شوند.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}

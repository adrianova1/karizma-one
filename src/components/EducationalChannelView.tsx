import React, { useState, useEffect } from 'react';
import { 
  Send, Globe, ExternalLink, Copy, Check, CheckCircle2, 
  ShieldCheck, Sparkles, Layers, Link as LinkIcon, Radio
} from 'lucide-react';
import { parseSafeJson } from '../lib/api.js';

interface EducationalChannelViewProps {
  token: string;
}

interface ChannelData {
  telegramUrl: string;
  alternativeUrl: string;
  alternativeTitle: string;
  alternativeDesc: string;
  alternativePlatformName: string;
  channelTitle: string;
  channelDescription: string;
}

export default function EducationalChannelView({ token }: EducationalChannelViewProps) {
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [channelData, setChannelData] = useState<ChannelData>({
    telegramUrl: 'https://t.me/Karizma_Academy',
    alternativeUrl: 'https://youtube.com/@Karizma_Center',
    alternativeTitle: 'کانال ارتباطی و دوره‌های جایگزین',
    alternativeDesc: 'دسترسی جایگزین به دوره‌ها، آموزش‌های تصویری، کانال‌های داخلی یا شبکه‌های اجتماعی در صورت عدم دسترسی به تلگرام',
    alternativePlatformName: 'یوتیوب / دوره‌ها / کانال جایگزین',
    channelTitle: 'کانال‌های آموزشی و ارتباطی کاریزما',
    channelDescription: 'دسترسی مستقیم به کانال اصلی تلگرام و بستر ارتباطی جایگزین جهت دریافت دوره‌های آموزشی، تحلیل سناریوها، پشتیبانی و کتاب‌ها'
  });

  useEffect(() => {
    fetch('/api/settings/educational-channel')
      .then(async (res) => {
        if (!res.ok) return null;
        return parseSafeJson(res);
      })
      .then((data) => {
        if (data) {
          setChannelData(prev => ({
            ...prev,
            ...data
          }));
        }
      })
      .catch((err) => console.error('Error loading educational links:', err))
      .finally(() => setLoading(false));
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 text-slate-100 font-sans space-y-6 max-w-4xl mx-auto" style={{ direction: 'rtl' }}>
      
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1224] via-[#101938] to-[#1d0d33] border border-sky-500/30 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.15),transparent_60%)] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-sky-500/20 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-sky-400">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold text-sky-400 bg-sky-950/80 border border-sky-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  کانال‌های آموزشی کاریزما
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  برخط و فعال
                </span>
              </div>
              <h1 className="text-lg md:text-xl font-black text-white mt-1.5">
                {channelData.channelTitle}
              </h1>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mt-4 border-t border-slate-800/80 pt-3.5">
          {channelData.channelDescription}
        </p>
      </div>

      {/* Exactly 2 Options / Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* OPTION 1: Primary Telegram Channel & Bot */}
        <div className="bg-gradient-to-br from-[#0c1626] via-[#0f1d33] to-[#0a1220] border border-sky-500/40 hover:border-sky-400 rounded-3xl p-6 transition-all duration-300 shadow-xl relative group overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-36 h-36 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition-all pointer-events-none" />
          
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/25">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">کانال تلگرام و ربات کاریزما</h2>
                  <span className="text-[11px] text-sky-400 font-bold">بستر اصلی آموزش، پشتیبانی و کتاب‌ها</span>
                </div>
              </div>
              <span className="text-[10px] bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded-full font-bold">
                کانال اصلی
              </span>
            </div>

            <ul className="space-y-2.5 mb-6 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>ارائه پادکست‌ها، فایل‌های صوتی و دوره‌های جامع مهارت فن بیان و کاریزما</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>پشتیبانی مستقیم، تحلیل چت‌های واقعی و رفع اشکال مکالمات کاربران</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>اتصال به ربات هوشمند جهت ارسال خودکار دوره‌ها، خلاصه کتاب‌ها و PDFهای آموزشی</span>
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-2 pt-4 border-t border-sky-500/20">
            <a
              href={channelData.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gradient-to-l from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs py-3.5 px-4 rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 active:scale-98"
            >
              <Send className="w-4 h-4" />
              <span>عضویت در کانال تلگرام کاریزما</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => copyToClipboard(channelData.telegramUrl, 'tg')}
              title="کپی لینک تلگرام"
              className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 p-3.5 rounded-2xl transition cursor-pointer shrink-0"
            >
              {copiedKey === 'tg' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* OPTION 2: Alternative Communication Channel / Custom Link (YouTube, SpotPlayer, Instagram, Rubika, etc.) */}
        <div className="bg-gradient-to-br from-[#180f28] via-[#140e24] to-[#0d0918] border border-purple-500/40 hover:border-purple-400 rounded-3xl p-6 transition-all duration-300 shadow-xl relative group overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />
          
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/25">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">
                    {channelData.alternativeTitle || 'کانال ارتباطی و دوره‌های جایگزین'}
                  </h2>
                  <span className="text-[11px] text-purple-400 font-bold">
                    {channelData.alternativePlatformName || 'بستر ارتباطی و آموزشی جایگزین'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-full font-bold">
                کانال جایگزین
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              {channelData.alternativeDesc || 'دسترسی جایگزین به دوره‌ها، آموزش‌های تصویری، کانال‌های داخلی یا شبکه‌های اجتماعی در صورت نیاز'}
            </p>

            <ul className="space-y-2.5 mb-6 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>دسترسی سریع و مستقیم به لینک تنظیم‌شده توسط مدیریت</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>پشتیبانی از انواع پلتفرم‌ها (یوتیوب، اسپات‌پلیر، اینستاگرام، روبیکا، بله و...)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>امکان استفاده بدون اختلال در صورت عدم دسترسی به تلگرام</span>
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-2 pt-4 border-t border-purple-500/20">
            <a
              href={channelData.alternativeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gradient-to-l from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs py-3.5 px-4 rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 active:scale-98"
            >
              <LinkIcon className="w-4 h-4" />
              <span>ورود به کانال / دوره جایگزین</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => copyToClipboard(channelData.alternativeUrl, 'alt')}
              title="کپی لینک جایگزین"
              className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 p-3.5 rounded-2xl transition cursor-pointer shrink-0"
            >
              {copiedKey === 'alt' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

      </div>

      {/* Trust & Direct Support Footer */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center space-y-2">
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-300 font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>اصالت و پشتیبانی کانال‌ها</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl mx-auto">
          تمامی لینک‌ها و دوره‌های فوق توسط تیم فنی مرکز کاریزما مدیریت و به‌روزرسانی می‌شوند. در صورت بروز هرگونه سوال با پشتیبانی در ارتباط باشید.
        </p>
      </div>

    </div>
  );
}

import React, { useState } from 'react';
import { Shield, KeyRound, UserPlus, LogIn } from 'lucide-react';
import { trackEvent } from '../lib/tracking.js';
import { parseSafeJson } from '../lib/api.js';

interface AuthViewProps {
  onLoginSuccess: (token: string, user: { id: string; username: string; role: string }) => void;
}

export default function AuthView({ onLoginSuccess }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toEnglishDigits = (str: string) => {
    return str
      .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername || !password.trim()) {
      setError('لطفاً نام کاربری و کلمه عبور را وارد کنید.');
      return;
    }
    if (!isLogin) {
      if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(cleanUsername)) {
        setError('نام کاربری باید حتماً با یک حرف انگلیسی آغاز شود و نمی‌تواند فقط عدد باشد یا با عدد شروع شود (مثال معتبر: adri12).');
        return;
      }
      if (cleanUsername.length < 3) {
        setError('نام کاربری باید حداقل ۳ کاراکتر باشد.');
        return;
      }
      if (cleanUsername.length > 30) {
        setError('نام کاربری حداکثر می‌تواند ۳۰ کاراکتر باشد.');
        return;
      }
      const normalizedPhone = toEnglishDigits(phoneNumber.trim()).replace(/[^0-9]/g, '');
      if (!normalizedPhone) {
        setError('وارد کردن شماره تلفن برای ثبت‌نام الزامی است.');
        return;
      }
      if (!/^09\d{9}$/.test(normalizedPhone)) {
        setError('لطفاً یک شماره موبایل معتبر ۱۱ رقمی (مانند 09123456789) وارد کنید.');
        return;
      }
    }

    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload: any = { username: cleanUsername, password };
    if (!isLogin) {
      payload.phoneNumber = toEnglishDigits(phoneNumber.trim()).replace(/[^0-9]/g, '');
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await parseSafeJson(response);
        throw new Error(errData?.error || `خطای سرور (${response.status})`);
      }

      const data = await parseSafeJson(response);
      if (!data || !data.token || !data.user) {
        throw new Error('پاسخ سرور در قالب معتبر دریافت نشد.');
      }

      trackEvent(isLogin ? 'user_login_success' : 'user_register_success', 'auth');

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans dir-rtl" style={{ direction: 'rtl' }}>
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* App Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-purple-600 p-3 shadow-lg shadow-sky-500/15 mb-4 animate-pulse">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">کاریزما سنتر</h1>
          <p className="text-sm text-slate-400">سامانه پیشرفته مدیریت دانش و هوش مصنوعی هلدینگ کاریزما</p>
        </div>

        {/* Login / Register Card */}
        <div className="glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white text-right">
              {isLogin ? 'ورود به حساب کاربری' : 'ثبت‌نام حساب کاربری جدید'}
            </h2>
            <p className="text-xs text-slate-400 text-right mt-1">
              {isLogin ? 'لطفاً نام کاربری و کلمه عبور خود را وارد نمایید' : 'جهت ساخت حساب کاربری جدید فرم زیر را تکمیل فرمایید'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl text-right">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-medium text-slate-300 text-right">نام کاربری</label>
                {!isLogin && (
                  <span className="text-[10px] text-sky-400 font-mono">فقط حروف و اعداد انگلیسی</span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isLogin ? "مثال: admin یا username" : "مثال: adri12 یا alireza"}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition text-left ltr font-mono"
                  style={{ direction: 'ltr' }}
                  required
                />
              </div>
              {!isLogin && (
                <p className="text-[10px] text-slate-400 text-right mt-1">
                  نام کاربری باید با یک حرف انگلیسی شروع شود (مانند: adri12). استفاده از عدد خالی مجاز نیست.
                </p>
              )}
            </div>

            {!isLogin && (
              <div className="animate-fade-in">
                <label className="block text-xs font-medium text-slate-300 mb-1.5 text-right">شماره تلفن</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(toEnglishDigits(e.target.value).replace(/[^0-9]/g, ''))}
                    placeholder="مثال: 09123456789"
                    maxLength={11}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition text-right ltr"
                    style={{ direction: 'ltr' }}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 text-right">کلمه عبور</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition text-right"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-sky-500 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white font-medium text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isLogin ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>ورود ایمن به حساب</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>ثبت‌نام و ایجاد حساب</span>
                </>
              )}
            </button>
          </form>

          {/* Prominent Glass Box for Switch to Register / Login */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="p-4 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-sky-500/30 hover:border-sky-500/50 shadow-lg shadow-sky-950/40 transition-all text-center group">
              <p className="text-xs text-slate-300 mb-2.5 font-medium">
                {isLogin ? 'هنوز در کاریزما سنتر حساب ندارید؟' : 'قبلاً حساب کاربری ساخته‌اید؟'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setUsername('');
                  setPassword('');
                  setPhoneNumber('');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/40 text-sky-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:shadow-md group-hover:shadow-sky-500/20"
              >
                {isLogin ? (
                  <>
                    <UserPlus className="w-4 h-4 text-sky-400" />
                    <span>ایجاد حساب کاربری جدید</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-sky-400" />
                    <span>ورود به حساب کاربری موجود</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

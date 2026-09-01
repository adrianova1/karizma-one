import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, Phone, Sparkles, Shield, Crown, Check, 
  Save, Calendar, Award, MessageSquare
} from 'lucide-react';
import { User, Role, UserPreferences } from '../types.js';
import { parseSafeJson } from '../lib/api.js';

interface ProfileSettingsViewProps {
  token: string;
  user: User | null;
  subscriptionName?: string;
  onBack?: () => void;
  onUserUpdated?: (updatedUser: User) => void;
}

export default function ProfileSettingsView({
  token,
  user,
  subscriptionName,
  onBack,
  onUserUpdated
}: ProfileSettingsViewProps) {
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [gender, setGender] = useState<'male' | 'female' | 'unspecified'>(
    user?.preferences?.gender || 'unspecified'
  );
  const [autoCopy, setAutoCopy] = useState<boolean>(
    user?.preferences?.autoCopy ?? true
  );

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch latest profile details from API
  useEffect(() => {
    async function loadLatestProfile() {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await parseSafeJson(res);
          if (data?.user) {
            if (data.user.phoneNumber) setPhoneNumber(data.user.phoneNumber);
            if (data.user.preferences) {
              if (data.user.preferences.gender) setGender(data.user.preferences.gender);
              if (data.user.preferences.autoCopy !== undefined) setAutoCopy(data.user.preferences.autoCopy);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    }

    // Also check localStorage fallback
    try {
      const localPrefs = JSON.parse(localStorage.getItem('user_preferences') || '{}');
      if (localPrefs.gender && gender === 'unspecified') setGender(localPrefs.gender);
    } catch {}

    loadLatestProfile();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    // Normalize phone number digits
    const toEnglishDigits = (str: string) => {
      return str
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧۸۹'.indexOf(d).toString());
    };

    const cleanPhone = toEnglishDigits(phoneNumber.trim()).replace(/[^0-9]/g, '');
    if (cleanPhone && !/^09\d{9}$/.test(cleanPhone)) {
      setLoading(false);
      setStatusMsg({
        type: 'error',
        text: 'شماره موبایل وارد شده معتبر نیست. شماره باید ۱۱ رقمی و با 09 شروع شود.'
      });
      return;
    }

    const updatedPreferences: UserPreferences = {
      gender,
      autoCopy
    };

    // Save to local storage for instant offline access
    localStorage.setItem('user_preferences', JSON.stringify(updatedPreferences));

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumber: cleanPhone || undefined,
          preferences: updatedPreferences
        })
      });

      const data = await parseSafeJson(res) || {};
      if (!res.ok) {
        throw new Error(data.error || `خطا در ذخیره‌سازی اطلاعات (${res.status}).`);
      }

      setStatusMsg({
        type: 'success',
        text: 'مشخصات و ترجیحات کاربری شما با موفقیت ذخیره شد.'
      });

      if (onUserUpdated && data.user) {
        onUserUpdated(data.user);
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'خطا در ارتباط با سرور.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative select-none" style={{ direction: 'rtl' }}>
      {/* Main Content Form */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 pb-24">
        {/* Status Toast */}
        {statusMsg && (
          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-fade-in ${
            statusMsg.type === 'success' 
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}>
            {statusMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0 text-emerald-400" /> : <span>⚠️</span>}
            <span className="font-medium">{statusMsg.text}</span>
          </div>
        )}

        {/* User Card Overview */}
        <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400 shadow-inner">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{user?.username || 'کاربر کاریزما'}</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                  user?.role === Role.ADMIN ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  user?.role === Role.MODERATOR ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {user?.role === Role.ADMIN ? 'مدیر سیستم' :
                   user?.role === Role.MODERATOR ? 'اپراتور ارشد' : 'کاربر طلایی'}
                </span>
              </h2>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                <span>شناسه: {user?.id || '-'}</span>
                {user?.role !== Role.ADMIN && (
                  <>
                    <span>•</span>
                    <span className="text-purple-400 font-medium">اشتراک: {subscriptionName || 'بدون اشتراک'}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Phone Number Field */}
          <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-4 space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-sky-400" />
              <span>شماره تلفن همراه:</span>
            </label>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              جهت بازیابی رمز عبور، دریافت پشتیبانی و اطلاع‌رسانی وضعیت اشتراک
            </p>
            <div className="relative mt-1.5">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="مثال: 09123456789"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/60 font-mono text-left dir-ltr"
              />
            </div>
          </div>

          {/* Gender Preference */}
          <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-4 space-y-2">
            <label className="text-xs font-bold text-slate-200 block">
              جنسیت شما (جهت تنظیم دقیق ضمیرها و ساختار پیام‌ها):
            </label>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { id: 'male', label: 'آقا 🧔‍♂️' },
                { id: 'female', label: 'خانم 👩‍🦰' },
                { id: 'unspecified', label: 'بدون ترجیح ⚡' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setGender(opt.id as any)}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer active:scale-95 ${
                    gender === opt.id
                      ? 'bg-sky-500/15 border-sky-500 text-sky-300 font-bold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition cursor-pointer active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>ذخیره مشخصات و تنظیمات</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

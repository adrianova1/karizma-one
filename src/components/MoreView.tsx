import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, CreditCard, Settings2, Users, LogOut, 
  ChevronRight, ArrowLeft, HelpCircle, Shield, ShieldAlert, UserCheck
} from 'lucide-react';
import SubscriptionsView from './SubscriptionsView.js';
import AdminPanelView from './AdminPanelView.js';
import SettingsView from './SettingsView.js';
import ProfileSettingsView from './ProfileSettingsView.js';
import SupportTicketsView from './SupportTicketsView.js';
import { Role, User as UserType } from '../types.js';

interface MoreViewProps {
  token: string;
  user: UserType | null;
  subscriptionName: string;
  onLogout: () => void;
  onOpenOnboarding: () => void;
  initialSubTab?: string;
  onChangeTab?: (tab: string) => void;
  onUserUpdated?: (updatedUser: UserType) => void;
}

export default function MoreView({ 
  token, 
  user, 
  subscriptionName, 
  onLogout, 
  onOpenOnboarding,
  initialSubTab = '',
  onChangeTab,
  onUserUpdated
}: MoreViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<string>(initialSubTab);

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const isAdmin = user?.role === Role.ADMIN;
  const isModerator = user?.role === Role.MODERATOR || isAdmin;

  // Primary menu list
  const menuItems = [
    {
      id: 'profile',
      label: 'پروفایل و اطلاعات کاربری',
      icon: User,
      desc: 'مشاهده و ویرایش مشخصات، شماره تماس و ترجیحات مربی',
      color: 'text-sky-400'
    },
    { 
      id: 'subscriptions', 
      label: 'پلن‌ها و تمدید اشتراک', 
      icon: CreditCard, 
      desc: 'تمدید و خرید دوره‌های تخصصی کاریزما سنتر', 
      color: 'text-purple-400' 
    },
    {
      id: 'support',
      label: 'پشتیبانی و تیکت‌ها',
      icon: HelpCircle,
      desc: 'ارسال درخواست، رفع مشکل و ارتباط با مدیریت',
      color: 'text-orange-400'
    }
  ];

  if (isModerator) {
    menuItems.push({ 
      id: 'admin-panel', 
      label: 'پنل مدیریت و هوش مصنوعی', 
      icon: Users, 
      desc: 'مدیریت کاربران، تراکنش‌ها و مشاهده لاگ‌ها', 
      color: 'text-emerald-400' 
    });
  }

  if (isAdmin) {
    menuItems.push({ 
      id: 'prompts-settings', 
      label: 'تنظیمات و الگوهای پرامپت', 
      icon: Settings2, 
      desc: 'تنظیم متون پیش‌فرض مربی ارشد کاریزما سنتر', 
      color: 'text-amber-400' 
    });
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <AnimatePresence mode="wait">
        {activeSubTab === '' ? (
          /* Main Settings List */
          <motion.div
            key="more-menu"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-1 overflow-y-auto space-y-6 p-6 pb-20 select-none"
            style={{ direction: 'rtl' }}
          >
            {/* Header / User Profile Card */}
            <div 
              onClick={() => setActiveSubTab('profile')}
              className="bg-[#0f0f13] hover:bg-[#15151c] border border-white/5 hover:border-sky-500/30 rounded-2xl p-5 flex items-center justify-between gap-4 transition cursor-pointer group shadow-sm"
              title="کلیک برای مشاهده و ویرایش پروفایل"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-slate-900 group-hover:bg-slate-850 border border-slate-800 flex items-center justify-center shadow-inner">
                  <User className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white group-hover:text-sky-300 transition flex items-center gap-1.5">
                    <span>{user?.username || 'کاربر کاریزما'}</span>
                  </h2>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-1">
                    <span>نقش کاربری:</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                      user?.role === Role.ADMIN ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      user?.role === Role.MODERATOR ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {user?.role === Role.ADMIN ? 'مدیر ارشد سیستم' :
                       user?.role === Role.MODERATOR ? 'اپراتور ارشد' : 'کاربر طلایی'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-left flex items-center gap-2">
                {user?.role !== Role.ADMIN && (
                  <div>
                    <span className="text-[9px] text-slate-500 block">اشتراک فعال:</span>
                    <span className="text-[11px] font-extrabold text-purple-400">{subscriptionName || 'بدون اشتراک'}</span>
                  </div>
                )}
                {user?.role === Role.ADMIN && (
                   <div>
                     <span className="text-[11px] font-extrabold text-slate-400">حساب مدیریتی</span>
                   </div>
                )}
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-sky-400 group-hover:translate-x-0.5 transition" />
              </div>
            </div>

            {/* Menu List of Settings Sections */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-slate-500 px-1 block">بخش‌های پیکربندی و محتوا</span>
              
              <div className="bg-[#0f0f13] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-tab-link={item.id}
                      onClick={() => setActiveSubTab(item.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] text-right transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`p-2 bg-slate-900 border border-slate-800 rounded-xl ${item.color}`}>
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white">{item.label}</h3>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Log out Section */}
            <div className="pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center justify-between p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-2xl text-red-400 transition cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                    <LogOut className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-xs font-bold text-red-400">خروج از حساب کاربری</h3>
                    <p className="text-[9px] text-red-500/60 mt-0.5">پایان دادن به سشن فعال روی این دستگاه</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-red-500/40" />
              </button>
            </div>

          </motion.div>
        ) : (
          /* Active Sub Feature Rendering */
          <motion.div
            key="sub-view"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            className="flex-1 flex flex-col h-full bg-slate-950/40 overflow-hidden"
            style={{ direction: 'rtl' }}
          >
            {/* Top Sub Navbar */}
            <div className="w-full bg-[#111114] border-b border-white/5 px-4 py-3 flex justify-between items-center z-40 shrink-0">
              <button
                onClick={() => setActiveSubTab('')}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl px-3 py-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>بازگشت</span>
              </button>
              <span className="text-xs font-extrabold text-white tracking-wide">
                {menuItems.find(m => m.id === activeSubTab)?.label || 'جزئیات'}
              </span>
              <div className="w-4" /> {/* spacer */}
            </div>

            {/* Content Scroller */}
            <div className="flex-grow overflow-y-auto">
              {activeSubTab === 'profile' && (
                <ProfileSettingsView 
                  token={token} 
                  user={user} 
                  subscriptionName={subscriptionName}
                  onBack={() => setActiveSubTab('')}
                  onUserUpdated={onUserUpdated}
                />
              )}
              {activeSubTab === 'support' && (
                <SupportTicketsView token={token} />
              )}
              {activeSubTab === 'subscriptions' && (
                <SubscriptionsView 
                  token={token} 
                  userSubscriptionId={null} 
                  onSubscriptionUpdate={() => {}} 
                />
              )}
              {activeSubTab === 'admin-panel' && (
                <AdminPanelView token={token} currentUserId={user?.id || ''} />
              )}
              {activeSubTab === 'prompts-settings' && (
                <SettingsView token={token} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

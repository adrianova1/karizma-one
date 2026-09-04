/**
 * Karizma Center Main App Controller
 * Integrates Auth, Sidebar navigation, and all system subviews (RAG, CRUD, Admin, Subscriptions, Settings).
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Menu } from 'lucide-react';
import AuthView from './components/AuthView.js';
import BottomNav from './components/BottomNav.js';
import HomeDashboardView from './components/HomeDashboardView.js';
import MoreView from './components/MoreView.js';
import RAGEngineView from './components/RAGEngineView.js';
import ScenarioBankView from './components/ScenarioBankView.js';
import AcademyView from './components/AcademyView.js';
import EducationalChannelView from './components/EducationalChannelView.js';
import KnowledgeBaseView from './components/KnowledgeBaseView.js';
import LeitnerStudyView from './components/LeitnerStudyView.js';
import OnboardingGuideModal from './components/OnboardingGuideModal.js';
import EmergencyLiveCoachModal from './components/EmergencyLiveCoachModal.js';
import PaywallModal from './components/PaywallModal.js';
import { Role, CoachingMode, User } from './types.js';
import { parseSafeJson } from './lib/api.js';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userXP, setUserXP] = useState<number>(100);
  const [userStreak, setUserStreak] = useState<number>(1);
  const [subscriptionName, setSubscriptionName] = useState('طرح طلایی (سازمانی)'); // Gold preset by default for test user
  const [currentTab, setCurrentTab] = useState('home');
  const [moreSubTab, setMoreSubTab] = useState('');
  const [appLoading, setAppLoading] = useState(true);

  // Intent states to hand over to AI Coach (RAGEngineView)
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [initialMode, setInitialMode] = useState<CoachingMode | undefined>(undefined);

  // Global modals control
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallFeatureTitle, setPaywallFeatureTitle] = useState<string | undefined>(undefined);

  const isNoSubscription = 
    user?.role !== Role.ADMIN && 
    user?.role !== 'admin' &&
    (!subscriptionName || subscriptionName === 'بدون اشتراک فعال' || subscriptionName === 'بدون اشتراک');

  // Authenticate from local storage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('karizma_token');
    const savedUser = localStorage.getItem('karizma_user');

    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setToken(savedToken);
      setUser(parsedUser);

      if (parsedUser.role === Role.ADMIN || parsedUser.role === 'admin') {
        setSubscriptionName('طرح طلایی (یک ماهه VIP)');
      }
      
      // Verify token is still valid with backend
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Session expired');
        }
        return parseSafeJson(res);
      })
      .then(data => {
        if (!data || !data.user) {
          throw new Error('Session expired');
        }
        setUser(data.user);
        if (data.stats) {
          setUserXP(data.stats.xp);
          setUserStreak(data.stats.streak);
        }
        if (data.user.role === Role.ADMIN || data.user.role === 'admin') {
          setSubscriptionName('طرح ادمین مادام‌العمر (VIP نامحدود)');
          return null;
        }
        // Load active subscription label for regular user
        return fetch('/api/subscriptions/me', {
          headers: { 'Authorization': `Bearer ${savedToken}` }
        });
      })
      .then(async (res) => {
        if (!res) return null;
        if (!res.ok) {
          return null;
        }
        return parseSafeJson(res);
      })
      .then(subInfo => {
        if (subInfo) {
          if (subInfo.hasActiveSub && subInfo.planName) {
            setSubscriptionName(subInfo.planName);
          } else {
            setSubscriptionName('بدون اشتراک فعال');
          }
        }
      })
      .catch(() => {
        // Clear expired session
        handleLogout();
      })
      .finally(() => {
        setAppLoading(false);
      });
    } else {
      setAppLoading(false);
    }
  }, []);

  const handleLoginSuccess = (newToken: string, newUserObj: { id: string; username: string; role: string }) => {
    setToken(newToken);
    setUser(newUserObj);
    localStorage.setItem('karizma_token', newToken);
    localStorage.setItem('karizma_user', JSON.stringify(newUserObj));
    
    if (newUserObj.role === Role.ADMIN || newUserObj.role === 'admin') {
      setSubscriptionName('طرح ادمین مادام‌العمر (VIP نامحدود)');
      return;
    }

    // Default subscription query for regular users
    fetch('/api/subscriptions/me', {
      headers: { 'Authorization': `Bearer ${newToken}` }
    })
    .then(async (res) => {
      if (!res.ok) {
        return null;
      }
      return parseSafeJson(res);
    })
    .then(subInfo => {
      if (subInfo && subInfo.hasActiveSub && subInfo.planName) {
        setSubscriptionName(subInfo.planName);
      } else {
        setSubscriptionName('بدون اشتراک فعال');
        if (newUserObj.role !== Role.ADMIN && newUserObj.role !== 'admin') {
          setPaywallFeatureTitle('فعال‌سازی حساب کاربری');
          setPaywallOpen(true);
        }
      }
    })
    .catch(err => console.error(err));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setSubscriptionName('بدون اشتراک');
    setCurrentTab('home');
    setMoreSubTab('');
    localStorage.removeItem('karizma_token');
    localStorage.removeItem('karizma_user');
  };

  const handleGoToSubscriptions = () => {
    setPaywallOpen(false);
    setMoreSubTab('subscriptions');
    setCurrentTab('more');
  };

  const handleTabChange = (targetTab: string) => {
    if (isNoSubscription && (targetTab === 'ai-engine' || targetTab === 'scenarios' || targetTab === 'academy' || targetTab === 'channel')) {
      const titles: Record<string, string> = {
        'ai-engine': 'مربی کاریزما (هوش مصنوعی)',
        'scenarios': 'بانک سناریوها و مکالمات',
        'academy': 'آکادمی تخصصی کاریزما',
        'channel': 'کانال VIP تحلیل‌های لایو'
      };
      setPaywallFeatureTitle(titles[targetTab] || 'امکانات کاربردی');
      setPaywallOpen(true);
      return;
    }

    if (targetTab !== 'more') {
      setMoreSubTab('');
    }
    setCurrentTab(targetTab);
  };

  if (appLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs text-slate-400 font-bold">در حال بارگذاری سیستم کاریزما...</span>
      </div>
    );
  }

  // Display login cards if unauthorized
  if (!token || !user) {
    return <AuthView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-[100dvh] w-full bg-[#050811] text-slate-100 flex justify-center items-center font-sans select-text relative" style={{ direction: 'rtl' }}>
      
      {/* Outer Glow Accents */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-sky-500/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Centered Mobile Container */}
      <div className="w-full md:max-w-[430px] h-[100dvh] bg-[#090d16] flex flex-col border-x border-slate-800/80 md:shadow-[0_0_60px_rgba(56,189,248,0.12)] relative overflow-y-auto overscroll-y-contain">

        {/* Mobile Top Navbar */}
        <div className="w-full bg-[#0b0f19]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3 flex justify-center items-center relative z-40 shrink-0 shadow-md">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-200 bg-clip-text text-transparent">
              مرکز کاریزما
            </span>
            <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          </div>
        </div>

        {/* Mandatory Profile Completion Prompt Banner */}
        {user && user.role !== Role.ADMIN && user.role !== 'admin' && !user.phoneNumber && (currentTab !== 'more' || moreSubTab !== 'profile') && (
          <div className="bg-amber-950/80 border-b border-amber-500/40 px-3.5 py-2 flex items-center justify-between gap-2 z-30 shrink-0 animate-fade-in">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-amber-400 text-xs shrink-0">⚠️</span>
              <span className="text-[11px] text-amber-200 font-medium truncate">
                شماره موبایل شما ثبت نشده است. لطفاً پروفایل را تکمیل کنید.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setMoreSubTab('profile');
                setCurrentTab('more');
              }}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded-lg transition shrink-0 cursor-pointer active:scale-95 shadow-sm"
            >
              تکمیل پروفایل
            </button>
          </div>
        )}

        {/* Main View Work Area */}
        <main className="flex-1 w-full min-h-0 overflow-hidden relative z-10 bg-slate-950/40 flex flex-col">
          
          {currentTab === 'home' && (
            <HomeDashboardView 
              user={user} 
              subscriptionName={subscriptionName} 
              onChangeTab={handleTabChange}
              onOpenEmergencyCoach={() => setEmergencyOpen(true)}
              onGoToSubscriptions={handleGoToSubscriptions}
              onOpenOnboarding={() => setOnboardingOpen(true)}
              onOpenKnowledgeCards={() => {
                if (isNoSubscription) {
                  setPaywallFeatureTitle('کارت‌های مهارتی و دانش');
                  setPaywallOpen(true);
                  return;
                }
                setCurrentTab('knowledge');
              }}
            />
          )}

          {currentTab === 'ai-engine' && (
            <RAGEngineView 
              token={token} 
              initialPrompt={initialPrompt}
              initialMode={initialMode}
              onClearInitialPrompt={() => {
                setInitialPrompt('');
                setInitialMode(undefined);
              }}
              onGoToSubscriptions={handleGoToSubscriptions}
            />
          )}

          {currentTab === 'scenarios' && (
            <div className="flex-grow overflow-y-auto h-full">
              <ScenarioBankView 
                token={token}
                onSelectScenarioForCoach={(scenarioText) => {
                  setInitialPrompt(scenarioText);
                  setCurrentTab('ai-engine');
                }}
              />
            </div>
          )}

          {currentTab === 'channel' && (
            <div className="flex-grow overflow-y-auto h-full">
              <EducationalChannelView token={token} />
            </div>
          )}

          {currentTab === 'academy' && (
            <div className="flex-grow overflow-y-auto h-full">
              <AcademyView token={token} />
            </div>
          )}

          {currentTab === 'leitner' && (
            <div className="flex-grow overflow-y-auto h-full">
              <LeitnerStudyView 
                token={token} 
                onBack={() => setCurrentTab('home')}
                onStudyComplete={() => {
                  setUserXP(prev => prev + 50);
                }}
              />
            </div>
          )}

          {currentTab === 'knowledge' && (
            <div className="flex-grow overflow-y-auto h-full">
              <KnowledgeBaseView token={token} userRole={user.role} onChangeTab={handleTabChange} />
            </div>
          )}

          {currentTab === 'more' && (
            <MoreView 
              token={token}
              user={user}
              subscriptionName={subscriptionName}
              onLogout={handleLogout}
              onOpenOnboarding={() => setOnboardingOpen(true)}
              initialSubTab={moreSubTab}
              onChangeTab={handleTabChange}
              onUserUpdated={(updatedUser) => {
                setUser(updatedUser);
                localStorage.setItem('karizma_user', JSON.stringify(updatedUser));
              }}
            />
          )}

        </main>

        {/* Unified Bottom Mobile Navigation */}
        <BottomNav currentTab={currentTab} onChangeTab={handleTabChange} />

      </div>

      {/* Paywall Lock & Upgrade Modal */}
      <PaywallModal
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onGoToSubscriptions={handleGoToSubscriptions}
        featureTitle={paywallFeatureTitle}
      />

      {/* Global Onboarding Guide Modal */}
      <OnboardingGuideModal 
        isOpen={onboardingOpen} 
        onClose={() => setOnboardingOpen(false)} 
        onSelectPromptAndMode={(promptText, mode) => {
          if (isNoSubscription) {
            setPaywallFeatureTitle('مربی کاریزما (هوش مصنوعی)');
            setPaywallOpen(true);
            return;
          }
          setInitialPrompt(promptText);
          setInitialMode(mode);
          setCurrentTab('ai-engine');
          setOnboardingOpen(false);
        }}
      />

      {/* Global Emergency Live Coach Modal */}
      <EmergencyLiveCoachModal
        isOpen={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        onSubmitLiveCoach={(promptText, mode) => {
          if (isNoSubscription) {
            setPaywallFeatureTitle('مربی کاریزما (هوش مصنوعی)');
            setPaywallOpen(true);
            return;
          }
          setInitialPrompt(promptText);
          setInitialMode(mode);
          setCurrentTab('ai-engine');
          setEmergencyOpen(false);
        }}
        loading={false}
      />

    </div>
  );
}

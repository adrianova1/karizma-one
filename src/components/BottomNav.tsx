import React from 'react';
import { motion } from 'motion/react';
import { Home, Sparkles, Tv, GraduationCap, MoreHorizontal } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
}

export default function BottomNav({ currentTab, onChangeTab }: BottomNavProps) {
  const tabs = [
    { id: 'home', label: 'خانه', icon: Home, color: 'text-sky-400', glow: 'shadow-sky-500/20' },
    { id: 'ai-engine', label: 'مربی کاریزما', icon: Sparkles, color: 'text-indigo-400', glow: 'shadow-indigo-500/20' },
    { id: 'channel', label: 'کانال VIP', icon: Tv, color: 'text-purple-400', glow: 'shadow-purple-500/20' },
    { id: 'academy', label: 'آکادمی', icon: GraduationCap, color: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
    { id: 'more', label: 'بیشتر', icon: MoreHorizontal, color: 'text-amber-400', glow: 'shadow-amber-500/20' },
  ];

  return (
    <div className="w-full bg-[#0b0f19]/95 backdrop-blur-xl border-t border-slate-800/80 py-1.5 px-3 flex justify-around items-center shrink-0 z-50 shadow-[0_-8px_32px_rgba(0,0,0,0.85)] pb-safe-bottom">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className="flex-1 py-1 px-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative select-none"
            style={{ minHeight: '48px', touchAction: 'manipulation' }}
          >
            <div className="relative">
              <Icon 
                className={`w-5 h-5 transition-all duration-300 ${
                  isActive 
                    ? `${tab.color} scale-110 drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]` 
                    : 'text-slate-400 hover:text-slate-200'
                }`} 
              />
              {isActive && (
                <motion.div 
                  layoutId="activeGlow" 
                  className={`absolute -inset-2 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 rounded-xl -z-10 border border-sky-500/20 ${tab.glow}`}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </div>
            
            <span className={`text-[10px] font-extrabold tracking-tight transition-all duration-200 ${
              isActive ? `${tab.color}` : 'text-slate-400'
            }`}>
              {tab.label}
            </span>

            {/* Glowing active indicator line at bottom */}
            {isActive && (
              <motion.div 
                layoutId="activeIndicator"
                className="absolute -bottom-1 w-6 h-0.5 bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

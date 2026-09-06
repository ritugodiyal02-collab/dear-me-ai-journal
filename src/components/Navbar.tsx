import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Lock, LogOut, Plus, BookOpen, PenLine, ChevronDown, Cloud } from 'lucide-react';

interface NavbarProps {
  onNewEntry: () => void;
  onOpenSecurity: () => void;
  savedCount: number;
  scrapbookCount?: number;
  activeView: 'reflections' | 'scrapbooks';
  onSwitchView: (view: 'reflections' | 'scrapbooks') => void;
}

export function Navbar({ 
  onNewEntry, 
  onOpenSecurity, 
  savedCount,
  scrapbookCount = 0,
  activeView,
  onSwitchView
}: NavbarProps) {
  const { currentUser, isGuest, signIn, signOut } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const getInitials = (name?: string | null) => {
    if (!name) return 'R';
    return name.charAt(0).toUpperCase();
  };

  const displayName = currentUser?.displayName || 'Ritu';

  return (
    <header className="sticky top-0 z-30 bg-[#f7f4ed] border-b border-[#e7e3d8] text-stone-800 transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand: Delicate Botanical Sprig + Dear Me + Subtitle */}
        <div className="flex items-center gap-3">
          <div className="text-[#526e54] shrink-0">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" stroke="none">
              <path d="M12 2C9 5 5 9 6 14c.5 2.5 2 4.5 4 5.5-1-2-1-4.5 0-6.5C11 10 13 8 16 6c-1.5 2.5-1.8 5-1 7 .8 2 2.5 3.5 4.5 4-1-3-1-6.5-1-9-3-2.5-5-4.5-6.5-6z" opacity="0.85" />
              <path d="M7 17c1.5 1.5 3.5 2 5.5 1.5-1-1-1.5-2.2-1.5-3.5-2 .5-3.5 1-4 2z" opacity="0.6" />
            </svg>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-serif italic text-2xl font-medium text-stone-900 tracking-tight">
              Dear Me
            </span>
            <span className="font-serif italic text-xs text-stone-400 font-normal hidden sm:inline-block">
              A space for my thoughts, memories and more.
            </span>
          </div>
        </div>

        {/* Center Primary Nav: Clean Underline Switcher */}
        {currentUser && (
          <div className="flex items-center gap-8 text-sm">
            <button
              onClick={() => onSwitchView('reflections')}
              className={`flex items-center gap-2 pb-1 transition-all cursor-pointer ${
                activeView === 'reflections'
                  ? 'text-[#2e3e30] border-b-2 border-[#3f5241] font-semibold'
                  : 'text-stone-500 hover:text-stone-800 font-medium'
              }`}
            >
              <PenLine className="w-4 h-4" />
              <span>Reflections</span>
            </button>

            <button
              onClick={() => onSwitchView('scrapbooks')}
              className={`flex items-center gap-2 pb-1 transition-all cursor-pointer ${
                activeView === 'scrapbooks'
                  ? 'text-[#2e3e30] border-b-2 border-[#3f5241] font-semibold'
                  : 'text-stone-500 hover:text-stone-800 font-medium'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Scrapbooks</span>
            </button>
          </div>
        )}

        {/* Right Actions */}
        {currentUser && (
          <div className="flex items-center gap-3">
            {/* Connect Google Account button for guest users */}
            {isGuest && (
              <button
                onClick={signIn}
                title="Connect Google Account for Cloud Sync"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-700" />
                <span>Sync Cloud</span>
              </button>
            )}

            {/* Single "+ New Reflection" Pill Button */}
            {activeView === 'reflections' && (
              <button
                id="nav-new-entry-btn"
                onClick={onNewEntry}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#3f5241] hover:bg-[#344536] active:bg-[#2b392d] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>New Reflection</span>
              </button>
            )}

            {/* Private & Encrypted Badge / Button */}
            <button
              id="nav-security-btn"
              onClick={onOpenSecurity}
              title="View Security & Firestore Isolation Architecture"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-stone-50 border border-stone-200/90 text-stone-600 text-xs font-medium shadow-2xs transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-stone-500" />
              <span>Private & Encrypted</span>
            </button>

            {/* User Profile Pill */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 pl-1 py-1 pr-2 rounded-full hover:bg-stone-200/50 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-[#86608e] text-white flex items-center justify-center text-xs font-bold font-serif shadow-2xs">
                  {getInitials(displayName)}
                </div>
                <span className="text-xs font-semibold text-stone-800">
                  {displayName.split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-10 z-50 bg-white border border-stone-200 rounded-xl shadow-lg py-1.5 w-48 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-stone-100 text-stone-500 text-[11px]">
                    <div>Signed in as <span className="font-semibold text-stone-800">{displayName}</span></div>
                    {isGuest && (
                      <div className="mt-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md inline-block">
                        Ephemeral Sandbox
                      </div>
                    )}
                  </div>
                  {isGuest && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        signIn();
                      }}
                      className="w-full px-3 py-1.5 text-left text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Cloud className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Connect Google</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenSecurity();
                    }}
                    className="w-full px-3 py-1.5 text-left text-stone-700 hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-stone-500" />
                    <span>Privacy Details</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      signOut();
                    }}
                    className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer border-t border-stone-100"
                    title={isGuest ? 'Exit Explorer and permanently clear all ephemeral sandbox data' : 'Sign out of your account'}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isGuest ? 'Exit & Clear Sandbox' : 'Sign Out'}</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </header>
  );
}


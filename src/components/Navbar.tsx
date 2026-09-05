import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ShieldCheck, LogOut, Plus, BookOpen, PenLine, Layers } from 'lucide-react';

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
  const { currentUser, signOut } = useAuth();

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 text-stone-800 transition-colors shadow-2xs">
      <div className="w-full px-4 sm:px-6 lg:px-7 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-800 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4 text-emerald-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif-title font-bold text-base sm:text-lg tracking-tight text-stone-900">
                My World
              </span>
              <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                GEMINI 3.6
              </span>
            </div>
            <p className="text-[11px] text-stone-500 hidden sm:block font-normal">
              Welcome to your world • Personal journaling & AI reflection
            </p>
          </div>
        </div>

        {/* Center Primary Nav Switcher (Reflections vs Scrapbooks) */}
        {currentUser && (
          <div className="flex items-center bg-stone-100 p-1 rounded-full border border-stone-200 shadow-2xs">
            <button
              onClick={() => onSwitchView('reflections')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeView === 'reflections'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>Reflections</span>
              {savedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600 text-[10px]">
                  {savedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSwitchView('scrapbooks')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeView === 'scrapbooks'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Scrapbooks</span>
              {scrapbookCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600 text-[10px]">
                  {scrapbookCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Right Actions */}
        {currentUser && (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* New Reflection Button */}
            {activeView === 'reflections' ? (
              <button
                id="nav-new-entry-btn"
                onClick={onNewEntry}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Reflection</span>
              </button>
            ) : null}

            {/* Private & Encrypted Badge / Button */}
            <button
              id="nav-security-btn"
              onClick={onOpenSecurity}
              title="View Security & Firestore Isolation Architecture"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium shadow-2xs transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span className="hidden lg:inline">Private & Encrypted</span>
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2.5 pl-1.5">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-8 h-8 rounded-full border border-stone-300 shadow-2xs object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-purple-700 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                  {getInitials(currentUser.displayName || currentUser.email)}
                </div>
              )}
              <div className="hidden xl:block text-left">
                <p className="text-xs font-bold text-stone-900 leading-tight truncate max-w-[120px]">
                  {currentUser.displayName || 'Ritu'}
                </p>
                <p className="text-[10px] text-emerald-700 font-semibold leading-tight">
                  {savedCount} {savedCount === 1 ? 'entry' : 'entries'}
                </p>
              </div>
            </div>

            {/* Logout */}
            <button
              id="nav-sign-out-btn"
              onClick={signOut}
              title="Sign Out"
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

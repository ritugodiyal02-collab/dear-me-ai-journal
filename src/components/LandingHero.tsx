import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Feather, 
  ArrowRight, 
  AlertCircle,
  Sun,
  Compass,
  Copy,
  Check,
  ExternalLink,
  Globe
} from 'lucide-react';
import { motion } from 'motion/react';

interface LandingHeroProps {
  onOpenSecurity: () => void;
}

export function LandingHero({ onOpenSecurity }: LandingHeroProps) {
  const { signIn, continueAsGuest, error, unauthorizedDomain, clearError } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isEnteringGuest, setIsEnteringGuest] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsSigningIn(true);
      await signIn();
    } catch {
      // Error is tracked in context
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGuestEntry = async () => {
    try {
      setIsEnteringGuest(true);
      await continueAsGuest();
    } catch {
      // Error is tracked in context
    } finally {
      setIsEnteringGuest(false);
    }
  };

  const currentHost = unauthorizedDomain || (typeof window !== 'undefined' ? window.location.hostname : '');

  const handleCopyDomain = () => {
    if (currentHost) {
      navigator.clipboard.writeText(currentHost);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden bg-stone-50 text-stone-800">
      
      {/* Warm Sand & Emerald Ambient Backdrops */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-gradient-to-br from-amber-200/30 via-stone-200/40 to-emerald-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-100/40 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-20 left-10 w-64 h-64 bg-amber-100/40 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-4xl mx-auto text-center relative z-10">
        
        {/* Feel-Good Welcoming Pill */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-stone-200 shadow-2xs text-xs text-stone-700 mb-8 backdrop-blur-xs"
        >
          <Sun className="w-3.5 h-3.5 text-amber-600" />
          <span className="font-medium">A calm sanctuary for your thoughts & creative sparks</span>
          <span className="text-stone-300">|</span>
          <button
            onClick={onOpenSecurity}
            className="text-emerald-800 hover:text-emerald-950 font-semibold underline underline-offset-2 cursor-pointer flex items-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Encrypted & Private</span>
          </button>
        </motion.div>

        {/* Serif Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-serif-title text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-stone-900 mb-6 leading-[1.15]"
        >
          Unwind your mind.{' '}
          <span className="block mt-2 italic font-serif text-emerald-900 font-medium">
            Reflect, brainstorm, and thrive with Gemini.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal"
        >
          Write freely, converse thoughtfully with your AI companion, and let gentle summaries bring peace, clarity, and direction to your days.
        </motion.p>

        {/* Specific Firebase Domain Authorization Helper Card */}
        {unauthorizedDomain ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto mb-8 p-5 rounded-2xl bg-amber-50/95 border-2 border-amber-300 text-stone-800 text-left shadow-md relative"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                <Globe className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="font-serif-title text-sm font-bold text-amber-950 mb-1 flex items-center gap-2">
                  Firebase Domain Authorization Required for Google Login
                </h2>
                <p className="text-xs text-stone-700 leading-relaxed mb-3">
                  Google Sign-In requires your current preview domain to be in your Firebase Console authorized domains list.
                </p>

                {/* Domain Copy Row */}
                <div className="flex items-center gap-2 mb-4 bg-white/90 p-2 rounded-xl border border-amber-200">
                  <code className="text-xs font-mono font-semibold text-stone-800 flex-1 truncate select-all px-1">
                    {currentHost}
                  </code>
                  <button
                    onClick={handleCopyDomain}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Copy domain to clipboard"
                  >
                    {copiedDomain ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-emerald-800 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-stone-600" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    onClick={handleGuestEntry}
                    disabled={isEnteringGuest}
                    className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-stone-50 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isEnteringGuest ? 'Entering Haven...' : 'Continue as Guest (Local Sanctuary)'}</span>
                  </button>

                  <a
                    href="https://console.firebase.google.com/project/gen-lang-client-0187697001/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>Firebase Console Settings</span>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
                  </a>

                  <button
                    onClick={clearError}
                    className="ml-auto text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-rose-600 hover:text-rose-800 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        ) : null}

        {/* Primary CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-16"
        >
          {/* Sign In with Google Button */}
          <button
            id="google-signin-btn"
            onClick={handleGoogleLogin}
            disabled={isSigningIn || isEnteringGuest}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-stone-50 font-semibold shadow-xl shadow-emerald-900/10 transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base ring-2 ring-emerald-700/30"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isSigningIn ? 'Opening sanctuary...' : 'Sign in with Google Account'}</span>
            <ArrowRight className="w-4 h-4 text-amber-300" />
          </button>

          {/* Direct Instant Guest / Explorer Entry */}
          <button
            id="guest-signin-btn"
            onClick={handleGuestEntry}
            disabled={isSigningIn || isEnteringGuest}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-white hover:bg-stone-100 active:bg-stone-200 border border-stone-300 text-stone-700 font-semibold shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            <Compass className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>{isEnteringGuest ? 'Entering...' : 'Explore as Guest (Local Sanctuary)'}</span>
          </button>
        </motion.div>

        {/* 3 Warm Sanctuary Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          
          <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-2xs hover:border-amber-400/70 hover:shadow-md transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-4 group-hover:scale-105 transition-transform">
              <Feather className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-serif-title font-semibold text-stone-900 text-lg mb-1.5">Gentle Dialogue</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Converse with an empathetic AI journaling partner that asks grounding questions, honors your feelings, and nurtures self-discovery.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-2xs hover:border-emerald-400/70 hover:shadow-md transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 mb-4 group-hover:scale-105 transition-transform">
              <Lock className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="font-serif-title font-semibold text-stone-900 text-lg mb-1.5">Your Private Haven</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Every thought is locked to your account with zero-exposure Firestore rules (<code className="text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded text-[10px] font-mono">auth.uid == userId</code>).
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-2xs hover:border-emerald-400/70 hover:shadow-md transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-center text-amber-800 mb-4 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-serif-title font-semibold text-stone-900 text-lg mb-1.5">Inspiring Synthesis</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              One click turns long journal reflections into clean executive summaries, heartfelt key insights, and simple next steps for your week.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}

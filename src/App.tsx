import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingHero } from './components/LandingHero';
import { HistorySidebar } from './components/HistorySidebar';
import { JournalEditor } from './components/JournalEditor';
import { ScrapbookGallery } from './components/ScrapbookGallery';
import { PhysicalScrapbookBook } from './components/PhysicalScrapbookBook';
import { CreateScrapbookModal } from './components/CreateScrapbookModal';
import { SecuritySpecModal } from './components/SecuritySpecModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { JournalReflection, Scrapbook } from './types';
import { 
  saveReflection, 
  deleteReflection as deleteReflectionFromDb, 
  subscribeUserReflections,
  saveScrapbook,
  deleteScrapbook as deleteScrapbookFromDb,
  subscribeUserScrapbooks,
  getUserProfile,
  subscribeQuotaExceeded,
  getQuotaExceededState,
  isQuotaExceededError,
  retryCloudSync,
  isStarterScrapbook
} from './lib/firestoreService';
import { Menu, X, PlusCircle, AlertCircle, ExternalLink, RefreshCw, BookOpen, Plus } from 'lucide-react';

function createBlankReflection(userId: string): JournalReflection {
  return {
    id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userId,
    title: '',
    content: '',
    mode: 'reflect',
    tags: [],
    images: [],
    audioNotes: [],
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastModelUsed: 'gemini-3.8-flash'
  };
}

function MainApp() {
  const { currentUser, loading: authLoading } = useAuth();

  // Navigation state
  const [activeView, setActiveView] = useState<'reflections' | 'scrapbooks'>('reflections');

  // Reflection State
  const [reflections, setReflections] = useState<JournalReflection[]>([]);
  const [activeReflection, setActiveReflection] = useState<JournalReflection | null>(null);
  const [isLoadingReflections, setIsLoadingReflections] = useState(true);
  const [isSavingReflection, setIsSavingReflection] = useState(false);
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);

  // Scrapbook State
  const [scrapbooks, setScrapbooks] = useState<Scrapbook[]>([]);
  const [activeScrapbook, setActiveScrapbook] = useState<Scrapbook | null>(null);
  const [isLoadingScrapbooks, setIsLoadingScrapbooks] = useState(true);
  const [isSavingScrapbook, setIsSavingScrapbook] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Firestore Daily Quota Exceeded State
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(() => getQuotaExceededState());
  const [isQuotaBannerDismissed, setIsQuotaBannerDismissed] = useState(false);
  const [isRetryingSync, setIsRetryingSync] = useState(false);

  // UI Modals & Responsive State
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [deleteScrapbookTarget, setDeleteScrapbookTarget] = useState<{ id: string; title?: string } | null>(null);
  const [deleteReflectionTarget, setDeleteReflectionTarget] = useState<{ id: string; title?: string } | null>(null);

  // Subscribe to Quota changes
  useEffect(() => {
    return subscribeQuotaExceeded((exceeded) => {
      setIsQuotaExceeded(exceeded);
      if (exceeded) {
        setIsQuotaBannerDismissed(false);
      }
    });
  }, []);

  // Hard session boundary guarantee: Whenever auth state or user changes (logout, login, account switch),
  // immediately reset navigation back to the primary Reflections journal view and clear active selections.
  useEffect(() => {
    setActiveView('reflections');
    setActiveReflection(null);
    setActiveScrapbook(null);
    setIsMobileSidebarOpen(false);
    setIsCreateModalOpen(false);
    setDeleteScrapbookTarget(null);
    setDeleteReflectionTarget(null);
  }, [currentUser?.uid]);

  // Toast Helpers
  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleRetrySync = async () => {
    setIsRetryingSync(true);
    addToast('info', 'Testing Cloud Connection', 'Reconnecting to Firestore and checking quota status...');
    try {
      const ok = await retryCloudSync();
      if (ok) {
        addToast('success', 'Cloud Reconnected', 'Firestore network is active. If your daily quota has reset, syncing will resume.');
      } else {
        addToast('info', 'Local Mode Active', 'Daily write limit is still in effect. Your data remains safely stored locally.');
      }
    } catch {
      addToast('info', 'Local Mode Active', 'Daily write limit is still in effect. Your data remains safely stored locally.');
    } finally {
      setIsRetryingSync(false);
    }
  };

  // 1. Real-time Subscription for Reflections
  useEffect(() => {
    if (!currentUser?.uid) {
      setReflections([]);
      setActiveReflection(null);
      setIsLoadingReflections(false);
      return;
    }

    setIsLoadingReflections(true);
    const uid = currentUser.uid;
    let isInitializedReflectionsDone = false;

    // Safety timeout to ensure loading state resolves even under extreme network latency
    const safetyTimer = setTimeout(() => {
      setIsLoadingReflections(false);
    }, 2500);

    const unsubscribe = subscribeUserReflections(
      uid,
      async (data) => {
        clearTimeout(safetyTimer);
        // Ensure no default welcome reflections are ever shown for normal users or explorers
        const cleanData = data.filter(
          (d) => !d.id.startsWith('ref_welcome_') && d.title !== 'Welcome to My World 🌱'
        );

        setReflections(cleanData);
        setIsLoadingReflections(false);

        // If no active reflection selected, select the latest existing one or leave null
        setActiveReflection((current) => {
          if (current) {
            const fresh = cleanData.find((d) => d.id === current.id);
            return fresh || (cleanData.length > 0 ? cleanData[0] : null);
          }
          return cleanData.length > 0 ? cleanData[0] : null;
        });
      },
      (err) => {
        clearTimeout(safetyTimer);
        if (!isQuotaExceededError(err)) {
          console.warn('Firestore subscription notice for reflections:', err);
        }
        setIsLoadingReflections(false);
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [currentUser?.uid]);

  // 2. Real-time Firestore Subscription for Scrapbooks
  useEffect(() => {
    if (!currentUser?.uid) {
      setScrapbooks([]);
      setActiveScrapbook(null);
      setIsLoadingScrapbooks(false);
      return;
    }

    setIsLoadingScrapbooks(true);
    let unsubscribeScrapbooks: (() => void) | null = null;
    let isMounted = true;

    async function initScrapbooks() {
      if (!currentUser?.uid) return;
      const uid = currentUser.uid;

      unsubscribeScrapbooks = subscribeUserScrapbooks(
        uid,
        (data) => {
          if (!isMounted) return;
          // Clean isolation: filter out any starter/mock scrapbooks
          const userScrapbooks = data.filter((s) => !isStarterScrapbook(s));
          setScrapbooks(userScrapbooks);
          setIsLoadingScrapbooks(false);

          setActiveScrapbook((current) => {
            if (current) {
              const fresh = userScrapbooks.find((d) => d.id === current.id);
              return fresh || null;
            }
            return null;
          });
        },
        (err) => {
          if (!isMounted) return;
          if (!isQuotaExceededError(err)) {
            console.warn('Firestore subscription notice for scrapbooks:', err);
          }
          setIsLoadingScrapbooks(false);
        }
      );
    }

    initScrapbooks();

    return () => {
      isMounted = false;
      if (unsubscribeScrapbooks) {
        unsubscribeScrapbooks();
      }
    };
  }, [currentUser?.uid]);

  // -------------------------------------------------------------
  // Reflection Handlers
  // -------------------------------------------------------------
  const handleNewEntry = async () => {
    if (!currentUser) return;
    const blank = createBlankReflection(currentUser.uid);
    // Immediately add to reflections list so it appears in the sidebar right away!
    setReflections((prev) => [blank, ...prev.filter((r) => r.id !== blank.id)]);
    setActiveReflection(blank);
    setActiveView('reflections');
    setIsMobileSidebarOpen(false);
    // Persist the blank reflection immediately so it is registered across storage & cloud
    await saveReflection(currentUser.uid, blank);
  };

  const handleSaveReflection = useCallback(async (reflectionToSave: JournalReflection): Promise<boolean> => {
    if (!currentUser) return false;
    setIsSavingReflection(true);
    setLastSaveError(null);

    const result = await saveReflection(currentUser.uid, reflectionToSave);

    setIsSavingReflection(false);
    if (result.success) {
      setActiveReflection(reflectionToSave);
      // Optimistically update reflections list immediately so sidebar reflects new title/content without delay
      setReflections((prev) => {
        const idx = prev.findIndex((r) => r.id === reflectionToSave.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = reflectionToSave;
          return next;
        }
        return [reflectionToSave, ...prev];
      });
      return true;
    } else {
      setLastSaveError(result.error || 'Failed to save to Firestore');
      addToast('error', 'Save Failed', result.error || 'Firestore write was rejected.');
      return false;
    }
  }, [currentUser, addToast]);

  const handleRetrySaveReflection = useCallback(() => {
    if (activeReflection) {
      handleSaveReflection(activeReflection);
    }
  }, [activeReflection, handleSaveReflection]);

  const handleDeleteReflection = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUser) return;
    const item = reflections.find((r) => r.id === id);
    setDeleteReflectionTarget({
      id,
      title: item?.title || 'Untitled Entry'
    });
  };

  const executeDeleteReflection = async () => {
    if (!currentUser || !deleteReflectionTarget) return;
    const { id } = deleteReflectionTarget;
    setDeleteReflectionTarget(null);

    // Optimistic UI state update
    setReflections((prev) => prev.filter((r) => r.id !== id));
    if (activeReflection?.id === id) {
      const remaining = reflections.filter((r) => r.id !== id);
      if (remaining.length > 0) {
        setActiveReflection(remaining[0]);
      } else {
        setActiveReflection(null);
      }
    }

    try {
      const res = await deleteReflectionFromDb(currentUser.uid, id);
      if (res.success) {
        addToast('info', 'Reflection Deleted', 'The journal entry was removed from your account.');
      } else {
        addToast('error', 'Delete Failed', res.error || 'Could not delete entry.');
      }
    } catch (err: any) {
      console.warn('Delete reflection error:', err);
      addToast('error', 'Delete Failed', err?.message || 'Could not delete entry.');
    }
  };

  const handleSelectReflection = (ref: JournalReflection) => {
    setActiveReflection(ref);
    setActiveView('reflections');
    setIsMobileSidebarOpen(false);
  };

  // -------------------------------------------------------------
  // Scrapbook Handlers
  // -------------------------------------------------------------
  const handleCreateNewScrapbook = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateScrapbookFromModal = async (newAlbum: Scrapbook) => {
    if (!currentUser) return;
    setIsCreateModalOpen(false);
    setIsSavingScrapbook(true);
    // Optimistically update state immediately
    setScrapbooks((prev) => [newAlbum, ...prev.filter((s) => s.id !== newAlbum.id)]);
    setActiveScrapbook(newAlbum);
    setActiveView('scrapbooks');

    const result = await saveScrapbook(currentUser.uid, newAlbum);
    setIsSavingScrapbook(false);
    if (result.success) {
      addToast('success', '✨ Scrapbook Created', `"${newAlbum.title}" was handcrafted successfully.`);
    } else {
      addToast('error', 'Scrapbook Save Error', result.error || 'Could not create scrapbook.');
    }
  };

  const handleSaveScrapbook = useCallback(async (updated: Scrapbook) => {
    if (!currentUser) return;
    setIsSavingScrapbook(true);
    // Optimistically update state immediately
    setScrapbooks((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    setActiveScrapbook(updated);

    const result = await saveScrapbook(currentUser.uid, updated);
    setIsSavingScrapbook(false);
    if (!result.success) {
      addToast('error', 'Album Save Failed', result.error || 'Could not save scrapbook to Firestore.');
    }
  }, [currentUser, addToast]);

  const handleDeleteScrapbook = useCallback((id: string, title?: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUser) return;
    const album = scrapbooks.find((s) => s.id === id);
    setDeleteScrapbookTarget({
      id,
      title: title || album?.title || 'Scrapbook Album'
    });
  }, [currentUser, scrapbooks]);

  const executeDeleteScrapbook = async () => {
    if (!currentUser || !deleteScrapbookTarget) return;
    const { id, title } = deleteScrapbookTarget;
    setDeleteScrapbookTarget(null);

    // Optimistically remove from state immediately
    setScrapbooks((prev) => prev.filter((s) => s.id !== id));
    if (activeScrapbook?.id === id) {
      setActiveScrapbook(null);
    }

    try {
      const res = await deleteScrapbookFromDb(currentUser.uid, id);
      if (res.success) {
        addToast('info', 'Scrapbook Deleted', `"${title || 'Memory Album'}" was permanently removed.`);
      } else {
        addToast('error', 'Delete Failed', res.error || 'Could not delete scrapbook from database.');
      }
    } catch (err: any) {
      console.warn('Delete scrapbook error:', err);
      addToast('error', 'Delete Failed', err?.message || 'Could not delete scrapbook from database.');
    }
  };

  const handleStoryCreatedFromReflection = useCallback(async (storyDraft: Scrapbook) => {
    if (!currentUser) return;
    // 1. Immediately add to scrapbooks state and open the album
    setScrapbooks((prev) => [storyDraft, ...prev.filter((s) => s.id !== storyDraft.id)]);
    setActiveScrapbook(storyDraft);
    setActiveView('scrapbooks');
    addToast('success', '✨ Story Album Created', 'Gemini woven your reflection, photos, and voice memos into an album!');

    // 2. Persist safely in background with local-first fallback
    try {
      await saveScrapbook(currentUser.uid, storyDraft);
    } catch (err) {
      console.warn('Background save for story album completed locally:', err);
    }
  }, [currentUser, addToast]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center text-stone-700">
        <div className="w-10 h-10 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-serif-title text-base font-medium text-stone-900">Entering your calm sanctuary...</p>
      </div>
    );
  }

  return (
    <div className={`${currentUser ? 'h-screen overflow-hidden' : 'min-h-screen'} flex flex-col bg-stone-50 text-stone-800 font-sans`}>
      
      {/* Navigation (Hidden when an active scrapbook is open to give full viewport immersion) */}
      {!(activeView === 'scrapbooks' && activeScrapbook) && (
        <Navbar
          onNewEntry={handleNewEntry}
          onOpenSecurity={() => setIsSecurityModalOpen(true)}
          savedCount={reflections.length}
          scrapbookCount={scrapbooks.length}
          activeView={activeView}
          onSwitchView={(v) => {
            setActiveView(v);
            if (v === 'scrapbooks' && activeScrapbook) {
              // Keep current scrapbook or gallery
            }
          }}
        />
      )}

      {/* Firestore Quota Exceeded Advisory Banner */}
      {currentUser && isQuotaExceeded && !isQuotaBannerDismissed && (
        <aside
          aria-label="Database Quota Notice"
          className="bg-amber-50/95 backdrop-blur-xs border-b border-amber-200/80 px-4 py-2 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 z-40"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
            <span className="font-semibold text-amber-950">Firestore Free Tier Daily Write Limit Reached:</span>
            <span className="text-amber-800">
              Your journals, mementos, and albums are safely saved locally on this device. Cloud sync will automatically resume when the free daily quota resets tomorrow.
            </span>
          </div>
          <div className="flex items-center gap-3 ml-auto flex-shrink-0">
            <button
              onClick={handleRetrySync}
              disabled={isRetryingSync}
              className="inline-flex items-center gap-1 font-semibold text-amber-950 hover:text-amber-800 underline transition-colors disabled:opacity-50 cursor-pointer"
              title="Test reconnecting to Cloud Firestore"
            >
              <RefreshCw className={`w-3 h-3 ${isRetryingSync ? 'animate-spin' : ''}`} />
              {isRetryingSync ? 'Testing...' : 'Retry Sync'}
            </button>
            <a
              href="https://console.firebase.google.com/project/dearme-da2e5/firestore"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-amber-950 hover:text-amber-800 underline transition-colors"
            >
              Manage Quota
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://firebase.google.com/pricing#cloud-firestore"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-800 hover:text-amber-950 underline transition-colors"
            >
              Spark Limits
            </a>
            <button
              onClick={() => setIsQuotaBannerDismissed(true)}
              className="p-1 rounded text-amber-700 hover:text-amber-950 hover:bg-amber-100 transition-colors"
              title="Dismiss notification"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      {!currentUser ? (
        <LandingHero onOpenSecurity={() => setIsSecurityModalOpen(true)} />
      ) : activeView === 'scrapbooks' ? (
        // ==========================================
        // SCRAPBOOKS VIEW (Editor or Gallery)
        // ==========================================
        activeScrapbook ? (
          <PhysicalScrapbookBook
            key={activeScrapbook.id}
            scrapbook={activeScrapbook}
            onSave={handleSaveScrapbook}
            onBack={() => setActiveScrapbook(null)}
            onDeleteScrapbook={(id) => handleDeleteScrapbook(id, activeScrapbook.title)}
            isSaving={isSavingScrapbook}
          />
        ) : (
          <ScrapbookGallery
            scrapbooks={scrapbooks}
            onSelectScrapbook={(s) => setActiveScrapbook(s)}
            onCreateNewScrapbook={handleCreateNewScrapbook}
            onDeleteScrapbook={handleDeleteScrapbook}
            onOpenJournalMode={() => setActiveView('reflections')}
            isLoading={isLoadingScrapbooks}
          />
        )
      ) : (
        // ==========================================
        // REFLECTIONS JOURNAL VIEW
        // ==========================================
        <div className="flex-1 flex overflow-hidden relative min-h-0 bg-[#f4f2ee]">
          
          {/* Mobile Sidebar Toggle Button */}
          <div className="md:hidden absolute top-3 left-3 z-20">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="p-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 shadow-md"
            >
              {isMobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

          {/* Desktop & Mobile History Sidebar */}
          <div
            className={`${
              isMobileSidebarOpen
                ? 'fixed inset-y-16 left-0 z-30 w-80 shadow-2xl p-3 bg-stone-900/10 backdrop-blur-xs'
                : 'hidden md:flex w-72 lg:w-80 min-w-72 lg:min-w-80 max-w-72 lg:max-w-80 p-3.5 pr-0'
            } h-full shrink-0 min-h-0`}
          >
            <HistorySidebar
              reflections={reflections}
              selectedId={activeReflection?.id || null}
              onSelect={handleSelectReflection}
              onDelete={handleDeleteReflection}
              onNewEntry={handleNewEntry}
              isLoading={isLoadingReflections}
            />
          </div>

          {/* Mobile Overlay */}
          {isMobileSidebarOpen && (
            <div
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-10"
            />
          )}

          {/* Workspace Editor Floating Container */}
          {activeReflection ? (
            <div className="flex-1 p-3.5 min-h-0 overflow-hidden flex min-w-0">
              <JournalEditor
                key={activeReflection.id}
                reflection={activeReflection}
                onSave={handleSaveReflection}
                onCreateStory={handleStoryCreatedFromReflection}
                userId={currentUser.uid}
                userDisplayName={currentUser.displayName || undefined}
                isSaving={isSavingReflection}
                lastSaveError={lastSaveError}
                onRetrySave={handleRetrySaveReflection}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#fbf9f4] m-3.5 rounded-2xl border border-stone-200/80 shadow-2xs">
              <div className="w-14 h-14 rounded-2xl bg-white border border-stone-200/80 flex items-center justify-center text-[#3f5241] mb-4 shadow-2xs">
                <BookOpen className="w-7 h-7 stroke-[1.5]" />
              </div>
              <h3 className="font-serif font-bold text-xl text-stone-900 mb-2">
                A Quiet Space for Your Thoughts
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto mb-6 leading-relaxed">
                Take a pause, write freely, record voice notes, or capture everyday reflections. Your sanctuary is clean and ready.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  id="empty-state-new-reflection-btn"
                  onClick={handleNewEntry}
                  className="px-6 py-2.5 rounded-full bg-[#3f5241] hover:bg-[#344536] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start New Reflection</span>
                </button>
                {currentUser.uid.startsWith('guest_') && (
                  <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-full">
                    Explorer Mode • Ephemeral Sandbox
                  </span>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Create Scrapbook Modal */}
      {isCreateModalOpen && currentUser && (
        <CreateScrapbookModal
          userId={currentUser.uid}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateScrapbookFromModal}
        />
      )}

      {/* Security Architecture Inspector Modal */}
      <SecuritySpecModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        userId={currentUser?.uid}
      />

      {/* Scrapbook Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteScrapbookTarget !== null}
        title="Delete Memory Album?"
        message={`Are you sure you want to delete "${deleteScrapbookTarget?.title || 'this memory album'}"? All chapters, photos, and handwritten notes within it will be permanently deleted from your Firestore database.`}
        confirmText="Delete Album"
        isDestructive={true}
        onConfirm={executeDeleteScrapbook}
        onCancel={() => setDeleteScrapbookTarget(null)}
      />

      {/* Reflection Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteReflectionTarget !== null}
        title="Delete Journal Reflection?"
        message={`Are you sure you want to delete "${deleteReflectionTarget?.title || 'this entry'}"? This reflection will be permanently removed from your account.`}
        confirmText="Delete Reflection"
        isDestructive={true}
        onConfirm={executeDeleteReflection}
        onCancel={() => setDeleteReflectionTarget(null)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

    </div>
  );
}

function AuthenticatedShell() {
  const { currentUser, loading } = useAuth();
  // Keying MainApp by user ID (or 'logged-out') guarantees that whenever a user
  // logs out or logs in with another account, the entire view state, navigation,
  // and editor session are completely torn down and reset to initial defaults.
  return <MainApp key={loading ? 'loading' : (currentUser?.uid || 'logged-out')} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedShell />
    </AuthProvider>
  );
}

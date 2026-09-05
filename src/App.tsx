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
  markUserScrapbooksInitialized,
  subscribeQuotaExceeded,
  getQuotaExceededState,
  isQuotaExceededError,
  retryCloudSync
} from './lib/firestoreService';
import { Menu, X, PlusCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

function createBlankReflection(userId: string): JournalReflection {
  return {
    id: `ref-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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
    lastModelUsed: 'gemini-3.6-flash'
  };
}

function getInitialStarterScrapbooks(userId: string): Scrapbook[] {
  return [
    {
      id: `scrapbook_raj_${userId}`,
      userId,
      title: 'Rajasthan',
      subtitle: 'March 2026',
      introduction: 'Exploring Rajasthan turned a simple journey into a tapestry of golden memories.',
      theme: 'parchment',
      coverColor: 'olive-green',
      category: 'Travel',
      date: 'March 2026',
      location: 'Rajasthan, India',
      quotePill: 'Collect moments, not things. ♡',
      tabs: ['MEMORIES', 'PEOPLE', 'NOTES'],
      coverImage: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80',
      sections: [
        {
          id: `sec_1_${Date.now()}`,
          chapterNumber: 1,
          heading: 'The Pink City',
          narrative: 'Our journey began in Jaipur, the Pink City. Every corner had a story to tell and every color felt like a celebration.',
          quote: 'The wind, the windows, and the whispers of history.',
          photos: [
            {
              id: `photo_1_${Date.now()}`,
              url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80',
              caption: 'Hawa Mahal Wonders ♡',
              rotation: 1,
              tapeStyle: 'paperclip',
              polaroidCaptionStyle: 'handwritten'
            }
          ],
          ticketStub: {
            location: 'JAIPUR, INDIA',
            date: 'March 2026',
            title: 'ADMIT ONE'
          },
          stickyNotes: [
            {
              id: `sn_1_${Date.now()}`,
              text: 'Felt like stepping into a postcard! ☺',
              color: 'yellow',
              rotation: -2
            }
          ],
          geminiReflectionNote: {
            insight: 'You seemed most alive in the little unexpected moments. Your happiness comes from wonder and connection.',
            sparkle: true
          },
          layout: 'polaroid'
        },
        {
          id: `sec_2_${Date.now()}`,
          chapterNumber: 2,
          heading: 'Lakes & Palaces',
          narrative: 'Udaipur felt like a dream. Calm waters, grand palaces and a sunset that stayed with me forever.',
          quote: 'Some places don’t just look beautiful, they feel like home. ♡',
          photos: [
            {
              id: `photo_2_${Date.now()}`,
              url: 'https://images.unsplash.com/photo-1588096344356-9b578c772e29?auto=format&fit=crop&w=800&q=80',
              caption: 'Lake Pichola Sunset ♡',
              rotation: -1,
              tapeStyle: 'washi-mint',
              polaroidCaptionStyle: 'handwritten'
            }
          ],
          ticketStub: {
            location: 'UDAIPUR, INDIA',
            date: 'March 2026',
            title: 'FERRY PASS'
          },
          stickyNotes: [
            {
              id: `sn_2_${Date.now()}`,
              text: 'The evening boat ride felt timeless ✨',
              color: 'pink',
              rotation: 2
            }
          ],
          geminiReflectionNote: {
            insight: 'Reflecting on Udaipur reveals your affinity for serene water and historic charm.',
            sparkle: true
          },
          layout: 'polaroid'
        },
        {
          id: `sec_3_${Date.now()}`,
          chapterNumber: 3,
          heading: 'The Blue Alleys',
          narrative: 'Wandering through the cobalt lanes of Jodhpur. Children playing on sandstone steps and the smell of cardamom chai.',
          quote: 'Every blue wall held a thousand quiet smiles.',
          photos: [
            {
              id: `photo_3_${Date.now()}`,
              url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
              caption: 'Mehrangarh Fortress View ♡',
              rotation: 1
            }
          ],
          ticketStub: {
            location: 'JODHPUR, INDIA',
            date: 'March 2026',
            title: 'CITADEL ENTRY'
          },
          stickyNotes: [
            {
              id: `sn_3_${Date.now()}`,
              text: 'The spicy street chai was heavenly ☕',
              color: 'yellow',
              rotation: 1
            }
          ],
          geminiReflectionNote: {
            insight: 'Getting lost in local neighborhoods created your most authentic memories.',
            sparkle: true
          },
          layout: 'polaroid'
        }
      ],
      tags: ['Travel', 'Memories', 'Rajasthan'],
      createdAt: Date.now() - 3600000 * 48,
      updatedAt: Date.now() - 3600000 * 48
    },
    {
      id: `scrapbook_coffee_${userId}`,
      userId,
      title: 'Weekend Calm',
      subtitle: 'February 2026',
      introduction: 'Slow mornings with pour-over coffee, vintage paper, and unhurried thoughts.',
      theme: 'parchment',
      coverColor: 'tan-leather',
      category: 'Personal',
      date: 'February 2026',
      location: 'Local Artisan Roastery',
      quotePill: 'Quiet minds, full hearts ✨',
      tabs: ['BREW', 'PAGES', 'THOUGHTS'],
      coverImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
      sections: [
        {
          id: `sec_c1_${Date.now()}`,
          chapterNumber: 1,
          heading: 'Morning Brew & Pages ☕',
          narrative: 'The cafe was quiet when I arrived. Steam rising in gentle curls, jazz playing softly in the background, and nowhere else I needed to be.',
          quote: 'Simplicity is the truest luxury.',
          photos: [
            {
              id: `photo_c1_${Date.now()}`,
              url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
              caption: 'Pour Over Ritual ♡',
              rotation: -1,
              tapeStyle: 'paperclip',
              polaroidCaptionStyle: 'handwritten'
            }
          ],
          ticketStub: {
            location: 'ROASTERY, DOWNTOWN',
            date: 'Feb 2026',
            title: 'TABLE 4 PASS'
          },
          stickyNotes: [
            {
              id: `sn_c1_${Date.now()}`,
              text: 'Notes of dark chocolate & orange peel ☕',
              color: 'yellow',
              rotation: 1
            }
          ],
          audioNote: {
            transcript: 'Just the sound of the grinder and rain on the glass window. Absolute peace.',
            duration: 45,
            memoStickyNote: 'Rainy cafe ambient memo ☕'
          },
          geminiReflectionNote: {
            insight: 'Rituals of stillness nurture your creativity and restore your inner balance.',
            sparkle: true
          },
          layout: 'polaroid'
        },
        {
          id: `sec_c2_${Date.now()}`,
          chapterNumber: 2,
          heading: 'Rain on the Windowpane',
          narrative: 'Afternoon rain began tapping against the glass. Watching drops race each other while sketching in the margins of my notebook.',
          quote: 'Let the rhythm of the rain wash away the hurry.',
          photos: [
            {
              id: `photo_c2_${Date.now()}`,
              url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
              caption: 'Cozy Corner Sanctuary ♡',
              rotation: 1,
              tapeStyle: 'washi-mint',
              polaroidCaptionStyle: 'handwritten'
            }
          ],
          ticketStub: {
            location: 'CORNER NOOK',
            date: 'Feb 2026',
            title: 'MUSE ENTRY'
          },
          stickyNotes: [
            {
              id: `sn_c2_${Date.now()}`,
              text: 'Warm cinnamon roll on the side 🥐',
              color: 'pink',
              rotation: -1
            }
          ],
          geminiReflectionNote: {
            insight: 'Cozy environments unlock your deepest poetic thoughts and self-acceptance.',
            sparkle: true
          },
          layout: 'polaroid'
        }
      ],
      tags: ['Personal', 'Coffee', 'Mindfulness'],
      createdAt: Date.now() - 3600000 * 24,
      updatedAt: Date.now() - 3600000 * 24
    },
    {
      id: `scrapbook_pines_${userId}`,
      userId,
      title: 'Alpine Trails',
      subtitle: 'January 2026',
      introduction: 'Crisp mountain air, pine scent, and climbing toward the morning sun.',
      theme: 'parchment',
      coverColor: 'deep-teal',
      category: 'Milestones',
      date: 'January 2026',
      location: 'Pine Ridge Trail',
      quotePill: 'Where the wild things are ✿',
      tabs: ['SUMMIT', 'CAMP', 'STARGAZING'],
      coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      sections: [
        {
          id: `sec_p1_${Date.now()}`,
          chapterNumber: 1,
          heading: 'Through the Pines 🌲',
          narrative: 'We set out before dawn. The first light struck the snow-dusted peaks just as we cleared the tree line. The whole valley below was asleep.',
          quote: 'The mountains are calling and I must go.',
          photos: [
            {
              id: `photo_p1_${Date.now()}`,
              url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
              caption: 'Summit at Sunrise ⛰',
              rotation: 2,
              tapeStyle: 'washi-yellow',
              polaroidCaptionStyle: 'handwritten'
            }
          ],
          ticketStub: {
            location: 'TRAILHEAD 04',
            date: 'Jan 2026',
            title: 'PARK PASS'
          },
          stickyNotes: [
            {
              id: `sn_p1_${Date.now()}`,
              text: 'Elevation 2,400m — breath caught in awe ✨',
              color: 'mint',
              rotation: -2
            }
          ],
          audioNote: {
            transcript: 'The wind through the high pines. Nothing else in the world mattered in that minute.',
            duration: 60,
            memoStickyNote: 'High pass wind recording 🌲'
          },
          geminiReflectionNote: {
            insight: 'Adventure expands your perspective. You find strength in challenge and calm in vast landscapes.',
            sparkle: true
          },
          layout: 'polaroid'
        },
        {
          id: `sec_p2_${Date.now()}`,
          chapterNumber: 2,
          heading: 'Evening Campfire Glow 🔥',
          narrative: 'We set up our tents by the alpine lake as twilight turned the water into violet glass. Hot soup and laughter under the constellations.',
          quote: 'Wild air heals what the noise broke.',
          photos: [
            {
              id: `photo_p2_${Date.now()}`,
              url: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80',
              caption: 'Twilight Basecamp ✨',
              rotation: -1,
              tapeStyle: 'kraft',
              polaroidCaptionStyle: 'handwritten'
            }
          ],
          ticketStub: {
            location: 'ALPINE LAKE',
            date: 'Jan 2026',
            title: 'CAMP PERMIT'
          },
          stickyNotes: [
            {
              id: `sn_p2_${Date.now()}`,
              text: 'Sleeping bag cozy, stars shining bright ⭐',
              color: 'yellow',
              rotation: 1
            }
          ],
          geminiReflectionNote: {
            insight: 'Unplugging completely in nature brings unmatched mental rejuvenation.',
            sparkle: true
          },
          layout: 'polaroid'
        }
      ],
      tags: ['Milestones', 'Hiking', 'Nature'],
      createdAt: Date.now() - 3600000 * 12,
      updatedAt: Date.now() - 3600000 * 12
    }
  ];
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

  // 1. Real-time Firestore Subscription for Reflections
  useEffect(() => {
    if (!currentUser?.uid) {
      setReflections([]);
      setActiveReflection(null);
      setIsLoadingReflections(false);
      return;
    }

    setIsLoadingReflections(true);

    const unsubscribe = subscribeUserReflections(
      currentUser.uid,
      (data) => {
        setReflections(data);
        setIsLoadingReflections(false);

        // If no active reflection selected, select the latest one or create a new blank one
        setActiveReflection((current) => {
          if (current) {
            const fresh = data.find((d) => d.id === current.id);
            return fresh || (data.length > 0 ? data[0] : createBlankReflection(currentUser.uid));
          }
          if (data.length > 0) {
            return data[0];
          }
          return createBlankReflection(currentUser.uid);
        });
      },
      (err) => {
        if (!isQuotaExceededError(err)) {
          console.warn('Firestore subscription notice for reflections:', err);
        }
        setIsLoadingReflections(false);
      }
    );

    return () => unsubscribe();
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
    let isInitializedCheckDone = false;
    let unsubscribeScrapbooks: (() => void) | null = null;
    let isMounted = true;

    async function initScrapbooks() {
      if (!currentUser?.uid) return;
      const uid = currentUser.uid;
      const profileDoc = await getUserProfile(uid);
      if (!isMounted) return;

      const alreadyInitialized = profileDoc?.hasInitializedScrapbooks === true ||
        localStorage.getItem(`has_initialized_scrapbooks_${uid}`) === 'true';

      unsubscribeScrapbooks = subscribeUserScrapbooks(
        uid,
        async (data) => {
          if (!isMounted) return;
          if (data.length === 0 && !alreadyInitialized && !isInitializedCheckDone) {
            isInitializedCheckDone = true;
            await markUserScrapbooksInitialized(uid);
            const starters = getInitialStarterScrapbooks(uid);
            setScrapbooks(starters);
            for (const book of starters) {
              await saveScrapbook(uid, book);
            }
          } else {
            isInitializedCheckDone = true;
            if (!alreadyInitialized && data.length > 0) {
              await markUserScrapbooksInitialized(uid);
            }
            setScrapbooks(data);
          }
          setIsLoadingScrapbooks(false);

          setActiveScrapbook((current) => {
            if (current) {
              const fresh = data.find((d) => d.id === current.id);
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
  const handleNewEntry = () => {
    if (!currentUser) return;
    const blank = createBlankReflection(currentUser.uid);
    setActiveReflection(blank);
    setActiveView('reflections');
    setIsMobileSidebarOpen(false);
  };

  const handleSaveReflection = async (reflectionToSave: JournalReflection): Promise<boolean> => {
    if (!currentUser) return false;
    setIsSavingReflection(true);
    setLastSaveError(null);

    const result = await saveReflection(currentUser.uid, reflectionToSave);

    setIsSavingReflection(false);
    if (result.success) {
      setActiveReflection(reflectionToSave);
      return true;
    } else {
      setLastSaveError(result.error || 'Failed to save to Firestore');
      addToast('error', 'Save Failed', result.error || 'Firestore write was rejected.');
      return false;
    }
  };

  const handleRetrySaveReflection = () => {
    if (activeReflection) {
      handleSaveReflection(activeReflection);
    }
  };

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
        setActiveReflection(createBlankReflection(currentUser.uid));
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
      console.error('Delete reflection error:', err);
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
    const result = await saveScrapbook(currentUser.uid, newAlbum);
    setIsSavingScrapbook(false);
    if (result.success) {
      setActiveScrapbook(newAlbum);
      setActiveView('scrapbooks');
      addToast('success', '✨ Scrapbook Created', `"${newAlbum.title}" was handcrafted successfully.`);
    } else {
      addToast('error', 'Scrapbook Save Error', result.error || 'Could not create scrapbook.');
    }
  };

  const handleSaveScrapbook = async (updated: Scrapbook) => {
    if (!currentUser) return;
    setIsSavingScrapbook(true);
    const result = await saveScrapbook(currentUser.uid, updated);
    setIsSavingScrapbook(false);
    if (result.success) {
      setActiveScrapbook(updated);
    } else {
      addToast('error', 'Album Save Failed', result.error || 'Could not save scrapbook to Firestore.');
    }
  };

  const handleDeleteScrapbook = (id: string, title?: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUser) return;
    const album = scrapbooks.find((s) => s.id === id);
    setDeleteScrapbookTarget({
      id,
      title: title || album?.title || 'Scrapbook Album'
    });
  };

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
      console.error('Delete scrapbook error:', err);
      addToast('error', 'Delete Failed', err?.message || 'Could not delete scrapbook from database.');
    }
  };

  const handleLoadSampleScrapbooks = async () => {
    if (!currentUser) return;
    setIsLoadingScrapbooks(true);
    const starters = getInitialStarterScrapbooks(currentUser.uid);
    setScrapbooks(starters);
    for (const book of starters) {
      await saveScrapbook(currentUser.uid, book);
    }
    await markUserScrapbooksInitialized(currentUser.uid);
    setIsLoadingScrapbooks(false);
    addToast('success', '✨ Sample Albums Restored', 'Curated starter scrapbooks were added to your library.');
  };

  const handleStoryCreatedFromReflection = async (storyDraft: Scrapbook) => {
    if (!currentUser) return;
    const result = await saveScrapbook(currentUser.uid, storyDraft);
    if (result.success) {
      setActiveScrapbook(storyDraft);
      setActiveView('scrapbooks');
      addToast('success', '✨ Story Album Created', 'Gemini woven your reflection, photos, and voice memos into an album!');
    } else {
      addToast('error', 'Story Creation Error', result.error || 'Could not save new story album.');
    }
  };

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
              href="https://console.firebase.google.com/project/gen-lang-client-0187697001/firestore/databases/ai-studio-5b5a8fd6-3891-4381-aa57-8d42c72151b9/data?openUpgradeDialog=true"
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
            onLoadSampleScrapbooks={handleLoadSampleScrapbooks}
            isLoading={isLoadingScrapbooks}
          />
        )
      ) : (
        // ==========================================
        // REFLECTIONS JOURNAL VIEW
        // ==========================================
        <div className="flex-1 flex overflow-hidden relative min-h-0">
          
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
              isMobileSidebarOpen ? 'fixed inset-y-16 left-0 z-20 w-80 shadow-2xl' : 'hidden md:flex'
            } h-full`}
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

          {/* Workspace Editor */}
          {activeReflection ? (
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
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-500 bg-stone-50">
              <p className="font-serif-title text-base font-semibold text-stone-800 mb-3">No active reflection selected</p>
              <button
                onClick={handleNewEntry}
                className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-stone-50 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                Create New Entry
              </button>
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

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

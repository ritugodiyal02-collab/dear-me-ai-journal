import React, { useState, useRef, useEffect } from 'react';
import { 
  Scrapbook, 
  ScrapbookSection, 
  ScrapbookPhoto, 
  ScrapbookCoverColor,
  ScrapbookSticker
} from '../types';
import { 
  DaisyFlower, 
  LavenderSprig, 
  WildflowerBouquet, 
  GreenPressedLeaf, 
  WashiTapeStrip, 
  PaperClip, 
  BrassPin, 
  TravelCircularStamp, 
  TravelTicketStub, 
  StickyNote, 
  GeminiParchmentCard, 
  SideBookTabs 
} from './ScrapbookDecorations';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Plus, 
  Play, 
  Pause, 
  Image as ImageIcon, 
  Edit3, 
  Trash2, 
  Palette, 
  Wand2, 
  BookOpen, 
  Camera, 
  StickyNote as StickyIcon,
  Flower2,
  Check,
  Eye,
  Maximize2,
  Minimize2,
  Bookmark,
  Sliders,
  Maximize,
  Minimize,
  Move,
  RotateCw
} from 'lucide-react';
import { ScrapbookEnhanceModal } from './ScrapbookEnhanceModal';
import { ScrapbookStoryAssistantModal } from './ScrapbookStoryAssistantModal';
import { ConfirmModal } from './ConfirmModal';
import { ScrapbookVoiceNote } from './ScrapbookVoiceNote';
import { ChapterManagerModal } from './ChapterManagerModal';
import { PhotoPickerModal } from './PhotoPickerModal';
import { PhotoAdjustModal } from './PhotoAdjustModal';

interface PhysicalScrapbookBookProps {
  scrapbook: Scrapbook;
  onSave: (updated: Scrapbook) => void;
  onBack: () => void;
  onDeleteScrapbook?: (id: string) => void;
  isSaving?: boolean;
}

const COVER_THEMES: Record<ScrapbookCoverColor, {
  name: string;
  coverBg: string;
  coverBorder: string;
  spineBg: string;
  textColor: string;
  accentBadge: string;
}> = {
  'olive-green': {
    name: 'Olive Botanical Leather',
    coverBg: 'bg-[#3b4834]',
    coverBorder: 'border-[#2c3727]',
    spineBg: 'bg-[#2e3a29]',
    textColor: 'text-[#fdfcf8]',
    accentBadge: 'bg-[#d8c39e] text-[#423421]'
  },
  'tan-leather': {
    name: 'Tan Camel Leather',
    coverBg: 'bg-[#8a572e]',
    coverBorder: 'border-[#6c4220]',
    spineBg: 'bg-[#734522]',
    textColor: 'text-[#fefcf8]',
    accentBadge: 'bg-[#ebd8bd] text-[#55361b]'
  },
  'dusty-rose': {
    name: 'Dusty Rose Vintage',
    coverBg: 'bg-[#8c545e]',
    coverBorder: 'border-[#703f47]',
    spineBg: 'bg-[#78434c]',
    textColor: 'text-[#fffbfb]',
    accentBadge: 'bg-[#faecee] text-[#61323b]'
  },
  'deep-teal': {
    name: 'Alpine Forest Teal',
    coverBg: 'bg-[#2f5155]',
    coverBorder: 'border-[#203a3d]',
    spineBg: 'bg-[#244246]',
    textColor: 'text-[#f5fbf9]',
    accentBadge: 'bg-[#d1e3de] text-[#1c393d]'
  },
  'vintage-brown': {
    name: 'Antique Walnut Leather',
    coverBg: 'bg-[#553925]',
    coverBorder: 'border-[#3d2819]',
    spineBg: 'bg-[#442c1b]',
    textColor: 'text-[#fcf8f2]',
    accentBadge: 'bg-[#edd9bf] text-[#47301c]'
  },
  'ocean-blue': {
    name: 'Denim Coastal Linen',
    coverBg: 'bg-[#374f60]',
    coverBorder: 'border-[#253846]',
    spineBg: 'bg-[#2b3f4e]',
    textColor: 'text-[#f8fafc]',
    accentBadge: 'bg-[#d3e3ec] text-[#243d4d]'
  }
};

export function PhysicalScrapbookBook({
  scrapbook: initialScrapbook,
  onSave,
  onBack,
  onDeleteScrapbook,
  isSaving = false
}: PhysicalScrapbookBookProps) {
  const [scrapbook, setScrapbook] = useState<Scrapbook>(initialScrapbook);
  
  // Default to Chapter 1 if sections exist, otherwise Album Cover (0)
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState<number>(() => {
    if (initialScrapbook.sections.length > 0) return 1;
    return 0;
  });
  
  // View mode vs Edit mode
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Fullscreen / Immersion mode
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenTip, setFullscreenTip] = useState<string | null>(null);
  const bookContainerRef = useRef<HTMLDivElement | null>(null);

  // Chapter Manager Modal
  const [showChapterManager, setShowChapterManager] = useState<boolean>(false);
  
  // Modals & Tools
  const [isEditingCoverTheme, setIsEditingCoverTheme] = useState(false);
  const [enhancingPhoto, setEnhancingPhoto] = useState<{ sectionIndex: number; photoIndex: number; photo: ScrapbookPhoto } | null>(null);
  const [adjustingPhoto, setAdjustingPhoto] = useState<{
    sectionIndex: number;
    photoIndex?: number;
    isCover?: boolean;
    photo: ScrapbookPhoto;
  } | null>(null);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [draggingStickerState, setDraggingStickerState] = useState<{
    stickerId: string;
    pageSide: 'left' | 'right';
    pointerId: number;
    parentRect: DOMRect;
  } | null>(null);
  const leftPageRef = useRef<HTMLDivElement | null>(null);
  const rightPageRef = useRef<HTMLDivElement | null>(null);
  const [showStoryAssistant, setShowStoryAssistant] = useState(false);
  const [mementoFeedback, setMementoFeedback] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Cover Theme
  const coverColor = scrapbook.coverColor || 'olive-green';
  const coverTheme = COVER_THEMES[coverColor] || COVER_THEMES['olive-green'];

  const MAX_PHOTOS_PER_PAGE = 3;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activePhotoUploadTarget, setActivePhotoUploadTarget] = useState<{ 
    sectionIndex: number; 
    isCover?: boolean;
    photoIndex?: number;
    mode?: 'add' | 'swap';
  } | null>(null);
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState<boolean>(false);
  const [photoPickerTarget, setPhotoPickerTarget] = useState<{ 
    sectionIndex: number; 
    isCover?: boolean;
    photoIndex?: number;
    mode?: 'add' | 'swap';
  } | null>(null);

  const handleOpenPhotoPicker = (
    sectionIndex: number, 
    isCover?: boolean, 
    photoIndex?: number, 
    mode: 'add' | 'swap' = 'add'
  ) => {
    setPhotoPickerTarget({ sectionIndex, isCover, photoIndex, mode });
    setIsPhotoPickerOpen(true);
  };

  const handlePhotoSelected = (photoUrl: string, caption?: string) => {
    if (photoPickerTarget?.isCover) {
      updateScrapbookState({ coverImage: photoUrl });
    } else if (photoPickerTarget !== null) {
      const secIndex = photoPickerTarget.sectionIndex;
      const newSections = [...scrapbook.sections];
      if (newSections[secIndex]) {
        const currentPhotos = [...(newSections[secIndex].photos || [])];

        if (photoPickerTarget.mode === 'swap' && typeof photoPickerTarget.photoIndex === 'number' && currentPhotos[photoPickerTarget.photoIndex]) {
          // Replace specific photo
          currentPhotos[photoPickerTarget.photoIndex] = {
            ...currentPhotos[photoPickerTarget.photoIndex],
            url: photoUrl,
            caption: caption || currentPhotos[photoPickerTarget.photoIndex].caption || 'Captured Memory ♡'
          };
        } else {
          // Add new photo (enforce MAX_PHOTOS_PER_PAGE = 3 limit as per physical spread size)
          if (currentPhotos.length < MAX_PHOTOS_PER_PAGE) {
            const rotations = [1, -2.5, 2];
            const tapes: Array<ScrapbookPhoto['tapeStyle']> = ['paperclip', 'washi-pink', 'washi-mint'];
            const newPhoto: ScrapbookPhoto = {
              id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              url: photoUrl,
              caption: caption || 'Captured Memory ♡',
              rotation: rotations[currentPhotos.length % rotations.length],
              tapeStyle: tapes[currentPhotos.length % tapes.length],
              polaroidCaptionStyle: 'handwritten'
            };
            currentPhotos.push(newPhoto);
          }
        }
        newSections[secIndex].photos = currentPhotos;
        updateScrapbookState({ sections: newSections });
      }
    }
    setIsPhotoPickerOpen(false);
    setPhotoPickerTarget(null);
  };

  const handleRemovePhotoFromSection = (secIndex: number, photoIndex?: number) => {
    const newSections = [...scrapbook.sections];
    if (newSections[secIndex]) {
      if (typeof photoIndex === 'number') {
        newSections[secIndex].photos = (newSections[secIndex].photos || []).filter((_, idx) => idx !== photoIndex);
      } else {
        newSections[secIndex].photos = [];
      }
      updateScrapbookState({ sections: newSections });
    }
  };

  // Total spreads corresponds directly to the real number of chapters
  const totalSpreads = scrapbook.sections.length;

  // Sync initialScrapbook when prop changes
  useEffect(() => {
    setScrapbook(initialScrapbook);
  }, [initialScrapbook]);

  // Synchronize state with browser native Fullscreen API changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFs = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isNativeFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Show ephemeral tip when fullscreen is activated
  useEffect(() => {
    if (isFullscreen) {
      setFullscreenTip('✨ Immersive Fullscreen Mode • Press Esc or click ⛶ to exit');
      const timer = setTimeout(() => setFullscreenTip(null), 3500);
      return () => clearTimeout(timer);
    } else {
      setFullscreenTip(null);
    }
  }, [isFullscreen]);

  // Keyboard navigation for page turning & fullscreen escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        setCurrentSpreadIndex((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentSpreadIndex((p) => Math.min(totalSpreads, p + 1));
      } else if (e.key === 'Home') {
        setCurrentSpreadIndex(0);
      } else if (e.key === 'Escape') {
        if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
          }
        }
        if (isFullscreen) setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSpreads, isFullscreen]);

  // Toggle fullscreen (combining HTML5 Fullscreen API with in-app maximized viewport fallback)
  const toggleFullscreen = async () => {
    try {
      const isNativeFs = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
      if (!isNativeFs && !isFullscreen) {
        const target = bookContainerRef.current || document.documentElement;
        if (target.requestFullscreen) {
          await target.requestFullscreen();
        } else if ((target as any).webkitRequestFullscreen) {
          await (target as any).webkitRequestFullscreen();
        } else if ((target as any).msRequestFullscreen) {
          await (target as any).msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          } else if ((document as any).msExitFullscreen) {
            await (document as any).msExitFullscreen();
          }
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.info('Native browser fullscreen request not permitted in current frame; toggling maximized viewport mode:', err);
      // Fallback: smoothly toggle in-app immersive fullscreen
      setIsFullscreen((prev) => !prev);
    }
  };

  // Track latest state and debounce cloud writes
  const latestScrapbookRef = useRef<Scrapbook>(scrapbook);
  latestScrapbookRef.current = scrapbook;
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const updateScrapbookState = (updates: Partial<Scrapbook>, immediate = false) => {
    const next = { ...latestScrapbookRef.current, ...updates, updatedAt: Date.now() };
    latestScrapbookRef.current = next;
    setScrapbook(next);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (immediate) {
      onSave(next);
    } else {
      debounceTimerRef.current = setTimeout(() => {
        onSave(latestScrapbookRef.current);
      }, 700);
    }
  };

  const updateCurrentSection = (updates: Partial<ScrapbookSection>) => {
    if (currentSpreadIndex === 0) return;
    const secIndex = currentSpreadIndex - 1;
    if (secIndex < 0 || secIndex >= scrapbook.sections.length) return;
    
    const newSections = [...scrapbook.sections];
    newSections[secIndex] = { ...newSections[secIndex], ...updates };
    updateScrapbookState({ sections: newSections });
  };

  const MAX_STICKY_NOTES_PER_PAGE = 3;

  // Add a new sticky note to current chapter (or chapter 1 if on cover)
  const addStickyNoteToSection = (text?: string, color: 'yellow' | 'pink' | 'mint' = 'mint') => {
    let targetSpread = currentSpreadIndex;
    if (targetSpread === 0) {
      if (scrapbook.sections.length === 0) {
        handleAddNewChapter();
        return;
      }
      targetSpread = 1;
      setCurrentSpreadIndex(1);
    }
    const secIndex = targetSpread - 1;
    const section = scrapbook.sections[secIndex];
    if (!section) return;

    const currentNotes = section.stickyNotes || [];
    const defaultTexts: Record<string, string> = {
      mint: 'The silence was so peaceful here... ✨ ♡',
      yellow: 'Felt like stepping into a postcard! ☺',
      pink: 'A sweet little moment captured forever ♡'
    };
    const noteText = text || defaultTexts[color] || 'A treasured memory captured here... ✨ ♡';
    const rotations = [0.5, -1.5, 1];

    let nextNotes: typeof currentNotes;
    if (currentNotes.length >= MAX_STICKY_NOTES_PER_PAGE) {
      // If at capacity, cycle the oldest note so user addition always succeeds
      nextNotes = [...currentNotes.slice(1), {
        id: `sticky_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        text: noteText,
        color,
        rotation: rotations[currentNotes.length % rotations.length]
      }];
    } else {
      nextNotes = [...currentNotes, {
        id: `sticky_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        text: noteText,
        color,
        rotation: rotations[currentNotes.length % rotations.length]
      }];
    }

    const newSections = [...scrapbook.sections];
    newSections[secIndex] = { ...newSections[secIndex], stickyNotes: nextNotes };
    updateScrapbookState({ sections: newSections });

    const colorName = color.charAt(0).toUpperCase() + color.slice(1);
    setMementoFeedback(`✨ Added ${colorName} Note to Chapter ${targetSpread}`);
    setTimeout(() => setMementoFeedback(null), 2500);
  };

  // Default positions across left and right pages for organic botanical placement
  const DEFAULT_STICKER_POSITIONS: Array<{ pageSide: 'left' | 'right'; xPercent: number; yPercent: number; rotation: number }> = [
    { pageSide: 'left', xPercent: 88, yPercent: 8, rotation: 12 },    // Top-right corner of journal
    { pageSide: 'right', xPercent: 82, yPercent: 72, rotation: -8 },  // Beside polaroid on right page
    { pageSide: 'left', xPercent: 12, yPercent: 82, rotation: -14 },  // Beside ticket stub on left page
    { pageSide: 'right', xPercent: 14, yPercent: 12, rotation: 10 },  // Top-left of right page
    { pageSide: 'left', xPercent: 10, yPercent: 8, rotation: -16 },   // Top-left corner of journal
    { pageSide: 'right', xPercent: 85, yPercent: 16, rotation: -10 }  // Top-right of right page
  ];

  // Add pressed flower or leaf decoration
  const addDecorationSticker = (type: ScrapbookSticker['type'], text?: string) => {
    let targetSpread = currentSpreadIndex;
    if (targetSpread === 0) {
      if (scrapbook.sections.length === 0) {
        handleAddNewChapter();
        return;
      }
      targetSpread = 1;
      setCurrentSpreadIndex(1);
    }
    const secIndex = targetSpread - 1;
    const section = scrapbook.sections[secIndex];
    if (!section) return;

    const currentStickers = section.stickers || [];
    const defaultPos = DEFAULT_STICKER_POSITIONS[currentStickers.length % DEFAULT_STICKER_POSITIONS.length];
    const newSticker: ScrapbookSticker = {
      id: `stk_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      type,
      text,
      pageSide: defaultPos.pageSide,
      xPercent: defaultPos.xPercent,
      yPercent: defaultPos.yPercent,
      rotation: defaultPos.rotation,
      scale: 1
    };

    // Keep up to 8 pressed botanicals per chapter spread
    const nextStickers = currentStickers.length >= 8 
      ? [...currentStickers.slice(1), newSticker]
      : [...currentStickers, newSticker];

    const newSections = [...scrapbook.sections];
    newSections[secIndex] = { ...newSections[secIndex], stickers: nextStickers };
    updateScrapbookState({ sections: newSections });
    setSelectedStickerId(newSticker.id);

    const label = type === 'daisy' ? '🌼 Daisy' : type === 'lavender' ? '🌿 Lavender' : type === 'flower' ? '🌸 Wildflower' : '🍃 Pressed Leaf';
    setMementoFeedback(`✨ Pressed ${label} onto ${defaultPos.pageSide === 'left' ? 'Left (Journal)' : 'Right (Photo)'} Page! Drag to reposition.`);
    setTimeout(() => setMementoFeedback(null), 3000);
  };

  // Botanical position & orientation modifiers
  const handleRotateSticker = (stickerId: string) => {
    if (currentSpreadIndex === 0) return;
    const secIndex = currentSpreadIndex - 1;
    const newSections = [...scrapbook.sections];
    if (newSections[secIndex]) {
      const stickers = (newSections[secIndex].stickers || []).map((s) => {
        if (s.id === stickerId) {
          const currentRot = s.rotation ?? 0;
          return { ...s, rotation: (currentRot + 15) % 360 };
        }
        return s;
      });
      newSections[secIndex].stickers = stickers;
      updateScrapbookState({ sections: newSections });
    }
  };

  const handleToggleStickerPage = (stickerId: string) => {
    if (currentSpreadIndex === 0) return;
    const secIndex = currentSpreadIndex - 1;
    const newSections = [...scrapbook.sections];
    if (newSections[secIndex]) {
      const stickers = (newSections[secIndex].stickers || []).map((s) => {
        if (s.id === stickerId) {
          const nextSide: 'left' | 'right' = (s.pageSide || 'left') === 'left' ? 'right' : 'left';
          return { 
            ...s, 
            pageSide: nextSide,
            // Flip xPercent symmetrically across center fold so it lands comfortably
            xPercent: Math.max(12, Math.min(88, 100 - (s.xPercent || 50)))
          };
        }
        return s;
      });
      newSections[secIndex].stickers = stickers;
      updateScrapbookState({ sections: newSections });
      setMementoFeedback('✨ Moved botanical across pages');
      setTimeout(() => setMementoFeedback(null), 1500);
    }
  };

  const handleToggleStickerScale = (stickerId: string) => {
    if (currentSpreadIndex === 0) return;
    const secIndex = currentSpreadIndex - 1;
    const newSections = [...scrapbook.sections];
    if (newSections[secIndex]) {
      const stickers = (newSections[secIndex].stickers || []).map((s) => {
        if (s.id === stickerId) {
          const cur = s.scale ?? 1;
          const next = cur === 1 ? 1.25 : cur === 1.25 ? 0.85 : 1;
          return { ...s, scale: next };
        }
        return s;
      });
      newSections[secIndex].stickers = stickers;
      updateScrapbookState({ sections: newSections });
    }
  };

  const handleCycleStickerPreset = (stickerId: string, currentSide: 'left' | 'right') => {
    if (currentSpreadIndex === 0) return;
    const secIndex = currentSpreadIndex - 1;
    const presetsLeft = [
      { xPercent: 88, yPercent: 8, rotation: 12 },
      { xPercent: 12, yPercent: 8, rotation: -14 },
      { xPercent: 12, yPercent: 82, rotation: 16 },
      { xPercent: 88, yPercent: 82, rotation: -10 },
      { xPercent: 92, yPercent: 46, rotation: 6 }
    ];
    const presetsRight = [
      { xPercent: 82, yPercent: 72, rotation: -8 },
      { xPercent: 14, yPercent: 12, rotation: 10 },
      { xPercent: 85, yPercent: 16, rotation: -12 },
      { xPercent: 16, yPercent: 82, rotation: 14 },
      { xPercent: 88, yPercent: 44, rotation: -6 }
    ];

    const presets = currentSide === 'left' ? presetsLeft : presetsRight;
    const newSections = [...scrapbook.sections];
    if (newSections[secIndex]) {
      const stickers = (newSections[secIndex].stickers || []).map((s) => {
        if (s.id === stickerId) {
          const matchIdx = presets.findIndex(p => Math.abs(p.xPercent - (s.xPercent || 0)) < 15 && Math.abs(p.yPercent - (s.yPercent || 0)) < 15);
          const nextPreset = presets[(matchIdx + 1) % presets.length];
          return {
            ...s,
            xPercent: nextPreset.xPercent,
            yPercent: nextPreset.yPercent,
            rotation: nextPreset.rotation
          };
        }
        return s;
      });
      newSections[secIndex].stickers = stickers;
      updateScrapbookState({ sections: newSections });
    }
  };

  // Sticker interactive pointer dragging
  const handleStickerPointerDown = (
    e: React.PointerEvent,
    sticker: ScrapbookSticker,
    pageSide: 'left' | 'right'
  ) => {
    if (!isEditMode) return;
    e.stopPropagation();
    
    const parent = pageSide === 'left' ? leftPageRef.current : rightPageRef.current;
    if (!parent) return;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }

    const rect = parent.getBoundingClientRect();
    setSelectedStickerId(sticker.id);
    setDraggingStickerState({
      stickerId: sticker.id,
      pageSide,
      pointerId: e.pointerId,
      parentRect: rect
    });
  };

  const handleStickerPointerMove = (e: React.PointerEvent) => {
    if (!draggingStickerState) return;
    const { stickerId, pageSide, parentRect } = draggingStickerState;
    
    const curX = ((e.clientX - parentRect.left) / parentRect.width) * 100;
    const curY = ((e.clientY - parentRect.top) / parentRect.height) * 100;

    const clampedX = Math.round(Math.min(94, Math.max(6, curX)));
    const clampedY = Math.round(Math.min(94, Math.max(6, curY)));

    const secIndex = currentSpreadIndex - 1;
    const newSections = [...scrapbook.sections];
    if (newSections[secIndex]) {
      const currentStickers = [...(newSections[secIndex].stickers || [])];
      const sIdx = currentStickers.findIndex(s => s.id === stickerId);
      if (sIdx !== -1) {
        currentStickers[sIdx] = {
          ...currentStickers[sIdx],
          pageSide,
          xPercent: clampedX,
          yPercent: clampedY
        };
        newSections[secIndex].stickers = currentStickers;
        // Update local UI only during dragging; do NOT fire database writes
        const next = { ...latestScrapbookRef.current, sections: newSections };
        latestScrapbookRef.current = next;
        setScrapbook(next);
      }
    }
  };

  const handleStickerPointerUp = (e: React.PointerEvent) => {
    if (draggingStickerState) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(draggingStickerState.pointerId);
      } catch {
        // ignore
      }
      setDraggingStickerState(null);
      setMementoFeedback('✨ Botanical position saved');
      setTimeout(() => setMementoFeedback(null), 1500);
      // Persist the final position once on drop
      updateScrapbookState({ sections: latestScrapbookRef.current.sections }, false);
    }
  };

  // Photo adjustment functions
  const handleSaveAdjustedPhoto = (adjusted: Partial<ScrapbookPhoto>) => {
    if (!adjustingPhoto) return;
    const secIndex = adjustingPhoto.sectionIndex;
    const pIdx = adjustingPhoto.photoIndex ?? 0;
    const newSections = [...scrapbook.sections];
    if (newSections[secIndex] && newSections[secIndex].photos?.[pIdx]) {
      const currentPhotos = [...(newSections[secIndex].photos || [])];
      currentPhotos[pIdx] = {
        ...currentPhotos[pIdx],
        ...adjusted
      };
      newSections[secIndex].photos = currentPhotos;
      updateScrapbookState({ sections: newSections });
      setMementoFeedback('✓ Photo framing saved');
      setTimeout(() => setMementoFeedback(null), 2000);
    }
  };

  const handleTogglePhotoFit = (secIndex: number, pIdx: number) => {
    const newSections = [...scrapbook.sections];
    if (newSections[secIndex] && newSections[secIndex].photos?.[pIdx]) {
      const currentPhotos = [...(newSections[secIndex].photos || [])];
      const currentFit = currentPhotos[pIdx].objectFit || 'cover';
      const nextFit: 'cover' | 'contain' = currentFit === 'cover' ? 'contain' : 'cover';
      currentPhotos[pIdx] = {
        ...currentPhotos[pIdx],
        objectFit: nextFit
      };
      newSections[secIndex].photos = currentPhotos;
      updateScrapbookState({ sections: newSections });
      setMementoFeedback(nextFit === 'contain' ? '✓ Set to Fit Whole Photo (No Cropping)' : '✓ Set to Fill Frame');
      setTimeout(() => setMementoFeedback(null), 2500);
    }
  };

  const handleCyclePhotoPosition = (secIndex: number, pIdx: number) => {
    const newSections = [...scrapbook.sections];
    if (newSections[secIndex] && newSections[secIndex].photos?.[pIdx]) {
      const currentPhotos = [...(newSections[secIndex].photos || [])];
      const curOffset = currentPhotos[pIdx].offsetY ?? 0;
      let nextOffset = 0;
      let label = 'Center';
      if (curOffset <= 5 && curOffset >= -5) {
        nextOffset = 35; // Pan up to show top (heads/faces)
        label = 'Top (Faces)';
      } else if (curOffset > 5) {
        nextOffset = -35; // Pan down
        label = 'Bottom';
      } else {
        nextOffset = 0;
        label = 'Center';
      }
      currentPhotos[pIdx] = {
        ...currentPhotos[pIdx],
        offsetY: nextOffset,
        objectPosition: `50% ${50 + nextOffset}%`
      };
      newSections[secIndex].photos = currentPhotos;
      updateScrapbookState({ sections: newSections });
      setMementoFeedback(`✓ Framing set to ${label}`);
      setTimeout(() => setMementoFeedback(null), 2000);
    }
  };

  // Remove pressed flower or sticker
  const handleRemoveStickerFromSection = (secIndex: number, stickerId: string) => {
    if (secIndex < 0 || !scrapbook.sections[secIndex]) return;
    const targetSection = scrapbook.sections[secIndex];
    const updatedStickers = (targetSection.stickers || []).filter(s => s.id !== stickerId);
    const newSections = scrapbook.sections.map((sec, idx) => 
      idx === secIndex ? { ...sec, stickers: updatedStickers } : sec
    );
    updateScrapbookState({ sections: newSections });
    if (selectedStickerId === stickerId) {
      setSelectedStickerId(null);
    }
    setMementoFeedback('🗑️ Botanical removed');
    setTimeout(() => setMementoFeedback(null), 1800);
  };

  // Clear all botanicals from current spread
  const handleClearAllBotanicalsOnSpread = (secIndex: number) => {
    if (secIndex < 0 || !scrapbook.sections[secIndex]) return;
    const newSections = scrapbook.sections.map((sec, idx) => 
      idx === secIndex ? { ...sec, stickers: [] } : sec
    );
    updateScrapbookState({ sections: newSections });
    setSelectedStickerId(null);
    setMementoFeedback('🗑️ All botanicals removed from spread');
    setTimeout(() => setMementoFeedback(null), 1800);
  };

  // Add photo upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      if (activePhotoUploadTarget?.isCover) {
        updateScrapbookState({ coverImage: url });
      } else if (activePhotoUploadTarget !== null) {
        const secIndex = activePhotoUploadTarget.sectionIndex;
        const newSections = [...scrapbook.sections];
        if (newSections[secIndex]) {
          const currentPhotos = [...(newSections[secIndex].photos || [])];
          if (activePhotoUploadTarget.mode === 'swap' && typeof activePhotoUploadTarget.photoIndex === 'number' && currentPhotos[activePhotoUploadTarget.photoIndex]) {
            currentPhotos[activePhotoUploadTarget.photoIndex] = {
              ...currentPhotos[activePhotoUploadTarget.photoIndex],
              url
            };
          } else if (currentPhotos.length < MAX_PHOTOS_PER_PAGE) {
            const rotations = [1, -2.5, 2];
            const tapes: Array<ScrapbookPhoto['tapeStyle']> = ['paperclip', 'washi-pink', 'washi-mint'];
            const newPhoto: ScrapbookPhoto = {
              id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              url,
              caption: 'Captured Memory ♡',
              rotation: rotations[currentPhotos.length % rotations.length],
              tapeStyle: tapes[currentPhotos.length % tapes.length],
              polaroidCaptionStyle: 'handwritten'
            };
            currentPhotos.push(newPhoto);
          }
          newSections[secIndex].photos = currentPhotos;
          updateScrapbookState({ sections: newSections });
        }
      }
      setActivePhotoUploadTarget(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Chapter management
  const handleAddNewChapter = () => {
    const newIndex = scrapbook.sections.length + 1;
    const newSec: ScrapbookSection = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      heading: `Chapter ${newIndex} Memories`,
      chapterNumber: newIndex,
      narrative: 'A fresh chapter in our story. Write your reflections and memories here.',
      photos: [], // Do NOT add photos if not provided by user!
      audioNote: undefined, // Do NOT add audio notes if not provided by user!
      quote: 'Every new chapter brings its own quiet beauty.',
      ticketStub: {
        location: scrapbook.location ? scrapbook.location.toUpperCase() : 'MEMORIES',
        date: scrapbook.date || '2026',
        title: 'CHAPTER PASS'
      },
      stickyNotes: [
        {
          id: `stk_${Date.now()}`,
          text: 'Felt so special to experience this ✨ ♡',
          color: 'mint',
          rotation: 0
        }
      ],
      geminiReflectionNote: {
        insight: 'Adding new chapters to your journey reflects ongoing growth and mindful living.',
        sparkle: true
      }
    };
    const nextSections = [...scrapbook.sections, newSec];
    updateScrapbookState({ sections: nextSections });
    setCurrentSpreadIndex(nextSections.length);
  };

  const handleDeleteChapter = (indexToDelete: number) => {
    if (scrapbook.sections.length <= 1) {
      setConfirmDialog({
        isOpen: true,
        title: 'Cannot Delete Chapter',
        message: 'Your memory album must have at least one chapter spread.',
        confirmText: 'Understood',
        isDestructive: false,
        onConfirm: () => setConfirmDialog(null)
      });
      return;
    }

    const chapterTitle = scrapbook.sections[indexToDelete]?.heading || `Chapter ${indexToDelete + 1}`;

    setConfirmDialog({
      isOpen: true,
      title: `Delete ${chapterTitle}?`,
      message: `Are you sure you want to delete chapter ${indexToDelete + 1} (${chapterTitle})? All photos, voice notes, and keepsakes on this spread will be removed.`,
      confirmText: 'Delete Chapter',
      isDestructive: true,
      onConfirm: () => {
        const filtered = scrapbook.sections
          .filter((_, idx) => idx !== indexToDelete)
          .map((sec, idx) => ({ ...sec, chapterNumber: idx + 1 }));
        
        updateScrapbookState({ sections: filtered });
        // Adjust current spread index if needed
        setCurrentSpreadIndex((curr) => {
          if (curr > filtered.length) return Math.max(1, filtered.length);
          if (curr === indexToDelete + 1) return Math.min(curr, filtered.length);
          return curr;
        });
        setConfirmDialog(null);
      }
    });
  };

  // Clean duplicate / redundant chapters
  const handleCleanDuplicateChapters = () => {
    const seenHeadings = new Set<string>();
    const cleaned: ScrapbookSection[] = [];
    
    scrapbook.sections.forEach((sec) => {
      const headingKey = (sec.heading || '').trim().toLowerCase();
      // If we've already seen this exact heading, skip redundant duplicate
      if (headingKey && seenHeadings.has(headingKey)) {
        return;
      }
      if (headingKey) seenHeadings.add(headingKey);
      cleaned.push({
        ...sec,
        chapterNumber: cleaned.length + 1
      });
    });

    const removedCount = scrapbook.sections.length - cleaned.length;

    if (removedCount > 0 && cleaned.length >= 1) {
      updateScrapbookState({ sections: cleaned });
      setCurrentSpreadIndex((curr) => Math.max(1, Math.min(cleaned.length, curr)));
      setConfirmDialog({
        isOpen: true,
        title: 'Chapters Cleaned ✨',
        message: `Successfully removed ${removedCount} redundant chapter(s). Your album now has ${cleaned.length} unique chapters.`,
        confirmText: 'Great',
        isDestructive: false,
        onConfirm: () => setConfirmDialog(null)
      });
    } else {
      setConfirmDialog({
        isOpen: true,
        title: 'All Chapters Unique',
        message: 'No redundant or duplicate chapters were detected in this album.',
        confirmText: 'Got It',
        isDestructive: false,
        onConfirm: () => setConfirmDialog(null)
      });
    }
  };

  const handleRequestDeleteAlbum = () => {
    if (!onDeleteScrapbook) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Entire Scrapbook?',
      message: `Are you sure you want to delete "${scrapbook.title || 'this memory album'}"? All chapters, polaroids, and audio memos will be permanently removed.`,
      confirmText: 'Delete Scrapbook',
      isDestructive: true,
      onConfirm: () => {
        setConfirmDialog(null);
        onDeleteScrapbook(scrapbook.id);
      }
    });
  };

  // Get active section safely
  const currentSection = currentSpreadIndex > 0 ? (scrapbook.sections[currentSpreadIndex - 1] || scrapbook.sections[0]) : null;

  // Render freely positionable botanical mementos (flowers, sprigs, leaves)
  const renderStickerItem = (sticker: ScrapbookSticker, pageSide: 'left' | 'right', index: number) => {
    const defaultPos = DEFAULT_STICKER_POSITIONS[index % DEFAULT_STICKER_POSITIONS.length];
    const x = sticker.xPercent ?? defaultPos.xPercent;
    const y = sticker.yPercent ?? defaultPos.yPercent;
    const rot = sticker.rotation ?? defaultPos.rotation;
    const scale = sticker.scale ?? 1;
    const isSelected = isEditMode && selectedStickerId === sticker.id;

    return (
      <div
        key={sticker.id}
        id={`sticker-${sticker.id}`}
        style={{
          position: 'absolute',
          left: `${x}%`,
          top: `${y}%`,
          transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${scale})`,
          zIndex: isSelected ? 40 : 25,
          touchAction: 'none'
        }}
        className={`select-none transition-shadow ${
          isEditMode ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-auto'
        }`}
        onPointerDown={(e) => {
          if (isEditMode) {
            handleStickerPointerDown(e, sticker, pageSide);
          }
        }}
        onPointerMove={handleStickerPointerMove}
        onPointerUp={handleStickerPointerUp}
        onClick={(e) => {
          if (isEditMode) {
            e.stopPropagation();
            setSelectedStickerId(selectedStickerId === sticker.id ? null : sticker.id);
          }
        }}
        title={isEditMode ? "Drag to place anywhere on page, or click to adjust tilt & size" : undefined}
      >
        {/* Botanical Graphic */}
        <div className={`relative p-1 transition-transform group ${
          isSelected 
            ? 'ring-2 ring-amber-600 ring-offset-2 ring-offset-amber-50 rounded-lg bg-amber-100/40 shadow-md' 
            : 'hover:scale-110'
        }`}>
          {sticker.type === 'daisy' && <DaisyFlower className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow-sm" />}
          {sticker.type === 'lavender' && <LavenderSprig className="w-5 h-10 sm:w-6 sm:h-12 drop-shadow-sm" />}
          {(sticker.type === 'flower' || sticker.type === 'stamp') && (
            <WildflowerBouquet className="w-6 h-9 sm:w-7 sm:h-11 drop-shadow-sm" />
          )}
          {(sticker.type === 'leaf' || sticker.type === 'paperclip' || sticker.type === 'pin') && (
            <GreenPressedLeaf className="w-5 h-9 sm:w-6 sm:h-11 drop-shadow-sm" />
          )}

          {/* Direct Instant Remove Button in Edit Mode */}
          {isEditMode && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleRemoveStickerFromSection(currentSpreadIndex - 1, sticker.id);
              }}
              className="absolute -top-2 -right-2 z-50 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center justify-center shadow-md cursor-pointer border border-white hover:scale-110 active:scale-95 transition-transform"
              title="Remove this botanical memento"
            >
              ✕
            </button>
          )}

          {/* Quick drag indicator dot in edit mode */}
          {isEditMode && (
            <div className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-stone-800 text-white flex items-center justify-center text-[7.5px] opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xs">
              ✥
            </div>
          )}
        </div>

        {/* Selected Botanical Mini Toolbar in Edit Mode */}
        {isSelected && (
          <div
            className="absolute left-1/2 -top-9 -translate-x-1/2 z-50 bg-[#2c2217] text-[#fcf8f2] text-[10px] px-2 py-0.5 rounded-md shadow-2xl flex items-center gap-1.5 whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-auto border border-[#715c48]"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tilt Button */}
            <button
              type="button"
              onClick={() => handleRotateSticker(sticker.id)}
              className="px-1 py-0.5 hover:bg-white/15 rounded text-amber-200 transition-colors flex items-center gap-0.5 cursor-pointer"
              title="Tilt angle (+15°)"
            >
              <RotateCw className="w-2.5 h-2.5" />
              <span>Tilt</span>
            </button>

            {/* Switch Page */}
            <button
              type="button"
              onClick={() => handleToggleStickerPage(sticker.id)}
              className="px-1 py-0.5 hover:bg-white/15 rounded text-emerald-300 transition-colors flex items-center gap-0.5 cursor-pointer"
              title={`Move to ${pageSide === 'left' ? 'Right (Photo)' : 'Left (Journal)'} Page`}
            >
              <span>{pageSide === 'left' ? 'To Right' : 'To Left'}</span>
            </button>

            {/* Scale Toggle */}
            <button
              type="button"
              onClick={() => handleToggleStickerScale(sticker.id)}
              className="px-1 py-0.5 hover:bg-white/15 rounded text-sky-300 transition-colors flex items-center gap-0.5 cursor-pointer"
              title="Toggle size"
            >
              <span>{scale > 1.1 ? 'Large' : scale < 0.9 ? 'Petite' : 'Normal'}</span>
            </button>

            {/* Preset Position */}
            <button
              type="button"
              onClick={() => handleCycleStickerPreset(sticker.id, pageSide)}
              className="px-1 py-0.5 hover:bg-white/15 rounded text-amber-300 transition-colors cursor-pointer"
              title="Snap to next preset position"
            >
              <span>📍 Preset</span>
            </button>

            {/* Remove */}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleRemoveStickerFromSection(currentSpreadIndex - 1, sticker.id);
              }}
              className="px-1.5 py-0.5 bg-rose-700/90 hover:bg-rose-700 rounded text-white font-bold transition-colors ml-0.5 cursor-pointer flex items-center gap-0.5"
              title="Remove botanical"
            >
              <span>✕</span>
              <span>Remove</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      ref={bookContainerRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col h-screen w-screen bg-[#ede4d4] overflow-hidden select-none animate-in fade-in duration-200"
          : "flex-1 flex flex-col h-full w-full min-h-0 bg-[#ede4d4] overflow-hidden select-none"
      }
    >
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & NAVIGATION (CLEAN & MINIMALIST) */}
      {/* ========================================================================= */}
      <header className="h-11 sm:h-12 bg-[#f8f5ee]/95 backdrop-blur-md border-b border-[#ded5c4] px-3 sm:px-6 flex items-center justify-between shrink-0 z-40">
        
        {/* Left: Library pill button & Title Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-stone-50 border border-[#d3c8b4] text-stone-800 text-xs sm:text-sm font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
            title="Return to Scrapbook Library"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-stone-700" />
            <span>Library</span>
          </button>

          <div className="flex items-center gap-1.5 truncate">
            <span className="font-serif-title font-bold text-stone-900 text-sm sm:text-base md:text-lg tracking-tight truncate">
              {scrapbook.title || 'Rajasthan'}
            </span>
            <span className="text-stone-400 text-xs">•</span>
            <span className="text-stone-600 font-sans text-xs truncate hidden xs:inline">
              {currentSpreadIndex === 0 ? 'Album Cover' : `Chapter ${currentSpreadIndex} of ${totalSpreads}`}
            </span>
          </div>
        </div>

        {/* Right Tools: Theme Color, Story Assistant, Edit Mode, Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Chapter Manager Button */}
          <button
            onClick={() => setShowChapterManager(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-amber-50/90 hover:bg-amber-100 border border-amber-300/80 text-amber-900 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Open Chapter Manager"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-700" />
            <span>Chapters ({scrapbook.sections.length})</span>
          </button>

          {/* Leather Palette Picker Button */}
          <div className="relative">
            <button
              onClick={() => setIsEditingCoverTheme(!isEditingCoverTheme)}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-white hover:bg-stone-50 border border-[#d3c8b4] text-stone-800 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              title="Change Album Cover Leather"
            >
              <Palette className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden md:inline">Cover Style</span>
            </button>

            {/* Leather Color Dropdown Popup */}
            {isEditingCoverTheme && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-stone-200 p-2.5 z-50 animate-in fade-in-50 zoom-in-95">
                <div className="text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-2 font-mono">
                  Album Cover Leather
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(COVER_THEMES) as ScrapbookCoverColor[]).map((cKey) => {
                    const t = COVER_THEMES[cKey];
                    const isSelected = coverColor === cKey;
                    return (
                      <button
                        key={cKey}
                        onClick={() => {
                          updateScrapbookState({ coverColor: cKey });
                          setIsEditingCoverTheme(false);
                        }}
                        className={`flex items-center gap-1.5 p-1.5 rounded-lg text-left text-xs font-medium border transition-all cursor-pointer ${
                          isSelected ? 'border-amber-600 bg-amber-50 font-bold' : 'border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full ${t.coverBg} border ${t.coverBorder} shrink-0`} />
                        <span className="truncate text-[11px] text-stone-800">{t.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowStoryAssistant(true)}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-white hover:bg-stone-50 border border-[#d3c8b4] text-stone-800 text-xs sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">AI Story</span>
          </button>

          {/* Prominent Mode Switcher: View Mode vs Edit Mode */}
          <div className="flex items-center bg-[#ece4d4] p-0.5 rounded-full border border-[#d6cbb5] shadow-inner">
            <button
              onClick={() => {
                setIsEditMode(false);
                setIsEditingCoverTheme(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                !isEditMode
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="View Mode: browse cleanly without editing controls"
            >
              <Eye className="w-3.5 h-3.5 text-amber-800" />
              <span>View Mode</span>
            </button>
            <button
              onClick={() => {
                setIsEditMode(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isEditMode
                  ? 'bg-amber-800 text-white shadow-xs font-bold ring-1 ring-amber-900'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Edit Mode: add photos, notes, stickers, and customize"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-200" />
              <span>Edit Mode</span>
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg border flex items-center justify-center shadow-2xs transition-all cursor-pointer ${
              isFullscreen
                ? 'bg-amber-800 hover:bg-amber-900 border-amber-900 text-white ring-2 ring-amber-400/60'
                : 'bg-white hover:bg-stone-50 border-[#d3c8b4] text-stone-700'
            }`}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Immersive Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Delete Album Button */}
          {onDeleteScrapbook && (
            <button
              onClick={handleRequestDeleteAlbum}
              className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-white hover:bg-rose-50 border border-[#d3c8b4] hover:border-rose-300 text-stone-500 hover:text-rose-600 flex items-center justify-center shadow-2xs transition-all cursor-pointer ml-1"
              title="Delete Entire Scrapbook"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. EDIT MODE CRAFT DRAWER */}
      {/* ========================================================================= */}
      {isEditMode && (
        <div className="bg-[#fcfaf5] border-b border-[#dfd4be] px-3 sm:px-6 py-2 shadow-xs flex flex-wrap items-center justify-between gap-2 shrink-0 animate-in slide-in-from-top-2 duration-150 z-30">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold text-stone-500 uppercase tracking-wider mr-1">
              Add Memento:
            </span>

            {/* Sticky Notes */}
            <button
              type="button"
              onClick={() => addStickyNoteToSection(undefined, 'mint')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#c5ead5] hover:bg-[#b2e4c5] active:scale-95 border border-[#aedec1] text-[#1c4731] text-xs font-hand-casual shadow-2xs cursor-pointer transition-all"
              title="Pin a Mint Sticky Note"
            >
              <StickyIcon className="w-3 h-3" />
              <span>Mint Note</span>
            </button>

            <button
              type="button"
              onClick={() => addStickyNoteToSection(undefined, 'yellow')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-200/90 hover:bg-amber-300 active:scale-95 border border-amber-300 text-amber-950 text-xs font-hand-casual shadow-2xs cursor-pointer transition-all"
              title="Pin a Yellow Sticky Note"
            >
              <StickyIcon className="w-3 h-3" />
              <span>Yellow Note</span>
            </button>

            <button
              type="button"
              onClick={() => addStickyNoteToSection(undefined, 'pink')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-200/90 hover:bg-rose-300 active:scale-95 border border-rose-300 text-rose-950 text-xs font-hand-casual shadow-2xs cursor-pointer transition-all"
              title="Pin a Pink Sticky Note"
            >
              <StickyIcon className="w-3 h-3" />
              <span>Pink Note</span>
            </button>

            {/* Pressed Florals & Botanicals */}
            <button
              type="button"
              onClick={() => addDecorationSticker('daisy')}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white hover:bg-amber-50/60 active:scale-95 border border-stone-300 text-stone-700 text-xs font-hand-casual shadow-2xs cursor-pointer transition-all"
              title="Press a Daisy flower"
            >
              <span>🌼 Daisy</span>
            </button>

            <button
              type="button"
              onClick={() => addDecorationSticker('lavender')}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white hover:bg-purple-50/60 active:scale-95 border border-stone-300 text-purple-900 text-xs font-hand-casual shadow-2xs cursor-pointer transition-all"
              title="Press a Lavender sprig"
            >
              <span>🌿 Lavender</span>
            </button>

            <button
              type="button"
              onClick={() => addDecorationSticker('flower')}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white hover:bg-rose-50/60 active:scale-95 border border-stone-300 text-rose-900 text-xs font-hand-casual shadow-2xs cursor-pointer transition-all"
              title="Press a Wildflower bouquet"
            >
              <span>🌸 Wildflower</span>
            </button>

            <button
              type="button"
              onClick={() => addDecorationSticker('leaf')}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white hover:bg-emerald-50/60 active:scale-95 border border-stone-300 text-emerald-900 text-xs font-hand-casual shadow-2xs cursor-pointer transition-all"
              title="Press a Green Leaf"
            >
              <span>🍃 Leaf</span>
            </button>

            {/* Clear All Botanicals on Spread if present */}
            {currentSection && (currentSection.stickers || []).length > 0 && (
              <button
                type="button"
                onClick={() => handleClearAllBotanicalsOnSpread(currentSpreadIndex - 1)}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 active:scale-95 border border-rose-200 text-rose-800 text-xs font-hand-casual shadow-2xs cursor-pointer transition-all ml-1"
                title="Remove all botanicals from this chapter spread"
              >
                <Trash2 className="w-3 h-3 text-rose-600" />
                <span>Clear Botanicals ({currentSection.stickers.length})</span>
              </button>
            )}

            {/* Instant Memento Added Feedback Banner */}
            {mementoFeedback && (
              <span className="text-[11px] font-hand-casual text-amber-900 font-bold bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-full animate-in fade-in zoom-in-95 duration-150 shrink-0">
                {mementoFeedback}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAddNewChapter}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#3b4834] hover:bg-[#2c3727] text-white text-xs font-semibold shadow-2xs cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>New Chapter</span>
            </button>

            {currentSpreadIndex > 0 && (
              <button
                onClick={() => handleDeleteChapter(currentSpreadIndex - 1)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-medium cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN PHYSICAL DESK STAGE (BALANCED PROPORTIONS & ZERO OVERLAPPING) */}
      {/* ========================================================================= */}
      <main className="flex-1 min-h-0 w-full flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 relative overflow-hidden">
        
        {/* Fullscreen Ephemeral Advisory Pill */}
        {fullscreenTip && (
          <div className="absolute top-2.5 z-50 bg-[#2d2116]/90 backdrop-blur-md text-[#fbf7f0] text-xs font-medium px-4 py-1.5 rounded-full shadow-lg border border-amber-500/40 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{fullscreenTip}</span>
            <button
              type="button"
              onClick={() => setFullscreenTip(null)}
              className="text-stone-300 hover:text-white ml-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Subtle Ambient Desk Botanical in Top-Right Corner */}
        <div className="hidden lg:block absolute top-0 right-0 pointer-events-none z-0 opacity-60">
          <svg viewBox="0 0 160 160" className="w-24 md:w-28 h-24 md:h-28 filter drop-shadow-sm">
            <g transform="rotate(-15 80 80)">
              <path d="M 140,10 Q 90,60 40,140" stroke="#3b4d2a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <ellipse cx="120" cy="30" rx="14" ry="9" fill="#4a6338" transform="rotate(-30 120 30)" />
              <ellipse cx="105" cy="45" rx="15" ry="10" fill="#587644" transform="rotate(40 105 45)" />
              <ellipse cx="90" cy="65" rx="17" ry="11" fill="#3f5530" transform="rotate(-20 90 65)" />
            </g>
          </svg>
        </div>

        {/* ========================================================================= */}
        {/* VIEW A: COVER VIEW */}
        {/* ========================================================================= */}
        {currentSpreadIndex === 0 ? (
          <div className={`relative flex flex-col items-center justify-center w-full ${
            isFullscreen ? 'max-w-md sm:max-w-lg' : 'max-w-sm sm:max-w-md'
          } my-auto animate-in zoom-in-95 duration-200 select-none py-1 overflow-y-auto scrapbook-page-scroll max-h-[calc(100vh-5rem)]`}>
            
            {/* Hardcover Album Jacket */}
            <div className={`relative w-full aspect-[3/4] max-h-[480px] rounded-[20px] shadow-2xl border-4 ${coverTheme.coverBg} ${coverTheme.coverBorder} flex flex-col justify-between overflow-hidden p-5 sm:p-6`}>
              
              {/* Stitched Edge Detail */}
              <div className="absolute inset-2.5 rounded-xl border border-dashed border-white/25 pointer-events-none" />

              {/* Left Spine Binder with Brass Grommets */}
              <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-11 bg-black/25 flex flex-col justify-around items-center py-5 z-10 border-r border-black/30">
                {[0, 1, 2].map((g) => (
                  <div key={g} className="relative flex items-center justify-center">
                    <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-amber-400 via-amber-700 to-amber-950 border border-amber-900 shadow-inner flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#3a2818] shadow-inner" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Top Tag: "My Journey" */}
              <div className="relative pl-9 sm:pl-11 flex justify-center">
                <WashiTapeStrip color="kraft" className="px-3 py-0.5 text-xs" rotation={-1} label="My Journey ♡" />
              </div>

              {/* Center Title & Polaroid */}
              <div className="relative pl-9 sm:pl-11 text-center my-auto space-y-2">
                <h1 className={`font-serif-title text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight ${coverTheme.textColor} filter drop-shadow-md leading-tight`}>
                  {scrapbook.title || 'Rajasthan'} <span className="font-handwriting text-rose-300">♡</span>
                </h1>

                <p className="font-hand-casual text-sm sm:text-base text-amber-100/90 tracking-wider">
                  {scrapbook.date || scrapbook.subtitle || 'March 2026'}
                </p>

                {/* Center Polaroid Photo or Embossed Seal on Cover */}
                {Boolean(scrapbook.coverImage || scrapbook.sections[0]?.photos?.[0]?.url) ? (
                  <div className="relative mx-auto mt-1 inline-block transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                    <div className="polaroid-frame bg-white w-32 sm:w-38 p-1.5 pb-3.5 rounded-xs shadow-xl">
                      <div className="w-full h-26 sm:h-32 bg-stone-200 overflow-hidden relative group rounded-2xs">
                        <img
                          src={scrapbook.coverImage || scrapbook.sections[0]?.photos?.[0]?.url}
                          alt={scrapbook.title}
                          className="w-full h-full object-cover"
                        />
                        {isEditMode && (
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1.5 text-white text-xs font-semibold cursor-pointer">
                            <button
                              onClick={() => handleOpenPhotoPicker(0, true)}
                              className="px-2 py-0.5 rounded-full bg-white/90 hover:bg-white text-stone-900 text-[10px] flex items-center gap-1 shadow-sm"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Change Photo</span>
                            </button>
                            <button
                              onClick={() => {
                                onSave({
                                  ...scrapbook,
                                  coverImage: undefined
                                });
                              }}
                              className="px-2 py-0.5 rounded-full bg-rose-700/90 hover:bg-rose-700 text-white text-[10px] flex items-center gap-1 shadow-sm"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="absolute -bottom-2 -right-2 z-20 pointer-events-none">
                      <DaisyFlower className="w-7 h-7 transform rotate-12" />
                    </div>
                  </div>
                ) : (
                  /* No cover photo provided */
                  <div className="relative mx-auto my-2 flex flex-col items-center">
                    <div className="w-28 h-28 rounded-full border-2 border-dashed border-amber-200/30 bg-black/20 flex flex-col items-center justify-center p-3 text-center shadow-inner">
                      <DaisyFlower className="w-8 h-8 transform rotate-12 drop-shadow-sm mb-1" />
                      <span className="font-handwriting text-xs text-amber-200/90 font-bold tracking-wide">
                        {scrapbook.quotePill || 'Memories ♡'}
                      </span>
                    </div>
                    {isEditMode && (
                      <button
                        onClick={() => handleOpenPhotoPicker(0, true)}
                        className="mt-2 px-3 py-1 rounded-full bg-white/90 hover:bg-white text-stone-900 text-[10px] font-semibold flex items-center gap-1 shadow-md cursor-pointer transition-colors"
                      >
                        <Camera className="w-3 h-3 text-amber-800" />
                        <span>+ Add Cover Photo</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Button */}
              <div className="relative pl-9 sm:pl-11 flex flex-col items-center">
                <button
                  onClick={() => setCurrentSpreadIndex(1)}
                  className="flex items-center gap-1.5 px-4.5 py-1.5 rounded-full bg-white hover:bg-stone-50 text-stone-900 font-serif font-bold text-xs sm:text-sm shadow-md hover:scale-105 transition-all cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Open Album</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* VIEW B: 2-PAGE SPREAD (BALANCED PROPORTIONS, ZERO OVERLAP & SCROLLABLE) */
          /* ========================================================================= */
          currentSection && (
            <div className={`relative flex flex-col items-center justify-center w-full ${
              isFullscreen 
                ? 'max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] h-full max-h-[calc(100vh-4.25rem)]' 
                : 'max-w-4xl lg:max-w-5xl xl:max-w-[1040px] h-full max-h-[calc(100vh-5.5rem)]'
            } min-h-0 animate-in zoom-in-95 duration-150`}>
              
              {/* Outer Leather Binder Frame with 3D Edge Thickness */}
              <div className={`relative w-full h-full rounded-[18px] sm:rounded-[20px] ${coverTheme.coverBg} p-2 sm:p-2.5 md:p-3 shadow-2xl border-[3px] ${coverTheme.coverBorder} flex items-stretch min-h-0`}>
                
                {/* 3D Stacked Page Edges (Curved Book Thickness) */}
                <div className="hidden md:block absolute -left-1 top-4 bottom-4 w-2 bg-gradient-to-r from-black/40 via-[#ded4bf] to-[#f4ebe0] rounded-l-md opacity-80 pointer-events-none" />
                <div className="hidden md:block absolute -right-1 top-4 bottom-4 w-2 bg-gradient-to-l from-black/40 via-[#ded4bf] to-[#f4ebe0] rounded-r-md opacity-80 pointer-events-none" />

                {/* 2-PAGE OPEN SPREAD PARCHMENT CONTAINER */}
                <div className="relative w-full h-full rounded-xl overflow-hidden scrapbook-paper-parchment shadow-inner border border-[#d6c7b0] grid grid-cols-1 md:grid-cols-2 min-h-0">
                  
                  {/* Center Crease & Leather Spine Shadow */}
                  <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-8 -translate-x-1/2 book-center-crease pointer-events-none z-30" />

                  {/* ========================================================= */}
                  {/* LEFT PAGE: CHAPTER BADGE, TITLE, STORY, KEEPSAKE TRAY */}
                  {/* ========================================================= */}
                  <div 
                    ref={leftPageRef}
                    className="relative p-3 sm:p-4 md:p-5 flex flex-col justify-between book-spine-shadow-left border-b md:border-b-0 md:border-r border-[#d6c7b0]/60 overflow-y-auto scrapbook-page-scroll"
                  >
                    {/* Free-form Pressed Botanicals on Left Page */}
                    {(currentSection.stickers || [])
                      .filter((s, idx) => (s.pageSide || (idx % 2 === 0 ? 'left' : 'right')) === 'left')
                      .map((sticker, sIdx) => renderStickerItem(sticker, 'left', sIdx))}
                    
                    {/* Top: Pastel Pink Ripped Washi Tag + Lavender Sprig + Chapter Actions */}
                    <div className="flex items-center justify-between shrink-0 mb-1">
                      <div className="flex items-center gap-2">
                        <WashiTapeStrip 
                          color="pink" 
                          className="px-3 py-0.5 text-xs font-handwriting font-bold tracking-wide" 
                          rotation={-1} 
                          label={`Chapter ${currentSpreadIndex}`} 
                        />
                        <LavenderSprig className="w-4 h-7 transform rotate-35 opacity-90" />
                      </div>

                      {/* Chapter Spread Quick Action Tools (Edit Mode Only) */}
                      {isEditMode && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={handleAddNewChapter}
                            className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white hover:bg-stone-50 border border-[#dfd4be] text-stone-700 text-[10px] font-semibold shadow-2xs transition-colors cursor-pointer"
                            title="Add New Chapter"
                          >
                            <Plus className="w-2.5 h-2.5 text-[#3b4834]" />
                            <span>Add</span>
                          </button>

                          <button
                            onClick={() => setShowChapterManager(true)}
                            className="px-2 py-0.5 rounded-full bg-white hover:bg-stone-50 border border-[#dfd4be] text-stone-700 text-[10px] font-semibold shadow-2xs transition-colors cursor-pointer"
                            title="View & organize all chapters"
                          >
                            <span>Manage</span>
                          </button>

                          {scrapbook.sections.length > 1 && (
                            <button
                              onClick={() => handleDeleteChapter(currentSpreadIndex - 1)}
                              className="w-5 h-5 rounded-full bg-white hover:bg-rose-50 border border-[#dfd4be] hover:border-rose-300 text-stone-400 hover:text-rose-600 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                              title={`Delete Chapter ${currentSpreadIndex}`}
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Clean Chapter Title */}
                    <div className="shrink-0 mb-1.5">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={currentSection.heading || `New Horizon`}
                          onChange={(e) => updateCurrentSection({ heading: e.target.value })}
                          className="w-full font-serif-title font-bold text-lg sm:text-xl lg:text-2xl text-[#2a2016] bg-transparent border-b border-dashed border-stone-400 focus:border-stone-800 focus:outline-none"
                          placeholder="Chapter Title ♡"
                        />
                      ) : (
                        <h2 className="font-serif-title font-bold text-lg sm:text-xl lg:text-2xl text-[#2a2016] tracking-tight leading-snug flex items-center flex-wrap gap-1.5">
                          <span>
                            {(currentSection.heading || 'New Horizon').replace(/^chapter\s*\d+[:\-]?\s*/i, '')}
                          </span>
                          <span className="font-handwriting text-rose-400 text-lg font-bold">♡</span>
                        </h2>
                      )}
                    </div>

                    {/* Story Narrative in Warm, Clear, Readable Journal Handwriting */}
                    <div className="flex-1 flex flex-col justify-start my-1 pr-1 min-h-0">
                      {isEditMode ? (
                        <textarea
                          value={currentSection.narrative || ''}
                          onChange={(e) => updateCurrentSection({ narrative: e.target.value })}
                          rows={3}
                          className="w-full font-hand-casual text-xs sm:text-sm md:text-[15px] leading-relaxed text-[#33251a] bg-transparent border border-stone-300/80 rounded p-1.5 focus:border-stone-600 focus:outline-none resize-none"
                          placeholder="Write your story..."
                        />
                      ) : (
                        <p className="font-hand-casual text-xs sm:text-sm md:text-[15px] lg:text-base leading-[1.6] text-[#33251a] select-text">
                          {currentSection.narrative || 'We paused for a moment to take in the breeze and the gentle hum of the world. Every moment felt unhurried and full of life.'}
                        </p>
                      )}
                    </div>

                    {/* Bottom Keepsakes: Travel Ticket Stub + Mint Pastel Sticky Note (Side by Side, Zero Overlap) */}
                    <div className="flex flex-wrap items-end justify-between gap-2 pt-2 mt-auto border-t border-[#dfd2be]/60 shrink-0">
                      
                      {/* Vintage Travel Ticket Stub */}
                      <div className="flex flex-col items-start transform -rotate-0.5 hover:rotate-0 transition-transform">
                        <div className="mb-0.5">
                          <WashiTapeStrip color="kraft" className="w-10 h-2.5 text-[6.5px]" rotation={-1} />
                        </div>
                        <TravelTicketStub
                          location={currentSection.ticketStub?.location || (scrapbook.location ? `${scrapbook.location.toUpperCase()}, INDIA` : 'RAJASTHAN, INDIA')}
                          date={currentSection.ticketStub?.date || 'March 2026'}
                          title={currentSection.ticketStub?.title || 'MEMORIES'}
                          className="w-28 sm:w-32 md:w-36"
                        />
                      </div>

                      {/* Pinned Keepsake Sticky Notes */}
                      <div className="flex flex-wrap items-end justify-end gap-1.5 flex-1 min-w-[130px]">
                        {(currentSection.stickyNotes || []).map((sticky, sIdx) => (
                          <div 
                            key={sticky.id || sIdx} 
                            className="flex flex-col items-end transform transition-transform hover:rotate-0"
                            style={{ transform: `rotate(${sticky.rotation ?? (sIdx === 0 ? 0.5 : -1.5)}deg)` }}
                          >
                            <StickyNote
                              text={sticky.text}
                              color={sticky.color || 'mint'}
                              rotation={0}
                              withPin={true}
                              className="w-28 sm:w-30 md:w-34 p-1.5"
                              isEditing={isEditMode}
                              onColorChange={isEditMode ? (newColor) => {
                                const nextStickies = [...(currentSection.stickyNotes || [])];
                                if (nextStickies[sIdx]) {
                                  nextStickies[sIdx] = { ...nextStickies[sIdx], color: newColor };
                                  updateCurrentSection({ stickyNotes: nextStickies });
                                }
                              } : undefined}
                              onChange={isEditMode ? (newText) => {
                                const nextStickies = [...(currentSection.stickyNotes || [])];
                                if (nextStickies[sIdx]) {
                                  nextStickies[sIdx] = { ...nextStickies[sIdx], text: newText };
                                  updateCurrentSection({ stickyNotes: nextStickies });
                                }
                              } : undefined}
                              onDelete={isEditMode ? () => {
                                const nextStickies = (currentSection.stickyNotes || []).filter((_, i) => i !== sIdx);
                                updateCurrentSection({ stickyNotes: nextStickies });
                              } : undefined}
                            />
                          </div>
                        ))}

                        {/* In Edit Mode, if under MAX_STICKY_NOTES_PER_PAGE, offer button to pin a note */}
                        {isEditMode && (!currentSection.stickyNotes || currentSection.stickyNotes.length < MAX_STICKY_NOTES_PER_PAGE) && (
                          <button
                            type="button"
                            onClick={() => addStickyNoteToSection(undefined, 'mint')}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-dashed border-[#aedec1] bg-[#c5ead5]/40 hover:bg-[#c5ead5]/80 text-[#1c4731] text-[11px] font-hand-casual cursor-pointer transition-colors shadow-2xs"
                            title="Pin a handwritten sticky note"
                          >
                            <StickyIcon className="w-3.5 h-3.5" />
                            <span>+ Pin Sticky Note</span>
                          </button>
                        )}
                      </div>

                    </div>

                    {/* Bottom Left Page Number */}
                    <div className="flex items-center justify-start pt-1 shrink-0">
                      <span className="font-handwriting text-[11px] text-stone-500 font-bold tracking-wider">
                        — Page {currentSpreadIndex * 2 - 1} —
                      </span>
                    </div>

                  </div>

                  {/* ========================================================= */}
                  {/* RIGHT PAGE: POLAROID, QUOTE, VOICE NOTE, GEMINI NOTE */}
                  {/* ========================================================= */}
                  <div 
                    ref={rightPageRef}
                    className="relative p-3 sm:p-4 md:p-5 flex flex-col justify-between book-spine-shadow-right bg-[#faf6ee] overflow-y-auto scrapbook-page-scroll"
                  >
                    {/* Free-form Pressed Botanicals on Right Page */}
                    {(currentSection.stickers || [])
                      .filter((s, idx) => (s.pageSide || (idx % 2 === 0 ? 'left' : 'right')) === 'right')
                      .map((sticker, sIdx) => renderStickerItem(sticker, 'right', sIdx))}
                    
                    {/* Top Tag: "Little Moments ♡" Washi Tape & Photo Count Limit */}
                    <div className="flex items-center justify-between shrink-0 mb-1">
                      <WashiTapeStrip 
                        color="kraft" 
                        className="px-2.5 py-0.2 text-xs font-handwriting font-bold" 
                        rotation={1} 
                        label={
                          (currentSection.photos || []).filter(p => Boolean(p?.url)).length > 1 
                            ? 'Moments Collage ♡' 
                            : 'Little Moments ♡'
                        } 
                      />

                      {isEditMode && (
                        <div className="flex items-center gap-1.5">
                          <span 
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${
                              (currentSection.photos || []).filter(p => Boolean(p?.url)).length >= MAX_PHOTOS_PER_PAGE
                                ? 'bg-amber-100/90 text-amber-900 border-amber-300' 
                                : 'bg-stone-100 text-stone-600 border-stone-200'
                            }`}
                            title={`Page Size Limit: Up to ${MAX_PHOTOS_PER_PAGE} polaroids fit comfortably on this chapter spread`}
                          >
                            {(currentSection.photos || []).filter(p => Boolean(p?.url)).length}/{MAX_PHOTOS_PER_PAGE} {(currentSection.photos || []).filter(p => Boolean(p?.url)).length >= MAX_PHOTOS_PER_PAGE ? 'Full' : ''}
                          </span>

                          {(currentSection.photos || []).filter(p => Boolean(p?.url)).length < MAX_PHOTOS_PER_PAGE && (
                            <button
                              onClick={() => handleOpenPhotoPicker(currentSpreadIndex - 1, false, undefined, 'add')}
                              className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white hover:bg-stone-50 border border-[#dfd4be] text-stone-800 text-[10px] font-semibold shadow-2xs transition-colors cursor-pointer"
                              title="Add another photo to this page spread (max 3)"
                            >
                              <Plus className="w-2.5 h-2.5 text-[#3b4834]" />
                              <span>Add Photo</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Polaroid Photos Showcase (1, 2, or 3 Photos Collage as per Page Size) */}
                    {(() => {
                      const validPhotos = (currentSection.photos || []).filter((p) => Boolean(p && p.url));
                      
                      if (validPhotos.length === 0) {
                        /* 0 PHOTOS: SHOW DEFAULT GOLDEN HOUR POLAROID WITH ADD/CUSTOMIZE OPTION */
                        const fallbackPhoto = {
                          url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80',
                          caption: 'Golden Hour Memories ♡'
                        };
                        return (
                          <div className="relative mx-auto my-1 w-full max-w-[270px] sm:max-w-[300px] transform rotate-[0.5deg] hover:rotate-0 transition-transform duration-300">
                            {/* Gold Paperclip */}
                            <div className="absolute -top-3 right-10 z-30 pointer-events-none">
                              <PaperClip className="w-4.5 h-9" color="gold" />
                            </div>

                            {/* Washi Tape Accent */}
                            <div className="absolute -top-2 -right-2 z-20 pointer-events-none transform rotate-45">
                              <WashiTapeStrip color="kraft" className="w-8 h-2 text-[6px]" />
                            </div>

                            {/* Polaroid Frame */}
                            <div className="polaroid-frame bg-white p-2 pb-2.5 rounded-xs shadow-md border border-stone-200/60 relative z-10">
                              <div className="relative w-full aspect-[4/3] max-h-[175px] sm:max-h-[195px] bg-[#f5efe4] overflow-hidden group rounded-2xs border border-stone-200/60 flex items-center justify-center">
                                <img
                                  src={fallbackPhoto.url}
                                  alt={fallbackPhoto.caption}
                                  className="w-full h-full object-cover"
                                />

                                {isEditMode && (
                                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center gap-1.5 transition-opacity opacity-0 group-hover:opacity-100 flex-wrap p-1">
                                    <button
                                      onClick={() => handleOpenPhotoPicker(currentSpreadIndex - 1, false, undefined, 'add')}
                                      className="px-2.5 py-1 rounded-full bg-[#3b4834] hover:bg-[#2c3727] text-white text-[10px] font-semibold flex items-center gap-1 shadow-md cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>Upload Your Photo</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Caption */}
                              <div className="mt-1 text-center">
                                <p className="font-handwriting text-sm sm:text-base font-bold text-center text-[#2d2116] tracking-wide">
                                  {fallbackPhoto.caption}
                                </p>
                              </div>
                            </div>

                            {/* Memory Quote underneath */}
                            <div className="my-1.5 text-center px-2">
                              <p className="font-hand-casual text-xs sm:text-[13px] text-[#403123] italic leading-relaxed">
                                "{currentSection.quote || 'Some memories stay bright even as seasons shift.'}"
                              </p>
                              <span className="font-handwriting text-stone-700 text-xs block mt-0.5 font-bold">♡</span>
                            </div>
                          </div>
                        );
                      }

                      if (validPhotos.length === 1) {
                        /* 1 PHOTO: CLASSIC CENTERED POLAROID (MATCHING REFERENCE IMAGE) */
                        const photo = validPhotos[0];
                        return (
                          <div className="relative mx-auto my-1 w-full max-w-[270px] sm:max-w-[300px] transform rotate-[0.5deg] hover:rotate-0 transition-transform duration-300">
                            {/* Gold Paperclip */}
                            <div className="absolute -top-3 right-10 z-30 pointer-events-none">
                              <PaperClip className="w-4.5 h-9" color="gold" />
                            </div>

                            {/* Washi Tape Accent */}
                            <div className="absolute -top-2 -right-2 z-20 pointer-events-none transform rotate-45">
                              <WashiTapeStrip color="kraft" className="w-8 h-2 text-[6px]" />
                            </div>

                            {/* Polaroid Frame */}
                            <div className="polaroid-frame bg-white p-2 pb-2.5 rounded-xs shadow-md border border-stone-200/60 relative z-10">
                              <div className="relative w-full aspect-[4/3] max-h-[175px] sm:max-h-[195px] bg-[#f5efe4] overflow-hidden group rounded-2xs border border-stone-200/60 flex items-center justify-center">
                                <img
                                  src={photo.url}
                                  alt={photo.caption || 'Memories'}
                                  style={{
                                    objectFit: photo.objectFit || 'cover',
                                    objectPosition: photo.objectPosition || 'center',
                                    transform: `scale(${photo.zoom || 1}) translate(${(photo.offsetX || 0) * 0.4}%, ${(photo.offsetY || 0) * 0.4}%)`
                                  }}
                                  className="w-full h-full transition-all duration-150"
                                />

                                {isEditMode && (
                                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center gap-1 transition-opacity opacity-0 group-hover:opacity-100 flex-wrap p-1">
                                    {/* Adjust Framing & Zoom modal */}
                                    <button
                                      onClick={() => setAdjustingPhoto({ sectionIndex: currentSpreadIndex - 1, photoIndex: 0, photo })}
                                      className="px-1.5 py-0.5 rounded-full bg-amber-800 hover:bg-amber-900 text-white text-[9px] font-semibold flex items-center gap-0.5 shadow-md cursor-pointer"
                                      title="Adjust photo framing, zoom & fit"
                                    >
                                      <Sliders className="w-2.5 h-2.5" />
                                      <span>Adjust</span>
                                    </button>

                                    {/* Quick Fit / Fill toggle */}
                                    <button
                                      onClick={() => handleTogglePhotoFit(currentSpreadIndex - 1, 0)}
                                      className="px-1.5 py-0.5 rounded-full bg-white text-stone-900 text-[9px] font-semibold flex items-center gap-0.5 shadow-md cursor-pointer hover:bg-stone-100"
                                      title={photo.objectFit === 'contain' ? 'Switch to Fill Frame' : 'Fit Entire Photo (No Cropping)'}
                                    >
                                      {photo.objectFit === 'contain' ? <Maximize className="w-2.5 h-2.5" /> : <Minimize className="w-2.5 h-2.5" />}
                                      <span>{photo.objectFit === 'contain' ? 'Fill' : 'Fit'}</span>
                                    </button>

                                    {/* Quick Vertical Framing Shift */}
                                    <button
                                      onClick={() => handleCyclePhotoPosition(currentSpreadIndex - 1, 0)}
                                      className="p-1 rounded-full bg-white text-stone-900 text-[9px] font-semibold shadow-md cursor-pointer hover:bg-stone-100"
                                      title="Cycle Top (Faces) / Center / Bottom framing"
                                    >
                                      <Move className="w-2.5 h-2.5" />
                                    </button>

                                    <button
                                      onClick={() => setEnhancingPhoto({ sectionIndex: currentSpreadIndex - 1, photoIndex: 0, photo })}
                                      className="p-1 rounded-full bg-emerald-800 text-white text-[9px] font-semibold shadow-md cursor-pointer hover:bg-emerald-900"
                                      title="Enhance with AI caption"
                                    >
                                      <Sparkles className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenPhotoPicker(currentSpreadIndex - 1, false, 0, 'swap')}
                                      className="p-1 rounded-full bg-white text-stone-900 text-[9px] font-semibold shadow-md cursor-pointer"
                                      title="Swap photo"
                                    >
                                      <Camera className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      onClick={() => handleRemovePhotoFromSection(currentSpreadIndex - 1, 0)}
                                      className="p-1 rounded-full bg-rose-700 hover:bg-rose-800 text-white text-[9px] font-semibold shadow-md cursor-pointer"
                                      title="Remove photo"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Caption */}
                              <div className="mt-1 text-center">
                                {isEditMode ? (
                                  <input
                                    type="text"
                                    value={photo.caption || 'Captured Memories ♡'}
                                    onChange={(e) => {
                                      const newPhotos = [...(currentSection.photos || [])];
                                      if (newPhotos[0]) {
                                        newPhotos[0].caption = e.target.value;
                                        updateCurrentSection({ photos: newPhotos });
                                      }
                                    }}
                                    className="w-full font-handwriting text-sm sm:text-base font-bold text-center text-[#2d2116] bg-transparent border-b border-dashed border-stone-300 focus:border-stone-600 focus:outline-none"
                                    placeholder="Photo caption ♡"
                                  />
                                ) : (
                                  <p className="font-handwriting text-sm sm:text-base font-bold text-center text-[#2d2116] tracking-wide">
                                    {photo.caption || 'Captured Memories ♡'}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Memory Quote underneath */}
                            <div className="my-1.5 text-center px-2">
                              <p className="font-hand-casual text-xs sm:text-[13px] text-[#403123] italic leading-relaxed">
                                "{currentSection.quote || 'Some memories stay bright even as seasons shift.'}"
                              </p>
                              <span className="font-handwriting text-stone-700 text-xs block mt-0.5 font-bold">♡</span>
                            </div>
                          </div>
                        );
                      }

                      if (validPhotos.length === 2) {
                        /* 2 PHOTOS: DUAL POLAROID COLLAGE SIDE-BY-SIDE (ADJUSTABLE FRAMING & FIT) */
                        return (
                          <div className="my-1 w-full max-w-[280px] sm:max-w-[310px] mx-auto">
                            <div className="flex items-center justify-center gap-2">
                              {validPhotos.map((photo, pIdx) => {
                                const isFirst = pIdx === 0;
                                const tilt = isFirst ? -2.5 : 2;
                                return (
                                  <div 
                                    key={photo.id || pIdx}
                                    className="relative flex-1 max-w-[135px] sm:max-w-[150px] transform transition-transform duration-300 hover:rotate-0 hover:z-20"
                                    style={{ transform: `rotate(${tilt}deg)` }}
                                  >
                                    {/* Paperclip or Washi Tape */}
                                    <div className={`absolute -top-2 ${isFirst ? 'left-1' : 'right-1'} z-30 pointer-events-none`}>
                                      {isFirst ? (
                                        <WashiTapeStrip color="kraft" className="w-8 h-2 text-[6px]" rotation={-4} />
                                      ) : (
                                        <PaperClip className="w-3.5 h-7" color="gold" />
                                      )}
                                    </div>

                                    {/* Frame */}
                                    <div className="polaroid-frame bg-white p-1 pb-1.5 rounded-xs shadow-md relative z-10">
                                      <div className="relative w-full aspect-square sm:aspect-[4/3] max-h-[110px] sm:max-h-[125px] bg-[#f5efe4] overflow-hidden group rounded-2xs border border-stone-200/60 flex items-center justify-center">
                                        <img
                                          src={photo.url}
                                          alt={photo.caption || `Photo ${pIdx + 1}`}
                                          style={{
                                            objectFit: photo.objectFit || 'cover',
                                            objectPosition: photo.objectPosition || 'center',
                                            transform: `scale(${photo.zoom || 1}) translate(${(photo.offsetX || 0) * 0.4}%, ${(photo.offsetY || 0) * 0.4}%)`
                                          }}
                                          className="w-full h-full transition-all duration-150"
                                        />
                                        {isEditMode && (
                                          <div className="absolute inset-0 bg-black/45 flex items-center justify-center gap-0.5 transition-opacity opacity-0 group-hover:opacity-100 flex-wrap p-1">
                                            {/* Adjust Modal */}
                                            <button
                                              onClick={() => setAdjustingPhoto({ sectionIndex: currentSpreadIndex - 1, photoIndex: pIdx, photo })}
                                              className="p-1 rounded-full bg-amber-800 text-white text-[8px] font-semibold cursor-pointer"
                                              title="Adjust framing & zoom"
                                            >
                                              <Sliders className="w-2.5 h-2.5" />
                                            </button>
                                            {/* Quick Fit Toggle */}
                                            <button
                                              onClick={() => handleTogglePhotoFit(currentSpreadIndex - 1, pIdx)}
                                              className="p-1 rounded-full bg-white text-stone-900 text-[8px] font-semibold cursor-pointer"
                                              title={photo.objectFit === 'contain' ? 'Fill Frame' : 'Fit Entire Photo'}
                                            >
                                              {photo.objectFit === 'contain' ? <Maximize className="w-2.5 h-2.5" /> : <Minimize className="w-2.5 h-2.5" />}
                                            </button>
                                            {/* AI Caption */}
                                            <button
                                              onClick={() => setEnhancingPhoto({ sectionIndex: currentSpreadIndex - 1, photoIndex: pIdx, photo })}
                                              className="p-1 rounded-full bg-emerald-800 text-white text-[8px] font-semibold cursor-pointer"
                                              title="AI Caption"
                                            >
                                              <Sparkles className="w-2.5 h-2.5" />
                                            </button>
                                            <button
                                              onClick={() => handleOpenPhotoPicker(currentSpreadIndex - 1, false, pIdx, 'swap')}
                                              className="p-1 rounded-full bg-white text-stone-900 text-[8px] font-semibold cursor-pointer"
                                              title="Swap photo"
                                            >
                                              <Camera className="w-2.5 h-2.5" />
                                            </button>
                                            <button
                                              onClick={() => handleRemovePhotoFromSection(currentSpreadIndex - 1, pIdx)}
                                              className="p-1 rounded-full bg-rose-700 text-white text-[8px] font-semibold cursor-pointer"
                                              title="Remove photo"
                                            >
                                              <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      {/* Caption */}
                                      <div className="mt-0.5 text-center px-0.5">
                                        {isEditMode ? (
                                          <input
                                            type="text"
                                            value={photo.caption || ''}
                                            onChange={(e) => {
                                              const newPhotos = [...(currentSection.photos || [])];
                                              if (newPhotos[pIdx]) {
                                                newPhotos[pIdx].caption = e.target.value;
                                                updateCurrentSection({ photos: newPhotos });
                                              }
                                            }}
                                            className="w-full font-handwriting text-[10.5px] text-center text-[#3a2e22] bg-transparent border-b border-dashed border-stone-300 focus:border-stone-600 focus:outline-none"
                                            placeholder="Caption ♡"
                                          />
                                        ) : (
                                          <p className="font-handwriting text-[10.5px] font-bold text-center text-[#3a2e22] truncate">
                                            {photo.caption || 'Memories ♡'}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Memory Quote underneath */}
                            <p className="font-hand-casual text-[10px] text-stone-600 italic text-center mt-1">
                              "{currentSection.quote || 'Some memories stay bright even as seasons shift.'}" <span className="font-handwriting text-stone-700">♡</span>
                            </p>
                          </div>
                        );
                      }

                      /* 3 PHOTOS: TRIO SCRAPBOOK COLLAGE (1 HERO + 2 STAGGERED MINI) */
                      return (
                        <div className="my-1 w-full max-w-[285px] sm:max-w-[315px] mx-auto">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Left Hero Photo */}
                            <div className="relative w-[135px] sm:w-[150px] transform -rotate-1.5 hover:rotate-0 transition-transform duration-300 z-10 shrink-0">
                              <div className="absolute -top-2 left-2 z-30 pointer-events-none">
                                <PaperClip className="w-3.5 h-7" color="gold" />
                              </div>
                              <div className="polaroid-frame bg-white p-1 pb-1.5 rounded-xs shadow-md">
                                <div className="relative w-full aspect-[4/5] sm:aspect-square max-h-[145px] sm:max-h-[160px] bg-[#f5efe4] overflow-hidden group rounded-2xs border border-stone-200/60 flex items-center justify-center">
                                  <img
                                    src={validPhotos[0].url}
                                    alt={validPhotos[0].caption || 'Hero memory'}
                                    style={{
                                      objectFit: validPhotos[0].objectFit || 'cover',
                                      objectPosition: validPhotos[0].objectPosition || 'center',
                                      transform: `scale(${validPhotos[0].zoom || 1}) translate(${(validPhotos[0].offsetX || 0) * 0.4}%, ${(validPhotos[0].offsetY || 0) * 0.4}%)`
                                    }}
                                    className="w-full h-full transition-all duration-150"
                                  />
                                  {isEditMode && (
                                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center gap-0.5 transition-opacity opacity-0 group-hover:opacity-100 flex-wrap p-1">
                                      <button
                                        onClick={() => setAdjustingPhoto({ sectionIndex: currentSpreadIndex - 1, photoIndex: 0, photo: validPhotos[0] })}
                                        className="p-1 rounded-full bg-amber-800 text-white text-[8px] cursor-pointer"
                                        title="Adjust framing & zoom"
                                      >
                                        <Sliders className="w-2.5 h-2.5" />
                                      </button>
                                      <button
                                        onClick={() => handleTogglePhotoFit(currentSpreadIndex - 1, 0)}
                                        className="p-1 rounded-full bg-white text-stone-900 text-[8px] cursor-pointer"
                                        title={validPhotos[0].objectFit === 'contain' ? 'Fill Frame' : 'Fit Entire Photo'}
                                      >
                                        {validPhotos[0].objectFit === 'contain' ? <Maximize className="w-2.5 h-2.5" /> : <Minimize className="w-2.5 h-2.5" />}
                                      </button>
                                      <button
                                        onClick={() => setEnhancingPhoto({ sectionIndex: currentSpreadIndex - 1, photoIndex: 0, photo: validPhotos[0] })}
                                        className="p-1 rounded-full bg-emerald-800 text-white text-[8px] cursor-pointer"
                                        title="AI Caption"
                                      >
                                        <Sparkles className="w-2.5 h-2.5" />
                                      </button>
                                      <button
                                        onClick={() => handleOpenPhotoPicker(currentSpreadIndex - 1, false, 0, 'swap')}
                                        className="p-1 rounded-full bg-white text-stone-900 text-[8px] cursor-pointer"
                                        title="Swap photo"
                                      >
                                        <Camera className="w-2.5 h-2.5" />
                                      </button>
                                      <button
                                        onClick={() => handleRemovePhotoFromSection(currentSpreadIndex - 1, 0)}
                                        className="p-1 rounded-full bg-rose-700 text-white text-[8px] cursor-pointer"
                                        title="Remove photo"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-0.5 text-center px-0.5">
                                  {isEditMode ? (
                                    <input
                                      type="text"
                                      value={validPhotos[0].caption || ''}
                                      onChange={(e) => {
                                        const newPhotos = [...(currentSection.photos || [])];
                                        if (newPhotos[0]) {
                                          newPhotos[0].caption = e.target.value;
                                          updateCurrentSection({ photos: newPhotos });
                                        }
                                      }}
                                      className="w-full font-handwriting text-[10px] text-center text-[#3a2e22] bg-transparent border-b border-dashed border-stone-300 focus:outline-none"
                                      placeholder="Caption ♡"
                                    />
                                  ) : (
                                    <p className="font-handwriting text-[10px] font-bold text-center text-[#3a2e22] truncate">
                                      {validPhotos[0].caption || 'Memories ♡'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right Stack: 2 Mini Polaroids */}
                            <div className="flex flex-col gap-1 w-[115px] sm:w-[125px] shrink-0">
                              {[validPhotos[1], validPhotos[2]].map((photo, miniIdx) => {
                                const realIdx = miniIdx + 1;
                                const tilt = miniIdx === 0 ? 2 : -1.5;
                                return (
                                  <div 
                                    key={photo.id || realIdx}
                                    className="relative transform transition-transform duration-300 hover:rotate-0 hover:z-20"
                                    style={{ transform: `rotate(${tilt}deg)` }}
                                  >
                                    <div className="polaroid-frame bg-white p-0.5 pb-1 rounded-xs shadow-sm">
                                      <div className="relative w-full h-14 sm:h-16 bg-[#f5efe4] overflow-hidden group rounded-2xs border border-stone-200/60 flex items-center justify-center">
                                        <img
                                          src={photo.url}
                                          alt={photo.caption || `Snap ${realIdx}`}
                                          style={{
                                            objectFit: photo.objectFit || 'cover',
                                            objectPosition: photo.objectPosition || 'center',
                                            transform: `scale(${photo.zoom || 1}) translate(${(photo.offsetX || 0) * 0.4}%, ${(photo.offsetY || 0) * 0.4}%)`
                                          }}
                                          className="w-full h-full transition-all duration-150"
                                        />
                                        {isEditMode && (
                                          <div className="absolute inset-0 bg-black/45 flex items-center justify-center gap-0.5 transition-opacity opacity-0 group-hover:opacity-100 flex-wrap p-0.5">
                                            <button
                                              onClick={() => setAdjustingPhoto({ sectionIndex: currentSpreadIndex - 1, photoIndex: realIdx, photo })}
                                              className="p-0.5 rounded-full bg-amber-800 text-white cursor-pointer"
                                              title="Adjust framing & zoom"
                                            >
                                              <Sliders className="w-2 h-2" />
                                            </button>
                                            <button
                                              onClick={() => handleTogglePhotoFit(currentSpreadIndex - 1, realIdx)}
                                              className="p-0.5 rounded-full bg-white text-stone-900 cursor-pointer"
                                              title={photo.objectFit === 'contain' ? 'Fill Frame' : 'Fit Entire Photo'}
                                            >
                                              {photo.objectFit === 'contain' ? <Maximize className="w-2 h-2" /> : <Minimize className="w-2 h-2" />}
                                            </button>
                                            <button
                                              onClick={() => handleOpenPhotoPicker(currentSpreadIndex - 1, false, realIdx, 'swap')}
                                              className="p-0.5 rounded-full bg-white text-stone-900 cursor-pointer"
                                              title="Swap photo"
                                            >
                                              <Camera className="w-2 h-2" />
                                            </button>
                                            <button
                                              onClick={() => handleRemovePhotoFromSection(currentSpreadIndex - 1, realIdx)}
                                              className="p-0.5 rounded-full bg-rose-700 text-white cursor-pointer"
                                              title="Remove photo"
                                            >
                                              <Trash2 className="w-2 h-2" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      <div className="mt-0.5 text-center px-0.5">
                                        {isEditMode ? (
                                          <input
                                            type="text"
                                            value={photo.caption || ''}
                                            onChange={(e) => {
                                              const newPhotos = [...(currentSection.photos || [])];
                                              if (newPhotos[realIdx]) {
                                                newPhotos[realIdx].caption = e.target.value;
                                                updateCurrentSection({ photos: newPhotos });
                                              }
                                            }}
                                            className="w-full font-handwriting text-[9px] text-center text-[#3a2e22] bg-transparent border-b border-dashed border-stone-200 focus:outline-none"
                                            placeholder="Snap ♡"
                                          />
                                        ) : (
                                          <p className="font-handwriting text-[9px] font-bold text-center text-[#3a2e22] truncate">
                                            {photo.caption || 'Snap ♡'}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Memory Quote underneath */}
                          <p className="font-hand-casual text-[10px] text-stone-600 italic text-center mt-1">
                            "{currentSection.quote || 'Some memories stay bright even as seasons shift.'}" <span className="font-handwriting text-stone-700">♡</span>
                          </p>
                        </div>
                      );
                    })()}

                    {/* Voice Memos / Audio Notes with Recording & Story Narrator (Limit 2 as per Page Size) */}
                    <div className="w-full max-w-[280px] sm:max-w-[310px] mx-auto shrink-0 my-1">
                      <ScrapbookVoiceNote
                        audioNotes={currentSection.audioNotes}
                        audioData={currentSection.audioNote}
                        narrativeText={currentSection.narrative || ''}
                        chapterTitle={currentSection.heading || `Chapter ${currentSpreadIndex}`}
                        isEditMode={isEditMode}
                        onUpdateAudioNotes={(nextNotes) => {
                          updateCurrentSection({
                            audioNotes: nextNotes,
                            audioNote: nextNotes[0] || undefined
                          });
                        }}
                        onUpdateAudio={(audioData) => {
                          updateCurrentSection({
                            audioNote: audioData,
                            audioNotes: audioData ? [audioData] : []
                          });
                        }}
                      />
                    </div>

                    {/* Gemini AI Heartfelt Reflection (Natural Scrapbook Torn Note with Brass Pin & Floral Accent) */}
                    <div className="w-full max-w-[280px] sm:max-w-[310px] mx-auto shrink-0 my-1">
                      <GeminiParchmentCard
                        insight={currentSection.geminiReflectionNote?.insight || 'Your memories radiate a deep sense of presence and quiet wonder. Cherish this stillness.'}
                        className="w-full"
                      />
                    </div>

                    {/* Bottom Right Page Number */}
                    <div className="flex items-center justify-end pt-1 shrink-0">
                      <span className="font-handwriting text-xs text-stone-500 font-bold tracking-wider">
                        — Page {currentSpreadIndex * 2} 🪶 —
                      </span>
                    </div>

                  </div>

                </div>

                {/* PROTRUDING REALISTIC BOOK TABS ON RIGHT EDGE (CH 1 to CH N) */}
                <div className="absolute right-0 top-5 bottom-5 flex flex-col justify-around">
                  <SideBookTabs
                    totalChapters={totalSpreads}
                    activeChapter={currentSpreadIndex}
                    onSelectChapter={(chNum) => setCurrentSpreadIndex(chNum)}
                  />
                </div>

              </div>

              {/* FLOATING BOTTOM PRIMARY NAVIGATION BAR */}
              <div className="flex items-center justify-center gap-2.5 mt-2 z-30 shrink-0">
                <button
                  onClick={() => setCurrentSpreadIndex((p) => Math.max(0, p - 1))}
                  disabled={currentSpreadIndex === 0}
                  className="flex items-center gap-1 px-3.5 py-1 rounded-full bg-white/95 hover:bg-white text-stone-800 border border-[#d9cfbf] text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none hover:scale-105"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {/* Center Chapter & Cover Selector */}
                <button
                  onClick={() => setShowChapterManager(true)}
                  className="flex items-center gap-1 bg-white/90 hover:bg-white backdrop-blur-xs px-3 py-0.5 rounded-full border border-[#d9cfbf] text-xs font-serif font-bold text-stone-700 shadow-2xs transition-all cursor-pointer hover:border-amber-700"
                  title="Click to view and manage all chapters"
                >
                  <Bookmark className="w-3 h-3 text-amber-700" />
                  <span>{currentSpreadIndex === 0 ? 'View Cover' : `Chapter ${currentSpreadIndex} of ${totalSpreads}`}</span>
                </button>

                <button
                  onClick={() => setCurrentSpreadIndex((p) => Math.min(totalSpreads, p + 1))}
                  disabled={currentSpreadIndex === totalSpreads}
                  className="flex items-center gap-1 px-3.5 py-1 rounded-full bg-white/95 hover:bg-white text-stone-800 border border-[#d9cfbf] text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none hover:scale-105"
                  title="Next Page"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )
        )}

      </main>

      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Chapter Manager Modal */}
      <ChapterManagerModal
        isOpen={showChapterManager}
        sections={scrapbook.sections}
        currentSpreadIndex={currentSpreadIndex}
        onClose={() => setShowChapterManager(false)}
        onSelectChapter={(idx) => setCurrentSpreadIndex(idx)}
        onDeleteChapter={(idx) => handleDeleteChapter(idx)}
        onAddChapter={handleAddNewChapter}
        onCleanDuplicates={handleCleanDuplicateChapters}
      />

      {/* Enhancer Modal */}
      {enhancingPhoto && (
        <ScrapbookEnhanceModal
          photo={enhancingPhoto.photo}
          onClose={() => setEnhancingPhoto(null)}
          onApplyCaption={(newCaption) => {
            const secIndex = enhancingPhoto.sectionIndex;
            const newSections = [...scrapbook.sections];
            if (newSections[secIndex]?.photos[enhancingPhoto.photoIndex]) {
              newSections[secIndex].photos[enhancingPhoto.photoIndex].caption = newCaption;
              updateScrapbookState({ sections: newSections });
            }
            setEnhancingPhoto(null);
          }}
        />
      )}

      {/* Photo Adjust Modal (Fit, Zoom, Framing offset) */}
      {adjustingPhoto && (
        <PhotoAdjustModal
          isOpen={true}
          photo={adjustingPhoto.photo}
          onClose={() => setAdjustingPhoto(null)}
          onSave={(adjusted) => {
            handleSaveAdjustedPhoto(adjusted);
            setAdjustingPhoto(null);
          }}
        />
      )}

      {/* Story Assistant Modal */}
      {showStoryAssistant && (
        <ScrapbookStoryAssistantModal
          scrapbook={scrapbook}
          onClose={() => setShowStoryAssistant(false)}
          onApplyImprovements={(improvedScrapbook) => {
            updateScrapbookState(improvedScrapbook);
            setShowStoryAssistant(false);
          }}
        />
      )}

      {/* Photo Picker Modal */}
      <PhotoPickerModal
        isOpen={isPhotoPickerOpen}
        onClose={() => {
          setIsPhotoPickerOpen(false);
          setPhotoPickerTarget(null);
        }}
        onSelectPhoto={handlePhotoSelected}
        title={photoPickerTarget?.isCover ? 'Choose Album Cover Photo' : `Choose Photo for Chapter ${photoPickerTarget ? photoPickerTarget.sectionIndex + 1 : ''}`}
      />

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          isDestructive={confirmDialog.isDestructive}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

    </div>
  );
}


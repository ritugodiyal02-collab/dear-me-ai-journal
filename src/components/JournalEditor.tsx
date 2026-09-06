import React, { useState, useEffect, useRef } from 'react';
import { 
  JournalReflection, 
  ChatMessage, 
  AIMode,
  JournalImage,
  AudioNote,
  ScrapbookCoverColor
} from '../types';
import { 
  Sparkles, 
  Save, 
  Send, 
  Lightbulb, 
  ListChecks, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Check, 
  Sparkle, 
  MessageSquare, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Pencil, 
  Bold, 
  Italic, 
  Underline,
  List, 
  ListOrdered, 
  Link2, 
  Image as ImageIcon, 
  ThumbsUp, 
  ThumbsDown, 
  Bookmark, 
  ArrowRight, 
  Sprout, 
  Heart, 
  BookOpen,
  Volume2,
  Cloud,
  Mic,
  Sun,
  RotateCcw,
  GripVertical,
  Plus,
  Trash2,
  Play,
  Pause,
  X,
  Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { MediaGallery, compressImageFile } from './MediaGallery';
import { AudioRecorder } from './AudioRecorder';
import { ScrapbookEnhanceModal } from './ScrapbookEnhanceModal';

interface JournalEditorProps {
  reflection: JournalReflection;
  onSave: (reflection: JournalReflection) => Promise<boolean>;
  onCreateStory?: (storyDraft: any) => void;
  userId: string;
  userDisplayName?: string;
  isSaving: boolean;
  lastSaveError: string | null;
  onRetrySave: () => void;
}

export function JournalEditor({
  reflection,
  onSave,
  onCreateStory,
  userId,
  userDisplayName,
  isSaving,
  lastSaveError,
  onRetrySave
}: JournalEditorProps) {
  // Local state
  const [title, setTitle] = useState(reflection.title);
  const [content, setContent] = useState(reflection.content);
  const [mode, setMode] = useState<AIMode>(reflection.mode || 'reflect');
  const [tags, setTags] = useState<string[]>(reflection.tags || []);
  const [images, setImages] = useState<JournalImage[]>(reflection.images || []);
  const [audioNotes, setAudioNotes] = useState<AudioNote[]>(reflection.audioNotes || []);
  const [messages, setMessages] = useState<ChatMessage[]>(reflection.messages || []);
  const [chatInput, setChatInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [summary, setSummary] = useState(reflection.summary || '');
  const [keyInsights, setKeyInsights] = useState<string[]>(reflection.keyInsights || []);
  const [actionItems, setActionItems] = useState<string[]>(reflection.actionItems || []);
  const [lastModelUsed, setLastModelUsed] = useState(reflection.lastModelUsed || 'gemini-3.8-flash');
  const [companionTab, setCompanionTab] = useState<'chat' | 'insights'>('chat');
  const [editorTab, setEditorTab] = useState<'text' | 'media' | 'audio'>('text');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [promptSetIndex, setPromptSetIndex] = useState(0);
  const [enhancingPhoto, setEnhancingPhoto] = useState<JournalImage | null>(null);
  const [likedMessages, setLikedMessages] = useState<Record<string, boolean>>({});
  const [dislikedMessages, setDislikedMessages] = useState<Record<string, boolean>>({});
  const [bookmarkedMessages, setBookmarkedMessages] = useState<Record<string, boolean>>({});
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const quickAudioRef = useRef<HTMLAudioElement | null>(null);

  const audioNotesRef = useRef<AudioNote[]>(audioNotes);
  const imagesRef = useRef<JournalImage[]>(images);

  useEffect(() => {
    audioNotesRef.current = audioNotes;
  }, [audioNotes]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const toggleQuickAudio = (note: AudioNote) => {
    const src = note.url || note.base64;
    if (!src) return;

    if (playingAudioId === note.id) {
      quickAudioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (quickAudioRef.current) {
        quickAudioRef.current.pause();
      }
      const audio = new Audio(src);
      quickAudioRef.current = audio;
      audio.onended = () => setPlayingAudioId(null);
      audio.play().catch((e) => console.warn('Audio play notice:', e));
      setPlayingAudioId(note.id);
    }
  };

  // Expandable & Stretchable Gemini Chat State
  const [chatWidth, setChatWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('dearme_chat_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 280 && parsed <= 900) {
          return parsed;
        }
      }
    } catch {
      // LocalStorage access fallback
    }
    return 380;
  });
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [isDraggingChat, setIsDraggingChat] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef<number>(0);
  const dragStartWidthRef = useRef<number>(chatWidth);
  const journalPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const handleQuickPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const newItems: JournalImage[] = [];
    for (const file of validFiles) {
      try {
        const { base64, mimeType } = await compressImageFile(file);
        newItems.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          url: base64,
          name: file.name,
          mimeType,
          caption: ''
        });
      } catch (err) {
        console.error('Photo compress error:', err);
      }
    }
    if (newItems.length > 0) {
      handleAddImages(newItems);
    }
    e.target.value = '';
  };

  // Synchronize dynamic stretching & resizing via mouse and touch
  useEffect(() => {
    if (!isDraggingChat) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Gemini Chat is on the right side: dragging to the left increases its width
      const deltaX = dragStartXRef.current - e.clientX;
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
      const minW = 280;
      const maxW = Math.max(minW, Math.min(850, containerWidth - 300));
      const nextW = Math.max(minW, Math.min(maxW, Math.round(dragStartWidthRef.current + deltaX)));
      
      setChatWidth(nextW);
      setIsChatExpanded(false);
      try {
        localStorage.setItem('dearme_chat_width', String(nextW));
      } catch {
        // Ignored
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const deltaX = dragStartXRef.current - e.touches[0].clientX;
        const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
        const minW = 280;
        const maxW = Math.max(minW, Math.min(850, containerWidth - 300));
        const nextW = Math.max(minW, Math.min(maxW, Math.round(dragStartWidthRef.current + deltaX)));

        setChatWidth(nextW);
        setIsChatExpanded(false);
        try {
          localStorage.setItem('dearme_chat_width', String(nextW));
        } catch {
          // Ignored
        }
      }
    };

    const handleDragEnd = () => {
      setIsDraggingChat(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingChat]);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingChat(true);
    dragStartXRef.current = e.clientX;
    const currentW = isChatExpanded
      ? Math.min(760, Math.max(540, ((containerRef.current?.offsetWidth || 1100) * 0.52)))
      : chatWidth;
    dragStartWidthRef.current = currentW;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDraggingChat(true);
      dragStartXRef.current = e.touches[0].clientX;
      const currentW = isChatExpanded
        ? Math.min(760, Math.max(540, ((containerRef.current?.offsetWidth || 1100) * 0.52)))
        : chatWidth;
      dragStartWidthRef.current = currentW;
      document.body.style.userSelect = 'none';
    }
  };

  const handleResetChatWidth = () => {
    setChatWidth(380);
    setIsChatExpanded(false);
    try {
      localStorage.setItem('dearme_chat_width', '380');
    } catch {
      // Ignored
    }
  };

  const handleToggleExpandChat = () => {
    setIsChatExpanded((prev) => !prev);
  };

  // Sync state when selected reflection changes
  useEffect(() => {
    setTitle(reflection.title || '');
    setContent(reflection.content || '');
    setMode(reflection.mode || 'reflect');
    setTags(reflection.tags || []);
    const initialImgs = reflection.images || [];
    setImages(initialImgs);
    imagesRef.current = initialImgs;
    const initialAudio = reflection.audioNotes || [];
    setAudioNotes(initialAudio);
    audioNotesRef.current = initialAudio;
    setMessages(reflection.messages || []);
    setSummary(reflection.summary || '');
    setKeyInsights(reflection.keyInsights || []);
    setActionItems(reflection.actionItems || []);
    setLastModelUsed(reflection.lastModelUsed || 'gemini-3.8-flash');
    setGenerationError(null);
  }, [reflection.id]);

  // Auto-scroll chat when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Auto-resize textarea to prevent nested scroll-trapping and overlapping
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(220, textareaRef.current.scrollHeight)}px`;
    }
  }, [content, editorTab]);

  // Reflection prompts sets
  const reflectionPromptSets = [
    [
      { id: '1', icon: Sprout, color: 'text-emerald-700', text: "What's bringing me joy right now?" },
      { id: '2', icon: Heart, color: 'text-rose-500', text: "What am I most grateful for today?" },
      { id: '3', icon: Sparkles, color: 'text-amber-500', text: "What did I learn about myself recently?" }
    ],
    [
      { id: '4', icon: Heart, color: 'text-rose-500', text: "What emotions am I experiencing today?" },
      { id: '5', icon: Sprout, color: 'text-emerald-700', text: "What would bring me peace of mind right now?" },
      { id: '6', icon: Sparkles, color: 'text-amber-500', text: "What is a small victory worth celebrating?" }
    ],
    [
      { id: '7', icon: Sparkles, color: 'text-amber-500', text: "What belief is holding me back today?" },
      { id: '8', icon: Sprout, color: 'text-emerald-700', text: "How can I be kinder to myself this week?" },
      { id: '9', icon: Heart, color: 'text-rose-500', text: "Who or what inspired me recently?" }
    ]
  ];

  // Manual or Triggered Save with clean payload
  const handleSaveDocument = async (override?: Partial<JournalReflection>) => {
    const updated: JournalReflection = {
      id: reflection.id,
      userId: userId || reflection.userId || 'user',
      title: title.trim() || 'Untitled Reflection',
      content: content || '',
      mode: mode || 'reflect',
      tags: tags || [],
      images: override?.images !== undefined ? override.images : imagesRef.current,
      audioNotes: override?.audioNotes !== undefined ? override.audioNotes : audioNotesRef.current,
      messages: messages || [],
      summary: summary || '',
      keyInsights: keyInsights || [],
      actionItems: actionItems || [],
      lastModelUsed: lastModelUsed || 'gemini-3.8-flash',
      createdAt: reflection.createdAt || Date.now(),
      updatedAt: Date.now(),
      ...override
    };
    return await onSave(updated);
  };

  // Media Handlers
  const handleAddImages = (newImgs: JournalImage[]) => {
    const nextImgs = [...imagesRef.current, ...newImgs];
    imagesRef.current = nextImgs;
    setImages(nextImgs);
    handleSaveDocument({ images: nextImgs });
  };

  const handleRemoveImage = (imgId: string) => {
    const nextImgs = imagesRef.current.filter(img => img.id !== imgId);
    imagesRef.current = nextImgs;
    setImages(nextImgs);
    handleSaveDocument({ images: nextImgs });
  };

  const handleUpdateImageCaption = (imgId: string, caption: string) => {
    const nextImgs = imagesRef.current.map(img => img.id === imgId ? { ...img, caption } : img);
    imagesRef.current = nextImgs;
    setImages(nextImgs);
    handleSaveDocument({ images: nextImgs });
  };

  // Audio Note Handlers
  const handleAddAudioNote = (newNote: AudioNote) => {
    const nextNotes = [...audioNotesRef.current.filter(n => n.id !== newNote.id), newNote];
    audioNotesRef.current = nextNotes;
    setAudioNotes(nextNotes);
    handleSaveDocument({ audioNotes: nextNotes });
  };

  const handleRemoveAudioNote = (noteId: string) => {
    const nextNotes = audioNotesRef.current.filter(n => n.id !== noteId);
    audioNotesRef.current = nextNotes;
    setAudioNotes(nextNotes);
    handleSaveDocument({ audioNotes: nextNotes });
  };

  const handleUpdateAudioNote = (noteId: string, updates: Partial<AudioNote>) => {
    const nextNotes = audioNotesRef.current.map(n => n.id === noteId ? { ...n, ...updates } : n);
    audioNotesRef.current = nextNotes;
    setAudioNotes(nextNotes);
    handleSaveDocument({ audioNotes: nextNotes });
  };

  // Rich Text Formatting helper
  const applyFormat = (formatType: 'bold' | 'italic' | 'underline' | 'bullet' | 'number' | 'link') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    let replacement = '';
    let newCursorPos = start;

    switch (formatType) {
      case 'bold':
        replacement = `**${selectedText || 'bold text'}**`;
        newCursorPos = selectedText ? end + 4 : start + 2;
        break;
      case 'italic':
        replacement = `*${selectedText || 'italic text'}*`;
        newCursorPos = selectedText ? end + 2 : start + 1;
        break;
      case 'underline':
        replacement = `<u>${selectedText || 'underlined text'}</u>`;
        newCursorPos = selectedText ? end + 7 : start + 3;
        break;
      case 'bullet':
        replacement = `\n- ${selectedText || 'List item'}\n`;
        newCursorPos = start + 3;
        break;
      case 'number':
        replacement = `\n1. ${selectedText || 'First item'}\n`;
        newCursorPos = start + 4;
        break;
      case 'link':
        replacement = `[${selectedText || 'link description'}](https://)`;
        newCursorPos = start + (selectedText ? selectedText.length + 3 : 18);
        break;
    }

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    handleSaveDocument({ content: newContent });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Dedicated Reset for Gemini Companion Chat (Resolves user confusion with "New Reflection")
  const handleClearChat = () => {
    setMessages([]);
    handleSaveDocument({ messages: [] });
  };

  // Send Multimodal Reflection Request to Gemini
  const handleTriggerReflection = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || chatInput).trim();
    if (!content.trim() && !promptToSend && images.length === 0 && audioNotes.length === 0) return;
    if (isGenerating) return;

    setGenerationError(null);
    setChatInput('');
    setCompanionTab('chat');

    const effectivePrompt = promptToSend || (
      mode === 'brainstorm' 
        ? 'Please brainstorm fresh perspectives and creative possibilities based on my reflection.'
        : mode === 'action_plan'
        ? 'Please identify clear, actionable next milestones from my journal entry.'
        : 'Please reflect deeply on what I have written, my photos, and voice notes with empathy and warmth.'
    );

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: effectivePrompt,
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reflection: {
            title,
            content,
            mode,
            images,
            audioNotes
          },
          messages: newMessages,
          customPrompt: effectivePrompt,
          userId
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();

      if (data && data.text) {
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now()}_a`,
          role: 'assistant',
          content: data.text,
          timestamp: Date.now(),
          modelUsed: data.modelUsed
        };

        const updatedHistory = [...newMessages, assistantMessage];
        setMessages(updatedHistory);
        if (data.modelUsed) setLastModelUsed(data.modelUsed);

        await handleSaveDocument({
          messages: updatedHistory,
          lastModelUsed: data.modelUsed || lastModelUsed
        });
      } else {
        throw new Error('No response text received from Gemini reflection service.');
      }
    } catch (err: any) {
      console.error('Reflection AI generation failed:', err);
      setGenerationError('Gemini is momentarily resting. Please try asking again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Synthesis Handler
  const handleSynthesize = async () => {
    if ((!content.trim() && messages.length === 0) || isSynthesizing) return;
    setIsSynthesizing(true);
    setGenerationError(null);

    try {
      const response = await fetch('/api/ai/reflection-synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          messages,
          images,
          audioNotes,
          userId
        })
      });

      if (!response.ok) {
        throw new Error(`Synthesis failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data) {
        const newSummary = data.summary || '';
        const newInsights = Array.isArray(data.keyInsights) ? data.keyInsights : [];
        const newActions = Array.isArray(data.actionItems) ? data.actionItems : [];

        setSummary(newSummary);
        setKeyInsights(newInsights);
        setActionItems(newActions);
        setCompanionTab('insights');

        await handleSaveDocument({
          summary: newSummary,
          keyInsights: newInsights,
          actionItems: newActions
        });
      }
    } catch (err: any) {
      console.error('Synthesis failed:', err);
      setGenerationError('Could not generate insights right now. Please try again.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Convert Reflection into Story Album
  const handleCreateStoryFromReflection = async () => {
    if (isCreatingStory) return;
    setIsCreatingStory(true);

    try {
      let storyData: any = null;

      // 1. Try calling the backend story creation endpoint with fallback
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch('/api/gemini/create-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            title: title.trim() || 'Untitled Reflection',
            content: content.trim() || title.trim(),
            journalText: content.trim() || title.trim(),
            images,
            audioNotes,
            audioTranscripts: audioNotes.map(a => a.transcript).filter(Boolean),
            summary: summary || '',
            reflectionSummary: summary || '',
            theme: 'parchment',
            userId
          })
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data && data.story) {
            storyData = data.story;
          }
        }
      } catch (fetchErr) {
        console.warn('Backend story endpoint unreachable or timed out, generating story draft directly:', fetchErr);
      }

      // 2. If backend was unavailable or returned empty, synthesize an instant aesthetic story draft
      if (!storyData) {
        const paragraphs = (content || '')
          .split(/\n\s*\n/)
          .map(p => p.trim())
          .filter(p => p.length > 0);

        const sectionsList = [];
        if (paragraphs.length >= 2) {
          sectionsList.push({
            heading: 'Moments Captured',
            narrative: paragraphs.slice(0, Math.ceil(paragraphs.length / 2)).join('\n\n'),
            quote: summary || 'Every moment holds its own quiet light.',
            transition: 'Moving through the rhythm of reflection.',
            photoIndices: images.slice(0, Math.ceil(images.length / 2)).map((_, i) => i),
            layout: 'polaroid'
          });
          sectionsList.push({
            heading: 'Insights & Presence',
            narrative: paragraphs.slice(Math.ceil(paragraphs.length / 2)).join('\n\n'),
            quote: 'A quiet reminder of what matters most.',
            transition: 'Carrying this clarity forward.',
            photoIndices: images.slice(Math.ceil(images.length / 2)).map((_, i) => i + Math.ceil(images.length / 2)),
            layout: 'polaroid'
          });
        } else {
          sectionsList.push({
            heading: title ? `Reflections on ${title}` : 'The Journey in Words',
            narrative: content || 'Moments and lessons preserved in stillness.',
            quote: summary || 'Every experience holds its own light.',
            transition: 'Carrying this clarity forward.',
            photoIndices: images.map((_, i) => i),
            layout: 'polaroid'
          });
        }

        storyData = {
          title: title || 'Memories & Reflections',
          subtitle: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          introduction: summary || (content.slice(0, 180) + (content.length > 180 ? '...' : '')) || 'Moments that shaped the journey.',
          theme: 'parchment',
          sections: sectionsList
        };
      }

      // 3. Map sections and attach photos & voice notes cleanly
      const structuredSections = (storyData.sections || []).map((sec: any, sIdx: number) => {
        let sectionPhotos: any[] = [];
        if (images.length > 0) {
          if (Array.isArray(sec.photoIndices) && sec.photoIndices.length > 0) {
            sectionPhotos = sec.photoIndices
              .map((idx: number, pIdx: number) => {
                const img = images[idx];
                if (!img) return null;
                return {
                  id: `photo_${Date.now()}_${sIdx}_${pIdx}`,
                  url: img.url,
                  caption: sec.photoCaptions?.[pIdx] || img.caption || 'Captured moment ♡',
                  rotation: (pIdx % 2 === 0 ? -1 : 1) * 2,
                  tapeStyle: 'paperclip' as const,
                  polaroidCaptionStyle: 'handwritten' as const
                };
              })
              .filter(Boolean);
          }
          if (sectionPhotos.length === 0) {
            const photosPerSection = Math.max(1, Math.ceil(images.length / Math.max(1, (storyData.sections || []).length)));
            const start = sIdx * photosPerSection;
            const slice = images.slice(start, start + photosPerSection);
            sectionPhotos = (slice.length > 0 ? slice : images.slice(0, 2)).map((img, pIdx) => ({
              id: `photo_${Date.now()}_${sIdx}_${pIdx}`,
              url: img.url,
              caption: img.caption || 'Captured moment ♡',
              rotation: (pIdx % 2 === 0 ? -1 : 1) * 2,
              tapeStyle: 'paperclip' as const,
              polaroidCaptionStyle: 'handwritten' as const
            }));
          }
        }

        const attachedAudio = audioNotes[sIdx] || (sIdx === 0 ? audioNotes[0] : undefined);
        const sectionAudio = attachedAudio ? {
          url: attachedAudio.url,
          transcript: attachedAudio.transcript,
          duration: attachedAudio.duration || 60,
          label: attachedAudio.transcript ? `Voice Note: ${attachedAudio.transcript.slice(0, 35)}...` : 'Voice Reflection ♡',
          memoStickyNote: `Audio memo: ${attachedAudio.transcript?.slice(0, 45) || 'Spoken reflection'}... ♡`
        } : undefined;

        return {
          id: `sec_${Date.now()}_${sIdx}`,
          chapterNumber: sIdx + 1,
          heading: sec.heading || `Chapter ${sIdx + 1}: Reflections ♡`,
          narrative: sec.narrative || content || '',
          quote: sec.quote || summary || 'Every moment holds its own quiet light.',
          transition: sec.transition || '',
          photos: sectionPhotos,
          audioNote: sectionAudio,
          stickyNotes: [
            {
              id: `sn_${Date.now()}_${sIdx}`,
              text: sec.quote || 'A memory worth holding close ✨',
              color: sIdx % 2 === 0 ? ('yellow' as const) : ('pink' as const),
              rotation: sIdx % 2 === 0 ? -2 : 2
            }
          ],
          geminiReflectionNote: {
            insight: summary || 'Reflecting on your journey brings clarity, gratitude, and presence.',
            sparkle: true
          },
          layout: 'polaroid' as const
        };
      });

      const coverColors: ScrapbookCoverColor[] = ['olive-green', 'tan-leather', 'dusty-rose', 'deep-teal', 'vintage-brown', 'ocean-blue'];
      const randomCoverColor = coverColors[Math.floor(Math.random() * coverColors.length)];

      const newScrapbookDraft = {
        id: `scrapbook_${Date.now()}`,
        userId,
        title: storyData.title || title || 'Memories & Reflections',
        subtitle: storyData.subtitle || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        introduction: storyData.introduction || summary || (content.slice(0, 200) || 'Moments captured in quiet reflection.'),
        theme: 'parchment' as const,
        coverColor: randomCoverColor,
        category: 'Personal' as const,
        date: storyData.date || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        location: storyData.location || '',
        quotePill: 'Collect moments, not things. ♡',
        tabs: ['MEMORIES', 'PEOPLE', 'NOTES'],
        coverImage: images[0]?.url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
        sourceReflectionId: reflection.id,
        sections: structuredSections.length > 0 ? structuredSections : [
          {
            id: `sec_${Date.now()}`,
            chapterNumber: 1,
            heading: 'Chapter 1: The Reflection ♡',
            narrative: content || 'Moments and lessons preserved in stillness.',
            quote: summary || 'Every experience holds its own light.',
            transition: 'Carrying this clarity forward.',
            photos: images.map((img, i) => ({
              id: `photo_${i}`,
              url: img.url,
              caption: img.caption || 'Moment captured ♡',
              rotation: 0,
              tapeStyle: 'paperclip' as const,
              polaroidCaptionStyle: 'handwritten' as const
            })),
            stickyNotes: [
              {
                id: `sn_init_${Date.now()}`,
                text: 'Stepping into this reflection with peace ✨',
                color: 'yellow' as const,
                rotation: -2
              }
            ],
            geminiReflectionNote: {
              insight: 'Your words hold presence and honesty. Cherish these insights.',
              sparkle: true
            },
            layout: 'polaroid' as const
          }
        ],
        tags: tags || [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      if (onCreateStory) {
        onCreateStory(newScrapbookDraft);
      }
    } catch (err) {
      console.error('Create story failed:', err);
    } finally {
      setIsCreatingStory(false);
    }
  };

  const hasInsights = Boolean(summary || keyInsights.length > 0 || actionItems.length > 0);

  return (
    <div 
      ref={containerRef}
      className={`flex-1 flex gap-2.5 sm:gap-3.5 h-full min-h-0 overflow-hidden min-w-0 ${
        isDraggingChat ? 'select-none' : ''
      }`}
    >
      
      {/* ============================================================ */}
      {/* CENTER COLUMN CARD: Clean Floating Journal Editor Card       */}
      {/* ============================================================ */}
      <div className="flex-1 h-full bg-white rounded-2xl border border-stone-200/80 shadow-2xs flex flex-col min-h-0 overflow-hidden min-w-0">
        
        {/* 1. Header: Fixed at top with Editable Title, Status, and Story Album Action */}
        <div className="shrink-0 p-5 sm:p-6 pb-3.5 border-b border-stone-100 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <input
              id="reflection-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleSaveDocument()}
              placeholder="Untitled Reflection"
              className="font-serif font-bold text-2xl sm:text-3xl text-stone-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full placeholder:text-stone-300"
            />
            <div className="flex items-center gap-2 text-xs text-stone-400 mt-1">
              <span>
                {new Date(reflection.updatedAt || reflection.createdAt || Date.now()).toLocaleDateString('en-GB', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </span>
              <span>•</span>
              <div className="flex items-center gap-1.5 text-stone-600 font-medium">
                <Cloud className="w-3.5 h-3.5 text-[#3f5241]" />
                <span>{isSaving ? 'Saving...' : lastSaveError ? 'Save Failed' : 'Saved in Cloud'}</span>
              </div>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="create-story-album-button"
              onClick={handleCreateStoryFromReflection}
              disabled={isCreatingStory}
              title="Transform this reflection into an aesthetic Story Scrapbook album"
              className="px-3.5 py-1.5 rounded-full bg-[#f2f6f1] hover:bg-[#e4ede2] text-[#2d4530] text-xs font-semibold border border-[#dce8da] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-60"
            >
              {isCreatingStory ? (
                <Loader2 className="w-3.5 h-3.5 text-[#3f5241] animate-spin" />
              ) : (
                <BookOpen className="w-3.5 h-3.5 text-[#3f5241]" />
              )}
              <span className="font-medium whitespace-nowrap">
                {isCreatingStory ? 'Crafting Album...' : 'Story Album'}
              </span>
            </button>

            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              title={isFocusMode ? "Exit Focus Mode" : "Full Focus View"}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 2. Workspace Tabs & Toolbar: Fixed directly below Header */}
        <div className="shrink-0 px-5 sm:px-6 py-2.5 border-b border-stone-100/70 bg-stone-50/40 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setEditorTab('text')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                editorTab === 'text'
                  ? 'bg-[#e8efe6] text-[#2d4530] font-semibold shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Journal</span>
            </button>

            <button
              onClick={() => setEditorTab('media')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                editorTab === 'media'
                  ? 'bg-[#e8efe6] text-[#2d4530] font-semibold shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Photos & Media</span>
              {images.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-700 text-[10px] font-bold">
                  {images.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setEditorTab('audio')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                editorTab === 'audio'
                  ? 'bg-[#e8efe6] text-[#2d4530] font-semibold shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Voice Memos</span>
              {audioNotes.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-700 text-[10px] font-bold">
                  {audioNotes.length}
                </span>
              )}
            </button>
          </div>

          {/* Rich Text Toolbar (when in text tab) */}
          {editorTab === 'text' && (
            <div className="flex items-center gap-1 text-stone-600 text-xs">
              <button
                onClick={() => applyFormat('bold')}
                title="Bold"
                className="font-bold hover:text-stone-950 p-1.5 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => applyFormat('italic')}
                title="Italic"
                className="italic hover:text-stone-950 p-1.5 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => applyFormat('underline')}
                title="Underline"
                className="underline hover:text-stone-950 p-1.5 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>

              <span className="w-px h-3.5 bg-stone-200 mx-1" />

              <button
                onClick={() => applyFormat('bullet')}
                title="Bullet List"
                className="hover:text-stone-950 p-1.5 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => applyFormat('number')}
                title="Numbered List"
                className="hover:text-stone-950 p-1.5 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => applyFormat('link')}
                title="Insert Link"
                className="hover:text-stone-950 p-1.5 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 3. Main Workspace Area: Pure vertical scroll container */}
        <div className="flex-1 min-h-0 overflow-y-auto scrapbook-page-scroll p-5 sm:p-6 flex flex-col min-w-0">
          {editorTab === 'text' && (
            <div className="w-full flex flex-col space-y-6 pb-12">
              {/* Journal Content Textarea */}
              <textarea
                ref={textareaRef}
                id="journal-content-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={() => handleSaveDocument()}
                placeholder="What's on your mind today?&#10;Write freely about your experiences, realizations, challenges, or captured moments..."
                className="w-full min-h-[220px] bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-stone-700 text-sm sm:text-base leading-relaxed resize-none placeholder:text-stone-400 font-sans block shrink-0"
              />

              {/* Attached Photos Card (Isolated box with explicit dimensions and no overlapping) */}
              {images.length > 0 && (
                <div className="shrink-0 relative w-full rounded-2xl border border-stone-200/90 bg-stone-50/80 p-4 sm:p-5 flex flex-col gap-3 shadow-2xs clear-both">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-stone-800">
                      <ImageIcon className="w-4 h-4 text-emerald-700" />
                      <span>Attached Photos ({images.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => journalPhotoInputRef.current?.click()}
                        className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-white hover:bg-emerald-50/60 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorTab('media')}
                        className="px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <span>Manage Gallery</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Horizontal Scroll Strip */}
                  <div className="flex items-center gap-3 overflow-x-auto py-1 px-0.5 min-w-0 scrapbook-page-scroll">
                    {images.map((img, idx) => (
                      <div
                        key={img.id}
                        className="group relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl border border-stone-200 bg-white overflow-hidden shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                        onClick={() => setEditorTab('media')}
                        title={img.caption || img.name || `Photo ${idx + 1}`}
                      >
                        <img
                          src={img.url}
                          alt={img.caption || `Photo ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          referrerPolicy="no-referrer"
                        />
                        {img.caption && (
                          <div className="absolute inset-x-0 bottom-0 bg-stone-900/80 backdrop-blur-[2px] px-1.5 py-1 pointer-events-none">
                            <p className="text-[10px] text-white truncate text-center font-hand-casual">
                              {img.caption}
                            </p>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(img.id);
                          }}
                          title="Remove photo"
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-stone-900/80 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => journalPhotoInputRef.current?.click()}
                      className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl border-2 border-dashed border-stone-300 hover:border-emerald-700 bg-white/70 hover:bg-emerald-50/40 flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-emerald-800 transition-colors cursor-pointer"
                      title="Add another photo"
                    >
                      <Plus className="w-4 h-4 text-stone-400 group-hover:text-emerald-700" />
                      <span className="text-[11px] font-medium text-stone-600">Add Photo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Attached Voice Notes Card */}
              {audioNotes.length > 0 && (
                <div className="shrink-0 relative w-full rounded-2xl border border-stone-200/90 bg-stone-50/80 p-4 sm:p-5 flex flex-col gap-3 shadow-2xs clear-both">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-stone-800">
                      <Volume2 className="w-4 h-4 text-emerald-700" />
                      <span>Attached Voice Notes ({audioNotes.length})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditorTab('audio')}
                      className="px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <span>Manage Audio</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5 overflow-x-auto py-1 px-0.5 min-w-0 scrapbook-page-scroll">
                    {audioNotes.map((note, idx) => {
                      const isPlaying = playingAudioId === note.id;
                      return (
                        <div
                          key={note.id}
                          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-stone-200 shadow-2xs hover:border-stone-300 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => toggleQuickAudio(note)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-white transition-all cursor-pointer shrink-0 ${
                              isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-800 hover:bg-emerald-900'
                            }`}
                            title={isPlaying ? 'Pause' : 'Play voice note'}
                          >
                            {isPlaying ? (
                              <Pause className="w-3 h-3 fill-white" />
                            ) : (
                              <Play className="w-3 h-3 fill-white ml-0.5" />
                            )}
                          </button>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-semibold text-stone-800 truncate max-w-[120px]">
                              Voice Memo {idx + 1}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              {Math.floor(note.duration / 60)}:{String(Math.floor(note.duration % 60)).padStart(2, '0')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAudioNote(note.id)}
                            title="Remove voice note"
                            className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hidden photo file input */}
              <input
                ref={journalPhotoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleQuickPhotoUpload}
              />

              {/* Reflection Prompts Section (Comfortable margin, completely non-overlapping) */}
              <div className="shrink-0 relative w-full pt-6 mt-6 border-t border-stone-200/70 flex flex-col gap-3 pb-4 clear-both">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <Sun className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-bold text-stone-900">Reflection Prompts</span>
                    <span className="text-stone-400 font-normal hidden sm:inline">— Not sure where to start? Try one of these...</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPromptSetIndex((promptSetIndex + 1) % reflectionPromptSets.length)}
                    title="Shuffle Prompts"
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {reflectionPromptSets[promptSetIndex].map((p) => {
                    const IconComponent = p.icon;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          const newContent = content ? `${content}\n\n**${p.text}**\n` : `**${p.text}**\n`;
                          setContent(newContent);
                          setEditorTab('text');
                          handleSaveDocument({ content: newContent });
                        }}
                        className="bg-[#faf8f2] hover:bg-[#f5f1e6] border border-[#eee8da] rounded-xl p-3 text-xs text-stone-700 hover:text-stone-900 transition-all cursor-pointer flex items-center gap-2 font-medium text-left shadow-2xs"
                      >
                        <IconComponent className={`w-3.5 h-3.5 ${p.color} shrink-0`} />
                        <span className="line-clamp-2 leading-snug">{p.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {editorTab === 'media' && (
            <div className="flex-1 overflow-y-auto pb-6">
              <MediaGallery
                images={images}
                onAddImages={handleAddImages}
                onRemoveImage={handleRemoveImage}
                onUpdateImageCaption={handleUpdateImageCaption}
                onEnhanceCaptionTrigger={(img) => setEnhancingPhoto(img)}
              />
            </div>
          )}

          {editorTab === 'audio' && (
            <div className="flex-1 overflow-y-auto pb-6">
              <AudioRecorder
                audioNotes={audioNotes}
                onAddAudioNote={handleAddAudioNote}
                onRemoveAudioNote={handleRemoveAudioNote}
                onUpdateAudioNote={handleUpdateAudioNote}
              />
            </div>
          )}
        </div>

      </div>


      {/* ============================================================ */}
      {/* DRAGGABLE DIVIDER: Stretch & Resize Gemini Chat Section      */}
      {/* ============================================================ */}
      {!isFocusMode && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize Gemini Chat section"
          onMouseDown={handleDragStart}
          onTouchStart={handleTouchStart}
          onDoubleClick={handleResetChatWidth}
          title="Drag horizontally to stretch chat • Double-click to reset (380px)"
          className={`group relative flex items-center justify-center w-2.5 -mx-1 cursor-col-resize select-none shrink-0 z-20 transition-all ${
            isDraggingChat ? 'bg-[#3f5241]/10 rounded-full' : 'hover:bg-[#3f5241]/10 rounded-full'
          }`}
        >
          {/* Subtle tactile grip handle */}
          <div
            className={`w-1 rounded-full transition-all flex items-center justify-center ${
              isDraggingChat
                ? 'h-24 bg-[#3f5241] shadow-xs scale-110'
                : 'h-10 bg-stone-300 group-hover:h-20 group-hover:bg-[#3f5241]'
            }`}
          >
            <GripVertical
              className={`w-3.5 h-3.5 transition-opacity ${
                isDraggingChat
                  ? 'opacity-100 text-white'
                  : 'opacity-0 group-hover:opacity-90 text-stone-500'
              }`}
            />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* RIGHT COLUMN CARD: Gemini AI Companion Card                  */}
      {/* ============================================================ */}
      {!isFocusMode && (
        <div
          style={{
            width: isChatExpanded
              ? `${Math.min(760, Math.max(540, ((containerRef.current?.offsetWidth || 1100) * 0.52)))}px`
              : `${Math.min(chatWidth, Math.max(280, (containerRef.current?.offsetWidth || 1200) - 280))}px`
          }}
          className={`shrink-0 h-full bg-white rounded-2xl border border-stone-200/80 shadow-2xs p-5 sm:p-6 flex flex-col min-h-0 overflow-hidden min-w-0 ${
            isDraggingChat ? '' : 'transition-[width] duration-200 ease-out'
          }`}
        >
          
          {/* Header Tabs: Chat | Insights & Expand / Stretch & New Chat Buttons */}
          <div className="shrink-0 flex items-center justify-between border-b border-stone-200 pb-2 text-xs">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCompanionTab('chat')}
                className={`pb-2 flex items-center gap-1.5 transition-all cursor-pointer relative ${
                  companionTab === 'chat'
                    ? 'text-[#2d4530] font-semibold border-b-2 border-[#3f5241]'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>

              <button
                onClick={() => setCompanionTab('insights')}
                className={`pb-2 flex items-center gap-1.5 transition-all cursor-pointer relative ${
                  companionTab === 'insights'
                    ? 'text-[#2d4530] font-semibold border-b-2 border-[#3f5241]'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Insights</span>
                {hasInsights && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-0.5" />
                )}
              </button>
            </div>

            {/* Right Action Controls: Expand / Stretch Toggle & New Chat Button */}
            <div className="flex items-center gap-1.5">
              {/* Expand / Collapse Button */}
              <button
                onClick={handleToggleExpandChat}
                title={isChatExpanded ? "Collapse to standard width (380px)" : "Expand chat view (Wide)"}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] ${
                  isChatExpanded
                    ? 'bg-[#e8efe6] text-[#2d4530] font-semibold border border-[#d2dfd1]'
                    : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
                }`}
              >
                {isChatExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isChatExpanded ? 'Standard' : 'Expand'}</span>
              </button>

              {/* Dedicated New Chat Button (Resets Gemini Chat without wiping reflection) */}
              <button
                onClick={handleClearChat}
                title="Reset chat conversation"
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            </div>
          </div>

          {/* Mode Selector Pills */}
          <div className="shrink-0 py-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => {
                setMode('reflect');
                handleSaveDocument({ mode: 'reflect' });
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                mode === 'reflect'
                  ? 'bg-[#e8efe6] text-[#2d4530]'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <Sparkle className="w-3 h-3" />
              <span>Reflect</span>
            </button>

            <button
              onClick={() => {
                setMode('brainstorm');
                handleSaveDocument({ mode: 'brainstorm' });
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                mode === 'brainstorm'
                  ? 'bg-[#e8efe6] text-[#2d4530]'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <Lightbulb className="w-3 h-3" />
              <span>Brainstorm</span>
            </button>

            <button
              onClick={() => {
                setMode('action_plan');
                handleSaveDocument({ mode: 'action_plan' });
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                mode === 'action_plan'
                  ? 'bg-[#e8efe6] text-[#2d4530]'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <ListChecks className="w-3 h-3" />
              <span>Action Plan</span>
            </button>
          </div>

          {/* TAB 1: Chat Stream */}
          {companionTab === 'chat' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
              
              {/* Scrollable Messages */}
              <div className="flex-1 overflow-y-auto space-y-3.5 text-xs min-h-0 pr-1">
                {messages.length === 0 ? (
                  <div className="text-center py-6 px-2 space-y-3">
                    <div className="w-10 h-10 rounded-full bg-[#f2f6f1] border border-[#dce8da] flex items-center justify-center text-[#2d4530] mx-auto shadow-2xs">
                      <Sprout className="w-5 h-5 text-[#3f5241]" />
                    </div>
                    <p className="font-serif font-bold text-base text-stone-900">
                      {userDisplayName ? `Welcome to your space, ${userDisplayName.split(' ')[0]}` : 'Welcome to your space'}
                    </p>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                      Share your thoughts, add photos, record voice notes, or ask Gemini anything about your reflections.
                    </p>

                    <div className="pt-3 space-y-2 text-left">
                      <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider px-1">Suggested for you</p>
                      {[
                        "What does this moment teach me?",
                        "What am I feeling most grateful for today?",
                        "How can I turn this experience into a positive learning?"
                      ].map((suggested, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleTriggerReflection(suggested)}
                          disabled={isGenerating}
                          className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-stone-100/90 text-left text-xs text-stone-700 font-medium transition-all shadow-2xs flex items-center justify-between group cursor-pointer"
                        >
                          <span className="group-hover:text-stone-900 transition-colors">{suggested}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#3f5241] shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isUser = msg.role === 'user';

                    if (isUser) {
                      return (
                        <div key={msg.id} className="flex flex-col items-end my-2">
                          <div className="flex items-center gap-1.5 mb-1 text-[11px] text-stone-400 font-medium">
                            <span>{userDisplayName || 'You'}</span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                          </div>
                          <div className="px-3.5 py-2 rounded-2xl rounded-tr-xs bg-[#455a47] text-white text-xs sm:text-sm font-medium leading-relaxed max-w-[85%] shadow-2xs">
                            {msg.content}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={msg.id} 
                        className="bg-stone-50/80 rounded-2xl border border-stone-200 p-3.5 shadow-2xs space-y-2.5 transition-all"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-stone-200/60 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-[#f2f6f1] border border-[#dce8da] flex items-center justify-center text-[#3f5241] shrink-0">
                              <Sparkles className="w-3 h-3" />
                            </div>
                            <span className="font-bold text-stone-900 text-xs">
                              Gemini
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                        </div>

                        <div className="reflection-prose text-xs">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-stone-200/60 text-stone-400">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setLikedMessages({ ...likedMessages, [msg.id]: !likedMessages[msg.id] })}
                              className={`p-1 rounded hover:bg-stone-200/60 transition-colors cursor-pointer ${
                                likedMessages[msg.id] ? 'text-emerald-700' : 'hover:text-stone-700'
                              }`}
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDislikedMessages({ ...dislikedMessages, [msg.id]: !dislikedMessages[msg.id] })}
                              className={`p-1 rounded hover:bg-stone-200/60 transition-colors cursor-pointer ${
                                dislikedMessages[msg.id] ? 'text-rose-600' : 'hover:text-stone-700'
                              }`}
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setBookmarkedMessages({ ...bookmarkedMessages, [msg.id]: !bookmarkedMessages[msg.id] })}
                              className={`p-1 rounded hover:bg-stone-200/60 transition-colors cursor-pointer ${
                                bookmarkedMessages[msg.id] ? 'text-emerald-700' : 'hover:text-stone-700'
                              }`}
                            >
                              <Bookmark className={`w-3 h-3 ${bookmarkedMessages[msg.id] ? 'fill-emerald-700' : ''}`} />
                            </button>
                          </div>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              setCopiedMessageId(msg.id);
                              setTimeout(() => setCopiedMessageId(null), 2000);
                            }}
                            className="flex items-center gap-1 p-1 rounded hover:bg-stone-200/60 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer text-[10px]"
                          >
                            {copiedMessageId === msg.id ? (
                              <span className="text-emerald-700 font-medium">Copied</span>
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                {isGenerating && (
                  <div className="flex items-center gap-2 p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-xs shadow-2xs">
                    <RefreshCw className="w-3.5 h-3.5 text-[#3f5241] animate-spin" />
                    <span>Gemini is contemplating with care...</span>
                  </div>
                )}

                {generationError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{generationError}</span>
                    </div>
                    <button
                      onClick={() => handleTriggerReflection()}
                      className="px-2 py-0.5 rounded bg-rose-600 text-white font-semibold cursor-pointer text-[11px]"
                    >
                      Retry
                    </button>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Pinned Bottom Input Form */}
              <div className="shrink-0 pt-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleTriggerReflection();
                  }}
                  className="bg-stone-50/70 border border-stone-200 rounded-2xl p-3 shadow-2xs focus-within:border-[#3f5241] focus-within:ring-1 focus-within:ring-[#3f5241]/20 transition-all flex flex-col gap-2"
                >
                  <textarea
                    id="chat-query-input"
                    placeholder="Ask Gemini about your thoughts, photos, or voice notes..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleTriggerReflection();
                      }
                    }}
                    disabled={isGenerating}
                    rows={2}
                    className="w-full bg-transparent text-xs text-stone-800 placeholder-stone-400 focus:outline-none resize-none"
                  />

                  <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 text-stone-400">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditorTab('media')}
                        title="Attach photo"
                        className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorTab('audio')}
                        title="Record voice memo"
                        className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      id="send-chat-btn"
                      type="submit"
                      disabled={isGenerating || !chatInput.trim()}
                      className="w-7 h-7 rounded-full bg-[#455a47] hover:bg-[#344536] text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 shadow-xs"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </form>

                <p className="text-[10px] text-stone-400 text-center mt-2 leading-tight">
                  Gemini reflects with care. Your data stays private.
                </p>
              </div>

            </div>
          )}

          {/* TAB 2: Insights Stream */}
          {companionTab === 'insights' && (
            <div className="flex-1 overflow-y-auto space-y-3.5 text-xs min-h-0 pr-1">
              {!hasInsights ? (
                <div className="text-center py-10 px-2 text-stone-500 space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="font-serif font-bold text-sm text-stone-900">
                    No Synthesis Generated Yet
                  </p>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                    Click the button below to have Gemini extract an executive summary, key takeaways, and action milestones.
                  </p>
                  <button
                    onClick={handleSynthesize}
                    disabled={isSynthesizing || (!content.trim() && messages.length === 0)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-40"
                  >
                    {isSynthesizing ? 'Synthesizing...' : '✨ Generate Insights Now'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {summary && (
                    <div className="bg-stone-50/80 p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                      <h5 className="font-serif font-bold text-xs text-stone-900 mb-1.5 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Executive Summary
                      </h5>
                      <p className="text-stone-700 leading-relaxed italic bg-white p-2.5 rounded-lg border border-stone-200/80">
                        "{summary}"
                      </p>
                    </div>
                  )}

                  {keyInsights.length > 0 && (
                    <div className="bg-stone-50/80 p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                      <h5 className="font-serif font-bold text-xs text-stone-900 mb-2 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                        Key Insights
                      </h5>
                      <ul className="space-y-1.5">
                        {keyInsights.map((insight, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-stone-700 bg-white p-2 rounded-lg border border-stone-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {actionItems.length > 0 && (
                    <div className="bg-stone-50/80 p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                      <h5 className="font-serif font-bold text-xs text-stone-900 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        Next Milestones
                      </h5>
                      <ul className="space-y-1.5">
                        {actionItems.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-stone-700 bg-white p-2 rounded-lg border border-stone-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={handleSynthesize}
                      disabled={isSynthesizing}
                      className="w-full py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-700 font-semibold text-xs border border-stone-200 transition-colors cursor-pointer"
                    >
                      {isSynthesizing ? 'Updating...' : '🔄 Refresh Synthesis'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Caption Enhancement Modal */}
      {enhancingPhoto && (
        <ScrapbookEnhanceModal
          photo={enhancingPhoto}
          journalContext={content}
          onApplyCaption={(newCaption) => {
            handleUpdateImageCaption(enhancingPhoto.id, newCaption);
            setEnhancingPhoto(null);
          }}
          onClose={() => setEnhancingPhoto(null)}
        />
      )}

    </div>
  );
}

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
  Compass, 
  Lightbulb, 
  ListChecks, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Tag, 
  Check, 
  Sparkle, 
  MessageSquare, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Pencil, 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Link2, 
  Image as ImageIcon, 
  ThumbsUp, 
  ThumbsDown, 
  Bookmark, 
  ArrowRight, 
  Paperclip, 
  Smile, 
  Sprout, 
  Heart, 
  X,
  Type,
  BookOpen,
  Volume2,
  Wand2,
  Layers
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { MediaGallery } from './MediaGallery';
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [content, setContent] = useState(reflection.content);
  const [mode, setMode] = useState<AIMode>(reflection.mode || 'reflect');
  const [tags, setTags] = useState<string[]>(reflection.tags || []);
  const [tagInput, setTagInput] = useState('');
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
  const [lastModelUsed, setLastModelUsed] = useState(reflection.lastModelUsed || 'gemini-3.6-flash');
  const [companionTab, setCompanionTab] = useState<'chat' | 'insights'>('chat');
  const [editorTab, setEditorTab] = useState<'text' | 'media' | 'audio'>('text');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [promptSetIndex, setPromptSetIndex] = useState(0);
  const [showJournalTip, setShowJournalTip] = useState(true);
  const [enhancingPhoto, setEnhancingPhoto] = useState<JournalImage | null>(null);
  const [likedMessages, setLikedMessages] = useState<Record<string, boolean>>({});
  const [dislikedMessages, setDislikedMessages] = useState<Record<string, boolean>>({});
  const [bookmarkedMessages, setBookmarkedMessages] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state when selected reflection changes
  useEffect(() => {
    setTitle(reflection.title);
    setContent(reflection.content);
    setMode(reflection.mode || 'reflect');
    setTags(reflection.tags || []);
    setImages(reflection.images || []);
    setAudioNotes(reflection.audioNotes || []);
    setMessages(reflection.messages || []);
    setSummary(reflection.summary || '');
    setKeyInsights(reflection.keyInsights || []);
    setActionItems(reflection.actionItems || []);
    setLastModelUsed(reflection.lastModelUsed || 'gemini-3.6-flash');
    setGenerationError(null);
  }, [reflection.id]);

  // Auto-scroll chat when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Reflection prompts
  const reflectionPromptSets = [
    [
      { id: '1', icon: Sprout, color: 'text-emerald-600', text: "What's present for me right now?" },
      { id: '2', icon: Heart, color: 'text-rose-500', text: "What emotions am I experiencing today?" },
      { id: '3', icon: Sparkles, color: 'text-amber-500', text: "What did I learn about myself today?" }
    ],
    [
      { id: '4', icon: Heart, color: 'text-rose-500', text: "What am I most grateful for today?" },
      { id: '5', icon: Sprout, color: 'text-emerald-600', text: "What would bring me peace of mind right now?" },
      { id: '6', icon: Sparkles, color: 'text-amber-500', text: "What is a small victory worth celebrating?" }
    ],
    [
      { id: '7', icon: Sparkles, color: 'text-amber-500', text: "What belief is holding me back today?" },
      { id: '8', icon: Sprout, color: 'text-emerald-600', text: "How can I be kinder to myself this week?" },
      { id: '9', icon: Heart, color: 'text-rose-500', text: "Who or what inspired me recently?" }
    ]
  ];

  const suggestedFollowUps = [
    "What does this moment teach me?",
    "What am I feeling most grateful for today?",
    "How can I carry this energy forward into a memory story?"
  ];

  // Manual or Triggered Save with undefined stripping
  const handleSaveDocument = async (override?: Partial<JournalReflection>) => {
    const updated: JournalReflection = {
      id: reflection.id,
      userId: reflection.userId || userId,
      title: title.trim() || 'Untitled Reflection',
      content: content || '',
      mode: mode || 'reflect',
      tags: tags || [],
      images: images || [],
      audioNotes: audioNotes || [],
      messages: messages || [],
      summary: summary || '',
      keyInsights: keyInsights || [],
      actionItems: actionItems || [],
      lastModelUsed: lastModelUsed || 'gemini-3.6-flash',
      createdAt: reflection.createdAt || Date.now(),
      updatedAt: Date.now(),
      ...override
    };
    return await onSave(updated);
  };

  // Add Tag
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, '');
      if (!tags.includes(clean)) {
        const nextTags = [...tags, clean];
        setTags(nextTags);
        handleSaveDocument({ tags: nextTags });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter(t => t !== tagToRemove);
    setTags(nextTags);
    handleSaveDocument({ tags: nextTags });
  };

  // Media Handlers
  const handleAddImages = (newImgs: JournalImage[]) => {
    const nextImgs = [...images, ...newImgs];
    setImages(nextImgs);
    handleSaveDocument({ images: nextImgs });
  };

  const handleRemoveImage = (imgId: string) => {
    const nextImgs = images.filter(img => img.id !== imgId);
    setImages(nextImgs);
    handleSaveDocument({ images: nextImgs });
  };

  const handleUpdateImageCaption = (imgId: string, caption: string) => {
    const nextImgs = images.map(img => img.id === imgId ? { ...img, caption } : img);
    setImages(nextImgs);
    handleSaveDocument({ images: nextImgs });
  };

  // Voice Note Handlers
  const handleAddAudioNote = (note: AudioNote) => {
    const nextNotes = [...audioNotes, note];
    setAudioNotes(nextNotes);
    handleSaveDocument({ audioNotes: nextNotes });
  };

  const handleRemoveAudioNote = (noteId: string) => {
    const nextNotes = audioNotes.filter(n => n.id !== noteId);
    setAudioNotes(nextNotes);
    handleSaveDocument({ audioNotes: nextNotes });
  };

  const handleUpdateAudioNote = (noteId: string, updates: Partial<AudioNote>) => {
    const nextNotes = audioNotes.map(n => n.id === noteId ? { ...n, ...updates } : n);
    setAudioNotes(nextNotes);
    handleSaveDocument({ audioNotes: nextNotes });
  };

  // Rich Text Formatting helper
  const applyFormat = (formatType: 'bold' | 'italic' | 'heading' | 'bullet' | 'number' | 'quote' | 'link' | 'image') => {
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
      case 'heading':
        replacement = `\n### ${selectedText || 'Heading'}\n`;
        newCursorPos = start + 5;
        break;
      case 'bullet':
        replacement = `\n- ${selectedText || 'List item'}\n`;
        newCursorPos = start + 3;
        break;
      case 'number':
        replacement = `\n1. ${selectedText || 'First item'}\n`;
        newCursorPos = start + 4;
        break;
      case 'quote':
        replacement = `\n> ${selectedText || 'Meaningful thought'}\n`;
        newCursorPos = start + 3;
        break;
      case 'link':
        replacement = `[${selectedText || 'link description'}](https://)`;
        newCursorPos = start + (selectedText ? selectedText.length + 3 : 18);
        break;
      case 'image':
        setEditorTab('media');
        return;
    }

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    handleSaveDocument({ content: newContent });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
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
        : mode === 'summarize'
        ? 'Please summarize the core insights and takeaways from my reflection.'
        : 'Please reflect deeply on what I have written, my photos, and voice notes with empathy and warmth.'
    );

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: effectivePrompt,
      timestamp: Date.now()
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsGenerating(true);

    try {
      // Gather images payload
      const imagesPayload = images.map(img => ({
        data: img.url,
        mimeType: img.mimeType || 'image/jpeg',
        caption: img.caption
      }));

      // Gather audio note transcripts
      const audioTranscripts = audioNotes
        .filter(n => Boolean(n.transcript))
        .map(n => n.transcript!);

      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          prompt: effectivePrompt,
          currentContent: content,
          images: imagesPayload,
          audioTranscripts,
          chatHistory: messages.map(m => ({ role: m.role, content: m.content })),
          userContext: { displayName: userDisplayName }
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Server error (${response.status})`);
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-gemini`,
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now(),
        modelUsed: data.modelUsed
      };

      const finalMessages = [...nextMessages, assistantMessage];
      setMessages(finalMessages);
      setLastModelUsed(data.modelUsed || 'gemini-3.6-flash');

      // Auto-save reflection
      await handleSaveDocument({
        messages: finalMessages,
        lastModelUsed: data.modelUsed
      });
    } catch (err: any) {
      console.error('Gemini interaction error:', err);
      setGenerationError(err?.message || 'Failed to generate Gemini response. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate Executive Synthesis
  const handleSynthesize = async () => {
    if (!content.trim() && messages.length === 0 && images.length === 0) return;
    setIsSynthesizing(true);
    setGenerationError(null);
    setCompanionTab('insights');

    try {
      const response = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          messages
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to synthesize reflection');
      }

      setSummary(data.summary || '');
      setKeyInsights(data.keyInsights || []);
      setActionItems(data.actionItems || []);
      setLastModelUsed(data.modelUsed || 'gemini-3.6-flash');

      await handleSaveDocument({
        summary: data.summary,
        keyInsights: data.keyInsights,
        actionItems: data.actionItems,
        lastModelUsed: data.modelUsed
      });
    } catch (err: any) {
      console.error('Synthesis error:', err);
      setGenerationError(err?.message || 'Failed to generate summary synthesis.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Create Story from Reflection
  const handleCreateStoryFromReflection = async () => {
    if (!content.trim() && images.length === 0 && audioNotes.length === 0) return;
    setIsCreatingStory(true);

    try {
      const audioTranscripts = audioNotes
        .filter(n => Boolean(n.transcript))
        .map(n => n.transcript!);

      const resp = await fetch('/api/gemini/create-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journalText: content,
          reflectionSummary: summary,
          images: images.map(img => ({ url: img.url, caption: img.caption, name: img.name })),
          audioTranscripts,
          theme: 'parchment'
        })
      });

      const data = await resp.json();
      if (data.success && data.story) {
        const story = data.story;
        
        // Map photo indices to real image objects
        const structuredSections = (story.sections || []).map((sec: any, sIdx: number) => {
          let sectionPhotos: any[] = [];
          if (Array.isArray(sec.photoIndices) && images.length > 0) {
            sectionPhotos = sec.photoIndices
              .filter((idx: number) => idx >= 0 && idx < images.length)
              .map((idx: number, pIdx: number) => ({
                id: `photo_${Date.now()}_${sIdx}_${pIdx}`,
                url: images[idx].url,
                caption: (sec.photoCaptions && sec.photoCaptions[pIdx]) || images[idx].caption || 'Captured moment ♡',
                rotation: Math.floor(Math.random() * 6) - 3,
                tapeStyle: pIdx === 0 ? 'paperclip' : 'washi-pink',
                polaroidCaptionStyle: 'handwritten'
              }));
          } else if (images.length > 0) {
            sectionPhotos = images.slice(0, 2).map((img, pIdx) => ({
              id: `photo_${Date.now()}_${pIdx}`,
              url: img.url,
              caption: img.caption || 'Captured moment ♡',
              rotation: Math.floor(Math.random() * 6) - 3,
              tapeStyle: 'paperclip',
              polaroidCaptionStyle: 'handwritten'
            }));
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
                color: sIdx % 2 === 0 ? 'yellow' : 'pink',
                rotation: sIdx % 2 === 0 ? -2 : 2
              }
            ],
            geminiReflectionNote: {
              insight: summary || 'Reflecting on your journey brings clarity, gratitude, and presence.',
              sparkle: true
            },
            layout: 'polaroid'
          };
        });

        const coverColors: ScrapbookCoverColor[] = ['olive-green', 'tan-leather', 'dusty-rose', 'deep-teal', 'vintage-brown', 'ocean-blue'];
        const randomCoverColor = coverColors[Math.floor(Math.random() * coverColors.length)];

        const newScrapbookDraft = {
          id: `scrapbook_${Date.now()}`,
          userId,
          title: story.title || title || 'Memories & Reflections',
          subtitle: story.subtitle || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          introduction: story.introduction || summary || content.slice(0, 200),
          theme: 'parchment' as const,
          coverColor: randomCoverColor,
          category: 'Personal' as const,
          date: story.date || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          location: story.location || '',
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
      }
    } catch (err) {
      console.error('Create story failed:', err);
    } finally {
      setIsCreatingStory(false);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const characterCount = content.length;
  const hasInsights = Boolean(summary || keyInsights.length > 0 || actionItems.length > 0);

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 h-full bg-stone-50 text-stone-800 overflow-hidden min-h-0">
      
      {/* ============================================================ */}
      {/* CENTER COLUMN: Journal Editor, Media Shelf & Prompts         */}
      {/* ============================================================ */}
      <div 
        className={`${
          isFocusMode ? 'lg:col-span-12' : 'lg:col-span-7 xl:col-span-7'
        } flex flex-col h-full border-r border-stone-200 bg-white overflow-y-auto min-h-0`}
      >
        {/* 1. Header Toolbar */}
        <div className="shrink-0 px-6 py-4 border-b border-stone-100 flex items-center justify-between gap-3 bg-white">
          {/* Editable Title */}
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            {isEditingTitle ? (
              <input
                id="reflection-title-input"
                type="text"
                value={title}
                autoFocus
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  setIsEditingTitle(false);
                  handleSaveDocument();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingTitle(false);
                    handleSaveDocument();
                  }
                }}
                className="font-serif-title text-xl sm:text-2xl font-bold text-stone-900 bg-transparent border-b-2 border-emerald-700 focus:outline-none pb-0.5 w-full"
              />
            ) : (
              <div 
                onClick={() => setIsEditingTitle(true)}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <h1 className="font-serif-title text-xl sm:text-2xl font-bold text-stone-900 group-hover:text-emerald-950 transition-colors">
                  {title || 'Untitled Reflection'}
                </h1>
                <Pencil className="w-4 h-4 text-stone-400 group-hover:text-emerald-700 transition-colors" />
              </div>
            )}
          </div>

          {/* Right Status & Save Controls */}
          <div className="flex items-center gap-2.5 text-xs">
            {lastSaveError ? (
              <div className="flex items-center gap-1.5 text-rose-700 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span className="hidden sm:inline">Save Failed</span>
                <button
                  onClick={onRetrySave}
                  className="underline hover:text-rose-950 font-bold ml-1 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : isSaving ? (
              <div className="flex items-center gap-1.5 text-stone-500 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-stone-400" />
                <span className="hidden sm:inline">Saving...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-xs">
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">Saved in Cloud</span>
              </div>
            )}

            {/* Turn into Scrapbook Action Button */}
            <button
              onClick={handleCreateStoryFromReflection}
              disabled={isCreatingStory || (!content.trim() && images.length === 0)}
              title="Create an evocative Scrapbook Story Album from this reflection"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/90 font-semibold text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-40"
            >
              {isCreatingStory ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-800" />
              ) : (
                <BookOpen className="w-3.5 h-3.5 text-emerald-800" />
              )}
              <span className="hidden sm:inline">{isCreatingStory ? 'Weaving Story...' : 'Turn into Story Album'}</span>
            </button>

            {/* Save Button */}
            <button
              id="manual-save-btn"
              onClick={() => handleSaveDocument()}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-medium text-xs transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              Save
            </button>

            {/* Expand / Focus Toggle */}
            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              title={isFocusMode ? "Exit Focus Mode" : "Expand to Focus Mode"}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer hidden md:flex items-center justify-center"
            >
              {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 2. Multimodal Workspace Tabs: [📝 Write] [📷 Photos (N)] [🎙️ Voice Notes (N)] */}
        <div className="shrink-0 px-6 pt-3 pb-0 border-b border-stone-100 bg-stone-50/50 flex items-center gap-6 text-xs">
          <button
            onClick={() => setEditorTab('text')}
            className={`pb-2.5 flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
              editorTab === 'text'
                ? 'text-emerald-800 border-b-2 border-emerald-800'
                : 'text-stone-500 hover:text-stone-800 font-medium'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Journal Writing</span>
          </button>

          <button
            onClick={() => setEditorTab('media')}
            className={`pb-2.5 flex items-center gap-1.5 transition-all cursor-pointer ${
              editorTab === 'media'
                ? 'text-emerald-800 border-b-2 border-emerald-800 font-bold'
                : 'text-stone-500 hover:text-stone-800 font-medium'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Photos & Media</span>
            {images.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {images.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setEditorTab('audio')}
            className={`pb-2.5 flex items-center gap-1.5 transition-all cursor-pointer ${
              editorTab === 'audio'
                ? 'text-emerald-800 border-b-2 border-emerald-800 font-bold'
                : 'text-stone-500 hover:text-stone-800 font-medium'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Voice Memos</span>
            {audioNotes.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {audioNotes.length}
              </span>
            )}
          </button>
        </div>

        {/* 3. Tags & Word Count Row */}
        <div className="shrink-0 px-6 py-2.5 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-stone-500 font-medium text-xs">Tags:</span>
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-xs font-medium"
              >
                #{t}
                <button
                  onClick={() => handleRemoveTag(t)}
                  className="text-stone-400 hover:text-rose-600 font-bold ml-0.5 cursor-pointer"
                >
                  &times;
                </button>
              </span>
            ))}
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-stone-200 bg-stone-50/50 text-stone-600 text-xs">
              <span className="text-stone-400">+</span>
              <input
                id="tag-add-input"
                type="text"
                placeholder="Add tag (Enter)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="bg-transparent text-xs text-stone-800 placeholder-stone-400 focus:outline-none w-24"
              />
            </div>
          </div>

          <div className="text-xs text-stone-400 shrink-0">
            {wordCount} words • {images.length} photos • {audioNotes.length} audio
          </div>
        </div>

        {/* 4. Active Tab Content Area */}
        <div className="px-6 py-2 flex-1 flex flex-col min-h-[280px]">
          {editorTab === 'text' && (
            <div className="flex-1 rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 flex flex-col shadow-2xs hover:border-stone-300 transition-colors">
              
              {/* Rich Text Toolbar */}
              <div className="shrink-0 pb-3 mb-2 border-b border-stone-100 flex items-center gap-1 sm:gap-2 text-stone-600 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => applyFormat('heading')}
                  title="Heading Size"
                  className="p-1.5 hover:bg-stone-100 rounded-md transition-colors cursor-pointer text-stone-600 font-bold text-xs flex items-center gap-0.5"
                >
                  <Type className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => applyFormat('bold')}
                  title="Bold (Ctrl+B)"
                  className="p-1.5 hover:bg-stone-100 rounded-md transition-colors cursor-pointer text-stone-700"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => applyFormat('italic')}
                  title="Italic (Ctrl+I)"
                  className="p-1.5 hover:bg-stone-100 rounded-md transition-colors cursor-pointer text-stone-700"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-stone-200 mx-0.5" />

                <button
                  type="button"
                  onClick={() => applyFormat('bullet')}
                  title="Bullet List"
                  className="p-1.5 hover:bg-stone-100 rounded-md transition-colors cursor-pointer text-stone-700"
                >
                  <List className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => applyFormat('number')}
                  title="Numbered List"
                  className="p-1.5 hover:bg-stone-100 rounded-md transition-colors cursor-pointer text-stone-700"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => applyFormat('quote')}
                  title="Quote Block"
                  className="p-1.5 hover:bg-stone-100 rounded-md transition-colors cursor-pointer text-stone-700"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-stone-200 mx-0.5" />

                <button
                  type="button"
                  onClick={() => setEditorTab('media')}
                  title="Attach Photos"
                  className="flex items-center gap-1 p-1.5 hover:bg-emerald-50 text-emerald-800 rounded-md transition-colors cursor-pointer text-xs font-medium"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Photos ({images.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditorTab('audio')}
                  title="Record Voice Note"
                  className="flex items-center gap-1 p-1.5 hover:bg-emerald-50 text-emerald-800 rounded-md transition-colors cursor-pointer text-xs font-medium"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Voice ({audioNotes.length})</span>
                </button>
              </div>

              {/* Textarea Content */}
              <textarea
                ref={textareaRef}
                id="journal-content-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={() => handleSaveDocument()}
                placeholder="What is on your mind today? Write freely about your experiences, realizations, challenges, or captured moments..."
                className="w-full flex-1 bg-transparent text-stone-800 text-sm sm:text-base leading-relaxed placeholder-stone-400 focus:outline-none resize-none font-sans min-h-[160px]"
              />

              {/* Attached Photos Preview Chips inside write tab */}
              {images.length > 0 && (
                <div className="pt-2 border-t border-stone-100 flex items-center gap-2 overflow-x-auto">
                  <span className="text-[11px] font-bold text-stone-400">Attached:</span>
                  {images.map((img) => (
                    <div 
                      key={img.id}
                      onClick={() => setEditorTab('media')}
                      className="inline-flex items-center gap-1.5 p-1 pr-2.5 rounded-lg bg-stone-100 border border-stone-200 hover:bg-stone-200 cursor-pointer text-xs text-stone-700 shrink-0"
                    >
                      <img src={img.url} alt="thumbnail" className="w-5 h-5 rounded object-cover" referrerPolicy="no-referrer" />
                      <span className="text-[11px] truncate max-w-[100px]">{img.caption || img.name || 'Photo'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {editorTab === 'media' && (
            <div className="flex-1 rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 flex flex-col shadow-2xs">
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
            <div className="flex-1 rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 flex flex-col shadow-2xs">
              <AudioRecorder
                audioNotes={audioNotes}
                onAddAudioNote={handleAddAudioNote}
                onRemoveAudioNote={handleRemoveAudioNote}
                onUpdateAudioNote={handleUpdateAudioNote}
              />
            </div>
          )}
        </div>

        {/* 5. Bottom Section: Reflection Prompts & Mindful Journal Tip */}
        <div className="shrink-0 px-6 py-4 space-y-3 bg-white">
          
          {/* Reflection Prompts Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="font-bold text-stone-900">Reflection Prompts</span>
                <span className="text-stone-400 font-normal">(Pick one to get started)</span>
              </div>

              <button
                type="button"
                onClick={() => setPromptSetIndex((promptSetIndex + 1) % reflectionPromptSets.length)}
                title="Shuffle Prompts"
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3 Interactive Prompt Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
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
                    className="p-3 rounded-xl border border-stone-200/90 bg-stone-50/50 hover:bg-stone-100/80 hover:border-stone-300 text-left transition-all cursor-pointer shadow-2xs group flex flex-col justify-between h-20"
                  >
                    <IconComponent className={`w-4 h-4 ${p.color} shrink-0 mb-1`} />
                    <p className="text-xs text-stone-700 font-medium line-clamp-2 leading-snug group-hover:text-stone-900">
                      {p.text}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mindful Journal Tip Card */}
          {showJournalTip && (
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100/90 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-stone-700">
                <div className="w-8 h-8 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0 shadow-2xs">
                  <Sprout className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <span className="font-bold text-stone-900 mr-1.5">Journal Tip</span>
                  <span className="text-stone-600">You can mix photos, voice memos, and written words together seamlessly.</span>
                </div>
              </div>

              <button
                onClick={() => setShowJournalTip(false)}
                title="Dismiss tip"
                className="text-stone-400 hover:text-stone-700 p-1 rounded-md transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>


      {/* ============================================================ */}
      {/* RIGHT COLUMN: Gemini AI Companion & Chat Interface           */}
      {/* ============================================================ */}
      <div 
        className={`${
          isFocusMode ? 'hidden' : 'lg:col-span-5 xl:col-span-5'
        } flex flex-col h-full bg-stone-50 overflow-hidden min-h-0`}
      >
        
        {/* 1. Header Tabs: Chat | Insights */}
        <div className="shrink-0 px-6 pt-3 pb-0 border-b border-stone-200 bg-white flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setCompanionTab('chat')}
              className={`pb-3 flex items-center gap-1.5 font-bold transition-all cursor-pointer relative ${
                companionTab === 'chat'
                  ? 'text-emerald-800 border-b-2 border-emerald-800'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat</span>
            </button>

            <button
              onClick={() => setCompanionTab('insights')}
              className={`pb-3 flex items-center gap-1.5 font-medium transition-all cursor-pointer relative ${
                companionTab === 'insights'
                  ? 'text-emerald-800 border-b-2 border-emerald-800 font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              <span>Insights</span>
              {hasInsights && (
                <span className="w-2 h-2 rounded-full bg-amber-500 ml-0.5" />
              )}
            </button>
          </div>

          {/* Multimodal Active Context Indicator */}
          <div className="pb-2.5 flex items-center gap-1.5 text-[11px] text-stone-500 font-mono">
            <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200 font-medium">
              📝 {wordCount}w {images.length > 0 ? `• 📷 ${images.length}` : ''} {audioNotes.length > 0 ? `• 🎙️ ${audioNotes.length}` : ''}
            </span>
          </div>
        </div>

        {/* Mode Selector Pills */}
        <div className="shrink-0 px-5 py-2.5 bg-stone-50/80 border-b border-stone-200/70 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setMode('reflect');
              handleSaveDocument({ mode: 'reflect' });
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              mode === 'reflect'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100/80'
            }`}
          >
            <Sparkle className="w-3.5 h-3.5" />
            <span>Reflect</span>
          </button>

          <button
            onClick={() => {
              setMode('brainstorm');
              handleSaveDocument({ mode: 'brainstorm' });
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              mode === 'brainstorm'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100/80'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Brainstorm</span>
          </button>

          <button
            onClick={() => {
              setMode('action_plan');
              handleSaveDocument({ mode: 'action_plan' });
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              mode === 'action_plan'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100/80'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>Action Plan</span>
          </button>
        </div>

        {/* TAB 1: Chat Dialogue Stream */}
        {companionTab === 'chat' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
            
            {/* Scrollable Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs min-h-0">
              
              {messages.length === 0 ? (
                <div className="text-center py-8 px-4 text-stone-500 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 mx-auto mb-2 shadow-2xs">
                    <Sparkles className="w-6 h-6 text-emerald-700" />
                  </div>
                  <p className="font-serif-title text-base font-bold text-stone-900">
                    {userDisplayName ? `Welcome to your space, ${userDisplayName.split(' ')[0]}` : 'Welcome to your world'}
                  </p>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                    Write freely, attach photos, record voice notes, or ask Gemini anything about your thoughts.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.role === 'user';

                  if (isUser) {
                    return (
                      <div key={msg.id} className="flex flex-col items-end my-2">
                        <div className="flex items-center gap-1.5 mb-1 text-[11px] text-stone-500 font-medium">
                          <span>{userDisplayName || 'You'}</span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                        </div>
                        <div className="px-4 py-2.5 rounded-2xl rounded-tr-xs bg-emerald-800 text-white text-xs sm:text-sm font-medium leading-relaxed max-w-[85%] shadow-2xs">
                          {msg.content}
                        </div>
                      </div>
                    );
                  }

                  // Gemini Message Card
                  return (
                    <div 
                      key={msg.id} 
                      className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs space-y-3 transition-all"
                    >
                      {/* Message Card Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-stone-100 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                          </div>
                          <span className="font-bold text-stone-900 text-xs sm:text-sm">
                            Gemini
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-mono text-[10px] border border-stone-200">
                            {msg.modelUsed || 'gemini-3.6-flash'}
                          </span>
                        </div>

                        <span className="text-[11px] text-stone-400 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </div>

                      {/* Card Body */}
                      <div className="reflection-prose">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {/* Card Action Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-stone-400">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setLikedMessages({ ...likedMessages, [msg.id]: !likedMessages[msg.id] })}
                            title="Helpful"
                            className={`p-1.5 rounded-md hover:bg-stone-100 transition-colors cursor-pointer ${
                              likedMessages[msg.id] ? 'text-emerald-700' : 'hover:text-stone-700'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDislikedMessages({ ...dislikedMessages, [msg.id]: !dislikedMessages[msg.id] })}
                            title="Not helpful"
                            className={`p-1.5 rounded-md hover:bg-stone-100 transition-colors cursor-pointer ${
                              dislikedMessages[msg.id] ? 'text-rose-600' : 'hover:text-stone-700'
                            }`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setBookmarkedMessages({ ...bookmarkedMessages, [msg.id]: !bookmarkedMessages[msg.id] })}
                            title="Save to Reflection"
                            className={`p-1.5 rounded-md hover:bg-stone-100 transition-colors cursor-pointer ${
                              bookmarkedMessages[msg.id] ? 'text-emerald-700' : 'hover:text-stone-700'
                            }`}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${bookmarkedMessages[msg.id] ? 'fill-emerald-700' : ''}`} />
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            setCopiedMessageId(msg.id);
                            setTimeout(() => setCopiedMessageId(null), 2000);
                          }}
                          title="Copy message"
                          className="flex items-center gap-1 p-1.5 rounded-md hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer text-xs"
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 text-[11px] font-medium">Copied</span>
                            </>
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Suggested Follow-ups */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                  <Sparkle className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Suggested for you</span>
                </div>

                <div className="space-y-2">
                  {suggestedFollowUps.map((suggested, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleTriggerReflection(suggested)}
                      disabled={isGenerating}
                      className="w-full p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50/90 text-left text-xs text-stone-800 font-medium transition-all shadow-2xs flex items-center justify-between group cursor-pointer"
                    >
                      <span className="group-hover:text-emerald-950 transition-colors">{suggested}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-700 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Generating loading indicator */}
              {isGenerating && (
                <div className="flex items-center gap-2.5 p-3.5 bg-white border border-stone-200 rounded-2xl w-fit text-stone-700 text-xs shadow-2xs">
                  <RefreshCw className="w-4 h-4 text-emerald-700 animate-spin" />
                  <span>Gemini is contemplating your words, photos, and voice memos...</span>
                </div>
              )}

              {/* Error banner */}
              {generationError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{generationError}</span>
                  </div>
                  <button
                    onClick={() => handleTriggerReflection()}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold ml-2 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Pinned Bottom Chat Input Box */}
            <div className="shrink-0 p-3.5 bg-stone-50 border-t border-stone-200/80 space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTriggerReflection();
                }}
                className="bg-white border border-stone-200 rounded-2xl p-3 shadow-2xs focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/15 transition-all"
              >
                <input
                  id="chat-query-input"
                  type="text"
                  placeholder="Ask Gemini about your thoughts, photos, or voice notes..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isGenerating}
                  className="w-full bg-transparent text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none mb-3"
                />

                <div className="flex items-center justify-between pt-1 text-stone-400">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditorTab('media')}
                      title="Attach photo"
                      className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditorTab('audio')}
                      title="Record audio note"
                      className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    id="send-chat-btn"
                    type="submit"
                    disabled={isGenerating || !chatInput.trim()}
                    className="w-8 h-8 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Gemini Disclaimer */}
              <p className="text-[10px] text-stone-400 text-center leading-tight">
                Gemini reflects on your text, attached photos, and voice notes.
              </p>
            </div>

          </div>
        )}

        {/* TAB 2: Insights & Summary */}
        {companionTab === 'insights' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs min-h-0">
            {!hasInsights ? (
              <div className="text-center py-12 px-4 text-stone-500 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto mb-2">
                  <Sparkles className="w-6 h-6 text-amber-600" />
                </div>
                <p className="font-serif-title text-base font-bold text-stone-900">
                  No Synthesis Generated Yet
                </p>
                <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                  Click the button below to have Gemini extract an executive summary, key takeaways, and action milestones.
                </p>
                <button
                  onClick={handleSynthesize}
                  disabled={isSynthesizing || (!content.trim() && messages.length === 0)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-40"
                >
                  {isSynthesizing ? 'Synthesizing...' : '✨ Generate Insights Now'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Executive Summary */}
                {summary && (
                  <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                    <h5 className="font-serif-title font-bold text-sm text-stone-900 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      Executive Reflection Summary
                    </h5>
                    <p className="text-stone-700 leading-relaxed italic bg-stone-50/80 p-3.5 rounded-xl border border-stone-200">
                      "{summary}"
                    </p>
                  </div>
                )}

                {keyInsights.length > 0 && (
                  <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                    <h5 className="font-serif-title font-bold text-sm text-stone-900 mb-2.5 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      Key Psychological & Practical Takeaways
                    </h5>
                    <ul className="space-y-2">
                      {keyInsights.map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-stone-700 bg-stone-50/70 p-2.5 rounded-xl border border-stone-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {actionItems.length > 0 && (
                  <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                    <h5 className="font-serif-title font-bold text-sm text-stone-900 mb-2.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      Actionable Next Milestones
                    </h5>
                    <ul className="space-y-2">
                      {actionItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-stone-700 bg-stone-50/70 p-2.5 rounded-xl border border-stone-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Refresh Button */}
                <div className="pt-2">
                  <button
                    onClick={handleSynthesize}
                    disabled={isSynthesizing}
                    className="w-full py-2 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-700 font-semibold text-xs border border-stone-200 transition-colors cursor-pointer"
                  >
                    {isSynthesizing ? 'Updating...' : '🔄 Refresh Synthesis'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

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

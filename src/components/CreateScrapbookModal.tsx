import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  BookOpen, 
  Camera, 
  Palette, 
  Heart, 
  Compass, 
  Check, 
  Calendar, 
  MapPin, 
  Tag,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Scrapbook, ScrapbookCoverColor, ScrapbookCategory } from '../types';
import { DaisyFlower, WashiTapeStrip } from './ScrapbookDecorations';

interface CreateScrapbookModalProps {
  userId: string;
  onClose: () => void;
  onCreate: (newScrapbook: Scrapbook) => void;
}

const COVER_OPTIONS: Array<{
  key: ScrapbookCoverColor;
  name: string;
  bg: string;
  border: string;
  accent: string;
  previewClass: string;
}> = [
  {
    key: 'olive-green',
    name: 'Olive Botanical',
    bg: 'bg-[#536348]',
    border: 'border-[#3f4d36]',
    accent: '#d8c39e',
    previewClass: 'from-[#536348] to-[#43523a]'
  },
  {
    key: 'tan-leather',
    name: 'Tan Camel Leather',
    bg: 'bg-[#9a673c]',
    border: 'border-[#794f2c]',
    accent: '#ebd8bd',
    previewClass: 'from-[#9a673c] to-[#7e522d]'
  },
  {
    key: 'dusty-rose',
    name: 'Dusty Rose Vintage',
    bg: 'bg-[#a36872]',
    border: 'border-[#855059]',
    accent: '#faecee',
    previewClass: 'from-[#a36872] to-[#89525b]'
  },
  {
    key: 'deep-teal',
    name: 'Alpine Forest Teal',
    bg: 'bg-[#3b6064]',
    border: 'border-[#2d494c]',
    accent: '#d1e3de',
    previewClass: 'from-[#3b6064] to-[#2b484b]'
  },
  {
    key: 'vintage-brown',
    name: 'Antique Walnut',
    bg: 'bg-[#6b4c35]',
    border: 'border-[#503724]',
    accent: '#edd9bf',
    previewClass: 'from-[#6b4c35] to-[#543924]'
  },
  {
    key: 'ocean-blue',
    name: 'Coastal Denim Linen',
    bg: 'bg-[#476072]',
    border: 'border-[#334654]',
    accent: '#d3e3ec',
    previewClass: 'from-[#476072] to-[#344856]'
  }
];

const CURATED_COVER_IMAGES = [
  { label: 'Palaces & Heritage', url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80' },
  { label: 'Coffee & Books', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80' },
  { label: 'Mountain Pines', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80' },
  { label: 'Coastal Ocean', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80' },
  { label: 'Wildflowers', url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=800&q=80' },
  { label: 'Golden Sunset', url: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80' }
];

const CATEGORIES: ScrapbookCategory[] = ['Travel', 'Personal', 'Milestones', 'Favorites'];

const PRESET_QUOTES = [
  'Collect moments, not things. ♡',
  'Where the wild things are ✿',
  'Quiet minds, full hearts ✨',
  'Every corner has a story ✈',
  'Little bits of everyday magic ♡'
];

export function CreateScrapbookModal({
  userId,
  onClose,
  onCreate
}: CreateScrapbookModalProps) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState(
    new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  );
  const [category, setCategory] = useState<ScrapbookCategory>('Travel');
  const [coverColor, setCoverColor] = useState<ScrapbookCoverColor>('olive-green');
  const [quotePill, setQuotePill] = useState('Collect moments, not things. ♡');
  const [coverImage, setCoverImage] = useState('');
  const [location, setLocation] = useState('');
  const [chapter1Heading, setChapter1Heading] = useState('Chapter 1: The Beginning ♡');
  const [chapter1Narrative, setChapter1Narrative] = useState('');

  const selectedCoverTheme = COVER_OPTIONS.find((c) => c.key === coverColor) || COVER_OPTIONS[0];

  const handleCreate = () => {
    const finalTitle = title.trim() || 'My Memory Scrapbook';
    const finalDate = subtitle.trim() || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const newBook: Scrapbook = {
      id: `scrapbook_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      title: finalTitle,
      subtitle: finalDate,
      introduction: `Reflections and handcrafted memories from ${finalTitle}.`,
      theme: 'parchment',
      coverColor,
      category,
      date: finalDate,
      location: location.trim() || undefined,
      quotePill: quotePill.trim() || 'Collect moments, not things. ♡',
      tabs: ['MEMORIES', 'PEOPLE', 'NOTES'],
      coverImage: coverImage.trim() || undefined,
      sections: [
        {
          id: `sec_1_${Date.now()}`,
          chapterNumber: 1,
          heading: chapter1Heading.trim() || 'Chapter 1: The First Step ♡',
          narrative: chapter1Narrative.trim() || 'Write about the sights, sounds, and emotions of this chapter...',
          quote: 'Every moment has a story waiting to be remembered.',
          photos: coverImage.trim() ? [
            {
              id: `photo_1_${Date.now()}`,
              url: coverImage.trim(),
              caption: 'First Memory ♡',
              rotation: 1,
              tapeStyle: 'paperclip',
              polaroidCaptionStyle: 'handwritten'
            }
          ] : [],
          stickyNotes: [
            {
              id: `sn_1_${Date.now()}`,
              text: 'A quiet beginning to something beautiful ✨',
              color: 'yellow',
              rotation: -2
            }
          ],
          geminiReflectionNote: {
            insight: 'Starting a new scrapbook is an act of honoring your story. Cherish every moment.',
            sparkle: true
          },
          layout: 'polaroid'
        }
      ],
      tags: [category],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    onCreate(newBook);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#fbf9f4] rounded-3xl shadow-2xl border border-[#ded4be] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-[#dfd4be] flex items-center justify-between bg-[#f4ece0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#d97c7c] text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif-title font-bold text-stone-900 text-base sm:text-lg">
                Create Handcrafted Scrapbook
              </h2>
              <p className="text-xs text-stone-500 font-hand-casual text-sm">
                Customise your 3D hardcover, spine binding, and opening chapter
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body with 2 Columns on Desktop */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Interactive Form Controls */}
            <div className="md:col-span-7 space-y-4">
              
              {/* Title & Subtitle */}
              <div>
                <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                  Scrapbook Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajasthan Journey, Summer in Kyoto, My 2026 Journal"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-[#d6c7b0] rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-600 focus:ring-1 focus:ring-stone-600"
                />
              </div>

              {/* Subtitle / Date & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                    Date / Subtitle
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. March 2026"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#d6c7b0] rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jaipur, India"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#d6c7b0] rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-600"
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div>
                <label className="block text-xs font-serif font-bold text-stone-800 mb-1.5">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${
                        category === cat
                          ? 'bg-stone-800 text-white font-semibold shadow-xs'
                          : 'bg-[#ebe3d5] text-stone-700 hover:bg-[#dfd7c7]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Book Cover Color Themes */}
              <div>
                <label className="block text-xs font-serif font-bold text-stone-800 mb-1.5">
                  Hardcover Leather / Linen Color
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {COVER_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setCoverColor(opt.key)}
                      className={`p-2 rounded-xl border-2 text-left flex items-center gap-2 transition-all cursor-pointer ${
                        coverColor === opt.key
                          ? 'border-stone-800 bg-white shadow-xs'
                          : 'border-transparent bg-[#f0e8dc] hover:bg-[#e7decfa0]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${opt.bg} shrink-0 border border-black/20`} />
                      <span className="text-[11px] font-medium text-stone-800 truncate">
                        {opt.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quote Motto Pill */}
              <div>
                <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                  Heartfelt Motto / Quote Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. Collect moments, not things. ♡"
                  value={quotePill}
                  onChange={(e) => setQuotePill(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#d6c7b0] rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-600 mb-1.5"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_QUOTES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuotePill(q)}
                      className="text-[10px] bg-[#ebe3d5] hover:bg-[#ded4c3] text-stone-700 px-2 py-0.5 rounded-md font-handwriting cursor-pointer transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Curated Cover Photo (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-serif font-bold text-stone-800">
                    Cover Photo (Optional)
                  </label>
                  <span className="text-[10px] text-stone-500 font-hand-casual">
                    {coverImage ? 'Photo selected' : 'No photo chosen (clean leather)'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-2">
                  {/* None Option */}
                  <button
                    type="button"
                    onClick={() => setCoverImage('')}
                    className={`relative aspect-4/3 rounded-lg flex flex-col items-center justify-center p-1 border-2 transition-all cursor-pointer ${
                      !coverImage 
                        ? 'border-stone-900 bg-amber-100/60 ring-2 ring-stone-900/30' 
                        : 'border-dashed border-stone-300 bg-white/50 hover:bg-stone-50'
                    }`}
                  >
                    <span className="text-xs font-serif font-bold text-stone-800">No Photo</span>
                    <span className="text-[9px] text-stone-500 font-hand-casual">Clean Cover</span>
                    {!coverImage && (
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-stone-900 text-white flex items-center justify-center">
                        <Check className="w-2 h-2" />
                      </div>
                    )}
                  </button>

                  {CURATED_COVER_IMAGES.slice(0, 3).map((img) => (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => setCoverImage(img.url)}
                      className={`relative aspect-4/3 rounded-lg overflow-hidden border-2 transition-all cursor-pointer group ${
                        coverImage === img.url
                          ? 'border-stone-900 ring-2 ring-stone-900/30'
                          : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] py-0.5 px-1 text-center truncate">
                        {img.label}
                      </span>
                      {coverImage === img.url && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-stone-900 text-white flex items-center justify-center">
                          <Check className="w-2 h-2" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Upload from Device Option */}
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-1.5 py-1 px-3 rounded-lg bg-white hover:bg-stone-50 border border-dashed border-stone-300 hover:border-stone-500 text-stone-700 text-xs font-hand-casual cursor-pointer transition-colors shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-stone-500" />
                    <span>Upload your own photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (reader.result) setCoverImage(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  {coverImage && (
                    <button
                      type="button"
                      onClick={() => setCoverImage('')}
                      className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-hand-casual cursor-pointer transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Live 3D Cover Preview */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-[#ede5d8] rounded-2xl border border-[#d6c7b0]">
              <span className="text-[11px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-3">
                Live Cover Preview
              </span>

              {/* Mini Book Cover Model */}
              <div className={`relative w-[220px] aspect-3/4 rounded-xl ${selectedCoverTheme.bg} border-3 ${selectedCoverTheme.border} p-4 flex flex-col justify-between shadow-xl overflow-hidden`}>
                
                {/* Stitched edge */}
                <div className="absolute inset-1.5 rounded-lg border border-dashed border-white/30 pointer-events-none" />

                {/* Left spine grommets */}
                <div className="absolute left-0 top-0 bottom-0 w-6 bg-black/25 flex flex-col justify-around items-center py-2 z-10 border-r border-black/30">
                  {[0, 1, 2].map((g) => (
                    <div key={g} className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-800 shadow-inner" />
                  ))}
                </div>

                {/* Side tabs */}
                <div className="absolute right-0 top-8 bottom-8 flex flex-col justify-around">
                  {['#d8c39e', '#b8ccc6', '#dec3c8'].map((col, i) => (
                    <div key={i} style={{ backgroundColor: col }} className="w-2 h-5 rounded-r-xs shadow-xs" />
                  ))}
                </div>

                {/* Cover Center */}
                <div className="pl-4 text-center my-auto space-y-1.5 z-10">
                  <h4 className="font-script text-2xl text-white line-clamp-2 leading-tight">
                    {title || 'My Journey'} ♡
                  </h4>
                  <p className="font-hand-casual text-xs text-amber-100/80">
                    {subtitle || 'Memories'}
                  </p>

                  {/* Polaroid thumbnail only if chosen */}
                  {coverImage ? (
                    <div className="w-24 mx-auto bg-white p-1 pb-2 shadow-md rounded-xs transform -rotate-2 mt-1">
                      <img src={coverImage} alt="Cover" className="w-full h-14 object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 mx-auto rounded-full border border-amber-200/40 bg-amber-900/20 flex items-center justify-center my-2 shadow-inner">
                      <Sparkles className="w-6 h-6 text-amber-200/80" />
                    </div>
                  )}

                  <div className="pt-1">
                    <DaisyFlower className="w-8 h-8 mx-auto transform rotate-6" />
                  </div>
                </div>

                {/* Bottom Quote Badge */}
                <div className="pl-4 text-center z-10">
                  <span className="inline-block bg-[#e8dcce] text-stone-800 text-[9px] px-2 py-0.5 rounded-sm font-handwriting">
                    {quotePill || 'Collect moments ♡'}
                  </span>
                </div>

              </div>

              <p className="text-[11px] text-stone-500 font-hand-casual text-center mt-3">
                Full 2-page physical spreads, polaroids, sticky notes & audio players will be initialized inside.
              </p>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#dfd4be] bg-[#f4ece0] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-stone-300 text-stone-700 text-xs font-medium hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#d97c7c] hover:bg-[#c96c6c] active:bg-[#b85e5e] text-white text-xs font-bold shadow-md hover:scale-102 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create & Open Scrapbook</span>
          </button>
        </div>

      </div>
    </div>
  );
}

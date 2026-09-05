import React, { useState, useRef } from 'react';
import { 
  Scrapbook, 
  ScrapbookSection, 
  ScrapbookPhoto, 
  ScrapbookTheme,
  JournalImage
} from '../types';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Image as ImageIcon, 
  Quote, 
  Wand2, 
  Printer, 
  Palette, 
  Calendar, 
  MapPin, 
  Check, 
  ChevronLeft,
  LayoutGrid,
  Columns,
  Maximize2,
  RefreshCw,
  FileText
} from 'lucide-react';
import { ScrapbookEnhanceModal } from './ScrapbookEnhanceModal';
import { ScrapbookStoryAssistantModal } from './ScrapbookStoryAssistantModal';

interface ScrapbookEditorProps {
  scrapbook: Scrapbook;
  onSave: (updated: Scrapbook) => void;
  onBack: () => void;
  isSaving?: boolean;
}

const THEME_CONFIGS: Record<ScrapbookTheme, {
  name: string;
  bgClass: string;
  cardClass: string;
  accentClass: string;
  textClass: string;
  fontTitleClass: string;
  fontBodyClass: string;
  borderClass: string;
  badgeClass: string;
}> = {
  parchment: {
    name: 'Parchment',
    bgClass: 'bg-[#faf6ee]',
    cardClass: 'bg-[#fffdf9] border-[#e8dfcf]',
    accentClass: 'text-amber-800',
    textClass: 'text-[#3d3429]',
    fontTitleClass: 'font-serif',
    fontBodyClass: 'font-serif',
    borderClass: 'border-[#e2d6c1]',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-200'
  },
  botanical: {
    name: 'Botanical Garden',
    bgClass: 'bg-[#f4f7f4]',
    cardClass: 'bg-white border-emerald-100',
    accentClass: 'text-emerald-800',
    textClass: 'text-stone-800',
    fontTitleClass: 'font-serif-title',
    fontBodyClass: 'font-sans',
    borderClass: 'border-emerald-200/70',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200'
  },
  sunset: {
    name: 'Warm Sunset',
    bgClass: 'bg-[#fdf7f2]',
    cardClass: 'bg-white border-orange-100',
    accentClass: 'text-rose-800',
    textClass: 'text-stone-800',
    fontTitleClass: 'font-serif',
    fontBodyClass: 'font-sans',
    borderClass: 'border-orange-200/80',
    badgeClass: 'bg-orange-100 text-orange-950 border-orange-200'
  },
  midnight: {
    name: 'Midnight Starlight',
    bgClass: 'bg-[#181a20]',
    cardClass: 'bg-[#22252e] border-stone-700',
    accentClass: 'text-emerald-400',
    textClass: 'text-stone-200',
    fontTitleClass: 'font-serif-title',
    fontBodyClass: 'font-sans',
    borderClass: 'border-stone-700',
    badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-800'
  },
  minimal: {
    name: 'Editorial Studio',
    bgClass: 'bg-stone-100',
    cardClass: 'bg-white border-stone-200',
    accentClass: 'text-stone-900',
    textClass: 'text-stone-800',
    fontTitleClass: 'font-sans font-black tracking-tight',
    fontBodyClass: 'font-sans',
    borderClass: 'border-stone-200',
    badgeClass: 'bg-stone-200 text-stone-800 border-stone-300'
  }
};

export function ScrapbookEditor({
  scrapbook: initialScrapbook,
  onSave,
  onBack,
  isSaving = false
}: ScrapbookEditorProps) {
  const [scrapbook, setScrapbook] = useState<Scrapbook>(initialScrapbook);
  const [activeTheme, setActiveTheme] = useState<ScrapbookTheme>(initialScrapbook.theme || 'parchment');
  const [enhancingPhoto, setEnhancingPhoto] = useState<{ sectionIndex: number; photoIndex: number; photo: ScrapbookPhoto } | null>(null);
  const [showStoryAssistant, setShowStoryAssistant] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeSectionUploadIndex, setActiveSectionUploadIndex] = useState<number | null>(null);

  const themeConfig = THEME_CONFIGS[activeTheme] || THEME_CONFIGS.parchment;

  const updateScrapbook = (updated: Partial<Scrapbook>) => {
    const next = { ...scrapbook, ...updated, updatedAt: Date.now() };
    setScrapbook(next);
    onSave(next);
  };

  const updateSection = (index: number, updates: Partial<ScrapbookSection>) => {
    const newSections = [...scrapbook.sections];
    newSections[index] = { ...newSections[index], ...updates };
    updateScrapbook({ sections: newSections });
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...scrapbook.sections];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newSections.length) return;
    const temp = newSections[index];
    newSections[index] = newSections[target];
    newSections[target] = temp;
    updateScrapbook({ sections: newSections });
  };

  const deleteSection = (index: number) => {
    const newSections = scrapbook.sections.filter((_, i) => i !== index);
    updateScrapbook({ sections: newSections });
  };

  const addSection = (layout: ScrapbookSection['layout'] = 'polaroid') => {
    const newSection: ScrapbookSection = {
      id: `sec_${Date.now()}`,
      heading: `Chapter ${scrapbook.sections.length + 1}`,
      narrative: 'Add a new memory or story segment here...',
      quote: '',
      transition: '',
      photos: [],
      layout
    };
    updateScrapbook({ sections: [...scrapbook.sections, newSection] });
  };

  const handleUploadPhotoToSection = (sectionIndex: number) => {
    setActiveSectionUploadIndex(sectionIndex);
    fileInputRef.current?.click();
  };

  const onPhotoFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || activeSectionUploadIndex === null) return;
    const files = Array.from(e.target.files);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const newPhoto: ScrapbookPhoto = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          url: base64,
          caption: file.name.replace(/\.[^/.]+$/, ''),
          rotation: Math.floor(Math.random() * 6) - 3 // -3 to +3 degrees random rotation for authentic scrapbook look
        };

        const section = scrapbook.sections[activeSectionUploadIndex];
        if (section) {
          updateSection(activeSectionUploadIndex, {
            photos: [...section.photos, newPhoto]
          });
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleApplyEnhancedCaption = (newCaption: string) => {
    if (!enhancingPhoto) return;
    const { sectionIndex, photoIndex } = enhancingPhoto;
    const section = scrapbook.sections[sectionIndex];
    if (!section) return;

    const newPhotos = [...section.photos];
    newPhotos[photoIndex] = {
      ...newPhotos[photoIndex],
      enhancedCaption: newCaption,
      caption: newCaption
    };

    updateSection(sectionIndex, { photos: newPhotos });
    setEnhancingPhoto(null);
  };

  const removePhotoFromSection = (sectionIndex: number, photoIndex: number) => {
    const section = scrapbook.sections[sectionIndex];
    if (!section) return;
    const newPhotos = section.photos.filter((_, i) => i !== photoIndex);
    updateSection(sectionIndex, { photos: newPhotos });
  };

  const updatePhotoCaption = (sectionIndex: number, photoIndex: number, caption: string) => {
    const section = scrapbook.sections[sectionIndex];
    if (!section) return;
    const newPhotos = [...section.photos];
    newPhotos[photoIndex] = { ...newPhotos[photoIndex], caption };
    updateSection(sectionIndex, { photos: newPhotos });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`min-h-full flex flex-col ${themeConfig.bgClass} ${themeConfig.textClass} transition-colors duration-300`}>
      
      {/* 1. Editor Navigation Bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-stone-600 hover:text-stone-900 hover:bg-stone-100 text-xs font-medium transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="h-4 w-px bg-stone-200" />

          <div className="flex items-center gap-2">
            <span className="font-serif-title font-bold text-stone-900 text-sm hidden sm:inline">
              Story Album:
            </span>
            <input
              type="text"
              value={scrapbook.title}
              onChange={(e) => updateScrapbook({ title: e.target.value })}
              className="font-serif font-bold text-stone-900 text-sm bg-transparent focus:outline-none focus:border-b border-emerald-700 max-w-[220px] sm:max-w-xs truncate"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Theme Selector */}
          <div className="flex items-center gap-1 text-xs">
            <Palette className="w-3.5 h-3.5 text-stone-400 hidden sm:inline" />
            <select
              value={activeTheme}
              onChange={(e) => {
                const newTheme = e.target.value as ScrapbookTheme;
                setActiveTheme(newTheme);
                updateScrapbook({ theme: newTheme });
              }}
              className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-stone-700 focus:outline-none focus:border-emerald-700 cursor-pointer"
            >
              <option value="parchment">📜 Parchment</option>
              <option value="botanical">🌿 Botanical</option>
              <option value="sunset">🌅 Sunset Warmth</option>
              <option value="midnight">🌌 Midnight</option>
              <option value="minimal">🖋️ Editorial Studio</option>
            </select>
          </div>

          {/* Gemini Story Assistant Button */}
          <button
            onClick={() => setShowStoryAssistant(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Arrange & Improve Story Flow with Gemini"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Story Assistant</span>
          </button>

          {/* Print / Export Button */}
          <button
            onClick={handlePrint}
            title="Print or Export as PDF"
            className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Scrapbook Magazine / Album Body */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-10 flex-1">
        
        {/* Cover Hero Banner */}
        <div className={`p-8 sm:p-12 rounded-3xl ${themeConfig.cardClass} border shadow-md text-center relative overflow-hidden transition-all`}>
          
          {/* Subtle Decorative Vintage Corner Accents */}
          <div className="absolute top-3 left-3 text-stone-300 font-serif text-sm opacity-50 select-none">❧</div>
          <div className="absolute top-3 right-3 text-stone-300 font-serif text-sm opacity-50 select-none">❧</div>
          <div className="absolute bottom-3 left-3 text-stone-300 font-serif text-sm opacity-50 select-none">❧</div>
          <div className="absolute bottom-3 right-3 text-stone-300 font-serif text-sm opacity-50 select-none">❧</div>

          {/* Metadata Row: Date, Location, Pages */}
          <div className="flex items-center justify-center gap-3 text-xs mb-4 flex-wrap">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${themeConfig.badgeClass}`}>
              <Calendar className="w-3.5 h-3.5" />
              <input
                type="text"
                value={scrapbook.date || ''}
                placeholder="Date (e.g. Autumn 2026)"
                onChange={(e) => updateScrapbook({ date: e.target.value })}
                className="bg-transparent focus:outline-none w-28 text-center text-xs"
              />
            </div>

            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${themeConfig.badgeClass}`}>
              <MapPin className="w-3.5 h-3.5" />
              <input
                type="text"
                value={scrapbook.location || ''}
                placeholder="Location (optional)"
                onChange={(e) => updateScrapbook({ location: e.target.value })}
                className="bg-transparent focus:outline-none w-28 text-center text-xs"
              />
            </div>
          </div>

          {/* Title */}
          <input
            type="text"
            value={scrapbook.title}
            onChange={(e) => updateScrapbook({ title: e.target.value })}
            placeholder="Story Title..."
            className={`w-full text-center text-2xl sm:text-4xl font-bold bg-transparent focus:outline-none ${themeConfig.fontTitleClass} mb-2 tracking-tight`}
          />

          {/* Subtitle */}
          <input
            type="text"
            value={scrapbook.subtitle || ''}
            onChange={(e) => updateScrapbook({ subtitle: e.target.value })}
            placeholder="A poetic subtitle..."
            className={`w-full text-center text-sm sm:text-base italic opacity-80 bg-transparent focus:outline-none ${themeConfig.fontBodyClass} mb-6`}
          />

          <div className="w-20 h-px bg-stone-300 mx-auto mb-6" />

          {/* Opening Introduction */}
          <div className="max-w-2xl mx-auto">
            <textarea
              value={scrapbook.introduction || ''}
              onChange={(e) => updateScrapbook({ introduction: e.target.value })}
              placeholder="Opening reflection or prologue for this memory collection..."
              className={`w-full p-4 rounded-2xl bg-stone-50/40 border border-stone-200/60 text-center text-sm leading-relaxed italic focus:outline-none focus:bg-white resize-none ${themeConfig.fontBodyClass}`}
              rows={3}
            />
          </div>
        </div>

        {/* 3. Story Chapters / Sections */}
        <div className="space-y-8">
          {scrapbook.sections.map((section, sectionIndex) => (
            <div
              key={section.id}
              className={`p-6 sm:p-8 rounded-3xl ${themeConfig.cardClass} border shadow-sm relative group space-y-6 transition-all`}
            >
              {/* Section Header Controls */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    Chapter {sectionIndex + 1}
                  </span>
                  
                  {/* Layout selector */}
                  <select
                    value={section.layout || 'polaroid'}
                    onChange={(e) => updateSection(sectionIndex, { layout: e.target.value as any })}
                    className="text-[11px] bg-stone-100 border border-stone-200 rounded-md px-2 py-0.5 text-stone-600 focus:outline-none"
                  >
                    <option value="polaroid">📷 Polaroid Album</option>
                    <option value="grid">🖼️ Photo Grid</option>
                    <option value="story-split">📖 Story Split</option>
                    <option value="single">🌟 Single Spotlight</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 text-stone-400">
                  <button
                    onClick={() => moveSection(sectionIndex, 'up')}
                    disabled={sectionIndex === 0}
                    title="Move chapter up"
                    className="p-1 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => moveSection(sectionIndex, 'down')}
                    disabled={sectionIndex === scrapbook.sections.length - 1}
                    title="Move chapter down"
                    className="p-1 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => deleteSection(sectionIndex)}
                    title="Delete chapter"
                    className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Chapter Heading */}
              <input
                type="text"
                value={section.heading || ''}
                onChange={(e) => updateSection(sectionIndex, { heading: e.target.value })}
                placeholder="Chapter Heading (e.g., The Afternoon Sun)..."
                className={`w-full text-xl sm:text-2xl font-bold bg-transparent focus:outline-none ${themeConfig.fontTitleClass}`}
              />

              {/* Narrative Story Block */}
              <textarea
                value={section.narrative || ''}
                onChange={(e) => updateSection(sectionIndex, { narrative: e.target.value })}
                placeholder="Write the narrative for this memory moment..."
                rows={3}
                className={`w-full p-4 rounded-2xl bg-stone-50/40 border border-stone-200/60 text-sm sm:text-base leading-relaxed focus:outline-none focus:bg-white resize-none ${themeConfig.fontBodyClass}`}
              />

              {/* Photos Gallery for this Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                    Visual Keepsakes ({section.photos.length})
                  </span>

                  <button
                    type="button"
                    onClick={() => handleUploadPhotoToSection(sectionIndex)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Photo</span>
                  </button>
                </div>

                {section.photos.length > 0 ? (
                  <div className={`grid gap-4 ${
                    section.layout === 'story-split'
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : section.layout === 'single'
                      ? 'grid-cols-1'
                      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                  }`}>
                    {section.photos.map((photo, photoIndex) => {
                      const rotationStyle = section.layout === 'polaroid' ? {
                        transform: `rotate(${photo.rotation || 0}deg)`
                      } : {};

                      return (
                        <div
                          key={photo.id}
                          style={rotationStyle}
                          className={`group relative rounded-2xl border ${themeConfig.borderClass} ${
                            section.layout === 'polaroid'
                              ? 'bg-white p-3 pb-4 shadow-md'
                              : 'bg-white overflow-hidden shadow-2xs'
                          } transition-all flex flex-col`}
                        >
                          {/* Top Tape Sticker effect on Polaroid */}
                          {section.layout === 'polaroid' && (
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-3.5 bg-amber-100/80 border border-amber-200/60 shadow-2xs rounded-xs rotate-[-2deg] z-10 opacity-80" />
                          )}

                          {/* Image Container */}
                          <div className="relative aspect-4/3 bg-stone-100 rounded-lg overflow-hidden">
                            <img
                              src={photo.url}
                              alt={photo.caption || 'Memory'}
                              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />

                            {/* Top overlay delete button */}
                            <button
                              onClick={() => removePhotoFromSection(sectionIndex, photoIndex)}
                              title="Delete photo"
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-stone-900/70 text-white hover:bg-rose-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Photo Caption with Gemini Enhance Action */}
                          <div className="mt-2.5 flex items-center justify-between gap-1.5">
                            <input
                              type="text"
                              value={photo.caption || ''}
                              onChange={(e) => updatePhotoCaption(sectionIndex, photoIndex, e.target.value)}
                              placeholder="Write a caption..."
                              className="w-full text-xs text-stone-800 placeholder-stone-400 bg-transparent focus:outline-none font-serif italic"
                            />

                            <button
                              onClick={() => setEnhancingPhoto({ sectionIndex, photoIndex, photo })}
                              title="✨ Enhance Caption with Gemini"
                              className="p-1 rounded-md text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer shrink-0"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    onClick={() => handleUploadPhotoToSection(sectionIndex)}
                    className="p-6 border-2 border-dashed border-stone-200/80 rounded-2xl text-center cursor-pointer hover:bg-stone-50/50 transition-all"
                  >
                    <ImageIcon className="w-6 h-6 text-stone-400 mx-auto mb-1" />
                    <p className="text-xs font-medium text-stone-600">
                      Click to attach photos to this chapter
                    </p>
                  </div>
                )}
              </div>

              {/* Poignant Quote Callout */}
              <div className="pt-2">
                <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/60">
                  <Quote className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <input
                    type="text"
                    value={section.quote || ''}
                    onChange={(e) => updateSection(sectionIndex, { quote: e.target.value })}
                    placeholder="Add a memorable quote or poignant realization..."
                    className="w-full bg-transparent text-xs sm:text-sm font-serif italic text-amber-950 placeholder-amber-700/60 focus:outline-none"
                  />
                </div>
              </div>

              {/* Connective Transition Sentence */}
              <div className="pt-1">
                <input
                  type="text"
                  value={section.transition || ''}
                  onChange={(e) => updateSection(sectionIndex, { transition: e.target.value })}
                  placeholder="Bridge/Transition to next memory (e.g. As the day gave way to evening...)"
                  className="w-full text-xs italic text-stone-400 bg-transparent focus:outline-none"
                />
              </div>

            </div>
          ))}
        </div>

        {/* 4. Add Chapter Button */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => addSection('polaroid')}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add New Chapter</span>
          </button>
        </div>

      </div>

      {/* Hidden File Input for Section Photo Uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onPhotoFilesSelected}
      />

      {/* Caption Enhance Modal */}
      {enhancingPhoto && (
        <ScrapbookEnhanceModal
          photo={enhancingPhoto.photo}
          journalContext={scrapbook.introduction || scrapbook.title}
          onApplyCaption={handleApplyEnhancedCaption}
          onClose={() => setEnhancingPhoto(null)}
        />
      )}

      {/* Story Assistant Modal */}
      {showStoryAssistant && (
        <ScrapbookStoryAssistantModal
          scrapbook={scrapbook}
          onApplyImprovements={(improved) => {
            setScrapbook(improved);
            onSave(improved);
          }}
          onClose={() => setShowStoryAssistant(false)}
        />
      )}

    </div>
  );
}

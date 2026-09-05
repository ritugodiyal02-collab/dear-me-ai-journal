import React, { useState } from 'react';
import { Scrapbook, ScrapbookCoverColor, ScrapbookCategory } from '../types';
import { 
  BookOpen, 
  Plus, 
  Sparkles, 
  Trash2, 
  Calendar, 
  MapPin, 
  Search,
  Bookmark,
  Heart,
  Maximize2
} from 'lucide-react';
import { 
  DaisyFlower, 
  LavenderSprig, 
  WildflowerBouquet, 
  GreenPressedLeaf,
  WashiTapeStrip
} from './ScrapbookDecorations';

interface ScrapbookGalleryProps {
  scrapbooks: Scrapbook[];
  onSelectScrapbook: (scrapbook: Scrapbook) => void;
  onCreateNewScrapbook: () => void;
  onDeleteScrapbook: (id: string, title?: string, e?: React.MouseEvent) => void;
  onOpenJournalMode: () => void;
  onLoadSampleScrapbooks?: () => void;
  isLoading: boolean;
}

const CATEGORIES: ScrapbookCategory[] = ['All', 'Travel', 'Personal', 'Milestones', 'Favorites'];

const BOOK_COVER_PALETTES: Array<{
  colorKey: ScrapbookCoverColor;
  bg: string;
  border: string;
  spine: string;
  titleColor: string;
  subtitleColor: string;
  tabColors: string[];
}> = [
  {
    colorKey: 'olive-green',
    bg: 'bg-[#536348]',
    border: 'border-[#3f4d36]',
    spine: 'bg-[#43523a]',
    titleColor: 'text-[#fbf9f4]',
    subtitleColor: 'text-amber-100/80',
    tabColors: ['#d8c39e', '#b8ccc6', '#dec3c8']
  },
  {
    colorKey: 'ocean-blue',
    bg: 'bg-[#476072]',
    border: 'border-[#334654]',
    spine: 'bg-[#344856]',
    titleColor: 'text-[#f8fafc]',
    subtitleColor: 'text-cyan-100/80',
    tabColors: ['#cbdad5', '#e2ceb5', '#edd8dc']
  },
  {
    colorKey: 'deep-teal',
    bg: 'bg-[#3b6064]',
    border: 'border-[#2d494c]',
    spine: 'bg-[#2b484b]',
    titleColor: 'text-[#f5fbf9]',
    subtitleColor: 'text-emerald-100/80',
    tabColors: ['#b8ccc6', '#dec3c8', '#d8c39e']
  },
  {
    colorKey: 'dusty-rose',
    bg: 'bg-[#a36872]',
    border: 'border-[#855059]',
    spine: 'bg-[#89525b]',
    titleColor: 'text-[#fffbfb]',
    subtitleColor: 'text-rose-100/80',
    tabColors: ['#dec3c8', '#d8c39e', '#b8ccc6']
  },
  {
    colorKey: 'tan-leather',
    bg: 'bg-[#9a673c]',
    border: 'border-[#794f2c]',
    spine: 'bg-[#7e522d]',
    titleColor: 'text-[#fefcf8]',
    subtitleColor: 'text-amber-100/80',
    tabColors: ['#ebd8bd', '#b0c4bd', '#dec3c8']
  },
  {
    colorKey: 'vintage-brown',
    bg: 'bg-[#6b4c35]',
    border: 'border-[#503724]',
    spine: 'bg-[#543924]',
    titleColor: 'text-[#fcf8f2]',
    subtitleColor: 'text-amber-100/80',
    tabColors: ['#edd9bf', '#dec3c8', '#b8ccc6']
  }
];

export function ScrapbookGallery({
  scrapbooks,
  onSelectScrapbook,
  onCreateNewScrapbook,
  onDeleteScrapbook,
  onOpenJournalMode,
  onLoadSampleScrapbooks,
  isLoading
}: ScrapbookGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<ScrapbookCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = scrapbooks.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.subtitle && s.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.location && s.location.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedCategory !== 'All' && s.category && s.category !== selectedCategory) {
      // If user filtered by category and scrapbook has category set
      return false;
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f5ee] p-4 sm:p-8 space-y-6">
      
      {/* Top Header Bar matching Panel 6 */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-title font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">
            My Scrapbooks
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 font-hand-casual text-base">
            Tangible keepsake albums filled with memories, polaroids, and quiet reflections.
          </p>
        </div>

        {/* "New Scrapbook" Terracotta / Rose Button */}
        <button
          onClick={onCreateNewScrapbook}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#d97c7c] hover:bg-[#c96c6c] active:bg-[#b85e5e] text-white text-xs font-semibold shadow-md transition-all cursor-pointer hover:scale-103"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Scrapbook</span>
        </button>
      </div>

      {/* Category Tabs & Search Bar (matching Panel 6) */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Pills: All, Travel, Personal, Milestones, Favorites */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-stone-800 text-white font-semibold shadow-2xs'
                  : 'bg-[#eae3d5] hover:bg-[#dfd7c7] text-stone-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-[#eae3d5]/70 border border-[#d8cdbc] rounded-full text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-500"
          />
        </div>
      </div>

      {/* 3D BOOKS GRID SHELF */}
      <div className="max-w-6xl mx-auto pt-4">
        {isLoading ? (
          <div className="py-24 text-center text-stone-400 space-y-3">
            <Sparkles className="w-6 h-6 animate-spin mx-auto text-amber-800" />
            <p className="text-xs font-serif">Opening your memory library...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-4 bg-[#fcf9f2] rounded-3xl border border-[#ded3be] p-8 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-[#efe7d8] border border-[#d6c7b0] flex items-center justify-center text-amber-900 mx-auto">
              <BookOpen className="w-8 h-8 text-amber-800" />
            </div>
            <div>
              <h3 className="font-serif-title font-bold text-lg text-stone-900">
                No Scrapbooks Found
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 leading-relaxed font-hand-casual text-base">
                Begin a new story album, or turn any reflection into a handcrafted memory book with Gemini!
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={onCreateNewScrapbook}
                className="px-5 py-2.5 rounded-full bg-[#d97c7c] hover:bg-[#c96c6c] text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Create New Scrapbook
              </button>
              {onLoadSampleScrapbooks && (
                <button
                  onClick={onLoadSampleScrapbooks}
                  className="px-4 py-2 rounded-full border border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-900 text-xs font-semibold cursor-pointer"
                >
                  Load Sample Albums
                </button>
              )}
              <button
                onClick={onOpenJournalMode}
                className="px-4 py-2 rounded-full border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium cursor-pointer"
              >
                Go to Reflections
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
            {filtered.map((album, index) => {
              const palette = album.coverColor 
                ? BOOK_COVER_PALETTES.find(p => p.colorKey === album.coverColor) || BOOK_COVER_PALETTES[index % BOOK_COVER_PALETTES.length]
                : BOOK_COVER_PALETTES[index % BOOK_COVER_PALETTES.length];
              const totalPhotos = album.sections.reduce((acc, s) => acc + (s.photos?.length || 0), 0);
              const firstPhoto = album.sections.find(s => s.photos && s.photos.length > 0)?.photos[0];

              return (
                <div
                  key={album.id}
                  onClick={() => onSelectScrapbook(album)}
                  className="group relative cursor-pointer flex flex-col items-center transition-all duration-300 hover:-translate-y-2 select-none"
                >
                  {/* REALISTIC 3D HARDCOVER BOOK JACKET */}
                  <div className={`relative w-full aspect-3/4 max-w-[310px] rounded-2xl ${palette.bg} border-3 ${palette.border} p-5 flex flex-col justify-between shadow-xl group-hover:shadow-2xl transition-all overflow-hidden`}>
                    
                    {/* Stitched Edge Detail */}
                    <div className="absolute inset-2.5 rounded-xl border border-dashed border-white/25 pointer-events-none" />

                    {/* Left Spine Texture with Ring Eyelets & Cord */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-black/20 border-r border-black/30 flex flex-col justify-around items-center py-4 z-10">
                      {[0, 1, 2].map((g) => (
                        <div key={g} className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-amber-300 via-amber-600 to-amber-900 border border-amber-950 shadow-inner flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#3a2818]" />
                        </div>
                      ))}
                    </div>

                    {/* Protruding Side Tabs on the Right Edge (matching Panel 6) */}
                    <div className="absolute right-0 top-12 bottom-12 flex flex-col justify-around z-0">
                      {palette.tabColors.map((col, tIdx) => (
                        <div
                          key={tIdx}
                          style={{ backgroundColor: col }}
                          className="w-3 h-8 rounded-r-sm shadow-xs border-r border-t border-b border-black/10"
                        />
                      ))}
                    </div>

                    {/* Delete Icon on Hover & Touch */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteScrapbook(album.id, album.title, e);
                      }}
                      title="Delete Scrapbook"
                      aria-label={`Delete scrapbook ${album.title}`}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-stone-900/70 hover:bg-rose-600 active:bg-rose-700 text-white flex items-center justify-center opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-all shadow-md z-20 cursor-pointer hover:scale-110"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Cover Center Content */}
                    <div className="pl-6 text-center my-auto space-y-2 z-10">
                      
                      {/* Cursive Title */}
                      <h3 className={`font-script text-3xl sm:text-4xl ${palette.titleColor} filter drop-shadow-sm line-clamp-2 leading-tight`}>
                        {album.title || 'My Journey'} <span className="font-handwriting text-rose-300 text-2xl">♡</span>
                      </h3>

                      {/* Subtitle / Date */}
                      <p className={`font-hand-casual text-sm sm:text-base ${palette.subtitleColor} tracking-wide`}>
                        {album.date || album.subtitle || 'Memories'}
                      </p>

                      {/* Centerpiece Floral or Photo illustration */}
                      <div className="pt-2 pb-1 flex justify-center">
                        {index % 3 === 0 ? (
                          <DaisyFlower className="w-16 h-16 transform rotate-6 drop-shadow-sm" />
                        ) : index % 3 === 1 ? (
                          <LavenderSprig className="w-10 h-16 transform -rotate-12 drop-shadow-sm" />
                        ) : (
                          <WildflowerBouquet className="w-14 h-16 transform rotate-3 drop-shadow-sm" />
                        )}
                      </div>

                      {/* Open Badge */}
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/90 group-hover:bg-white text-stone-900 font-serif font-bold text-xs shadow-xs group-hover:scale-105 transition-all">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-800" />
                          <span>Open Scrapbook</span>
                        </span>
                      </div>

                    </div>

                    {/* Bottom Metadata */}
                    <div className="pl-6 flex items-center justify-between text-[11px] text-white/80 font-hand-casual z-10 border-t border-white/10 pt-2">
                      <span>{album.sections.length} {album.sections.length === 1 ? 'Chapter' : 'Chapters'}</span>
                      <span>{totalPhotos} {totalPhotos === 1 ? 'Photo' : 'Photos'}</span>
                    </div>

                  </div>

                  {/* Tactile Wooden / Desk Shadow Beneath Book */}
                  <div className="w-4/5 h-3 bg-stone-900/10 rounded-full filter blur-xs mt-2 group-hover:w-3/4 group-hover:bg-stone-900/15 transition-all" />

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

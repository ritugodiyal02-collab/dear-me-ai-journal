import React, { useState } from 'react';
import { JournalReflection } from '../types';
import { 
  Search, 
  Trash2, 
  Bookmark, 
  MoreVertical, 
  X,
  BookOpen
} from 'lucide-react';

interface HistorySidebarProps {
  reflections: JournalReflection[];
  selectedId: string | null;
  onSelect: (reflection: JournalReflection) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onNewEntry?: () => void;
  isLoading: boolean;
}

export function HistorySidebar({
  reflections,
  selectedId,
  onSelect,
  onDelete,
  isLoading
}: HistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Filter reflections based on search
  const filtered = reflections.filter((r) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(query) ||
      r.content.toLowerCase().includes(query) ||
      (r.summary && r.summary.toLowerCase().includes(query)) ||
      (r.tags && r.tags.some(t => t.toLowerCase().includes(query)))
    );
  });

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDay = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.getDate().toString().padStart(2, '0');
  };

  const formatMonth = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-US', { month: 'short' });
  };

  return (
    <aside className="w-full h-full flex flex-col bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden text-stone-800 transition-all min-w-0">
      
      {/* Header: Title + Subtitle + Search Icon */}
      <div className="p-4 border-b border-stone-100 bg-white min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-base text-stone-900 tracking-tight truncate">
            Past Reflections
          </h3>
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            title="Search reflections"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer shrink-0"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-stone-400 font-normal mt-0.5 truncate">
          Your stories, always with you.
        </p>

        {/* Expandable Search Input */}
        {isSearchOpen && (
          <div className="relative mt-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="history-search-input"
              type="text"
              placeholder="Search reflections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#3f5241] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reflections List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 min-h-0 scrapbook-page-scroll min-w-0">
        {isLoading ? (
          <div className="text-center py-12 text-stone-400 text-xs">
            <div className="w-5 h-5 border-2 border-[#3f5241] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading reflections...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4 text-stone-400">
            <div className="w-10 h-10 rounded-full bg-[#f7f4ed] border border-[#e7e3d8] flex items-center justify-center text-[#526e54] mx-auto mb-2">
              <BookOpen className="w-5 h-5 opacity-70" />
            </div>
            <p className="text-xs font-semibold text-stone-700">No reflections found</p>
            <p className="text-[11px] text-stone-400 mt-1">
              {searchQuery ? 'Try a different keyword' : 'Create your first reflection to begin.'}
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isSelected = item.id === selectedId;
            const snippet = item.summary || item.content.replace(/^[#*\-\s]+/, '') || 'A quiet space for thought...';

            return (
              <div
                key={item.id}
                id={`history-item-${item.id}`}
                onClick={() => onSelect(item)}
                className={`group relative flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer text-left w-full min-w-0 overflow-hidden ${
                  isSelected
                    ? 'bg-[#edf3ec] border-[#d2dfd1] shadow-2xs'
                    : 'bg-white hover:bg-[#faf9f5] border-stone-200/60 hover:border-stone-200 shadow-2xs'
                }`}
              >
                {/* Calm Editorial Date Tile (replaces image thumbnail with clean journal typography) */}
                <div
                  className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 border transition-all ${
                    isSelected
                      ? 'bg-white border-[#c9d8c8] text-[#2d3e30] shadow-2xs'
                      : 'bg-[#f7f5ed] border-[#e8e4d8] text-stone-700 group-hover:bg-white group-hover:border-stone-200'
                  }`}
                >
                  <span className="text-[9px] font-sans font-bold uppercase tracking-wider leading-none text-stone-400 group-hover:text-stone-500">
                    {formatMonth(item.updatedAt || item.createdAt)}
                  </span>
                  <span className="text-sm font-serif font-bold leading-tight mt-0.5">
                    {formatDay(item.updatedAt || item.createdAt)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pr-1 overflow-hidden">
                  <div className="flex items-center justify-between gap-1 min-w-0">
                    <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900 group-hover:text-stone-950 truncate leading-snug">
                      {item.title || 'Untitled Reflection'}
                    </h4>

                    <div className="shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {isSelected && (
                        <Bookmark className="w-3.5 h-3.5 fill-[#3f5241] text-[#3f5241] shrink-0" />
                      )}

                      {/* Options Dropdown */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === item.id ? null : item.id);
                          }}
                          title="Options"
                          className="p-1 rounded-md text-stone-300 hover:text-stone-600 hover:bg-stone-200/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {menuOpenId === item.id && (
                          <div className="absolute right-0 top-6 z-30 bg-white border border-stone-200 rounded-xl shadow-lg py-1 w-28 text-xs animate-in fade-in duration-100">
                            <button
                              onClick={(e) => {
                                setMenuOpenId(null);
                                onDelete(item.id, e);
                              }}
                              className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metadata: Date and optional Mode / Tags */}
                  <p className="text-[11px] text-stone-400 font-normal leading-tight mt-0.5 truncate flex items-center gap-1">
                    <span>{formatDate(item.updatedAt || item.createdAt)}</span>
                    {item.mode && (
                      <>
                        <span>•</span>
                        <span className="capitalize text-stone-500 font-medium">{item.mode.replace('_', ' ')}</span>
                      </>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-stone-500">#{item.tags[0]}</span>
                      </>
                    )}
                  </p>

                  {/* Single-line snippet with ellipsis */}
                  <p className="text-[11px] text-stone-500 truncate leading-tight mt-1 font-normal block max-w-full">
                    {snippet}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Mindful Quote Card matching image.png */}
      <div className="mt-auto p-3 m-2.5 rounded-xl bg-[#f7f5ed] border border-[#e8e4d8] flex items-center gap-2.5 shrink-0 min-w-0">
        <div className="text-[#526e54] shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" stroke="none">
            <path d="M12 2C9 5 5 9 6 14c.5 2.5 2 4.5 4 5.5-1-2-1-4.5 0-6.5C11 10 13 8 16 6c-1.5 2.5-1.8 5-1 7 .8 2 2.5 3.5 4.5 4-1-3-1-6.5-1-9-3-2.5-5-4.5-6.5-6z" opacity="0.85" />
            <path d="M7 17c1.5 1.5 3.5 2 5.5 1.5-1-1-1.5-2.2-1.5-3.5-2 .5-3.5 1-4 2z" opacity="0.6" />
          </svg>
        </div>
        <p className="font-serif italic text-xs text-stone-600 leading-snug min-w-0 truncate">
          &ldquo;A more mindful me, for a brighter tomorrow.&rdquo;
        </p>
      </div>

    </aside>
  );
}

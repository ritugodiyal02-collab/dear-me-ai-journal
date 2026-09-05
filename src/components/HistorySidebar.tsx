import React, { useState } from 'react';
import { JournalReflection, AIMode } from '../types';
import { 
  Search, 
  Trash2, 
  BookMarked, 
  Compass, 
  Lightbulb, 
  ListChecks, 
  Sparkles,
  MessageCircle,
  Coffee,
  Bookmark,
  MoreVertical,
  Plus,
  Shield,
  SlidersHorizontal
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
  onNewEntry,
  isLoading
}: HistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'reflections' | 'plans' | 'insights'>('all');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Filter reflections based on search and active tab filter
  const filtered = reflections.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.summary && r.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.tags && r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;

    if (activeFilter === 'reflections') {
      return r.mode === 'reflect' || !r.mode;
    }
    if (activeFilter === 'plans') {
      return r.mode === 'action_plan' || (r.actionItems && r.actionItems.length > 0);
    }
    if (activeFilter === 'insights') {
      return (r.keyInsights && r.keyInsights.length > 0) || r.mode === 'summarize' || r.mode === 'brainstorm';
    }

    return true;
  });

  const getModeBadge = (mode: AIMode) => {
    switch (mode) {
      case 'brainstorm':
        return { 
          label: 'Brainstorm', 
          icon: Lightbulb, 
          style: 'bg-amber-50 text-amber-900 border-amber-200' 
        };
      case 'summarize':
        return { 
          label: 'Summary', 
          icon: Sparkles, 
          style: 'bg-stone-100 text-stone-800 border-stone-200' 
        };
      case 'action_plan':
        return { 
          label: 'Action Plan', 
          icon: ListChecks, 
          style: 'bg-emerald-50 text-emerald-800 border-emerald-200/80' 
        };
      default:
        return { 
          label: 'Reflection', 
          icon: Compass, 
          style: 'bg-stone-100 text-stone-700 border-stone-200' 
        };
    }
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Today at ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    }
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <aside className="w-full md:w-80 lg:w-88 flex flex-col bg-stone-50/70 border-r border-stone-200 h-full text-stone-800 transition-colors">
      
      {/* Header & Search */}
      <div className="p-4 border-b border-stone-200 space-y-3 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-stone-900">
            <BookMarked className="w-4 h-4 text-emerald-700" />
            <h3 className="font-serif-title font-bold text-sm">Past Reflections</h3>
          </div>
          <span className="text-xs text-stone-700 font-semibold px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200">
            {reflections.length}
          </span>
        </div>

        {/* Pill Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="history-search-input"
            type="text"
            placeholder="Search entries, tags, or insights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-full text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-700 focus:bg-white transition-all"
          />
        </div>

        {/* Filter Chips row matching Mockup: All, Reflections, Plans, Insights */}
        <div className="flex items-center justify-between gap-1 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('reflections')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                activeFilter === 'reflections'
                  ? 'bg-emerald-100 text-emerald-800 font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
              }`}
            >
              Reflections
            </button>
            <button
              onClick={() => setActiveFilter('plans')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                activeFilter === 'plans'
                  ? 'bg-emerald-100 text-emerald-800 font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
              }`}
            >
              Plans
            </button>
            <button
              onClick={() => setActiveFilter('insights')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                activeFilter === 'insights'
                  ? 'bg-emerald-100 text-emerald-800 font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
              }`}
            >
              Insights
            </button>
          </div>
          <button 
            title="Filter options"
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
        {isLoading ? (
          <div className="text-center py-12 text-stone-500 text-xs">
            <div className="w-5 h-5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Gathering your thoughts...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4 text-stone-500">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto mb-3">
              <Coffee className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-xs font-semibold text-stone-800">No reflections found</p>
            <p className="text-[11px] text-stone-500 mt-1 max-w-[200px] mx-auto">
              {searchQuery ? 'Try a different keyword' : 'Create your first journal entry to begin.'}
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isSelected = item.id === selectedId;
            const badge = getModeBadge(item.mode);
            const Icon = badge.icon;
            const msgCount = item.messages?.length || 0;

            return (
              <div
                key={item.id}
                id={`history-item-${item.id}`}
                onClick={() => onSelect(item)}
                className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-white border-emerald-700/80 shadow-md ring-1 ring-emerald-700/20'
                    : 'bg-white hover:bg-stone-50/80 border-stone-200 hover:border-stone-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="font-serif-title text-sm font-bold text-stone-900 line-clamp-1 group-hover:text-emerald-900 transition-colors">
                    {item.title || 'Untitled Reflection'}
                  </h4>
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isSelected && (
                      <Bookmark className="w-3.5 h-3.5 text-emerald-700 fill-emerald-700" />
                    )}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === item.id ? null : item.id);
                        }}
                        title="Options"
                        className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {menuOpenId === item.id && (
                        <div className="absolute right-0 top-6 z-30 bg-white border border-stone-200 rounded-xl shadow-lg py-1 w-28 text-xs">
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

                <p className="text-[11px] text-stone-600 line-clamp-2 mb-2.5 leading-relaxed font-sans">
                  {item.summary || item.content || 'Blank entry... write your thoughts'}
                </p>

                {/* Mode Pill Badge */}
                <div className="mb-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium ${badge.style}`}>
                    <Icon className="w-2.5 h-2.5" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Footer with Chat count and timestamp */}
                <div className="flex items-center justify-between text-[10px] text-stone-400 pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-1 text-stone-500">
                    <MessageCircle className="w-3 h-3 text-emerald-700" />
                    <span className="font-semibold">{msgCount}</span>
                  </div>
                  <span>{formatDate(item.updatedAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Promo & Privacy Section (Pinned at bottom of sidebar) */}
      <div className="shrink-0 p-3.5 border-t border-stone-200 bg-white space-y-3">
        {/* Start a new reflection card */}
        <div className="p-3.5 rounded-2xl bg-stone-50/80 border border-stone-200/90 space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900 leading-tight">Start a new reflection</p>
              <p className="text-[11px] text-stone-500 leading-tight mt-0.5">
                Capture your thoughts and get AI-powered insights.
              </p>
            </div>
          </div>
          {onNewEntry && (
            <button
              onClick={onNewEntry}
              className="w-full py-1.5 px-3 rounded-full border border-emerald-600 hover:bg-emerald-50 text-emerald-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Reflection</span>
            </button>
          )}
        </div>

        {/* Privacy note */}
        <div className="flex items-start gap-2 text-[11px] text-stone-400 px-1">
          <Shield className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-tight">
            Your reflections are private, encrypted, and only visible to you.
          </p>
        </div>
      </div>
    </aside>
  );
}

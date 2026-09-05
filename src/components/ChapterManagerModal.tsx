import React from 'react';
import { X, Trash2, Plus, Sparkles, BookOpen, Layers } from 'lucide-react';
import { ScrapbookSection } from '../types';

interface ChapterManagerModalProps {
  isOpen: boolean;
  sections: ScrapbookSection[];
  currentSpreadIndex: number;
  onClose: () => void;
  onSelectChapter: (index: number) => void;
  onDeleteChapter: (index: number) => void;
  onAddChapter: () => void;
  onCleanDuplicates: () => void;
}

export function ChapterManagerModal({
  isOpen,
  sections,
  currentSpreadIndex,
  onClose,
  onSelectChapter,
  onDeleteChapter,
  onAddChapter,
  onCleanDuplicates
}: ChapterManagerModalProps) {
  if (!isOpen) return null;

  // Check if there are likely duplicates
  const seenHeadings = new Set<string>();
  let hasPotentialDuplicates = false;
  sections.forEach((sec) => {
    const key = (sec.heading || '').trim().toLowerCase();
    if (key && seenHeadings.has(key)) {
      hasPotentialDuplicates = true;
    }
    if (key) seenHeadings.add(key);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-lg bg-[#faf7f0] rounded-2xl border border-[#d8cdbc] shadow-2xl p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#dfd4be]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#3b4834] text-white flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif-title font-bold text-lg text-stone-900 leading-tight">
                Scrapbook Chapters
              </h3>
              <p className="text-xs text-stone-500">
                {sections.length} chapter {sections.length === 1 ? 'spread' : 'spreads'} in this album
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            onClick={onAddChapter}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3b4834] hover:bg-[#2c3727] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Chapter</span>
          </button>

          <button
            onClick={onCleanDuplicates}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Automatically remove redundant or duplicate placeholder chapters"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Clean Redundant Chapters</span>
          </button>
        </div>

        {/* Chapters List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrapbook-page-scroll">
          {sections.map((section, idx) => {
            const isCurrent = currentSpreadIndex === idx + 1;
            const photoUrl = section.photos?.[0]?.url;

            return (
              <div
                key={section.id || idx}
                className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                  isCurrent 
                    ? 'bg-amber-50/80 border-amber-400/80 ring-1 ring-amber-300' 
                    : 'bg-white hover:bg-stone-50/80 border-stone-200'
                }`}
              >
                {/* Chapter Info */}
                <div 
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => {
                    onSelectChapter(idx + 1);
                    onClose();
                  }}
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-md bg-stone-200 overflow-hidden shrink-0 border border-stone-300">
                    {photoUrl ? (
                      <img src={photoUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <BookOpen className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Title & Preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded-sm bg-[#3b4834]/10 text-[#3b4834] text-[10px] font-mono font-bold">
                        CH {idx + 1}
                      </span>
                      <h4 className="font-serif-title font-semibold text-stone-800 text-sm truncate">
                        {section.heading || `Chapter ${idx + 1}`}
                      </h4>
                    </div>
                    <p className="text-[11px] text-stone-500 font-sans truncate mt-0.5">
                      {section.narrative || 'No story written yet.'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      onSelectChapter(idx + 1);
                      onClose();
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      isCurrent 
                        ? 'bg-amber-600 text-white' 
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    {isCurrent ? 'Viewing' : 'Open'}
                  </button>

                  <button
                    onClick={() => onDeleteChapter(idx)}
                    disabled={sections.length <= 1}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      sections.length <= 1
                        ? 'text-stone-300 cursor-not-allowed'
                        : 'text-stone-400 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title={sections.length <= 1 ? 'Albums require at least 1 chapter' : `Delete Chapter ${idx + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[#dfd4be] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

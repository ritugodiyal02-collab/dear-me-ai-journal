import React, { useState, useEffect } from 'react';
import { Sparkles, X, Check, RefreshCw, AlertCircle, Quote } from 'lucide-react';
import { JournalImage, ScrapbookPhoto } from '../types';

interface CaptionSuggestion {
  style: string;
  caption: string;
  reason?: string;
}

interface ScrapbookEnhanceModalProps {
  photo: JournalImage | ScrapbookPhoto | null;
  journalContext?: string;
  onApplyCaption: (newCaption: string) => void;
  onClose: () => void;
}

export function ScrapbookEnhanceModal({
  photo,
  journalContext = '',
  onApplyCaption,
  onClose
}: ScrapbookEnhanceModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CaptionSuggestion[]>([]);
  const [customDraft, setCustomDraft] = useState('');
  const [selectedStyleIndex, setSelectedStyleIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!photo) return;
    setCustomDraft(photo.caption || '');
    generateCaptions();
  }, [photo]);

  const generateCaptions = async () => {
    if (!photo) return;
    setIsLoading(true);
    setError(null);
    setSelectedStyleIndex(null);

    try {
      const resp = await fetch('/api/gemini/enhance-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalCaption: photo.caption || '',
          journalContext: journalContext.slice(0, 1000),
          imageData: photo.url.startsWith('data:') ? photo.url : undefined
        })
      });

      const json = await resp.json();
      if (json.success && json.data?.suggestions) {
        setSuggestions(json.data.suggestions);
      } else {
        setError(json.error || 'Failed to suggest caption enhancements.');
      }
    } catch (err: any) {
      console.error('Caption enhance error:', err);
      setError(err?.message || 'Network error occurred while enhancing caption.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
              <Sparkles className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-serif-title font-bold text-stone-900 text-sm">
                Enhance Photo Caption
              </h3>
              <p className="text-[11px] text-stone-500">
                Gemini suggests poetic, vivid, and reflective descriptions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Photo Thumbnail + Current Caption */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200">
            <img
              src={photo.url}
              alt="Photo preview"
              className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-0.5">
                Current Draft
              </span>
              <p className="text-xs text-stone-800 italic truncate font-serif">
                "{photo.caption || 'No caption yet'}"
              </p>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading ? (
            <div className="py-10 text-center space-y-3">
              <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto" />
              <p className="text-xs text-stone-600 font-medium">
                Gemini is crafting evocative caption variations...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Could not generate suggestions</span>
              </div>
              <p>{error}</p>
              <button
                onClick={generateCaptions}
                className="w-fit px-3 py-1 rounded-lg bg-rose-600 text-white font-medium text-xs mt-1"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900">
                  Select a Variation:
                </span>
                <button
                  onClick={generateCaptions}
                  className="flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 font-medium cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Regenerate</span>
                </button>
              </div>

              {suggestions.map((sug, idx) => {
                const isSelected = selectedStyleIndex === idx;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedStyleIndex(idx);
                      setCustomDraft(sug.caption);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-700'
                        : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                        {sug.style}
                      </span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-800 font-serif leading-relaxed">
                      "{sug.caption}"
                    </p>
                    {sug.reason && (
                      <p className="text-[11px] text-stone-400 mt-1">
                        • {sug.reason}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Editable Fine-Tune Input */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Fine-tune Caption:
                </label>
                <textarea
                  value={customDraft}
                  onChange={(e) => setCustomDraft(e.target.value)}
                  placeholder="Edit or customize caption..."
                  className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-emerald-700 min-h-[70px] resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-stone-200 bg-white text-stone-700 text-xs font-medium hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Keep Original
          </button>

          <button
            onClick={() => {
              if (customDraft.trim()) {
                onApplyCaption(customDraft.trim());
              }
              onClose();
            }}
            disabled={!customDraft.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Apply Caption</span>
          </button>
        </div>

      </div>
    </div>
  );
}

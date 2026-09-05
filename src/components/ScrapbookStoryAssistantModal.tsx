import React, { useState, useEffect } from 'react';
import { Sparkles, X, Check, RefreshCw, AlertCircle, ArrowUpDown, Wand2, Compass } from 'lucide-react';
import { Scrapbook, ScrapbookSection } from '../types';

interface StoryAnalysis {
  assessment: string;
  suggestedTitle?: string;
  suggestedIntro?: string;
  sectionRecommendations: Array<{
    sectionIndex: number;
    suggestedHeading?: string;
    suggestedTransition?: string;
    narrativeTip?: string;
  }>;
  suggestedOrder?: number[];
}

interface ScrapbookStoryAssistantModalProps {
  scrapbook: Scrapbook;
  onApplyImprovements: (improvedScrapbook: Scrapbook) => void;
  onClose: () => void;
}

export function ScrapbookStoryAssistantModal({
  scrapbook,
  onApplyImprovements,
  onClose
}: ScrapbookStoryAssistantModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<StoryAnalysis | null>(null);
  const [userGoal, setUserGoal] = useState('');
  const [applyTitle, setApplyTitle] = useState(true);
  const [applyIntro, setApplyIntro] = useState(true);
  const [applyTransitions, setApplyTransitions] = useState(true);
  const [applyOrder, setApplyOrder] = useState(true);

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const fetchAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const resp = await fetch('/api/gemini/improve-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scrapbook,
          userGoal: userGoal.trim() || undefined
        })
      });

      const json = await resp.json();
      if (json.success && json.analysis) {
        setAnalysis(json.analysis);
      } else {
        setError(json.error || 'Failed to analyze story flow.');
      }
    } catch (err: any) {
      console.error('Story assistant error:', err);
      setError(err?.message || 'Network error occurred while analyzing story.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!analysis) return;

    let updatedScrapbook: Scrapbook = { ...scrapbook };

    if (applyTitle && analysis.suggestedTitle) {
      updatedScrapbook.title = analysis.suggestedTitle;
    }

    if (applyIntro && analysis.suggestedIntro) {
      updatedScrapbook.introduction = analysis.suggestedIntro;
    }

    // Apply section recommendations
    let updatedSections = [...scrapbook.sections];

    if (applyTransitions && analysis.sectionRecommendations) {
      analysis.sectionRecommendations.forEach((rec) => {
        if (updatedSections[rec.sectionIndex]) {
          updatedSections[rec.sectionIndex] = {
            ...updatedSections[rec.sectionIndex],
            heading: rec.suggestedHeading || updatedSections[rec.sectionIndex].heading,
            transition: rec.suggestedTransition || updatedSections[rec.sectionIndex].transition
          };
        }
      });
    }

    // Reorder if selected
    if (applyOrder && analysis.suggestedOrder && analysis.suggestedOrder.length === updatedSections.length) {
      const reordered: ScrapbookSection[] = [];
      analysis.suggestedOrder.forEach((idx) => {
        if (updatedSections[idx]) {
          reordered.push(updatedSections[idx]);
        }
      });
      if (reordered.length === updatedSections.length) {
        updatedSections = reordered;
      }
    }

    updatedScrapbook.sections = updatedSections;
    onApplyImprovements(updatedScrapbook);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
              <Compass className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-serif-title font-bold text-stone-900 text-sm">
                Arrange & Improve Story Flow
              </h3>
              <p className="text-[11px] text-stone-500">
                Gemini curates pacing, chapter sequencing, and transitions
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

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Goal input */}
          <div className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-2xl border border-stone-200">
            <input
              type="text"
              placeholder="Optional focus: e.g. Make it nostalgic, focus on peaceful nature..."
              value={userGoal}
              onChange={(e) => setUserGoal(e.target.value)}
              className="w-full text-xs text-stone-800 placeholder-stone-400 bg-transparent focus:outline-none px-2"
            />
            <button
              onClick={fetchAnalysis}
              disabled={isLoading}
              className="px-3 py-1 rounded-full bg-emerald-800 text-white font-medium text-xs hover:bg-emerald-900 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              Update
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-7 h-7 text-emerald-700 animate-spin mx-auto" />
              <p className="text-xs text-stone-600 font-medium">
                Gemini is analyzing chapter transitions and narrative tempo...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchAnalysis}
                className="px-3 py-1 bg-rose-600 text-white font-semibold rounded-lg text-xs"
              >
                Retry
              </button>
            </div>
          ) : analysis ? (
            <div className="space-y-4 text-xs">
              
              {/* Assessment Callout */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-stone-800 space-y-1">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  Narrative Arc Assessment
                </span>
                <p className="text-xs text-stone-700 leading-relaxed font-serif">
                  {analysis.assessment}
                </p>
              </div>

              {/* Title & Intro Proposal */}
              {analysis.suggestedTitle && (
                <div className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/40 space-y-2">
                  <label className="flex items-center gap-2 font-bold text-stone-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyTitle}
                      onChange={(e) => setApplyTitle(e.target.checked)}
                      className="rounded text-emerald-700 focus:ring-emerald-700"
                    />
                    <span>Suggested Title Upgrade</span>
                  </label>
                  <p className="text-xs font-serif font-bold text-stone-800 pl-5">
                    "{analysis.suggestedTitle}"
                  </p>
                </div>
              )}

              {/* Introduction Proposal */}
              {analysis.suggestedIntro && (
                <div className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/40 space-y-2">
                  <label className="flex items-center gap-2 font-bold text-stone-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyIntro}
                      onChange={(e) => setApplyIntro(e.target.checked)}
                      className="rounded text-emerald-700 focus:ring-emerald-700"
                    />
                    <span>Enhanced Opening Introduction</span>
                  </label>
                  <p className="text-xs font-serif italic text-stone-700 pl-5 leading-relaxed">
                    "{analysis.suggestedIntro}"
                  </p>
                </div>
              )}

              {/* Section Transitions */}
              {analysis.sectionRecommendations.length > 0 && (
                <div className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/40 space-y-2">
                  <label className="flex items-center gap-2 font-bold text-stone-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyTransitions}
                      onChange={(e) => setApplyTransitions(e.target.checked)}
                      className="rounded text-emerald-700 focus:ring-emerald-700"
                    />
                    <span>Connective Transitions ({analysis.sectionRecommendations.length} chapters)</span>
                  </label>
                  <div className="pl-5 space-y-2 pt-1">
                    {analysis.sectionRecommendations.map((rec, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-white border border-stone-200 space-y-1">
                        <span className="font-bold text-[11px] text-stone-800 block">
                          Chapter {rec.sectionIndex + 1}: {rec.suggestedHeading || `Section ${rec.sectionIndex + 1}`}
                        </span>
                        {rec.suggestedTransition && (
                          <p className="text-[11px] text-emerald-900 italic">
                            Bridge: "{rec.suggestedTransition}"
                          </p>
                        )}
                        {rec.narrativeTip && (
                          <p className="text-[11px] text-stone-500">
                            Tip: {rec.narrativeTip}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sequencing option */}
              {analysis.suggestedOrder && analysis.suggestedOrder.length > 1 && (
                <div className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/40 space-y-2">
                  <label className="flex items-center gap-2 font-bold text-stone-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyOrder}
                      onChange={(e) => setApplyOrder(e.target.checked)}
                      className="rounded text-emerald-700 focus:ring-emerald-700"
                    />
                    <span>Optimize Chapter Sequencing for Emotional Flow</span>
                  </label>
                  <p className="text-[11px] text-stone-500 pl-5">
                    Order: {analysis.suggestedOrder.map(i => `Chapter ${i + 1}`).join(' → ')}
                  </p>
                </div>
              )}

            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-stone-200 bg-white text-stone-700 text-xs font-medium hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            disabled={!analysis}
            className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Apply Story Recommendations</span>
          </button>
        </div>

      </div>
    </div>
  );
}

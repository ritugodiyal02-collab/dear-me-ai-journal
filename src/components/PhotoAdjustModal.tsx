import React, { useState } from 'react';
import { X, Check, ZoomIn, ZoomOut, MoveVertical, Maximize, Minimize, RotateCcw } from 'lucide-react';
import { ScrapbookPhoto } from '../types';

interface PhotoAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: ScrapbookPhoto;
  onSave: (adjusted: Partial<ScrapbookPhoto>) => void;
  title?: string;
}

export function PhotoAdjustModal({
  isOpen,
  onClose,
  photo,
  onSave,
  title = 'Adjust Photo Framing & Fit'
}: PhotoAdjustModalProps) {
  const [objectFit, setObjectFit] = useState<'cover' | 'contain'>(photo.objectFit || 'cover');
  const [zoom, setZoom] = useState<number>(photo.zoom ?? 1);
  const [offsetY, setOffsetY] = useState<number>(photo.offsetY ?? 0);
  const [offsetX, setOffsetX] = useState<number>(photo.offsetX ?? 0);

  if (!isOpen) return null;

  const handleReset = () => {
    setObjectFit('cover');
    setZoom(1);
    setOffsetY(0);
    setOffsetX(0);
  };

  const handleApply = () => {
    onSave({
      objectFit,
      zoom,
      offsetY,
      offsetX,
      objectPosition: `${50 + offsetX}% ${50 + offsetY}%`
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-[#faf6ee] rounded-2xl max-w-md w-full shadow-2xl border border-[#d8c8b0] flex flex-col overflow-hidden text-[#2c2217]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#e5d8c3] flex items-center justify-between bg-[#f4ece0]">
          <div>
            <h3 className="font-serif-title font-bold text-base text-stone-900 flex items-center gap-1.5">
              <span>{title}</span>
              <span className="font-handwriting text-rose-500 font-bold">♡</span>
            </h3>
            <p className="text-[11px] text-stone-500 font-hand-casual">
              Fine-tune framing so your memories look just right in the album
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview in Polaroid Frame */}
        <div className="p-4 bg-[#ede4d4] flex flex-col items-center justify-center border-b border-[#e5d8c3]">
          <div className="polaroid-frame bg-white p-2 pb-4 rounded-xs shadow-lg w-52 transform -rotate-1 transition-transform">
            <div className="w-full h-36 bg-[#e8e0d0] rounded-2xs overflow-hidden relative flex items-center justify-center border border-stone-200/50">
              <img
                src={photo.url}
                alt={photo.caption || 'Preview'}
                style={{
                  objectFit: objectFit,
                  transform: `scale(${zoom}) translate(${offsetX * 0.4}%, ${offsetY * 0.4}%)`,
                  transition: 'transform 0.15s ease-out'
                }}
                className="w-full h-full"
              />
            </div>
            <p className="font-handwriting text-xs text-center text-[#3a2e22] mt-2 truncate">
              {photo.caption || 'Captured Memory ♡'}
            </p>
          </div>
          <span className="text-[10px] text-stone-500 font-hand-casual mt-2 italic">
            Live Polaroid Preview
          </span>
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
          
          {/* Fit vs Fill Switcher */}
          <div>
            <label className="block text-xs font-serif font-bold text-stone-800 mb-1.5">
              Photo Fit Mode:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setObjectFit('contain')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  objectFit === 'contain'
                    ? 'bg-[#3b4834] text-white border-[#3b4834] shadow-sm'
                    : 'bg-white border-[#d8c8b0] text-stone-700 hover:bg-stone-50'
                }`}
              >
                <Minimize className="w-3.5 h-3.5" />
                <span>Fit Whole Photo</span>
              </button>

              <button
                type="button"
                onClick={() => setObjectFit('cover')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  objectFit === 'cover'
                    ? 'bg-[#3b4834] text-white border-[#3b4834] shadow-sm'
                    : 'bg-white border-[#d8c8b0] text-stone-700 hover:bg-stone-50'
                }`}
              >
                <Maximize className="w-3.5 h-3.5" />
                <span>Fill Frame</span>
              </button>
            </div>
            <p className="text-[10px] text-stone-500 mt-1 font-hand-casual">
              {objectFit === 'contain' 
                ? '✓ Displays the complete original image with zero cropping.' 
                : '✓ Fills the polaroid edge-to-edge.'}
            </p>
          </div>

          {/* Quick Vertical Framing Buttons */}
          <div>
            <label className="block text-xs font-serif font-bold text-stone-800 mb-1.5">
              Vertical Framing:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setOffsetY(35)}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                  offsetY > 15
                    ? 'bg-amber-100/90 text-amber-950 border-amber-400 font-bold'
                    : 'bg-white border-[#dfd4be] text-stone-600 hover:bg-stone-50'
                }`}
              >
                ▲ Top (Faces)
              </button>
              <button
                type="button"
                onClick={() => setOffsetY(0)}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                  offsetY >= -15 && offsetY <= 15
                    ? 'bg-amber-100/90 text-amber-950 border-amber-400 font-bold'
                    : 'bg-white border-[#dfd4be] text-stone-600 hover:bg-stone-50'
                }`}
              >
                ● Center
              </button>
              <button
                type="button"
                onClick={() => setOffsetY(-35)}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                  offsetY < -15
                    ? 'bg-amber-100/90 text-amber-950 border-amber-400 font-bold'
                    : 'bg-white border-[#dfd4be] text-stone-600 hover:bg-stone-50'
                }`}
              >
                ▼ Bottom
              </button>
            </div>

            {/* Slider for fine adjustment */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-stone-500 font-mono shrink-0">Bottom</span>
              <input
                type="range"
                min={-50}
                max={50}
                step={2}
                value={offsetY}
                onChange={(e) => setOffsetY(Number(e.target.value))}
                className="w-full accent-[#3b4834] cursor-pointer"
              />
              <span className="text-[10px] text-stone-500 font-mono shrink-0">Top</span>
            </div>
          </div>

          {/* Zoom Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-serif font-bold text-stone-800 flex items-center gap-1">
                <ZoomIn className="w-3.5 h-3.5 text-stone-600" />
                <span>Zoom Scale:</span>
              </label>
              <span className="text-[11px] font-mono text-stone-600">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ZoomOut className="w-3 h-3 text-stone-400" />
              <input
                type="range"
                min={0.7}
                max={1.6}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-[#3b4834] cursor-pointer"
              />
              <ZoomIn className="w-3 h-3 text-stone-400" />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-[#e5d8c3] bg-[#f4ece0] flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-full border border-[#d8c8b0] text-stone-700 bg-white hover:bg-stone-50 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded-full bg-[#3b4834] hover:bg-[#2c3727] text-white text-xs font-semibold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Adjustment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

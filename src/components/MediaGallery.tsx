import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Plus, Trash2, X, Sparkles, ZoomIn } from 'lucide-react';
import { JournalImage } from '../types';

interface MediaGalleryProps {
  images: JournalImage[];
  onAddImages: (newImages: JournalImage[]) => void;
  onRemoveImage: (id: string) => void;
  onUpdateImageCaption: (id: string, caption: string) => void;
  onEnhanceCaptionTrigger?: (image: JournalImage) => void;
}

/**
 * Optimizes an uploaded image via HTML Canvas to avoid storing massive raw files
 * while preserving high fidelity, crisp polaroid rendering, and staying well under Firestore limits.
 */
export async function compressImageFile(file: File, maxDimension: number = 800): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ base64: e.target?.result as string, mimeType: 'image/jpeg' });
          return;
        }

        // Fill background with white for transparency compatibility
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Always convert to compressed JPEG (PNG ignores quality in canvas and creates multi-megabyte payloads)
        let base64 = canvas.toDataURL('image/jpeg', 0.72);

        // Defensive second-pass downscaling if still over 120KB
        if (base64.length > 160000 && (width > 500 || height > 500)) {
          const smallCanvas = document.createElement('canvas');
          const scale = 0.7;
          smallCanvas.width = Math.round(width * scale);
          smallCanvas.height = Math.round(height * scale);
          const sCtx = smallCanvas.getContext('2d');
          if (sCtx) {
            sCtx.fillStyle = '#FFFFFF';
            sCtx.fillRect(0, 0, smallCanvas.width, smallCanvas.height);
            sCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
            base64 = smallCanvas.toDataURL('image/jpeg', 0.65);
          }
        }

        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.onerror = () => resolve({ base64: e.target?.result as string, mimeType: 'image/jpeg' });
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function MediaGallery({
  images,
  onAddImages,
  onRemoveImage,
  onUpdateImageCaption,
  onEnhanceCaptionTrigger
}: MediaGalleryProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState<JournalImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    const newImageItems: JournalImage[] = [];

    for (const file of validFiles) {
      try {
        const { base64, mimeType } = await compressImageFile(file);
        newImageItems.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          url: base64,
          name: file.name,
          mimeType,
          caption: ''
        });
      } catch (err) {
        console.error('Error processing image:', err);
      }
    }

    if (newImageItems.length > 0) {
      onAddImages(newImageItems);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-3 pb-12">
      {/* Upload Zone & Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-stone-700 text-xs font-semibold">
          <ImageIcon className="w-4 h-4 text-emerald-700" />
          <span>Photos & Visual Memories ({images.length})</span>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Photos</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
      </div>

      {/* Drag and Drop Box or Photos Grid */}
      {images.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-emerald-700 bg-emerald-50/50'
              : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 hover:bg-stone-50'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-emerald-800 mx-auto mb-2 shadow-2xs">
            <ImageIcon className="w-5 h-5 text-emerald-700" />
          </div>
          <p className="text-xs font-semibold text-stone-800">
            Drop photos here, or <span className="text-emerald-800 underline">browse</span>
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            Capture scenes, moments, tickets, or feelings to ground your reflection
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="group relative rounded-xl border border-stone-200 bg-white overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col"
            >
              {/* Image Preview Thumbnail */}
              <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                <img
                  src={img.url}
                  alt={img.caption || `Photo ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />

                {/* Top Action Overlay */}
                <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewImage(img)}
                    title="Enlarge Photo"
                    className="w-8 h-8 rounded-full bg-white/90 text-stone-800 hover:bg-white flex items-center justify-center shadow-md transition-all cursor-pointer"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemoveImage(img.id)}
                    title="Remove Photo"
                    className="w-8 h-8 rounded-full bg-white/90 text-rose-600 hover:bg-white flex items-center justify-center shadow-md transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Caption Input Row */}
              <div className="p-2 bg-white flex flex-col gap-1.5 border-t border-stone-100">
                <div className="flex items-center justify-between gap-1">
                  <input
                    type="text"
                    placeholder="Add caption..."
                    value={img.caption || ''}
                    onChange={(e) => onUpdateImageCaption(img.id, e.target.value)}
                    className="w-full text-xs text-stone-800 placeholder-stone-400 bg-transparent focus:outline-none"
                  />

                  {onEnhanceCaptionTrigger && (
                    <button
                      type="button"
                      onClick={() => onEnhanceCaptionTrigger(img)}
                      title="✨ Enhance Caption with Gemini"
                      className="p-1 text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Additional Add Button Box */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-4/3 rounded-xl border-2 border-dashed border-stone-200 hover:border-stone-300 hover:bg-stone-50 flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-stone-600 transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-5 h-5" />
            <span className="text-[11px] font-medium">Add more</span>
          </button>
        </div>
      )}

      {/* Lightbox Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-stone-900/70 text-white hover:bg-stone-900 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex-1 overflow-auto flex items-center justify-center bg-stone-950 p-2">
              <img
                src={previewImage.url}
                alt={previewImage.caption || 'Enlarged photo'}
                className="max-h-[75vh] w-auto object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-between">
              <div className="flex-1 pr-4">
                <input
                  type="text"
                  placeholder="Add a rich caption to remember this moment..."
                  value={previewImage.caption || ''}
                  onChange={(e) => {
                    onUpdateImageCaption(previewImage.id, e.target.value);
                    setPreviewImage({ ...previewImage, caption: e.target.value });
                  }}
                  className="w-full text-sm text-stone-900 placeholder-stone-400 bg-transparent focus:outline-none font-serif-title"
                />
              </div>

              {onEnhanceCaptionTrigger && (
                <button
                  type="button"
                  onClick={() => {
                    const current = previewImage;
                    setPreviewImage(null);
                    onEnhanceCaptionTrigger(current);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Enhance Caption</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

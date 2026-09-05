import React, { useState } from 'react';
import { X, Upload, Image as ImageIcon, Sparkles, Check, Link as LinkIcon, Camera } from 'lucide-react';

interface PhotoPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhoto: (photoUrl: string, caption?: string) => void;
  title?: string;
}

interface CuratedCategory {
  name: string;
  photos: Array<{
    url: string;
    caption: string;
    tag: string;
  }>;
}

const CURATED_CATEGORIES: CuratedCategory[] = [
  {
    name: 'Heritage & Palaces',
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1000&q=80',
        caption: 'Golden Palaces of Rajasthan ♡',
        tag: 'Heritage'
      },
      {
        url: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1000&q=80',
        caption: 'Majestic Fort in Amber Light ✨',
        tag: 'Architecture'
      },
      {
        url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1000&q=80',
        caption: 'Historic Arches & Symmetry ♡',
        tag: 'Heritage'
      },
      {
        url: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1000&q=80',
        caption: 'Ancient Courtyard at Sunset ☼',
        tag: 'Palace'
      }
    ]
  },
  {
    name: 'Nature & Mountains',
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80',
        caption: 'Alpine Pines & Mountain Mist 🌲',
        tag: 'Mountains'
      },
      {
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
        caption: 'Serene Valley Reflections ⛰️',
        tag: 'Nature'
      },
      {
        url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1000&q=80',
        caption: 'Wildflowers in the Meadow 🌼',
        tag: 'Floral'
      },
      {
        url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1000&q=80',
        caption: 'Snowy Peak Under Starlight ✨',
        tag: 'Night'
      }
    ]
  },
  {
    name: 'Ocean & Sunsets',
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
        caption: 'Gentle Waves at Golden Hour 🌊',
        tag: 'Coast'
      },
      {
        url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1000&q=80',
        caption: 'Dusk Over the Pacific 🌅',
        tag: 'Sunset'
      },
      {
        url: 'https://images.unsplash.com/photo-1509233725247-49e657c54213?auto=format&fit=crop&w=1000&q=80',
        caption: 'Sandy Footsteps & Warm Breeze 🐚',
        tag: 'Beach'
      },
      {
        url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1000&q=80',
        caption: 'Sailing Along the Horizon ⛵',
        tag: 'Travel'
      }
    ]
  },
  {
    name: 'Cozy & Moments',
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80',
        caption: 'Warm Espresso & Quiet Pages ☕',
        tag: 'Cozy'
      },
      {
        url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1000&q=80',
        caption: 'Celebrations with Confetti & Friends 🎉',
        tag: 'Moments'
      },
      {
        url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=80',
        caption: 'Spontaneous Laughter & Sunshine ♡',
        tag: 'Portraits'
      },
      {
        url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1000&q=80',
        caption: 'Sunlight Filtered Through Autumn Leaves 🍂',
        tag: 'Peaceful'
      }
    ]
  }
];

export function PhotoPickerModal({
  isOpen,
  onClose,
  onSelectPhoto,
  title = 'Add Photo to Scrapbook'
}: PhotoPickerModalProps) {
  const [activeTab, setActiveTab] = useState<'curated' | 'upload' | 'url'>('curated');
  const [selectedCategory, setSelectedCategory] = useState(CURATED_CATEGORIES[0].name);
  const [customUrl, setCustomUrl] = useState('');
  const [customCaption, setCustomCaption] = useState('');
  const [previewError, setPreviewError] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      onSelectPhoto(url, customCaption.trim() || file.name.replace(/\.[^/.]+$/, '') || 'Memory Photo ♡');
      onClose();
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (!customUrl.trim()) return;
    onSelectPhoto(customUrl.trim(), customCaption.trim() || 'Treasured Memory ♡');
    onClose();
  };

  const currentCategoryData = CURATED_CATEGORIES.find((c) => c.name === selectedCategory) || CURATED_CATEGORIES[0];

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#fdfaf5] rounded-3xl shadow-2xl border border-[#ded4be] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#dfd4be] flex items-center justify-between bg-[#f4ece0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#3b4834] text-white flex items-center justify-center shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif-title font-bold text-stone-900 text-base sm:text-lg">
                {title}
              </h2>
              <p className="text-xs text-stone-500 font-hand-casual">
                Upload your photos or choose from curated nostalgic imagery
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

        {/* Tab Selection */}
        <div className="flex border-b border-[#ded4be] px-6 bg-white/70">
          <button
            onClick={() => setActiveTab('curated')}
            className={`flex items-center gap-1.5 py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'curated'
                ? 'border-amber-800 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Curated Collection</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'border-amber-800 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-700" />
            <span>Upload From Device</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-1.5 py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'border-amber-800 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5 text-blue-700" />
            <span>Web Link (URL)</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* TAB 1: CURATED COLLECTION */}
          {activeTab === 'curated' && (
            <div className="space-y-4">
              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5">
                {CURATED_CATEGORIES.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      selectedCategory === cat.name
                        ? 'bg-[#3b4834] text-white shadow-2xs'
                        : 'bg-white border border-[#ded4be] text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Photos Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {currentCategoryData.photos.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      onSelectPhoto(item.url, item.caption);
                      onClose();
                    }}
                    className="group relative bg-white p-1.5 pb-2.5 rounded-lg border border-[#dfd4be] shadow-xs hover:shadow-md hover:border-amber-600 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="relative aspect-square w-full rounded-md overflow-hidden bg-stone-100">
                      <img
                        src={item.url}
                        alt={item.caption}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="px-2 py-1 rounded-full bg-white text-stone-900 text-[10px] font-bold shadow-xs">
                          Select Photo ♡
                        </span>
                      </div>
                    </div>
                    <p className="font-handwriting text-[11px] text-center text-stone-700 mt-1.5 line-clamp-1">
                      {item.caption}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD FROM DEVICE */}
          {activeTab === 'upload' && (
            <div className="space-y-4 text-center">
              <label className="border-2 border-dashed border-[#cbbca3] hover:border-amber-700 bg-white/60 hover:bg-amber-50/40 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center mb-3 shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="font-serif font-bold text-stone-900 text-sm mb-1">
                  Click to choose a photo or drag and drop
                </h4>
                <p className="text-xs text-stone-500 max-w-sm mb-3">
                  PNG, JPG, WEBP or GIF from your phone, camera, or computer
                </p>
                <span className="px-4 py-1.5 rounded-full bg-[#3b4834] text-white text-xs font-semibold shadow-xs">
                  Browse Files
                </span>
              </label>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 text-left">
                  Optional Handwritten Caption:
                </label>
                <input
                  type="text"
                  placeholder="e.g. A sunset we'll never forget ♡"
                  value={customCaption}
                  onChange={(e) => setCustomCaption(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-[#d6c7b0] rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-600"
                />
              </div>
            </div>
          )}

          {/* TAB 3: WEB LINK (URL) */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                  Image Direct URL:
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={customUrl}
                  onChange={(e) => {
                    setCustomUrl(e.target.value);
                    setPreviewError(false);
                  }}
                  className="w-full px-3.5 py-2 bg-white border border-[#d6c7b0] rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-600"
                />
              </div>

              <div>
                <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                  Photo Caption:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stepping into the morning light ✨"
                  value={customCaption}
                  onChange={(e) => setCustomCaption(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-[#d6c7b0] rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-600"
                />
              </div>

              {customUrl && !previewError && (
                <div className="p-3 bg-white rounded-xl border border-[#dfd4be] flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                    <img
                      src={customUrl}
                      alt="Preview"
                      onError={() => setPreviewError(true)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-xs text-stone-700 flex-1">
                    <p className="font-semibold text-emerald-800">✓ Image Preview Loaded</p>
                    <p className="font-handwriting text-stone-500 mt-0.5">{customCaption || 'Untitled Photo'}</p>
                  </div>
                </div>
              )}

              {previewError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                  Could not load preview for this image link. Please verify the URL.
                </p>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleApplyCustomUrl}
                  disabled={!customUrl.trim()}
                  className="px-5 py-2 rounded-full bg-[#3b4834] hover:bg-[#2e3a29] text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Use This Image
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

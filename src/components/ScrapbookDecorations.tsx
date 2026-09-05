import React from 'react';

// =========================================================
// 1. PRESSED BOTANICALS & FLOWERS (Realistic SVG Botanical Assets)
// =========================================================

export function DaisyFlower({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} filter drop-shadow-sm select-none pointer-events-none`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <g opacity="0.95">
        {/* Stem & Leaves */}
        <path d="M50 50 Q 52 75 48 95" stroke="#4a6344" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M50 70 Q 62 65 65 58 Q 58 66 50 72" fill="#587950" />
        <path d="M49 80 Q 38 78 35 70 Q 42 77 49 82" fill="#587950" />
        
        {/* Petals */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
          <ellipse
            key={i}
            cx="50"
            cy="28"
            rx="5"
            ry="18"
            fill={i % 2 === 0 ? "#fdfbf7" : "#faf5eb"}
            stroke="#e4dbcb"
            strokeWidth="0.5"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}
        {/* Flower Center with dried pollen texture */}
        <circle cx="50" cy="50" r="11" fill="#eab308" />
        <circle cx="50" cy="50" r="9.5" fill="#ca8a04" />
        <circle cx="48.5" cy="48.5" r="7" fill="#eab308" opacity="0.8" />
        <circle cx="51" cy="51" r="4" fill="#a16207" opacity="0.6" />
      </g>
    </svg>
  );
}

export function LavenderSprig({ className = "w-8 h-20" }: { className?: string }) {
  return (
    <svg viewBox="0 0 50 120" className={`${className} filter drop-shadow-xs select-none pointer-events-none`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Stem */}
      <path d="M25 115 Q 24 60 26 15" stroke="#5a7052" strokeWidth="2" strokeLinecap="round" />
      {/* Lavender Florets */}
      {[20, 28, 36, 44, 52, 60, 68, 76].map((y, i) => (
        <g key={i}>
          <ellipse cx="20" cy={y} rx="4.5" ry="3" fill="#8b5cf6" transform={`rotate(-25 20 ${y})`} opacity="0.9" />
          <ellipse cx="30" cy={y + 2} rx="4.5" ry="3" fill="#7c3aed" transform={`rotate(25 30 ${y+2})`} opacity="0.85" />
          <ellipse cx="25" cy={y - 3} rx="3.5" ry="2.5" fill="#a78bfa" opacity="0.95" />
        </g>
      ))}
      <ellipse cx="25" cy="15" rx="3" ry="4" fill="#8b5cf6" />
      {/* Thin Leaves */}
      <path d="M25 85 Q 15 80 12 70" stroke="#5a7052" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M25 95 Q 35 90 38 82" stroke="#5a7052" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function WildflowerBouquet({ className = "w-10 h-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 100" className={`${className} filter drop-shadow-xs select-none pointer-events-none`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 95 Q 26 60 22 25" stroke="#4b6045" strokeWidth="1.8" />
      <path d="M30 95 Q 32 60 38 30" stroke="#4b6045" strokeWidth="1.8" />
      <path d="M30 95 Q 30 50 30 20" stroke="#4b6045" strokeWidth="1.8" />
      {/* Pink & Peach dried buds */}
      <circle cx="22" cy="25" r="5" fill="#f43f5e" opacity="0.85" />
      <circle cx="38" cy="30" r="5.5" fill="#fb923c" opacity="0.85" />
      <circle cx="30" cy="20" r="6" fill="#ec4899" opacity="0.85" />
      <circle cx="30" cy="20" r="2.5" fill="#fef08a" />
      <circle cx="22" cy="25" r="2" fill="#fef08a" />
      <circle cx="38" cy="30" r="2" fill="#fef08a" />
    </svg>
  );
}

export function GreenPressedLeaf({ className = "w-6 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 80" className={`${className} filter drop-shadow-xs select-none pointer-events-none`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 75 Q 19 40 20 5" stroke="#4d6648" strokeWidth="1.5" />
      <path d="M20 5 C 35 25 35 50 20 65 C 5 50 5 25 20 5 Z" fill="#5f8358" opacity="0.88" />
      {/* Leaf veins */}
      <path d="M20 20 L 28 15 M20 30 L 30 24 M20 40 L 29 35 M20 25 L 11 20 M20 35 L 10 30 M20 45 L 11 40" stroke="#40593b" strokeWidth="0.8" opacity="0.7" />
    </svg>
  );
}

// =========================================================
// 2. WASHI TAPE & ADHESIVE STRIPS
// =========================================================

export function WashiTapeStrip({ 
  color = 'kraft', 
  className = "w-24 h-6",
  rotation = 0,
  label
}: { 
  color?: 'kraft' | 'pink' | 'mint' | 'yellow' | 'gingham'; 
  className?: string;
  rotation?: number;
  label?: string;
}) {
  const bgStyles = {
    kraft: 'bg-amber-100/80 border-amber-200/90 text-amber-900',
    pink: 'bg-rose-200/80 border-rose-300/90 text-rose-950',
    mint: 'bg-emerald-200/80 border-emerald-300/90 text-emerald-950',
    yellow: 'bg-amber-200/85 border-amber-300/90 text-amber-950',
    gingham: 'bg-[#fde2e4]/90 border-rose-200 text-rose-900'
  }[color];

  return (
    <div 
      style={{ transform: `rotate(${rotation}deg)` }}
      className={`relative inline-flex items-center justify-center px-3 py-1 text-xs font-hand-casual shadow-2xs backdrop-blur-xs select-none border-t border-b ${bgStyles} ${className}`}
    >
      {/* Jagged / torn left and right edges */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-r from-black/10 to-transparent opacity-30" />
      <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-l from-black/10 to-transparent opacity-30" />
      {label && <span className="font-handwriting font-bold text-sm tracking-wide">{label}</span>}
    </div>
  );
}

// =========================================================
// 3. PAPER CLIPS & BRASS PINS
// =========================================================

export function PaperClip({ className = "w-6 h-12", color = "silver" }: { className?: string; color?: "silver" | "gold" }) {
  const strokeColor = color === "gold" ? "#d97706" : "#94a3b8";
  return (
    <svg viewBox="0 0 30 65" className={`${className} filter drop-shadow-md select-none pointer-events-none`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 20 V 48 C 10 55 20 55 20 48 V 12 C 20 4 5 4 5 12 V 52 C 5 62 25 62 25 52 V 22"
        stroke={strokeColor}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrassPin({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <div className={`rounded-full bg-gradient-to-br from-amber-300 via-amber-600 to-amber-900 shadow-md border border-amber-700/50 flex items-center justify-center ${className}`}>
      <div className="w-1.5 h-1.5 rounded-full bg-amber-200/80 shadow-inner" />
    </div>
  );
}

// =========================================================
// 4. VINTAGE TRAVEL STAMPS & POSTAL MARKS
// =========================================================

export function TravelCircularStamp({ 
  text = "MEMORIES KEEPING",
  subtext = "AIR MAIL",
  className = "w-24 h-24",
  color = "#854d0e"
}: { 
  text?: string; 
  subtext?: string;
  className?: string; 
  color?: string;
}) {
  return (
    <svg viewBox="0 0 120 120" className={`${className} select-none pointer-events-none opacity-85 transform -rotate-12`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer & Inner stamped rings */}
      <circle cx="60" cy="60" r="54" stroke={color} strokeWidth="2.2" strokeDasharray="4 2" />
      <circle cx="60" cy="60" r="46" stroke={color} strokeWidth="1.5" />
      <circle cx="60" cy="60" r="28" stroke={color} strokeWidth="1" strokeDasharray="3 3" />
      
      {/* Airplane Icon */}
      <path d="M60 45 L 63 56 L 74 58 L 64 62 L 66 73 L 60 67 L 54 73 L 56 62 L 46 58 L 57 56 Z" fill={color} />
      
      {/* Curving Text / Stamped text */}
      <text fill={color} fontSize="9" fontWeight="bold" fontFamily="Courier Prime, monospace" textAnchor="middle" letterSpacing="2">
        <textPath href="#circlePathTop" startOffset="50%">
          {text}
        </textPath>
      </text>
      <text fill={color} fontSize="8" fontWeight="bold" fontFamily="Courier Prime, monospace" textAnchor="middle" letterSpacing="1.5">
        <textPath href="#circlePathBottom" startOffset="50%">
          {subtext}
        </textPath>
      </text>
      
      <defs>
        <path id="circlePathTop" d="M 22,60 A 38,38 0 0,1 98,60" fill="none" />
        <path id="circlePathBottom" d="M 98,60 A 38,38 0 0,1 22,60" fill="none" />
      </defs>
    </svg>
  );
}

export function PostageFloralStamp({ className = "w-14 h-16", value = "★" }: { className?: string; value?: string }) {
  return (
    <div className={`relative bg-[#fbf8f2] border-2 border-dashed border-rose-300 p-2 flex flex-col items-center justify-between shadow-xs ${className}`}>
      <span className="text-[9px] font-mono text-rose-800 font-bold self-start">POSTAGE</span>
      <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 text-sm">
        🌸
      </div>
      <span className="text-[10px] font-bold font-handwriting text-rose-900">{value}</span>
    </div>
  );
}

// =========================================================
// 5. VINTAGE TICKET STUB (Udaipur / Travel Stub)
// =========================================================

export function TravelTicketStub({
  location = "UDAIPUR",
  date = "12 MAR 2026",
  title = "ADMIT ONE",
  className = "w-36"
}: {
  location?: string;
  date?: string;
  title?: string;
  className?: string;
}) {
  return (
    <div className={`relative bg-[#f5ede0] border border-[#d6c7b2] rounded-xs p-1.5 shadow-2xs font-typewriter text-[#4a3b2c] ${className}`}>
      {/* Side notches */}
      <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#faf6ee] border-r border-[#d6c7b2]" />
      <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#faf6ee] border-l border-[#d6c7b2]" />
      
      <div className="flex items-center justify-between border-b border-dashed border-[#c5b59e] pb-0.5 mb-1">
        <span className="text-[10px] font-bold tracking-wider uppercase truncate max-w-[85px]">{location}</span>
        <span className="text-[8px] text-stone-500">MEMORIES</span>
      </div>

      <div className="flex items-center justify-between text-[9px] mb-1">
        <div>
          <span className="text-[7px] text-stone-400 block uppercase leading-none">DATE:</span>
          <span className="font-bold">{date}</span>
        </div>
        <div className="text-right">
          <span className="text-[7px] text-stone-400 block uppercase leading-none">STATUS:</span>
          <span className="text-emerald-800 font-bold">SAVED</span>
        </div>
      </div>

      {/* Barcode line mock */}
      <div className="flex items-center justify-between pt-0.5 border-t border-stone-300/80">
        <div className="flex gap-0.5 h-2">
          {[2,1,3,1,2,3,1,2,1,2,2,1,2,3,1].map((w, idx) => (
            <div key={idx} className="bg-stone-700 h-full" style={{ width: `${w * 1.1}px` }} />
          ))}
        </div>
        <span className="text-[7px] text-stone-500 font-mono">№ 849204</span>
      </div>
    </div>
  );
}

// =========================================================
// 6. POST-IT / STICKY NOTES WITH HANDWRITTEN EMOTIONS & PINS
// =========================================================

export function StickyNote({
  text,
  color = 'mint',
  rotation = 0,
  className = "w-32 p-2",
  withPin = true,
  onDelete,
  onChange,
  onColorChange,
  isEditing = false
}: {
  text: string;
  color?: 'yellow' | 'pink' | 'mint';
  rotation?: number;
  className?: string;
  withPin?: boolean;
  onDelete?: () => void;
  onChange?: (newText: string) => void;
  onColorChange?: (newColor: 'yellow' | 'pink' | 'mint') => void;
  isEditing?: boolean;
}) {
  const colorClass = {
    yellow: 'bg-[#fef08a] border border-[#fde047] text-amber-950 shadow-2xs',
    pink: 'bg-[#fbcfe8] border border-[#f472b6] text-rose-950 shadow-2xs',
    mint: 'bg-[#c5ead5] border border-[#aedec1] text-[#1c4731] shadow-2xs'
  }[color] || 'bg-[#c5ead5] border border-[#aedec1] text-[#1c4731] shadow-2xs';

  return (
    <div
      style={{ transform: `rotate(${rotation}deg)` }}
      className={`relative group rounded-xs ${colorClass} ${className} transition-transform hover:scale-[1.02] shadow-sm`}
    >
      {/* 3D Golden Brass Pin in Top Center */}
      {withPin && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <BrassPin className="w-3.5 h-3.5" />
        </div>
      )}

      {/* Top adhesive sheen */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/25 pointer-events-none" />
      
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Remove sticky note"
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-stone-800 hover:bg-rose-700 text-white flex items-center justify-center text-[10px] opacity-75 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md z-30"
        >
          ×
        </button>
      )}

      {isEditing && onChange ? (
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your note... ♡"
          rows={3}
          className="w-full bg-transparent font-handwriting text-xs sm:text-[13px] leading-tight font-medium pt-1 resize-none focus:outline-none border-b border-dashed border-black/20"
        />
      ) : (
        <p className="font-handwriting text-xs sm:text-[13px] leading-tight font-medium pt-0.5 whitespace-pre-wrap select-text">
          {text}
        </p>
      )}

      {/* Color switcher dots in Edit Mode */}
      {isEditing && onColorChange && (
        <div className="flex items-center gap-1 justify-end mt-1 pt-0.5 border-t border-black/10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onColorChange('mint');
            }}
            title="Mint paper"
            className={`w-2.5 h-2.5 rounded-full bg-[#aedec1] border border-stone-500/50 cursor-pointer ${color === 'mint' ? 'ring-1 ring-stone-800 scale-110' : 'opacity-70 hover:opacity-100'}`}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onColorChange('yellow');
            }}
            title="Yellow paper"
            className={`w-2.5 h-2.5 rounded-full bg-[#fde047] border border-stone-500/50 cursor-pointer ${color === 'yellow' ? 'ring-1 ring-stone-800 scale-110' : 'opacity-70 hover:opacity-100'}`}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onColorChange('pink');
            }}
            title="Pink paper"
            className={`w-2.5 h-2.5 rounded-full bg-[#f472b6] border border-stone-500/50 cursor-pointer ${color === 'pink' ? 'ring-1 ring-stone-800 scale-110' : 'opacity-70 hover:opacity-100'}`}
          />
        </div>
      )}
    </div>
  );
}

// =========================================================
// 7. GEMINI AI REFLECTION (NATURAL TORN PAPER SCRAPBOOK NOTE)
// =========================================================

export function GeminiParchmentCard({
  insight,
  className = "w-full",
  title = "A Quiet Thought ♡"
}: {
  insight: string;
  className?: string;
  title?: string;
}) {
  return (
    <div 
      className={`relative bg-[#f5ecdc] border border-[#d8c7b0] rounded-xs p-2 pt-2.5 shadow-2xs transform -rotate-0.5 hover:rotate-0 transition-transform ${className}`}
      style={{
        backgroundImage: 'radial-gradient(#e6d8c3 0.6px, transparent 0.6px)',
        backgroundSize: '10px 10px'
      }}
    >
      {/* Top Center Washi Tape Strip holding down the paper */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <WashiTapeStrip color="mint" className="px-2.5 py-0.2 text-[9px] font-handwriting font-bold" label="✦ Reflection" rotation={-1} />
      </div>

      {/* Torn / Deckle Edge effect on header */}
      <div className="flex items-center justify-between mb-0.5 mt-0.5">
        <div className="flex items-center gap-1">
          <span className="font-handwriting font-bold text-[#543b23] text-xs sm:text-[13px] tracking-wide">
            {title}
          </span>
        </div>
        <span className="text-amber-700/80 text-[10px]">✨</span>
      </div>

      <p className="font-hand-casual text-[11px] sm:text-xs leading-snug text-[#3e2c1a] select-text">
        {insight}
      </p>

      {/* Tiny subtle dried wildflower sprig on bottom right */}
      <div className="absolute -bottom-1 -right-1 opacity-70 pointer-events-none">
        <WildflowerBouquet className="w-4 h-6 transform rotate-15" />
      </div>
    </div>
  );
}

// =========================================================
// 8. SIDE INDEX TABS (PROTRUDING REALISTIC BOOK TABS)
// =========================================================

export function SideBookTabs({
  totalChapters = 7,
  activeChapter = 6,
  onSelectChapter
}: {
  totalChapters?: number;
  activeChapter?: number;
  onSelectChapter?: (chNum: number) => void;
}) {
  const tabThemes = [
    { bg: 'bg-[#e4d7c0]', text: 'text-[#483a2a]', border: 'border-[#cfbf9f]' }, // CH 1 Sand
    { bg: 'bg-[#bfd9d1]', text: 'text-[#2b4b41]', border: 'border-[#a8c7be]' }, // CH 2 Sage
    { bg: 'bg-[#ebd0d5]', text: 'text-[#58333c]', border: 'border-[#dcb5bc]' }, // CH 3 Dusty Rose
    { bg: 'bg-[#dedfb8]', text: 'text-[#474826]', border: 'border-[#c6c79a]' }, // CH 4 Khaki
    { bg: 'bg-[#dbc1a5]', text: 'text-[#4d3822]', border: 'border-[#c5a687]' }, // CH 5 Camel
    { bg: 'bg-[#3a4833]', text: 'text-[#f5faf2]', border: 'border-[#2c3727]' }, // CH 6 Forest Green
    { bg: 'bg-[#dec2cd]', text: 'text-[#4d2f3c]', border: 'border-[#cca9b7]' }  // CH 7 Lilac
  ];

  const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-1.5 select-none -mr-4 z-20">
      {chapters.map((chNum) => {
        const theme = tabThemes[(chNum - 1) % tabThemes.length];
        const isActive = activeChapter === chNum;

        return (
          <button
            key={chNum}
            onClick={() => onSelectChapter && onSelectChapter(chNum)}
            className={`group relative flex items-center justify-center py-2.5 px-3 rounded-r-xl border-t border-r border-b font-sans text-xs font-bold tracking-wider shadow-sm transition-all duration-150 cursor-pointer ${theme.bg} ${theme.text} ${theme.border} ${
              isActive 
                ? 'translate-x-2.5 shadow-md ring-1 ring-white/40 scale-105 z-30 font-black' 
                : 'hover:translate-x-1 hover:shadow-xs opacity-95 hover:opacity-100'
            }`}
          >
            <span className="whitespace-nowrap">CH {chNum}</span>
            {isActive && <span className="ml-1 text-xs">🌿</span>}
          </button>
        );
      })}
    </div>
  );
}

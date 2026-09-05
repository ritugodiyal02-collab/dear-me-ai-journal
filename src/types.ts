export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastLoginAt?: number;
  hasInitializedScrapbooks?: boolean;
}

export type AIMode = 'reflect' | 'brainstorm' | 'summarize' | 'action_plan';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  modelUsed?: string;
}

export interface JournalImage {
  id: string;
  url: string; // Base64 or URL
  caption?: string;
  name?: string;
  mimeType?: string;
}

export interface AudioNote {
  id: string;
  url?: string;
  base64?: string;
  duration: number; // in seconds
  transcript?: string;
  createdAt: number;
  isTranscribing?: boolean;
}

export interface JournalReflection {
  id: string;
  userId: string;
  title: string;
  content: string;
  mode: AIMode;
  tags: string[];
  images?: JournalImage[];
  audioNotes?: AudioNote[];
  location?: string;
  date?: string;
  summary?: string;
  keyInsights?: string[];
  actionItems?: string[];
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  lastModelUsed?: string;
}

export type ScrapbookTheme = 'parchment' | 'botanical' | 'sunset' | 'midnight' | 'minimal';
export type ScrapbookCoverColor = 'olive-green' | 'tan-leather' | 'dusty-rose' | 'deep-teal' | 'vintage-brown' | 'ocean-blue';
export type ScrapbookCategory = 'All' | 'Travel' | 'Personal' | 'Milestones' | 'Favorites';

export interface ScrapbookSticker {
  id: string;
  type: 'flower' | 'daisy' | 'lavender' | 'leaf' | 'stamp' | 'washi-tape' | 'paperclip' | 'pin' | 'heart' | 'star' | 'doodle' | 'ticket' | 'sticky-note' | 'gemini-card';
  text?: string;
  subtext?: string;
  color?: 'yellow' | 'pink' | 'mint' | 'kraft' | 'blue' | 'white';
  rotation?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'margin';
  pageSide?: 'left' | 'right';
  xPercent?: number; // 0 to 100 percentage from left edge of page
  yPercent?: number; // 0 to 100 percentage from top edge of page
  scale?: number; // scale multiplier e.g. 0.85, 1.0, 1.25
}

export interface ScrapbookPhoto {
  id: string;
  url: string;
  caption?: string;
  originalCaption?: string;
  enhancedCaption?: string;
  location?: string;
  rotation?: number; // tilt angle for polaroid aesthetic
  tapeStyle?: 'none' | 'kraft' | 'washi-pink' | 'washi-mint' | 'washi-yellow' | 'paperclip' | 'brass-pin';
  polaroidCaptionStyle?: 'handwritten' | 'typewriter' | 'clean';
  objectFit?: 'cover' | 'contain'; // whether to fill frame or fit whole photo without cropping
  objectPosition?: string; // e.g. 'center', 'top', 'bottom' or '50% 20%'
  zoom?: number; // 0.7 to 1.6
  offsetY?: number; // -50 to 50 vertical shift percentage
  offsetX?: number; // -50 to 50 horizontal shift percentage
}

export interface ScrapbookAudioNoteItem {
  id: string;
  transcript?: string;
  duration?: number;
  url?: string;
  label?: string;
  memoStickyNote?: string;
}

export interface ScrapbookSection {
  id: string;
  heading?: string;
  chapterNumber?: number | string;
  narrative?: string;
  quote?: string;
  quoteAuthor?: string;
  transition?: string;
  photos?: ScrapbookPhoto[];
  audioNote?: {
    transcript?: string;
    duration?: number;
    url?: string;
    label?: string;
    memoStickyNote?: string;
  };
  audioNotes?: ScrapbookAudioNoteItem[];
  geminiReflectionNote?: {
    insight?: string;
    sparkle?: boolean;
    doodle?: string;
  };
  ticketStub?: {
    location?: string;
    date?: string;
    title?: string;
    barcodeNumber?: string;
  };
  stickers?: ScrapbookSticker[];
  stickyNotes?: Array<{
    id: string;
    text: string;
    color: 'yellow' | 'pink' | 'mint';
    rotation?: number;
  }>;
  layout?: 'single' | 'grid' | 'polaroid' | 'quote-focus' | 'story-split' | 'magazine-spread';
}

export interface Scrapbook {
  id: string;
  userId: string;
  title: string;
  subtitle?: string;
  introduction?: string;
  coverImage?: string;
  coverColor?: ScrapbookCoverColor;
  category?: ScrapbookCategory;
  theme: ScrapbookTheme;
  date?: string;
  location?: string;
  quotePill?: string; // e.g. "Collect moments, not things. ♡"
  tabs?: string[]; // e.g. ["MEMORIES", "PEOPLE", "NOTES"]
  sourceReflectionId?: string;
  sections: ScrapbookSection[];
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AIRequestPayload {
  mode: AIMode;
  prompt: string;
  currentContent?: string;
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  images?: Array<{ mimeType: string; data: string }>;
  audioTranscripts?: string[];
  userContext?: {
    displayName?: string;
  };
}

export interface AIResponsePayload {
  success: boolean;
  reply: string;
  summary?: string;
  keyInsights?: string[];
  actionItems?: string[];
  modelUsed: string;
  attemptsCount?: number;
  error?: string;
}

export interface CreateStoryRequestPayload {
  journalText: string;
  reflectionSummary?: string;
  images?: Array<{ url: string; caption?: string; name?: string }>;
  audioTranscripts?: string[];
  userInstructions?: string;
  theme?: ScrapbookTheme;
}

export interface EnhanceCaptionRequestPayload {
  originalCaption: string;
  journalContext?: string;
  imageDescription?: string;
  imageData?: string; // Optional base64
  mimeType?: string;
}

export interface ImproveStoryRequestPayload {
  scrapbook: Scrapbook;
  userGoal?: string;
}
